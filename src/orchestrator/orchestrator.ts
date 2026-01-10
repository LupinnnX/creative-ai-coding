/**
 * Orchestrator - Main conversation handler
 * Routes slash commands and AI messages appropriately
 * Enhanced with NOVA Framework v6.0 integration
 * Enhanced with Self-Healing Error Debugger v1.0
 * Enhanced with Async Job Routing v1.0
 * Enhanced with Context Burn Prevention v1.0
 */
import { readFile } from 'fs/promises';
import { join } from 'path';
import { IPlatformAdapter } from '../types';
import * as db from '../db/conversations';
import * as codebaseDb from '../db/codebases';
import * as sessionDb from '../db/sessions';
import * as jobQueue from '../db/job-queue';
import * as commandHandler from '../handlers/command-handler';
import { formatToolCall } from '../utils/tool-formatter';
import { substituteVariables } from '../utils/variable-substitution';
import { DroidClient, type DroidClientOptions, type ReasoningEffort } from '../clients/droid';
import { getSystemPrompt } from '../prompts/system-prompt';
import { 
  buildNovaContext, 
  NovaAgentId,
  NOVA_AGENTS,
  analyzeError,
  createReflectionFromAnalysis,
} from '../nova';
import {
  buildNovaContextLite,
  buildQuickActivationLite,
  estimateTokens,
} from '../nova/steering-lite';
import {
  isAuditRequest,
  getAuditInterceptionMessage,
} from '../nova/context-budget';

type DroidAuto = 'normal' | 'low' | 'medium' | 'high';

function normalizeDroidAuto(v: unknown): DroidAuto | undefined {
  if (typeof v !== 'string') return undefined;
  const x = v.trim().toLowerCase();
  if (x === 'normal' || x === 'low' || x === 'medium' || x === 'high') return x;
  return undefined;
}

function getDefaultDroidAuto(): DroidAuto {
  const fromEnv = normalizeDroidAuto(process.env.DROID_DEFAULT_AUTO);
  return fromEnv ?? 'medium';
}

function normalizeDroidReasoningEffort(v: unknown): ReasoningEffort | undefined {
  if (typeof v !== 'string') return undefined;
  const x = v.trim().toLowerCase();
  if (x === 'off' || x === 'none' || x === 'low' || x === 'medium' || x === 'high') return x;
  return undefined;
}

function buildDroidClientOptions(metadata: Record<string, unknown>): DroidClientOptions {
  const opts: DroidClientOptions = {};

  if (typeof metadata.droidModel === 'string') opts.model = metadata.droidModel;

  const reasoning = normalizeDroidReasoningEffort(metadata.droidReasoningEffort);
  if (reasoning) opts.reasoningEffort = reasoning;

  if (metadata.droidUseSpec === true) opts.useSpec = true;

  if (typeof metadata.droidSpecModel === 'string') opts.specModel = metadata.droidSpecModel;

  const specReasoning = normalizeDroidReasoningEffort(metadata.droidSpecReasoningEffort);
  if (specReasoning) opts.specReasoningEffort = specReasoning;

  const auto = normalizeDroidAuto(metadata.droidAuto);
  if (auto) opts.auto = auto;

  return opts;
}

async function buildNovaSteeringPrefix(
  metadata: Record<string, unknown> | null | undefined,
  cwd: string
): Promise<string> {
  const active = typeof metadata?.novaActiveAgent === 'string' ? metadata.novaActiveAgent : '';
  const mission = typeof metadata?.novaMission === 'string' ? metadata.novaMission : '';
  const useLiteContext = metadata?.novaLiteContext !== false; // Default to LITE

  if (!active) return '';

  // Validate agent name
  const agentName = active.toUpperCase() as NovaAgentId;
  if (!NOVA_AGENTS[agentName]) return '';

  // Use LITE context by default to prevent 200K token burn
  if (useLiteContext) {
    const liteContext = buildNovaContextLite(agentName, mission);
    console.log(`[Orchestrator] Using LITE NOVA context (~${estimateTokens(liteContext)} tokens)`);
    return liteContext + '\n\n---\n\nUser prompt:';
  }

  // Full context only if explicitly requested (novaLiteContext: false)
  try {
    const fullContext = await buildNovaContext(
      cwd,
      agentName,
      [],
      mission
    );
    
    if (fullContext && fullContext.length > 100) {
      console.log(`[Orchestrator] Using FULL NOVA context (~${estimateTokens(fullContext)} tokens) - WARNING: High token usage`);
      return fullContext + '\n\n---\n\nUser prompt:';
    }
  } catch {
    console.log('[Orchestrator] Full NOVA context unavailable, using LITE');
  }

  // Fallback to quick activation
  const quickContext = buildQuickActivationLite(agentName, mission);
  return quickContext + '\n\n---\n\nUser prompt:';
}

// ============================================================================
// ASYNC JOB ROUTING - Complexity Estimation & Job Queue Integration
// ============================================================================

type TaskComplexity = 'quick' | 'medium' | 'complex';

/**
 * Environment configuration for async job routing
 */
function getAsyncJobConfig(): { enabled: boolean; complexityThreshold: TaskComplexity } {
  const enabled = process.env.NOVA_ASYNC_JOBS_ENABLED === 'true';
  const threshold = (process.env.NOVA_ASYNC_THRESHOLD || 'complex') as TaskComplexity;
  return { enabled, complexityThreshold: threshold };
}

/**
 * Estimate task complexity based on prompt characteristics
 * Used to route complex tasks to background job queue
 */
function estimateTaskComplexity(prompt: string, hasNovaAgent: boolean): TaskComplexity {
  const length = prompt.length;
  
  // Patterns indicating complex multi-step tasks
  const multiStepPatterns = /\b(then|after that|finally|phase|step \d|first.*then|next)/i;
  const hasMultiStep = multiStepPatterns.test(prompt);
  
  // Patterns indicating large-scale operations
  const largeScalePatterns = /\b(refactor|migrate|entire|all files|whole|complete|full)/i;
  const hasLargeScale = largeScalePatterns.test(prompt);
  
  // Patterns indicating research/analysis tasks
  const researchPatterns = /\b(research|analyze|investigate|compare|evaluate|audit)/i;
  const hasResearch = researchPatterns.test(prompt);
  
  // Patterns indicating build/create tasks
  const buildPatterns = /\b(build|create|implement|develop|design|architect)/i;
  const hasBuild = buildPatterns.test(prompt);
  
  // Score-based complexity estimation
  let score = 0;
  
  // Length scoring
  if (length > 2000) score += 3;
  else if (length > 1000) score += 2;
  else if (length > 500) score += 1;
  
  // Pattern scoring
  if (hasMultiStep) score += 2;
  if (hasLargeScale) score += 2;
  if (hasResearch) score += 1;
  if (hasBuild && hasNovaAgent) score += 2;
  if (hasNovaAgent) score += 1;
  
  // Determine complexity
  if (score >= 5) return 'complex';
  if (score >= 2) return 'medium';
  return 'quick';
}

/**
 * Check if task should be routed to async job queue
 */
function shouldRouteToJobQueue(
  complexity: TaskComplexity,
  config: { enabled: boolean; complexityThreshold: TaskComplexity }
): boolean {
  if (!config.enabled) return false;
  
  const thresholdMap: Record<TaskComplexity, number> = {
    quick: 1,
    medium: 2,
    complex: 3,
  };
  
  return thresholdMap[complexity] >= thresholdMap[config.complexityThreshold];
}

/**
 * Create an async job for background processing
 */
async function createAsyncJob(params: {
  conversationId: string;
  sessionId: string;
  prompt: string;
  cwd: string;
  novaAgent?: string;
  novaMission?: string;
  droidOptions?: DroidClientOptions;
  userIdentifier?: string;
  complexity: TaskComplexity;
}): Promise<jobQueue.Job> {
  const jobType = params.novaAgent ? 'nova_mission' : 'droid_exec';
  const jobName = params.novaMission 
    ? `${params.novaAgent}: ${params.novaMission.substring(0, 50)}...`
    : `Task: ${params.prompt.substring(0, 50)}...`;
  
  // Priority based on complexity (higher = more urgent, but complex = lower priority)
  const priorityMap: Record<TaskComplexity, number> = {
    quick: 70,
    medium: 50,
    complex: 30,
  };
  
  const job = await jobQueue.createJob({
    job_type: jobType,
    job_name: jobName,
    payload: {
      prompt: params.prompt,
      cwd: params.cwd,
      sessionId: params.sessionId,
      droidOptions: params.droidOptions,
      novaAgent: params.novaAgent,
      novaMission: params.novaMission,
    },
    priority: priorityMap[params.complexity],
    conversation_id: params.conversationId,
    session_id: params.sessionId,
    agent: params.novaAgent,
    user_identifier: params.userIdentifier,
    timeout_seconds: params.complexity === 'complex' ? 1800 : 600, // 30 min for complex, 10 min otherwise
    metadata: {
      complexity: params.complexity,
      promptLength: params.prompt.length,
    },
  });
  
  console.log(`[Orchestrator] Created async job ${job.id} (${jobType}, ${params.complexity})`);
  return job;
}

/**
 * Format job queued acknowledgment message
 */
function formatJobQueuedMessage(job: jobQueue.Job, complexity: TaskComplexity): string {
  const shortId = job.id.substring(0, 8);
  const complexityEmoji = {
    quick: '⚡',
    medium: '🔄',
    complex: '🚀',
  }[complexity];
  
  return `${complexityEmoji} **Task Queued** (Job: \`${shortId}\`)

Your request is being processed in the background.
Complexity: ${complexity}

💡 Commands:
• \`/job ${shortId}\` - Check status
• \`/jobs\` - List all jobs
• \`/cancel ${shortId}\` - Cancel task

I'll notify you when it's complete.`;
}

/**
 * User context for multi-user tracking
 */
export interface UserContext {
  userId: string;
  username?: string;
}

export async function handleMessage(
  platform: IPlatformAdapter,
  conversationId: string,
  message: string,
  issueContext?: string, // Optional GitHub issue/PR context to append AFTER command loading
  userContext?: UserContext // Optional user context for multi-user tracking
): Promise<void> {
  try {
    console.log(`[Orchestrator] Handling message for conversation ${conversationId}`, {
      userId: userContext?.userId,
      username: userContext?.username,
    });

    // Get or create conversation with user context
    let conversation = await db.getOrCreateConversation(
      platform.getPlatformType(), 
      conversationId,
      undefined,
      userContext
    );

    // Natural-language shortcuts for session management
    // "new chat", "fresh start", "start over", "clear chat" → /reset
    const resetPhrases = /^(new\s*chat|fresh\s*start|start\s*over|clear\s*(chat|session|context)|nouveau\s*chat)$/i;
    if (!message.startsWith('/') && resetPhrases.test(message.trim())) {
      const { handleCommand } = await import('../handlers/command-handler');
      const r = await handleCommand(conversation, '/reset');
      await platform.sendMessage(conversationId, r.message);
      return;
    }

    // Natural-language activation (Telegram): "activate POLARIS (mission...)" etc.
    // After activation, CONTINUE to AI execution with the mission as the prompt
    let activationMission: string | null = null;
    
    if (!message.startsWith('/') && /^activate\s+/i.test(message.trim())) {
      const activateRegex = /^activate\s+(.+?)\s*[\-\(]\s*(.+?)\s*\)?$/i;
      const activateMatch = activateRegex.exec(message.trim());
      if (activateMatch) {
        const rawAgents = (activateMatch[1] || '').trim();
        const rawMission = (activateMatch[2] || '').trim();
        if (rawAgents && rawMission) {
          const { handleCommand } = await import('../handlers/command-handler');
          // Support "X and Y" by activating primary + storing mission
          const agents = rawAgents
            .split(/\s+and\s+|\s*,\s*/i)
            .map(s => s.trim())
            .filter(Boolean);
          const primary = agents[0] || '';
          const cmd = `/activate ${primary} ${rawMission}`;
          const r = await handleCommand(conversation, cmd);
          await platform.sendMessage(conversationId, r.message);
          
          // Store mission to continue to AI execution
          activationMission = rawMission;
          // DON'T return - continue to AI execution with the mission!
        }
      }
    }

    // Handle slash commands (except /command-invoke and /activate which need AI execution)
    if (message.startsWith('/')) {
      // /activate should continue to AI execution after setting up the agent
      if (message.startsWith('/activate ')) {
        console.log(`[Orchestrator] Processing /activate command: ${message}`);
        const result = await commandHandler.handleCommand(conversation, message);
        await platform.sendMessage(conversationId, result.message);
        
        // Extract mission from /activate command and continue to AI
        const { args } = commandHandler.parseCommand(message);
        if (args.length >= 2) {
          activationMission = args.slice(1).join(' ');
          // Reload conversation to get updated session
          conversation = await db.getOrCreateConversation(
            platform.getPlatformType(),
            conversationId
          );
          // IMPORTANT: Deactivate old session to start fresh with new agent
          const oldSession = await sessionDb.getActiveSession(conversation.id);
          if (oldSession) {
            await sessionDb.deactivateSession(oldSession.id);
            console.log('[Orchestrator] Deactivated old session for new agent activation');
          }
          // DON'T return - continue to AI execution!
        } else {
          return; // No mission provided, just show activation message
        }
      } else if (!message.startsWith('/command-invoke')) {
        console.log(`[Orchestrator] Processing slash command: ${message}`);
        const result = await commandHandler.handleCommand(conversation, message);
        await platform.sendMessage(conversationId, result.message);

        // Reload conversation if modified
        if (result.modified) {
          conversation = await db.getOrCreateConversation(
            platform.getPlatformType(),
            conversationId
          );
        }
        return;
      }
      // /command-invoke falls through to AI handling
    }

    // Parse /command-invoke if applicable
    let promptToSend = activationMission || message;
    let commandName: string | null = null;
    
    // If we have an activation mission, skip command-invoke parsing
    if (activationMission) {
      console.log(`[Orchestrator] Executing activation mission: ${activationMission}`);
    } else if (message.startsWith('/command-invoke')) {
      // Use parseCommand to properly handle quoted arguments
      // e.g., /command-invoke plan "here is the request" → args = ['plan', 'here is the request']
      const { args: parsedArgs } = commandHandler.parseCommand(message);

      if (parsedArgs.length < 1) {
        await platform.sendMessage(conversationId, 'Usage: /command-invoke <name> [args...]');
        return;
      }

      commandName = parsedArgs[0];
      const args = parsedArgs.slice(1);

      if (!conversation.codebase_id) {
        await platform.sendMessage(conversationId, 'No codebase configured. Use /clone first.');
        return;
      }

      // Look up command definition
      const codebase = await codebaseDb.getCodebase(conversation.codebase_id);
      if (!codebase) {
        await platform.sendMessage(conversationId, 'Codebase not found.');
        return;
      }

      const commandDef = codebase.commands[commandName];
      if (!commandDef) {
        await platform.sendMessage(
          conversationId,
          `Command '${commandName}' not found. Use /commands to see available.`
        );
        return;
      }

      // Read command file
      const cwd = conversation.cwd || codebase.default_cwd;
      const commandFilePath = join(cwd, commandDef.path);

      try {
        const commandText = await readFile(commandFilePath, 'utf-8');

        // Substitute variables (no metadata needed - file-based workflow)
        promptToSend = substituteVariables(commandText, args);

        // Append issue/PR context AFTER command loading (if provided)
        if (issueContext) {
          promptToSend = promptToSend + '\n\n---\n\n' + issueContext;
          console.log('[Orchestrator] Appended issue/PR context to command prompt');
        }

        console.log(`[Orchestrator] Executing '${commandName}' with ${args.length} args`);
      } catch (error) {
        const err = error as Error;
        await platform.sendMessage(conversationId, `Failed to read command file: ${err.message}`);
        return;
      }
    } else {
      // Regular message - codebase is optional.
      // If no codebase is configured, we still allow the assistant to operate from a default cwd.
    }

    console.log('[Orchestrator] Starting AI conversation');
    console.log(`[Orchestrator] activationMission: ${activationMission}`);
    console.log(`[Orchestrator] promptToSend length: ${promptToSend.length}`);

    // Get or create session (handle plan→execute transition)
    let session = await sessionDb.getActiveSession(conversation.id);
    console.log(`[Orchestrator] Session found: ${!!session}, novaActiveAgent: ${session?.metadata?.novaActiveAgent}`);
    
    const codebase = conversation.codebase_id
      ? await codebaseDb.getCodebase(conversation.codebase_id)
      : null;
    const cwd = conversation.cwd || codebase?.default_cwd || '/workspace';
    console.log(`[Orchestrator] CWD: ${cwd}`);

    // Check for plan→execute transition (requires NEW session per PRD)
    // Note: The planning command is named 'plan-feature', not 'plan'
    const needsNewSession =
      commandName === 'execute' && session?.metadata?.lastCommand === 'plan-feature';

    if (needsNewSession) {
      console.log('[Orchestrator] Plan→Execute transition: creating new session');

      if (session) {
        await sessionDb.deactivateSession(session.id);
      }

      session = await sessionDb.createSession({
        conversation_id: conversation.id,
        codebase_id: conversation.codebase_id || undefined,
        ai_assistant_type: conversation.ai_assistant_type,
        user_identifier: userContext?.userId,
        platform_username: userContext?.username,
      });
    } else if (!session) {
      console.log('[Orchestrator] Creating new session', {
        userId: userContext?.userId,
        username: userContext?.username,
      });
      session = await sessionDb.createSession({
        conversation_id: conversation.id,
        codebase_id: conversation.codebase_id || undefined,
        ai_assistant_type: conversation.ai_assistant_type,
        user_identifier: userContext?.userId,
        platform_username: userContext?.username,
      });
    } else {
      console.log(`[Orchestrator] Resuming session ${session.id}`, {
        userId: userContext?.userId,
      });
    }

    if (conversation.ai_assistant_type === 'droid') {
      const currentAuto = normalizeDroidAuto(session.metadata.droidAuto);
      if (!currentAuto) {
        const defaultAuto = getDefaultDroidAuto();
        try {
          await sessionDb.updateSessionMetadata(session.id, { droidAuto: defaultAuto });
        } catch (error) {
          console.error('[Orchestrator] Failed to persist default droid auto setting', {
            error,
            sessionId: session.id,
          });
        }

        session.metadata = { ...session.metadata, droidAuto: defaultAuto };
      }
    }

    // Extract NOVA context (used for both prompt building and async routing)
    const novaAgent = typeof session.metadata?.novaActiveAgent === 'string' 
      ? session.metadata.novaActiveAgent 
      : undefined;
    const novaMission = typeof session.metadata?.novaMission === 'string'
      ? session.metadata.novaMission
      : undefined;

    // ========================================================================
    // CONTEXT BURN PREVENTION - Intercept audit/scan requests
    // ========================================================================
    // Check if this looks like an "audit codebase" request that would burn context
    if (!commandName && isAuditRequest(promptToSend)) {
      console.log('[Orchestrator] Intercepted audit request to prevent context burn');
      const auditMessage = getAuditInterceptionMessage(cwd);
      await platform.sendMessage(conversationId, auditMessage);
      return; // Don't proceed to AI - would burn context
    }

    if (conversation.ai_assistant_type === 'droid') {
      const novaPrefix = await buildNovaSteeringPrefix(session.metadata, cwd);
      
      console.log(`[Orchestrator] Building prompt - novaAgent: ${novaAgent}, novaPrefixLength: ${novaPrefix?.length || 0}`);
      
      // Build the complete prompt with system instructions
      const systemPrompt = getSystemPrompt(novaAgent);
      
      if (novaPrefix) {
        promptToSend = `${systemPrompt}\n\n---\n\n${novaPrefix}\n${promptToSend}`;
        console.log(`[Orchestrator] NOVA agent ${novaAgent} active with enhanced steering`);
      } else {
        promptToSend = `${systemPrompt}\n\n---\n\nUser request:\n${promptToSend}`;
      }
      
      console.log(`[Orchestrator] Final prompt length: ${promptToSend.length}`);
    }

    // Normalize assistant type - only 'droid' is supported
    if (conversation.ai_assistant_type !== 'droid') {
      console.log(`[Orchestrator] Unsupported assistant type '${conversation.ai_assistant_type}', using 'droid'`);
      // Auto-fix the database record to prevent future errors
      await db.updateConversation(conversation.id, { ai_assistant_type: 'droid' });
    }

    // ========================================================================
    // ASYNC JOB ROUTING - Route complex tasks to background job queue
    // ========================================================================
    const asyncConfig = getAsyncJobConfig();
    
    if (asyncConfig.enabled) {
      const complexity = estimateTaskComplexity(promptToSend, !!novaAgent);
      console.log(`[Orchestrator] Task complexity: ${complexity} (async enabled, threshold: ${asyncConfig.complexityThreshold})`);
      
      if (shouldRouteToJobQueue(complexity, asyncConfig)) {
        console.log(`[Orchestrator] Routing to async job queue (complexity: ${complexity})`);
        
        try {
          const job = await createAsyncJob({
            // IMPORTANT: Use platform_conversation_id for Telegram notifications
            // The notifier needs the Telegram chat ID, not the internal UUID
            conversationId: conversation.platform_conversation_id,
            sessionId: session.id,
            prompt: promptToSend,
            cwd,
            novaAgent,
            novaMission,
            droidOptions: buildDroidClientOptions(session.metadata),
            userIdentifier: userContext?.userId,
            complexity,
          });
          
          // Send immediate acknowledgment
          const ackMessage = formatJobQueuedMessage(job, complexity);
          await platform.sendMessage(conversationId, ackMessage);
          
          // Track in session metadata
          await sessionDb.updateSessionMetadata(session.id, { 
            lastJobId: job.id,
            lastJobComplexity: complexity,
          });
          
          console.log(`[Orchestrator] Task queued as job ${job.id}, returning`);
          return; // Exit - job worker will handle execution
        } catch (jobError) {
          console.error('[Orchestrator] Failed to create async job, falling back to sync:', jobError);
          // Fall through to synchronous execution
        }
      }
    }
    // ========================================================================
    
    const aiClient = new DroidClient(buildDroidClientOptions(session.metadata));
    console.log(`[Orchestrator] Using ${aiClient.getType()} assistant`);
    console.log(`[Orchestrator] About to call AI with prompt (first 200 chars): ${promptToSend.substring(0, 200)}...`);

    // Send to AI and stream responses
    const mode = platform.getStreamingMode();
    console.log(`[Orchestrator] Streaming mode: ${mode}`);

    if (mode === 'stream') {
      // Stream mode: Send each chunk immediately
      for await (const msg of aiClient.sendQuery(
        promptToSend,
        cwd,
        session.assistant_session_id || undefined
      )) {
        if (msg.type === 'assistant' && msg.content) {
          await platform.sendMessage(conversationId, msg.content);
        } else if (msg.type === 'system' && msg.content) {
          await platform.sendMessage(conversationId, msg.content);
        } else if (msg.type === 'tool' && msg.toolName) {
          // Format and send tool call notification
          const toolMessage = formatToolCall(msg.toolName, msg.toolInput);
          await platform.sendMessage(conversationId, toolMessage);
        } else if (msg.type === 'result' && msg.sessionId) {
          // Save session ID for resume
          await sessionDb.updateSession(session.id, msg.sessionId);
        }
      }
    } else {
      // Batch mode: Accumulate all chunks for logging, send only final clean summary
      const allChunks: { type: string; content: string }[] = [];
      const assistantMessages: string[] = [];
      const systemMessages: string[] = [];

      for await (const msg of aiClient.sendQuery(
        promptToSend,
        cwd,
        session.assistant_session_id || undefined
      )) {
        if (msg.type === 'assistant' && msg.content) {
          assistantMessages.push(msg.content);
          allChunks.push({ type: 'assistant', content: msg.content });
        } else if (msg.type === 'system' && msg.content) {
          systemMessages.push(msg.content);
          allChunks.push({ type: 'system', content: msg.content });
        } else if (msg.type === 'tool' && msg.toolName) {
          // Format and log tool call for observability
          const toolMessage = formatToolCall(msg.toolName, msg.toolInput);
          allChunks.push({ type: 'tool', content: toolMessage });
          console.log(`[Orchestrator] Tool call: ${msg.toolName}`);
        } else if (msg.type === 'result' && msg.sessionId) {
          await sessionDb.updateSession(session.id, msg.sessionId);
        }
      }

      // Log all chunks for observability
      console.log(`[Orchestrator] Received ${allChunks.length} chunks total`);
      console.log(`[Orchestrator] Assistant messages: ${assistantMessages.length}`);

      // Extract clean summary from the last message
      // Tool indicators from Droid: 🔧, 💭, etc.
      // These appear at the start of lines showing tool usage
      let finalMessage = '';

      if (assistantMessages.length > 0) {
        const lastMessage = assistantMessages[assistantMessages.length - 1];

        // Split by double newlines to separate tool sections from summary
        const sections = lastMessage.split('\n\n');

        // Filter out sections that start with tool indicators
        // Using alternation for emojis with variation selectors
        const toolIndicatorRegex =
          /^(?:\u{1F527}|\u{1F4AD}|\u{1F4DD}|\u{270F}\u{FE0F}|\u{1F5D1}\u{FE0F}|\u{1F4C2}|\u{1F50D})/u;
        const cleanSections = sections.filter(section => {
          const trimmed = section.trim();
          return !toolIndicatorRegex.exec(trimmed);
        });

        // Join remaining sections (this is the summary without tool indicators)
        finalMessage = cleanSections.join('\n\n').trim();

        // If we filtered everything out, fall back to last message
        if (!finalMessage) {
          finalMessage = lastMessage;
        }
      }

      if (finalMessage) {
        console.log(`[Orchestrator] Sending final message (${finalMessage.length} chars)`);
        await platform.sendMessage(conversationId, finalMessage);
      } else if (systemMessages.length > 0) {
        const combined = systemMessages.join('\n\n');
        console.log(
          `[Orchestrator] No assistant message; sending system output (${combined.length} chars)`
        );
        await platform.sendMessage(conversationId, combined);
      }
    }

    // Track last command in metadata (for plan→execute detection)
    if (commandName) {
      await sessionDb.updateSessionMetadata(session.id, { lastCommand: commandName });
    }

    console.log('[Orchestrator] Message handling complete');
  } catch (error) {
    const err = error as Error & { code?: string };
    console.error('[Orchestrator] Error:', error);
    
    // ============================================
    // NOVA SELF-HEALING ERROR DEBUGGER + REFLEXION
    // Automatically activates ARCTURUS + VEGA
    // Creates reflections for learning from failures
    // ============================================
    try {
      const cwd = '/workspace';
      const analysis = await analyzeError(
        { code: err.code, message: err.message, stack: err.stack },
        cwd
      );
      
      // Log analysis for debugging
      console.log(`[NOVA:Healing] Error analyzed - ID: ${analysis.id}`);
      console.log(`[NOVA:Healing] Category: ${analysis.category}`);
      console.log(`[NOVA:Healing] Root cause: ${analysis.firstPrinciples.rootCause}`);
      
      // Get session for context
      const session = await sessionDb.getActiveSession(conversationId);
      const activeAgent = (session?.metadata?.novaActiveAgent as string)?.toUpperCase() || 'POLARIS';
      const validAgents = ['POLARIS', 'VEGA', 'SIRIUS', 'RIGEL', 'ANTARES', 'ARCTURUS'];
      const agent = validAgents.includes(activeAgent) ? activeAgent : 'POLARIS';
      
      // Create reflection for learning (Reflexion Loop)
      try {
        const reflectionId = await createReflectionFromAnalysis(analysis, {
          agent: agent as 'POLARIS' | 'VEGA' | 'SIRIUS' | 'RIGEL' | 'ANTARES' | 'ARCTURUS',
          taskType: 'orchestrator-error',
          taskDescription: message.substring(0, 200),
          sessionId: session?.id,
          conversationId,
        });
        console.log(`[NOVA:Reflexion] Created reflection: ${reflectionId}`);
      } catch (reflexionError) {
        console.error('[NOVA:Reflexion] Failed to create reflection:', reflexionError);
      }
      
      // Send detailed error analysis to user
      let errorMessage = '🛡️ **NOVA Error Debugger Activated**\n\n';
      errorMessage += `**Error**: ${err.message}\n`;
      errorMessage += `**Category**: ${analysis.category}\n`;
      errorMessage += `**Root Cause**: ${analysis.firstPrinciples.rootCause}\n\n`;
      
      if (analysis.suggestedFixes.length > 0) {
        errorMessage += '**Suggested Fixes**:\n';
        for (const fix of analysis.suggestedFixes.slice(0, 3)) {
          errorMessage += `• [${fix.confidence}%] ${fix.description}\n`;
        }
      }
      
      if (analysis.similarErrors.length > 0) {
        errorMessage += '\n💡 Similar errors found in debug memory. Previous fixes may apply.';
      }
      
      errorMessage += '\n\n🧠 Reflection saved for future learning.';
      errorMessage += '\nUse /reset to start fresh, or describe the issue for deeper analysis.';
      
      await platform.sendMessage(conversationId, errorMessage);
      
    } catch (analysisError) {
      // Fallback if error analysis itself fails
      console.error('[NOVA:Healing] Analysis failed:', analysisError);
      await platform.sendMessage(
        conversationId,
        '⚠️ An error occurred. Try /reset to start a fresh session.'
      );
    }
  }
}
