/**
 * Sandboxed Command Execution Module
 * Safe shell command execution with allowlist/blocklist
 * 
 * NOVA Framework v6.0 - ARCTURUS Security Design
 */
import { exec } from 'child_process';
import { promisify } from 'util';
import { ExecConfig } from './config';

const execAsync = promisify(exec);

export interface ExecResult {
  success: boolean;
  message: string;
  stdout?: string;
  stderr?: string;
  exitCode?: number;
}

/**
 * Check if command matches any pattern in blocklist
 */
function isBlocked(command: string, blocklist: string[]): boolean {
  const normalized = command.toLowerCase().trim();
  
  for (const pattern of blocklist) {
    if (normalized.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Additional dangerous pattern checks
  const dangerousPatterns = [
    /rm\s+-rf\s+\/(?!\w)/,           // rm -rf / (but allow rm -rf /path)
    />\s*\/dev\/sd[a-z]/,             // Write to disk devices
    /mkfs\./,                          // Format filesystem
    /dd\s+if=/,                        // Direct disk access
    /:\(\)\{.*\}.*:/,                  // Fork bomb
    /chmod\s+777\s+\//,                // chmod 777 on root
    /sudo\s+rm/,                       // sudo rm
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Check if command starts with an allowed program
 */
function isAllowed(command: string, allowlist: string[]): boolean {
  const normalized = command.trim();
  const firstWord = normalized.split(/\s+/)[0];
  
  // Check direct match
  if (allowlist.includes(firstWord)) {
    return true;
  }
  
  // Check if it's a path to an allowed program
  const basename = firstWord.split('/').pop() || firstWord;
  if (allowlist.includes(basename)) {
    return true;
  }
  
  return false;
}

/**
 * Truncate output for Telegram (4096 char limit)
 */
function truncateOutput(text: string, maxLength = 3500): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + '\n\n... (truncated)';
}


/**
 * Execute a command in sandbox with safety checks
 */
export async function execSandbox(
  command: string,
  cwd: string,
  config: ExecConfig
): Promise<ExecResult> {
  // Check if exec is enabled
  if (!config.enabled) {
    return {
      success: false,
      message: '❌ Command execution disabled.\n\nEnable with: /autonomy exec on',
    };
  }
  
  // Check blocklist first (highest priority)
  if (isBlocked(command, config.blocklist)) {
    return {
      success: false,
      message: `🛡️ Command blocked for safety.\n\nThis command matches a dangerous pattern.`,
    };
  }
  
  // Check allowlist
  if (!isAllowed(command, config.allowlist)) {
    const firstWord = command.trim().split(/\s+/)[0];
    return {
      success: false,
      message: `❌ Command not in allowlist: ${firstWord}\n\nAllowed: ${config.allowlist.slice(0, 10).join(', ')}...\n\nAdd with: /autonomy exec-allow ${firstWord}`,
    };
  }
  
  try {
    const startTime = Date.now();
    
    const { stdout, stderr } = await execAsync(command, {
      cwd,
      timeout: config.timeout,
      maxBuffer: 1024 * 1024, // 1MB
      env: {
        ...process.env,
        // Prevent interactive prompts
        CI: 'true',
        FORCE_COLOR: '0',
      },
    });
    
    const duration = Date.now() - startTime;
    
    let msg = `✅ Command completed (${duration}ms)\n\n`;
    
    if (stdout.trim()) {
      msg += `📤 Output:\n${truncateOutput(stdout)}`;
    }
    
    if (stderr.trim() && !stdout.trim()) {
      msg += `⚠️ Stderr:\n${truncateOutput(stderr)}`;
    }
    
    if (!stdout.trim() && !stderr.trim()) {
      msg += '(no output)';
    }
    
    return {
      success: true,
      message: msg,
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    const err = error as Error & { code?: number; killed?: boolean; stdout?: string; stderr?: string };
    
    // Timeout
    if (err.killed) {
      return {
        success: false,
        message: `⏱️ Command timed out after ${config.timeout / 1000}s\n\nPartial output:\n${truncateOutput(err.stdout || '')}`,
        exitCode: -1,
      };
    }
    
    // Non-zero exit
    if (err.code !== undefined) {
      let msg = `❌ Command failed (exit ${err.code})\n\n`;
      
      if (err.stderr) {
        msg += `Error:\n${truncateOutput(err.stderr)}`;
      } else if (err.stdout) {
        msg += `Output:\n${truncateOutput(err.stdout)}`;
      } else {
        msg += err.message;
      }
      
      return {
        success: false,
        message: msg,
        stdout: err.stdout,
        stderr: err.stderr,
        exitCode: err.code,
      };
    }
    
    return {
      success: false,
      message: `❌ Execution error: ${err.message}`,
    };
  }
}

/**
 * Execute multiple commands in sequence
 */
export async function execSequence(
  commands: string[],
  cwd: string,
  config: ExecConfig,
  stopOnError = true
): Promise<ExecResult[]> {
  const results: ExecResult[] = [];
  
  for (const cmd of commands) {
    const result = await execSandbox(cmd, cwd, config);
    results.push(result);
    
    if (!result.success && stopOnError) {
      break;
    }
  }
  
  return results;
}

/**
 * Quick exec with default config (for internal use)
 */
export async function quickExec(
  command: string,
  cwd: string,
  timeout = 30000
): Promise<ExecResult> {
  try {
    const { stdout, stderr } = await execAsync(command, { cwd, timeout });
    return {
      success: true,
      message: stdout.trim() || stderr.trim() || '(no output)',
      stdout: stdout.trim(),
      stderr: stderr.trim(),
      exitCode: 0,
    };
  } catch (error) {
    const err = error as Error;
    return {
      success: false,
      message: err.message,
    };
  }
}
