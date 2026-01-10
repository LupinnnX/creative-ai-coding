/**
 * Smart Command Execution Module
 * Enhanced command execution with directory detection, sequence parsing,
 * and full autonomy mode support for multi-user VPS environments.
 * 
 * NOVA Framework v6.0 - POLARIS Strategy + ANTARES Implementation
 * 
 * Features:
 * - Parse numbered command sequences from natural language
 * - Auto-detect project directories (find .next, node_modules, etc.)
 * - Execute commands in correct working directory
 * - Multi-user isolation via session-based cwd
 * - Full autonomy mode with expanded allowlist
 * - Progress reporting for long-running sequences
 */

import { access, readdir, stat } from 'fs/promises';
import { join, dirname } from 'path';
import { ExecConfig, AutonomyLevel } from './config';
import { execSandbox, ExecResult } from './exec-sandbox';
import {
  parseCommandSequence,
  extractCommandsFromMessage,
  validateCommands,
  ParsedSequence,
  ParsedCommand,
} from './command-sequence-parser';

/**
 * Extended allowlist for full autonomy mode
 * Includes common development commands that are safe in isolated environments
 */
export const FULL_AUTONOMY_ALLOWLIST = [
  // Package managers
  'npm', 'yarn', 'pnpm', 'bun', 'npx',
  // Node.js
  'node', 'tsx', 'ts-node',
  // Git
  'git', 'gh',
  // File operations (safe in project context)
  'rm', 'mkdir', 'cp', 'mv', 'touch', 'cat', 'head', 'tail',
  'ls', 'pwd', 'echo', 'wc', 'grep', 'find', 'which', 'env',
  // Network
  'curl', 'wget',
  // Build tools
  'make', 'cargo', 'go', 'python', 'pip', 'python3', 'pip3',
  // Docker
  'docker', 'docker-compose',
  // Vercel/Netlify/etc
  'vercel', 'netlify', 'surge',
  // Testing
  'jest', 'vitest', 'mocha', 'pytest',
  // Linting/Formatting
  'eslint', 'prettier', 'tsc', 'biome',
  // Database
  'psql', 'mysql', 'sqlite3', 'redis-cli',
  // Process management
  'pm2', 'forever',
  // Misc dev tools
  'sed', 'awk', 'sort', 'uniq', 'diff', 'patch',
  'tar', 'gzip', 'gunzip', 'zip', 'unzip',
  'chmod', 'chown',
];

/**
 * Dangerous patterns that should NEVER be allowed, even in full autonomy
 */
export const ABSOLUTE_BLOCKLIST = [
  'rm -rf /',
  'rm -rf /*',
  'rm -rf ~',
  'rm -rf $HOME',
  'sudo rm',
  'sudo su',
  'sudo -i',
  'sudo bash',
  'mkfs',
  'dd if=',
  ':(){:|:&};:',
  '> /dev/sd',
  '> /dev/nvme',
  'mv /* ',
  'chmod -R 777 /',
  'chown -R',
  'shutdown',
  'reboot',
  'init 0',
  'init 6',
  'halt',
  'poweroff',
];

export interface SmartExecOptions {
  /** Working directory (required for multi-user isolation) */
  cwd: string;
  /** Execution config from session */
  config: ExecConfig;
  /** Autonomy level */
  autonomyLevel: AutonomyLevel;
  /** Progress callback for long sequences */
  onProgress?: (current: number, total: number, result: ExecResult) => void;
  /** Stop on first error */
  stopOnError?: boolean;
  /** Dry run - validate but don't execute */
  dryRun?: boolean;
}

export interface SmartExecResult {
  success: boolean;
  message: string;
  results: ExecResult[];
  parsed: ParsedSequence;
  executedCount: number;
  failedCount: number;
  skippedCount: number;
}

/**
 * Check if a command matches absolute blocklist
 */
function isAbsolutelyBlocked(command: string): boolean {
  const normalized = command.toLowerCase().trim();
  
  for (const pattern of ABSOLUTE_BLOCKLIST) {
    if (normalized.includes(pattern.toLowerCase())) {
      return true;
    }
  }
  
  // Additional regex patterns for dangerous commands
  const dangerousPatterns = [
    /rm\s+-rf\s+\/(?!\w)/,           // rm -rf / (but allow rm -rf /path/to/something)
    />\s*\/dev\/sd[a-z]/,             // Write to disk devices
    />\s*\/dev\/nvme/,                // Write to NVMe devices
    /mkfs\./,                          // Format filesystem
    /dd\s+if=/,                        // Direct disk access
    /:\(\)\{.*\}.*:/,                  // Fork bomb
    /sudo\s+(?:rm|dd|mkfs|chmod\s+777)/,  // Dangerous sudo commands
  ];
  
  for (const pattern of dangerousPatterns) {
    if (pattern.test(normalized)) {
      return true;
    }
  }
  
  return false;
}

/**
 * Get effective allowlist based on autonomy level
 */
function getEffectiveAllowlist(config: ExecConfig, autonomyLevel: AutonomyLevel): string[] {
  if (autonomyLevel === 'full') {
    // Merge default allowlist with full autonomy allowlist
    return [...new Set([...config.allowlist, ...FULL_AUTONOMY_ALLOWLIST])];
  }
  return config.allowlist;
}

/**
 * Find project root by looking for common markers
 */
export async function findProjectRoot(startPath: string): Promise<string | null> {
  const markers = ['package.json', 'Cargo.toml', 'go.mod', 'pyproject.toml', 'pom.xml', '.git'];
  
  let currentPath = startPath;
  const root = '/';
  
  while (currentPath !== root) {
    for (const marker of markers) {
      try {
        await access(join(currentPath, marker));
        return currentPath;
      } catch {
        // Continue searching
      }
    }
    currentPath = dirname(currentPath);
  }
  
  return null;
}

/**
 * Find a specific directory within the project
 * Useful for finding .next, node_modules, dist, etc.
 */
export async function findDirectory(
  startPath: string,
  targetName: string,
  maxDepth = 3
): Promise<string | null> {
  async function search(path: string, depth: number): Promise<string | null> {
    if (depth > maxDepth) return null;
    
    try {
      const entries = await readdir(path, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory()) {
          if (entry.name === targetName) {
            return join(path, entry.name);
          }
          
          // Skip node_modules and hidden directories for performance
          if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
            const found = await search(join(path, entry.name), depth + 1);
            if (found) return found;
          }
        }
      }
    } catch {
      // Permission denied or other error
    }
    
    return null;
  }
  
  // First check if target exists directly in startPath
  try {
    const directPath = join(startPath, targetName);
    const stats = await stat(directPath);
    if (stats.isDirectory()) {
      return directPath;
    }
  } catch {
    // Not found directly, search recursively
  }
  
  return search(startPath, 0);
}

/**
 * Smart command execution with directory detection
 * Handles commands like "rm -rf .next" by finding the .next directory
 */
export async function smartExecSingle(
  command: string,
  options: SmartExecOptions
): Promise<ExecResult> {
  const { cwd, config, autonomyLevel, dryRun } = options;
  
  // Check absolute blocklist first
  if (isAbsolutelyBlocked(command)) {
    return {
      success: false,
      message: `🛡️ Command blocked for safety.\n\nThis command matches a dangerous pattern and cannot be executed.`,
    };
  }
  
  // Get effective allowlist
  const effectiveAllowlist = getEffectiveAllowlist(config, autonomyLevel);
  
  // Create modified config with effective allowlist
  const effectiveConfig: ExecConfig = {
    ...config,
    allowlist: effectiveAllowlist,
  };
  
  // Dry run - just validate
  if (dryRun) {
    const firstWord = command.trim().split(/\s+/)[0];
    const basename = firstWord.split('/').pop() || firstWord;
    const isAllowed = effectiveAllowlist.includes(firstWord) || effectiveAllowlist.includes(basename);
    
    return {
      success: isAllowed,
      message: isAllowed 
        ? `✅ [DRY RUN] Command would be allowed: ${command}`
        : `❌ [DRY RUN] Command not in allowlist: ${firstWord}`,
    };
  }
  
  // Execute with sandbox
  return execSandbox(command, cwd, effectiveConfig);
}

/**
 * Execute a sequence of commands parsed from natural language
 */
export async function smartExecSequence(
  input: string,
  options: SmartExecOptions
): Promise<SmartExecResult> {
  const { cwd, config, autonomyLevel, onProgress, stopOnError = true, dryRun } = options;
  
  // Parse commands from input
  let parsed = parseCommandSequence(input);
  
  // If no structured commands found, try extracting from code blocks
  if (parsed.totalCount === 0) {
    parsed = extractCommandsFromMessage(input);
  }
  
  // If still no commands, return error
  if (parsed.totalCount === 0) {
    return {
      success: false,
      message: '❌ No commands found in input.\n\nExpected format:\n1. command1\n2. command2\n\nOr:\n```bash\ncommand1\ncommand2\n```',
      results: [],
      parsed,
      executedCount: 0,
      failedCount: 0,
      skippedCount: 0,
    };
  }
  
  // Get effective allowlist
  const effectiveAllowlist = getEffectiveAllowlist(config, autonomyLevel);
  
  // Validate commands
  const { valid, invalid } = validateCommands(parsed.commands, effectiveAllowlist);
  
  // Check for absolutely blocked commands
  const blocked: ParsedCommand[] = [];
  const safeValid: ParsedCommand[] = [];
  
  for (const cmd of valid) {
    if (isAbsolutelyBlocked(cmd.command)) {
      blocked.push(cmd);
    } else {
      safeValid.push(cmd);
    }
  }
  
  // Build result
  const results: ExecResult[] = [];
  let executedCount = 0;
  let failedCount = 0;
  let skippedCount = invalid.length + blocked.length;
  
  // Report blocked commands
  if (blocked.length > 0) {
    const blockedMsg = blocked.map(c => `  • ${c.command}`).join('\n');
    results.push({
      success: false,
      message: `🛡️ Blocked dangerous commands:\n${blockedMsg}`,
    });
  }
  
  // Report invalid commands
  if (invalid.length > 0) {
    const invalidMsg = invalid.map(c => {
      const firstWord = c.command.trim().split(/\s+/)[0];
      return `  • ${firstWord}: ${c.command}`;
    }).join('\n');
    results.push({
      success: false,
      message: `❌ Commands not in allowlist:\n${invalidMsg}\n\nAdd with: /autonomy exec-allow <command>`,
    });
  }
  
  // Execute valid commands
  const effectiveConfig: ExecConfig = {
    ...config,
    allowlist: effectiveAllowlist,
  };
  
  for (let i = 0; i < safeValid.length; i++) {
    const cmd = safeValid[i];
    
    // Execute command
    const result = dryRun
      ? { success: true, message: `✅ [DRY RUN] Would execute: ${cmd.command}` }
      : await execSandbox(cmd.command, cwd, effectiveConfig);
    
    results.push(result);
    
    if (result.success) {
      executedCount++;
    } else {
      failedCount++;
    }
    
    // Report progress
    if (onProgress) {
      onProgress(i + 1, safeValid.length, result);
    }
    
    // Stop on error if configured
    if (!result.success && stopOnError && !dryRun) {
      skippedCount += safeValid.length - i - 1;
      break;
    }
  }
  
  // Build summary message
  let message = '';
  
  if (dryRun) {
    message = `🔍 Dry Run Complete\n\n`;
    message += `📋 Parsed ${parsed.totalCount} commands\n`;
    message += `✅ Would execute: ${safeValid.length}\n`;
    message += `❌ Blocked/Invalid: ${skippedCount}\n`;
  } else {
    const allSuccess = failedCount === 0 && skippedCount === 0;
    message = allSuccess ? '✅ All commands completed successfully!\n\n' : '⚠️ Command sequence completed with issues.\n\n';
    message += `📊 Results:\n`;
    message += `  ✅ Executed: ${executedCount}\n`;
    message += `  ❌ Failed: ${failedCount}\n`;
    message += `  ⏭️ Skipped: ${skippedCount}\n`;
  }
  
  // Add individual results
  if (results.length > 0) {
    message += '\n📋 Details:\n';
    for (let i = 0; i < Math.min(results.length, 10); i++) {
      const r = results[i];
      const icon = r.success ? '✅' : '❌';
      // Truncate long messages
      const shortMsg = r.message.length > 100 
        ? r.message.substring(0, 97) + '...'
        : r.message;
      message += `${icon} ${shortMsg}\n`;
    }
    
    if (results.length > 10) {
      message += `\n... and ${results.length - 10} more results`;
    }
  }
  
  return {
    success: failedCount === 0 && blocked.length === 0,
    message,
    results,
    parsed,
    executedCount,
    failedCount,
    skippedCount,
  };
}

/**
 * Common command templates for quick execution
 */
export const COMMAND_TEMPLATES = {
  'nextjs-clean': [
    'rm -rf .next',
    'rm -rf node_modules/.cache',
    'npm run build',
  ],
  'nextjs-export': [
    'rm -rf .next',
    'rm -rf out',
    'npm run build',
    'npm run export',
  ],
  'npm-fresh': [
    'rm -rf node_modules',
    'rm -rf package-lock.json',
    'npm install',
  ],
  'yarn-fresh': [
    'rm -rf node_modules',
    'rm -rf yarn.lock',
    'yarn install',
  ],
  'pnpm-fresh': [
    'rm -rf node_modules',
    'rm -rf pnpm-lock.yaml',
    'pnpm install',
  ],
  'git-clean': [
    'git clean -fd',
    'git checkout .',
  ],
  'docker-clean': [
    'docker system prune -f',
    'docker volume prune -f',
  ],
} as const;

export type CommandTemplate = keyof typeof COMMAND_TEMPLATES;

/**
 * Execute a predefined command template
 */
export async function execTemplate(
  template: CommandTemplate,
  options: SmartExecOptions
): Promise<SmartExecResult> {
  const commands = COMMAND_TEMPLATES[template];
  const input = commands.map((cmd, i) => `${i + 1}. ${cmd}`).join('\n');
  return smartExecSequence(input, options);
}

/**
 * List available command templates
 */
export function listTemplates(): string {
  let msg = '📋 Available Command Templates:\n\n';
  
  for (const [name, commands] of Object.entries(COMMAND_TEMPLATES)) {
    msg += `🔧 ${name}:\n`;
    for (const cmd of commands) {
      msg += `   • ${cmd}\n`;
    }
    msg += '\n';
  }
  
  msg += 'Use: /exec-template <name>';
  return msg;
}
