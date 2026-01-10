/**
 * Message Formatter - Enhanced Telegram UX
 * 
 * Transforms raw AI output into beautiful, scannable, actionable messages
 * Following the "Glanceable Agent" pattern
 */

// Status phases with emojis
export type MessagePhase = 
  | 'planning'
  | 'researching' 
  | 'building'
  | 'reviewing'
  | 'complete'
  | 'error'
  | 'waiting';

const PHASE_ICONS: Record<MessagePhase, string> = {
  planning: '🎯',
  researching: '🔬',
  building: '🏗️',
  reviewing: '✨',
  complete: '✅',
  error: '❌',
  waiting: '⏳',
};

const PHASE_LABELS: Record<MessagePhase, string> = {
  planning: 'PLANNING',
  researching: 'RESEARCHING',
  building: 'BUILDING',
  reviewing: 'REVIEWING',
  complete: 'COMPLETE',
  error: 'ERROR',
  waiting: 'PROCESSING',
};

// NOVA agent icons
const NOVA_ICONS: Record<string, string> = {
  POLARIS: '⭐',
  VEGA: '🔭',
  SIRIUS: '✨',
  RIGEL: '🔷',
  ANTARES: '❤️',
  ARCTURUS: '🛡️',
};

export interface FormattedMessage {
  phase: MessagePhase;
  summary: string;
  details?: string[];
  filesModified?: string[];
  toolsUsed?: string[];
  nextSteps?: string[];
  tip?: string;
  novaAgent?: string;
  progress?: { current: number; total: number };
}

/**
 * Format a structured message for Telegram
 */
export function formatMessage(msg: FormattedMessage): string {
  const lines: string[] = [];

  // Header with phase and optional NOVA agent
  const phaseIcon = PHASE_ICONS[msg.phase];
  const phaseLabel = PHASE_LABELS[msg.phase];
  
  if (msg.novaAgent && NOVA_ICONS[msg.novaAgent]) {
    lines.push(`${NOVA_ICONS[msg.novaAgent]} ${msg.novaAgent} | ${phaseIcon} ${phaseLabel}`);
  } else {
    lines.push(`${phaseIcon} ${phaseLabel}`);
  }

  // Progress bar if provided
  if (msg.progress) {
    lines.push('');
    lines.push(formatProgressBar(msg.progress.current, msg.progress.total));
  }

  // Summary (always present)
  lines.push('');
  lines.push(`📋 ${msg.summary}`);

  // Details (bullet points)
  if (msg.details && msg.details.length > 0) {
    lines.push('');
    msg.details.forEach(detail => {
      lines.push(`• ${detail}`);
    });
  }

  // Files modified (tree format)
  if (msg.filesModified && msg.filesModified.length > 0) {
    lines.push('');
    lines.push('📝 Modified:');
    msg.filesModified.forEach((file, i) => {
      const prefix = i === msg.filesModified!.length - 1 ? '└──' : '├──';
      lines.push(`${prefix} ${file}`);
    });
  }

  // Tools used (compact)
  if (msg.toolsUsed && msg.toolsUsed.length > 0) {
    lines.push('');
    lines.push(`🔧 Tools: ${msg.toolsUsed.join(', ')}`);
  }

  // Next steps (always encouraged)
  if (msg.nextSteps && msg.nextSteps.length > 0) {
    lines.push('');
    lines.push('▶️ Next steps:');
    msg.nextSteps.forEach((step, i) => {
      lines.push(`${i + 1}. ${step}`);
    });
  }

  // Tip (optional)
  if (msg.tip) {
    lines.push('');
    lines.push(`💡 ${msg.tip}`);
  }

  return lines.join('\n');
}

/**
 * Format a progress bar
 */
function formatProgressBar(current: number, total: number): string {
  const percentage = Math.round((current / total) * 100);
  const filled = Math.round(percentage / 5);
  const empty = 20 - filled;
  const bar = '━'.repeat(filled) + '░'.repeat(empty);
  return `⏳ ${bar} ${percentage}%`;
}

/**
 * Format a compact tool notification
 */
export function formatToolCompact(toolName: string, result?: 'success' | 'error' | 'running'): string {
  const resultIcon = result === 'success' ? '✅' : result === 'error' ? '❌' : '⏳';
  return `🔧 ${toolName} ${resultIcon}`;
}

/**
 * Format an error message with recovery suggestions
 */
export function formatError(error: string, suggestions: string[]): string {
  const lines: string[] = [
    '❌ ERROR',
    '',
    `📋 ${error}`,
  ];

  if (suggestions.length > 0) {
    lines.push('');
    lines.push('▶️ To fix this:');
    suggestions.forEach((suggestion, i) => {
      lines.push(`${i + 1}. ${suggestion}`);
    });
  }

  lines.push('');
  lines.push('💡 Or try: /reset to start fresh');

  return lines.join('\n');
}

/**
 * Format a success message with next steps
 */
export function formatSuccess(summary: string, nextSteps: string[], tip?: string): string {
  return formatMessage({
    phase: 'complete',
    summary,
    nextSteps,
    tip,
  });
}

/**
 * Format NOVA agent activation
 */
export function formatNovaActivation(agent: string, mission: string, phases: string[]): string {
  const icon = NOVA_ICONS[agent] || '⭐';
  const lines: string[] = [
    `${icon} ${agent} Activated`,
    '',
    `📋 Mission: ${mission}`,
  ];

  if (phases.length > 0) {
    lines.push('');
    lines.push('🎯 Strategy:');
    phases.forEach((phase, i) => {
      lines.push(`${i + 1}. ${phase}`);
    });
  }

  lines.push('');
  lines.push('▶️ Beginning Phase 1...');
  lines.push('');
  lines.push('💡 Use /deactivate to switch agents');

  return lines.join('\n');
}

/**
 * Generate context-aware next steps
 */
export function generateNextSteps(context: {
  lastCommand?: string;
  hasCodebase: boolean;
  hasSession: boolean;
  phase?: MessagePhase;
}): string[] {
  const steps: string[] = [];

  if (!context.hasCodebase) {
    steps.push('Clone a repo: /clone <url>');
    steps.push('Or set working directory: /setcwd <path>');
    return steps;
  }

  if (!context.hasSession) {
    steps.push('Send a message to start working');
    steps.push('Or check status: /status');
    return steps;
  }

  // Context-aware suggestions based on last command
  switch (context.lastCommand) {
    case 'clone':
      steps.push('Load commands: /load-commands .agents/commands');
      steps.push('Check status: /status');
      steps.push('Start coding: just send a message!');
      break;
    case 'plan':
    case 'plan-feature':
      steps.push('Execute the plan: /command-invoke execute');
      steps.push('Refine the plan: ask for changes');
      steps.push('Start over: /reset');
      break;
    case 'execute':
      steps.push('Validate changes: /command-invoke validate');
      steps.push('Review status: /status');
      steps.push('Commit: /command-invoke commit "message"');
      break;
    case 'validate':
      steps.push('Fix issues: describe what to fix');
      steps.push('Commit if passing: /command-invoke commit');
      steps.push('Run again: /command-invoke validate');
      break;
    default:
      steps.push('Continue working: send your next request');
      steps.push('Check progress: /status');
      steps.push('Start fresh: /reset');
  }

  return steps.slice(0, 3); // Max 3 suggestions
}

/**
 * Parse raw AI response and extract structure
 */
export function parseAIResponse(raw: string): {
  summary: string;
  details: string[];
  filesModified: string[];
  phase: MessagePhase;
} {
  const lines = raw.split('\n').filter(l => l.trim());
  
  // Detect phase from content
  let phase: MessagePhase = 'complete';
  const lowerRaw = raw.toLowerCase();
  
  if (lowerRaw.includes('error') || lowerRaw.includes('failed') || lowerRaw.includes('cannot')) {
    phase = 'error';
  } else if (lowerRaw.includes('analyzing') || lowerRaw.includes('reading') || lowerRaw.includes('searching')) {
    phase = 'researching';
  } else if (lowerRaw.includes('planning') || lowerRaw.includes('will ') || lowerRaw.includes("i'll")) {
    phase = 'planning';
  } else if (lowerRaw.includes('creating') || lowerRaw.includes('writing') || lowerRaw.includes('implementing')) {
    phase = 'building';
  } else if (lowerRaw.includes('reviewing') || lowerRaw.includes('checking') || lowerRaw.includes('testing')) {
    phase = 'reviewing';
  }

  // Extract summary (first meaningful sentence)
  let summary = lines[0] || 'Task processed';
  if (summary.length > 150) {
    summary = summary.substring(0, 147) + '...';
  }

  // Extract bullet points as details
  const details = lines
    .filter(l => l.trim().startsWith('-') || l.trim().startsWith('•') || l.trim().startsWith('*'))
    .map(l => l.replace(/^[\s\-•*]+/, '').trim())
    .slice(0, 5);

  // Extract file paths
  const filePattern = /(?:^|\s)([\w./\\-]+\.[a-z]{1,4})(?:\s|$|:|\))/gi;
  const filesModified: string[] = [];
  let match;
  while ((match = filePattern.exec(raw)) !== null) {
    const file = match[1];
    if (!filesModified.includes(file) && !file.includes('http')) {
      filesModified.push(file);
    }
  }

  return {
    summary,
    details,
    filesModified: filesModified.slice(0, 5),
    phase,
  };
}

/**
 * Format a complete AI response with all enhancements
 */
export function formatAIResponse(
  raw: string,
  context: {
    novaAgent?: string;
    lastCommand?: string;
    hasCodebase: boolean;
  }
): string {
  const parsed = parseAIResponse(raw);
  
  // If the response is short and clean, return as-is with minimal formatting
  if (raw.length < 200 && !raw.includes('\n\n')) {
    const nextSteps = generateNextSteps({
      lastCommand: context.lastCommand,
      hasCodebase: context.hasCodebase,
      hasSession: true,
      phase: parsed.phase,
    });

    return formatMessage({
      phase: parsed.phase,
      summary: raw.trim(),
      nextSteps,
      novaAgent: context.novaAgent,
    });
  }

  // For longer responses, create structured format
  const nextSteps = generateNextSteps({
    lastCommand: context.lastCommand,
    hasCodebase: context.hasCodebase,
    hasSession: true,
    phase: parsed.phase,
  });

  return formatMessage({
    phase: parsed.phase,
    summary: parsed.summary,
    details: parsed.details.length > 0 ? parsed.details : undefined,
    filesModified: parsed.filesModified.length > 0 ? parsed.filesModified : undefined,
    nextSteps,
    novaAgent: context.novaAgent,
  });
}
