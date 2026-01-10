/**
 * NOVA Context Budget Manager v1.0
 * Tracks and limits token usage to prevent context burn
 * 
 * Problem: Uncontrolled file reads burn through 200K context in 6-7 files
 * Solution: Hard budget limits with visibility
 * 
 * Based on: Factory AI research (December 2025), Cursor blog (January 2026)
 * 
 * @author ANTARES Ξ148478
 */

export interface ContextBudget {
  maxTokens: number;
  systemPromptTokens: number;
  novaContextTokens: number;
  filesReadTokens: number;
  historyTokens: number;
  userMessageTokens: number;
  remaining: number;
  filesRead: Map<string, number>; // path → tokens
  warningThreshold: number; // Warn when remaining < this
}

export interface BudgetConfig {
  maxTokens?: number;
  maxFileTokens?: number;
  warningThreshold?: number;
  historyTokensPerMessage?: number;
}

const DEFAULT_CONFIG: Required<BudgetConfig> = {
  maxTokens: 180000, // Leave 20K buffer from 200K
  maxFileTokens: 50000, // Max tokens for file reads
  warningThreshold: 30000, // Warn when < 30K remaining
  historyTokensPerMessage: 500, // Estimate per history message
};

/**
 * Estimate tokens for a string (rough: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Create a new context budget tracker
 */
export function createContextBudget(
  systemPrompt: string,
  novaContext: string,
  historyLength: number,
  config?: BudgetConfig
): ContextBudget {
  const cfg = { ...DEFAULT_CONFIG, ...config };

  const systemPromptTokens = estimateTokens(systemPrompt);
  const novaContextTokens = estimateTokens(novaContext);
  const historyTokens = historyLength * cfg.historyTokensPerMessage;

  const used = systemPromptTokens + novaContextTokens + historyTokens;

  return {
    maxTokens: cfg.maxTokens,
    systemPromptTokens,
    novaContextTokens,
    filesReadTokens: 0,
    historyTokens,
    userMessageTokens: 0,
    remaining: cfg.maxTokens - used,
    filesRead: new Map(),
    warningThreshold: cfg.warningThreshold,
  };
}

/**
 * Check if we can read a file within budget
 */
export function canReadFile(
  budget: ContextBudget,
  estimatedTokens: number,
  maxFileTokens = DEFAULT_CONFIG.maxFileTokens
): { allowed: boolean; reason?: string } {
  // Check total file budget
  if (budget.filesReadTokens + estimatedTokens > maxFileTokens) {
    return {
      allowed: false,
      reason: `File reading budget exceeded (${budget.filesReadTokens}/${maxFileTokens} tokens used)`,
    };
  }

  // Check overall context budget
  if (budget.remaining - estimatedTokens < 0) {
    return {
      allowed: false,
      reason: `Context budget exceeded (${budget.remaining} tokens remaining)`,
    };
  }

  return { allowed: true };
}

/**
 * Record a file read in the budget
 */
export function recordFileRead(
  budget: ContextBudget,
  path: string,
  tokens: number
): ContextBudget {
  const newFilesRead = new Map(budget.filesRead);
  newFilesRead.set(path, tokens);

  return {
    ...budget,
    filesReadTokens: budget.filesReadTokens + tokens,
    remaining: budget.remaining - tokens,
    filesRead: newFilesRead,
  };
}

/**
 * Record user message tokens
 */
export function recordUserMessage(
  budget: ContextBudget,
  message: string
): ContextBudget {
  const tokens = estimateTokens(message);
  return {
    ...budget,
    userMessageTokens: tokens,
    remaining: budget.remaining - tokens,
  };
}

/**
 * Check if budget is in warning zone
 */
export function isInWarningZone(budget: ContextBudget): boolean {
  return budget.remaining < budget.warningThreshold;
}

/**
 * Check if budget is critical (< 10K remaining)
 */
export function isCritical(budget: ContextBudget): boolean {
  return budget.remaining < 10000;
}

/**
 * Format budget for display
 */
export function formatBudget(budget: ContextBudget): string {
  const usedPercent = Math.round(
    ((budget.maxTokens - budget.remaining) / budget.maxTokens) * 100
  );

  let status = '🟢';
  if (isCritical(budget)) {
    status = '🔴';
  } else if (isInWarningZone(budget)) {
    status = '🟡';
  }

  let msg = `${status} Context Budget: ${usedPercent}% used\n\n`;
  msg += `📊 Token Breakdown:\n`;
  msg += `  System Prompt: ~${budget.systemPromptTokens.toLocaleString()}\n`;
  msg += `  NOVA Context: ~${budget.novaContextTokens.toLocaleString()}\n`;
  msg += `  Files Read: ~${budget.filesReadTokens.toLocaleString()}\n`;
  msg += `  History: ~${budget.historyTokens.toLocaleString()}\n`;
  msg += `  User Message: ~${budget.userMessageTokens.toLocaleString()}\n`;
  msg += `\n`;
  msg += `📈 Remaining: ~${budget.remaining.toLocaleString()} / ${budget.maxTokens.toLocaleString()} tokens\n`;

  if (budget.filesRead.size > 0) {
    msg += `\n📂 Files Read (${budget.filesRead.size}):\n`;
    const files = Array.from(budget.filesRead.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
    for (const [path, tokens] of files) {
      const shortPath = path.length > 40 ? '...' + path.slice(-37) : path;
      msg += `  • ${shortPath}: ~${tokens.toLocaleString()} tokens\n`;
    }
    if (budget.filesRead.size > 5) {
      msg += `  ... and ${budget.filesRead.size - 5} more\n`;
    }
  }

  if (isCritical(budget)) {
    msg += `\n⚠️ CRITICAL: Context nearly exhausted!\n`;
    msg += `💡 Use /reset to start fresh.`;
  } else if (isInWarningZone(budget)) {
    msg += `\n⚠️ Warning: Running low on context.\n`;
    msg += `💡 Consider /reset if responses degrade.`;
  }

  return msg;
}

/**
 * Format budget as compact status line
 */
export function formatBudgetCompact(budget: ContextBudget): string {
  const usedPercent = Math.round(
    ((budget.maxTokens - budget.remaining) / budget.maxTokens) * 100
  );

  let status = '🟢';
  if (isCritical(budget)) {
    status = '🔴';
  } else if (isInWarningZone(budget)) {
    status = '🟡';
  }

  return `${status} Context: ${usedPercent}% (${Math.round(budget.remaining / 1000)}K remaining)`;
}

/**
 * Patterns that indicate "audit" or "scan all" requests
 * These should be intercepted to prevent context burn
 */
export const AUDIT_PATTERNS = [
  /\b(audit|scan|analyze)\s+(the\s+)?(entire\s+)?(codebase|project|repo)/i,
  /\b(view|see|show|read)\s+(all|every)\s+(the\s+)?files?/i,
  /\b(review|check)\s+(the\s+)?(entire|whole|full)\s+(codebase|project)/i,
  /\blist\s+(all|every)\s+(the\s+)?files?\s+in/i,
  /\b(what|which)\s+files?\s+(are|do)\s+(there|we\s+have)/i,
  /\bshow\s+me\s+(the\s+)?(project|codebase)\s+structure/i,
];

/**
 * Check if a prompt looks like an audit request
 */
export function isAuditRequest(prompt: string): boolean {
  return AUDIT_PATTERNS.some(pattern => pattern.test(prompt));
}

/**
 * Generate a safe response for audit requests
 */
export function getAuditInterceptionMessage(_cwd: string): string {
  return `📂 **Codebase Overview Request Detected**

⚠️ Reading all files would exceed context limits and cause timeouts.

**Instead, I can help you with:**
1. 📁 Show directory structure (lightweight)
2. 🔍 Search for specific files or patterns
3. 📄 Read specific files you're interested in
4. 🏗️ Explain the architecture based on key files

**Try asking:**
• "What's in the src/ directory?"
• "Show me the main entry point"
• "Find files related to authentication"
• "Read the package.json"

💡 Focused questions = faster, better responses!`;
}
