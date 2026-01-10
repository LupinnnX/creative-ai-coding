/**
 * NOVA Steering LITE v7.1
 * Minimal context version to prevent 200K token burn
 * 
 * Problem: Full NOVA context = ~50K tokens, burns through GLM-4.7's 200K in 4 messages
 * Solution: Compressed context = ~2K tokens, allows 100+ message sessions
 * 
 * @author VEGA Ξ172167
 */
import { NovaAgentId, NOVA_AGENTS } from './types';

/**
 * LITE agent context - ~500 tokens per agent (vs ~3K full)
 */
export function buildAgentContextLite(agentName: NovaAgentId): string {
  const agent = NOVA_AGENTS[agentName];
  if (!agent) return '';

  return `# ${agent.emoji} ${agent.name} ${agent.id}
Role: ${agent.role} | Strength: ${agent.strength}
Lexicon: ${agent.lexicon.slice(0, 3).join(', ')}
${agent.hasVeto ? '⚠️ VETO POWER active' : ''}
Sign: ${agent.emoji} ${agent.name} ${agent.id}`;
}

/**
 * LITE cognitive loop - ~200 tokens (vs ~800 full)
 */
export function buildCognitiveLoopLite(): string {
  return `## Antigravity Loop (execute before output)
1. META-PLAN → 2. DRAFT → 3. CRITIQUE → 4. REFINE → 5. VERIFY`;
}

/**
 * LITE response format - ~300 tokens
 */
export function buildResponseFormatLite(): string {
  return `## Response Format
[PHASE_EMOJI] [PHASE_NAME]
📋 Summary (2-3 sentences)
📂 Files: 🔍read 📝modified ✨created
▶️ Next: 1. action 2. alternative

Phases: 🎯PLANNING 🔬RESEARCHING 🏗️BUILDING ✨REVIEWING ✅COMPLETE ❌ERROR`;
}

/**
 * Build COMPLETE LITE context - ~1.5K tokens total (vs ~50K full)
 */
export function buildNovaContextLite(
  activeAgent: NovaAgentId | null,
  mission: string
): string {
  const parts: string[] = [];

  // Minimal header
  parts.push(`# NOVA v7.1 LITE | ${new Date().toISOString().split('T')[0]}`);
  if (mission) parts.push(`Mission: ${mission}`);
  parts.push('');

  // Response format (critical for Telegram)
  parts.push(buildResponseFormatLite());
  parts.push('');

  // Cognitive loop (compressed)
  parts.push(buildCognitiveLoopLite());
  parts.push('');

  // Agent context (if active)
  if (activeAgent) {
    parts.push(buildAgentContextLite(activeAgent));
  }

  // Autonomy reminder (critical)
  parts.push(`
## Autonomy
You EXECUTE operations directly. Never say "run this command" - DO IT.
Report what you DID, not what user should do.`);

  return parts.join('\n');
}

/**
 * Build quick activation for /activate command - ~800 tokens
 */
export function buildQuickActivationLite(
  activeAgent: NovaAgentId,
  mission: string
): string {
  const agent = NOVA_AGENTS[activeAgent];
  if (!agent) return '';

  return `${agent.emoji} ${agent.name} ${agent.id} ACTIVATED
Mission: ${mission}
Lexicon: ${agent.lexicon.join(' | ')}
${agent.hasVeto ? '⚠️ VETO POWER' : ''}

Execute Antigravity Loop. Sign outputs with ${agent.emoji} ${agent.name} ${agent.id}`;
}

/**
 * Estimate token count (rough: 1 token ≈ 4 chars)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

/**
 * Context budget manager - ensures we stay under limit
 */
export interface ContextBudget {
  maxTokens: number;
  systemPromptTokens: number;
  novaContextTokens: number;
  historyTokens: number;
  userMessageTokens: number;
  remaining: number;
}

export function calculateContextBudget(
  systemPrompt: string,
  novaContext: string,
  historyLength: number,
  userMessage: string,
  maxTokens = 180000 // Leave 20K buffer from 200K
): ContextBudget {
  const systemPromptTokens = estimateTokens(systemPrompt);
  const novaContextTokens = estimateTokens(novaContext);
  const historyTokens = historyLength * 500; // Estimate 500 tokens per history message
  const userMessageTokens = estimateTokens(userMessage);
  
  const used = systemPromptTokens + novaContextTokens + historyTokens + userMessageTokens;
  
  return {
    maxTokens,
    systemPromptTokens,
    novaContextTokens,
    historyTokens,
    userMessageTokens,
    remaining: maxTokens - used,
  };
}
