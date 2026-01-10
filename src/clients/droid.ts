import { spawn } from 'child_process';
import { IAssistantClient, MessageChunk } from '../types';

export type ReasoningEffort = 'off' | 'none' | 'low' | 'medium' | 'high';
export type DroidAutonomy = 'normal' | 'low' | 'medium' | 'high';

export interface DroidClientOptions {
  bin?: string;
  model?: string;
  reasoningEffort?: ReasoningEffort;
  useSpec?: boolean;
  specModel?: string;
  specReasoningEffort?: ReasoningEffort;
  auto?: DroidAutonomy;
  /** Custom timeout in ms. 0 = infinite. Default: dynamic based on prompt length */
  timeoutMs?: number;
  /** Callback for progress updates during execution */
  onProgress?: (elapsed: number, message: string) => void;
}

function envString(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed ? trimmed : undefined;
}

function boolEnv(name: string): boolean {
  const v = envString(name);
  return v === '1' || v?.toLowerCase() === 'true' || v?.toLowerCase() === 'yes';
}

function normalizeReasoningEffort(v: unknown): ReasoningEffort | undefined {
  if (typeof v !== 'string') return undefined;
  const x = v.trim().toLowerCase();
  if (x === 'off' || x === 'none' || x === 'low' || x === 'medium' || x === 'high') return x;
  return undefined;
}

function normalizeAutonomy(v: unknown): DroidAutonomy | undefined {
  if (typeof v !== 'string') return undefined;
  const x = v.trim().toLowerCase();
  if (x === 'normal' || x === 'low' || x === 'medium' || x === 'high') return x;
  return undefined;
}

function redactSecrets(text: string): string {
  // Best-effort redaction (avoid leaking keys into Telegram/logs).
  return text
    .replace(/\bfk-[A-Za-z0-9_-]+\b/g, 'fk-***')
    .replace(/\bghp_[A-Za-z0-9]+\b/g, 'ghp_***')
    .replace(/\bsk-ant-oat01-[A-Za-z0-9_-]+\b/g, 'sk-ant-oat01-***')
    .replace(/\bsk-ant-[A-Za-z0-9_-]+\b/g, 'sk-ant-***')
    .replace(/\b\d{8,12}:[A-Za-z0-9_-]{20,}\b/g, '<redacted:telegram_bot_token>');
}

function parseDroidJsonOutput(stdout: string): unknown {
  const s = stdout.trim();
  if (!s) throw new Error('Empty stdout');

  // Common cases:
  // 1) A single JSON object
  // 2) JSONL (multiple lines) where the last line is the final result object
  // 3) Extra log noise around the JSON (we extract the outermost {...})
  try {
    return JSON.parse(s);
  } catch {
    // JSONL fallback
    const lines = s
      .split(/\r?\n/)
      .map(l => l.trim())
      .filter(Boolean);
    for (let i = lines.length - 1; i >= 0; i -= 1) {
      const line = lines[i];
      if (line.startsWith('{') && line.endsWith('}')) {
        try {
          return JSON.parse(line);
        } catch {
          // keep searching
        }
      }
    }

    // Noise fallback: take substring from first '{' to last '}'
    const start = s.indexOf('{');
    const end = s.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(s.slice(start, end + 1));
    }

    throw new Error('Unparseable stdout');
  }
}

function looksLikeAuthError(stderr: string, stdout: string): boolean {
  const hay = `${stderr}\n${stdout}`.toLowerCase();
  return (
    hay.includes('factory_api_key') ||
    hay.includes('not authenticated') ||
    hay.includes('unauthorized') ||
    hay.includes('forbidden') ||
    hay.includes('401') ||
    hay.includes('api_key') ||
    hay.includes('invalid key') ||
    hay.includes('authentication')
  );
}

function buildAuthHelp(): string {
  return (
    'Auth required. Fix one of these:\n' +
    '1) Run `droid` once as the service user (appuser) and complete the browser login flow, or\n' +
    '2) Ensure ~/.factory/config.json has your Z.AI API key for GLM-4.7.\n\n' +
    'See docs/DEPLOY_UBUNTU.md for setup instructions.'
  );
}

function buildNotFoundHelp(bin: string): string {
  return (
    `Droid CLI not found: '${bin}'. Fix one of these:\n` +
    '1) Install Droid CLI and ensure it is on PATH for the service user, or\n' +
    '2) Set DROID_BIN to the absolute path (e.g. /usr/local/bin/droid).'
  );
}

function safeSnippet(text: string, maxChars = 1800): string {
  const t = text.trim();
  if (!t) return '';
  const redacted = redactSecrets(t);
  if (redacted.length <= maxChars) return redacted;
  return redacted.slice(0, maxChars) + '\n... (truncated)';
}

export class DroidClient implements IAssistantClient {
  private options: DroidClientOptions;

  constructor(options?: DroidClientOptions) {
    this.options = options || {};
  }

  async *sendQuery(
    prompt: string,
    cwd: string,
    resumeSessionId?: string
  ): AsyncGenerator<MessageChunk> {
    const droidBin = this.options.bin ?? envString('DROID_BIN') ?? 'droid';
    const startTime = Date.now();

    // DIAGNOSTIC: Log Droid execution start
    console.log(`[Droid:DIAG] Starting exec at ${new Date().toISOString()}`, {
      bin: droidBin,
      cwd,
      hasResumeSession: !!resumeSessionId,
      promptLength: prompt.length,
    });

    // Defaults from env for backwards compatibility.
    const useSpec = this.options.useSpec ?? boolEnv('DROID_USE_SPEC');
    const model = this.options.model ?? envString('DROID_MODEL');
    const reasoning =
      this.options.reasoningEffort ?? normalizeReasoningEffort(envString('DROID_REASONING_EFFORT'));
    const specModel = this.options.specModel ?? envString('DROID_SPEC_MODEL');
    const specReasoning =
      this.options.specReasoningEffort ??
      normalizeReasoningEffort(envString('DROID_SPEC_REASONING_EFFORT'));
    const auto = this.options.auto ?? normalizeAutonomy(envString('DROID_AUTO'));

    const args: string[] = ['exec', '-o', 'json', '--cwd', cwd];
    if (resumeSessionId) args.push('-s', resumeSessionId);
    if (model) args.push('-m', model);
    if (reasoning) args.push('-r', reasoning);
    if (useSpec) args.push('--use-spec');
    if (specModel) args.push('--spec-model', specModel);
    if (specReasoning) args.push('--spec-reasoning-effort', specReasoning);
    if (auto && auto !== 'normal') args.push('--auto', auto);
    args.push(prompt);

    // DIAGNOSTIC: Log full command (without prompt for brevity)
    console.log(`[Droid:DIAG] Command args (excluding prompt):`, args.slice(0, -1));

    let child: ReturnType<typeof spawn>;
    try {
      child = spawn(droidBin, args, {
        env: {
          ...process.env,
        },
        stdio: ['ignore', 'pipe', 'pipe'],
      });
    } catch (error) {
      const e = error as NodeJS.ErrnoException;
      console.error(`[Droid:DIAG] spawn FAILED`, { code: e.code, message: e.message });
      if (e.code === 'ENOENT') {
        yield { type: 'assistant', content: buildNotFoundHelp(droidBin) };
        return;
      }
      yield { type: 'assistant', content: `Failed to start Droid CLI: ${e.message}` };
      return;
    }

    if (!child.stdout || !child.stderr) {
      console.error(`[Droid:DIAG] stdio attach FAILED`);
      yield { type: 'assistant', content: 'Failed to attach to Droid CLI stdio.' };
      return;
    }

    let stdout = '';
    let stderr = '';
    let lastActivityTime = Date.now();

    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');

    child.stdout.on('data', (data: string) => {
      stdout += data;
      lastActivityTime = Date.now(); // Reset activity timer
      console.log(`[Droid:DIAG] stdout chunk received (${data.length} chars)`);
    });

    child.stderr.on('data', (data: string) => {
      stderr += data;
      lastActivityTime = Date.now(); // Reset activity timer
      console.log(`[Droid:DIAG] stderr chunk received (${data.length} chars)`);
    });

    // Dynamic timeout based on prompt complexity
    // Base: 5 minutes, +2 minutes per 5000 chars, max configurable (default 15 min)
    // If timeoutMs option is set: 0 = infinite, otherwise use that value
    const customTimeout = this.options.timeoutMs;
    const maxTimeoutEnv = envString('DROID_MAX_TIMEOUT_MS');
    const maxTimeoutMs = maxTimeoutEnv ? parseInt(maxTimeoutEnv, 10) : 15 * 60 * 1000;
    const baseTimeoutMs = 5 * 60 * 1000;
    const promptComplexityFactor = Math.floor(prompt.length / 5000);
    const dynamicTimeout = Math.min(baseTimeoutMs + promptComplexityFactor * 2 * 60 * 1000, maxTimeoutMs);
    
    // Use custom timeout if provided, 0 means infinite (1 hour hard cap for safety)
    const TIMEOUT_MS = customTimeout !== undefined 
      ? (customTimeout === 0 ? 60 * 60 * 1000 : customTimeout)  // 0 = 1 hour
      : dynamicTimeout;
    
    console.log(`[Droid:DIAG] Timeout configured: ${TIMEOUT_MS / 1000}s (prompt: ${prompt.length} chars, custom: ${customTimeout !== undefined})`);
    
    let timedOut = false;
    const onProgress = this.options.onProgress;
    let progressInterval: NodeJS.Timeout | null = null;
    
    // Progress callback for long-running jobs (every 60s)
    if (onProgress) {
      progressInterval = setInterval(() => {
        const elapsed = Math.round((Date.now() - startTime) / 1000);
        onProgress(elapsed, `Processing... (${Math.floor(elapsed / 60)}m ${elapsed % 60}s elapsed)`);
      }, 60000);
    }
    
    // Activity-based timeout: reset on any output
    const checkActivity = () => {
      const idleTime = Date.now() - lastActivityTime;
      if (idleTime > TIMEOUT_MS) {
        timedOut = true;
        console.error(`[Droid:DIAG] TIMEOUT after ${idleTime}ms idle - killing process`);
        child.kill('SIGTERM');
      }
    };
    
    const activityCheckInterval = setInterval(checkActivity, 30000); // Check every 30s
    
    const timeoutId = setTimeout(() => {
      timedOut = true;
      console.error(`[Droid:DIAG] HARD TIMEOUT after ${TIMEOUT_MS}ms - killing process`);
      child.kill('SIGTERM');
    }, TIMEOUT_MS);

    let exitCode: number;
    try {
      exitCode = await new Promise<number>((resolve, reject) => {
        child.on('error', reject);
        child.on('close', code => {
          clearTimeout(timeoutId);
          clearInterval(activityCheckInterval);
          if (progressInterval) clearInterval(progressInterval);
          resolve(code ?? 1);
        });
      });
    } catch (error) {
      clearTimeout(timeoutId);
      clearInterval(activityCheckInterval);
      if (progressInterval) clearInterval(progressInterval);
      const e = error as NodeJS.ErrnoException;
      console.error(`[Droid:DIAG] process error`, { code: e.code, message: e.message });
      if (e.code === 'ENOENT') {
        yield { type: 'assistant', content: buildNotFoundHelp(droidBin) };
        return;
      }
      yield { type: 'assistant', content: `Droid CLI process error: ${e.message}` };
      return;
    }

    const execDuration = Date.now() - startTime;
    
    // DIAGNOSTIC: Log execution result
    console.log(`[Droid:DIAG] exec completed`, {
      exitCode,
      durationMs: execDuration,
      stdoutLength: stdout.length,
      stderrLength: stderr.length,
      hasAuthError: looksLikeAuthError(stderr, stdout),
      timedOut,
    });

    // Handle timeout
    if (timedOut) {
      const timeoutSecs = TIMEOUT_MS / 1000;
      yield {
        type: 'assistant',
        content: `⚠️ Droid CLI timed out after ${timeoutSecs} seconds.\n\n` +
          `**Why this happened:**\n` +
          `• Complex NOVA missions with large prompts need more processing time\n` +
          `• The AI may be performing deep reasoning or multi-step operations\n\n` +
          `**Solutions:**\n` +
          `1. **Break down the task** - Instead of "Implement Phase 2 Memory System", try:\n` +
          `   • "Create SQLite schema for episodic memory"\n` +
          `   • "Implement memory CRUD operations"\n` +
          `2. **/reset** - Start a fresh session\n` +
          `3. **Reduce reasoning effort** - Use \`/set droidReasoningEffort low\`\n` +
          `4. **Check VPS resources** - Ensure adequate CPU/memory\n\n` +
          `💡 Tip: Smaller, focused tasks complete faster and more reliably.`,
      };
      return;
    }

    // Only surface stderr when the command fails; avoid spamming normal runs.
    if (exitCode !== 0 && stderr.trim()) {
      console.error(`[Droid:DIAG] stderr content (truncated):`, safeSnippet(stderr, 500));
      yield { type: 'system', content: safeSnippet(stderr, 4000) };
    }

    let parsed: unknown;
    try {
      parsed = parseDroidJsonOutput(stdout);
    } catch (error) {
      const snippet = safeSnippet(stdout, 1200);
      const errMsg = error instanceof Error ? error.message : 'Unknown parse error';
      const help =
        looksLikeAuthError(stderr, stdout) && !envString('FACTORY_API_KEY')
          ? `\n\n${buildAuthHelp()}`
          : '';

      yield {
        type: 'assistant',
        content:
          `Failed to parse Droid output (exit ${exitCode}). ${errMsg}.\n` +
          `Ensure Droid supports 'droid exec -o json' and is authenticated.${help}` +
          (snippet ? `\n\nRaw stdout (truncated):\n${snippet}` : ''),
      };
      return;
    }

    const root = parsed as Record<string, unknown>;
    const sessionId =
      (root.sessionId as string | undefined) ??
      (root.session_id as string | undefined) ??
      ((root.session as Record<string, unknown> | undefined)?.id as string | undefined);

    const isError =
      root.is_error === true ||
      root.isError === true ||
      (typeof root.subtype === 'string' && root.subtype.toLowerCase().includes('error'));

    const message =
      (root.result as string | undefined) ??
      (root.message as string | undefined) ??
      (root.output as string | undefined) ??
      (root.text as string | undefined) ??
      ((root.response as Record<string, unknown> | undefined)?.text as string | undefined);

    if (sessionId) yield { type: 'result', sessionId };

    if (isError || exitCode !== 0) {
      const help = looksLikeAuthError(stderr, stdout) ? `\n\n${buildAuthHelp()}` : '';
      const body = message ? safeSnippet(message, 2500) : '';
      const errBlock = stderr.trim() ? `\n\nStderr (truncated):\n${safeSnippet(stderr, 1200)}` : '';

      yield {
        type: 'assistant',
        content:
          `⚠️ Droid exec failed (exit ${exitCode}).${help}` +
          (body ? `\n\n${body}` : '') +
          errBlock,
      };
      return;
    }

    if (message) {
      yield { type: 'assistant', content: message };
      return;
    }

    // Successful exit but no parsable message.
    const help = looksLikeAuthError(stderr, stdout) ? `\n\n${buildAuthHelp()}` : '';
    yield {
      type: 'assistant',
      content:
        `Droid exec completed (exit ${exitCode}) but returned no message.${help}` +
        (stdout.trim() ? `\n\nRaw stdout (truncated):\n${safeSnippet(stdout, 1200)}` : ''),
    };
  }

  getType(): string {
    return 'droid';
  }
}
