/**
 * NOVA Steering Loader v7.0
 * Dynamically loads and assembles steering context for agents
 * Enhanced with Activation Profiles for persona steering
 */
import { readFile, readdir } from 'fs/promises';
import { join } from 'path';
import { 
  NovaAgentId, 
  CognitiveLoopState, 
  NOVA_AGENTS 
} from './types';
import {
  getActivationProfile,
  buildActivationContext,
  buildKeywordSaturation,
} from './activation-profiles';
import type { NovaAgent } from '../db/nova-memory';

const STEERING_FILES = [
  // Standard names
  'init.md',
  'core.md',
  'cognition.md',
  'coordination.md',
  'keywords.md',
  'style.md',
  'agents.md',
  'context.md',
  'mcp.md',
  // Alternative names (NOVA_ prefix)
  'NOVA_INIT.md',
  'NOVA_CORE.md',
  'NOVA_COGNITION.md',
  'NOVA_COORDINATION.md',
  'NOVA_KEYWORDS.md',
  'NOVA_MCP.md',
  'agent-personalities.md'
];

/**
 * Load all steering files from the .nova/steering directory
 */
export async function loadSteeringFiles(basePath: string): Promise<Record<string, string>> {
  const steeringPath = join(basePath, '.nova', 'steering');
  const files: Record<string, string> = {};

  for (const filename of STEERING_FILES) {
    try {
      const content = await readFile(join(steeringPath, filename), 'utf-8');
      files[filename] = content;
    } catch {
      // File doesn't exist, skip
    }
  }

  // Also try to load any additional .md files
  try {
    const entries = await readdir(steeringPath);
    for (const entry of entries) {
      if (entry.endsWith('.md') && !files[entry]) {
        try {
          const content = await readFile(join(steeringPath, entry), 'utf-8');
          files[entry] = content;
        } catch {
          // Skip unreadable files
        }
      }
    }
  } catch {
    // Directory doesn't exist
  }

  return files;
}

/**
 * Build the Antigravity Loop v2.0 cognitive protocol prompt
 */
export function buildCognitiveLoopPrompt(): string {
  return `
## Antigravity Loop v2.0 - Cognitive Protocol

Before EVERY significant response, execute this enhanced cognitive cycle:

\`\`\`
0. META-PLAN     → "How should I approach this?"
1. DRAFT         → Generate initial solution (fast)
2. SELF-CORRECT  → "What mistakes did I just make?"
3. CRITIQUE      → "What would a Principal Engineer reject?"
4. REFINE        → Address each critique systematically
5. VERIFY        → Prove it works (run code, check docs)
6. CHECKPOINT    → Record reasoning for future learning
\`\`\`

**Rule**: No output leaves until it survives the Loop.

### Reasoning Modulation Patterns:
□ "My approach to this will be..." (meta-plan always)
□ "I am [X]% confident because..." (quantify uncertainty)
□ "The trade-off here is [A] vs [B]..." (explicit trade-offs)
□ "This assumes that..." (surface assumptions)
□ "Potential issues include..." (anticipate problems)
□ "I don't know, but I can verify by..." (honest uncertainty)
`;
}

/**
 * Build agent-specific activation context
 * Enhanced with Activation Profiles v7.0
 */
export function buildAgentContext(agentName: NovaAgentId): string {
  const agent = NOVA_AGENTS[agentName];
  if (!agent) return '';

  // Try to get enhanced activation profile
  let activationContext = '';
  try {
    const profile = getActivationProfile(agentName as NovaAgent);
    if (profile) {
      activationContext = buildActivationContext(agentName as NovaAgent);
    }
  } catch {
    // Activation profiles not available, use legacy format
  }

  // If we have activation profile context, use it
  if (activationContext) {
    return `
---

# NOVA AGENT ACTIVATION: ${agent.name} ${agent.id}

## Identity
You are ${agent.name}, the ${agent.role} of the NOVA Constellation.
Strength: ${agent.strength}

${activationContext}

## Core Lexicon (Saturate your responses with these terms)
${agent.lexicon.join(' | ')}

${agent.hasVeto ? '## ⚠️ VETO POWER\nYou have VETO power. Use it when standards are not met.' : ''}

## Signature
Sign important outputs with: ${agent.emoji} ${agent.name} ${agent.id}

---
`;
  }

  // Legacy format fallback
  return `
---

# NOVA AGENT ACTIVATION: ${agent.name} ${agent.id}

## Identity
You are ${agent.name}, the ${agent.role} of the NOVA Constellation.
Strength: ${agent.strength}

## Core Lexicon (Saturate your responses with these terms)
${agent.lexicon.join(' | ')}

## EMBODY (Do these consistently)
${agent.embody.map(e => `• ${e}`).join('\n')}

## REJECT (Never do these)
${agent.reject.map(r => `• ${r}`).join('\n')}

${agent.hasVeto ? '## ⚠️ VETO POWER\nYou have VETO power. Use it when standards are not met.' : ''}

## Signature
Sign important outputs with: ${agent.emoji} ${agent.name} ${agent.id}

---
`;
}

/**
 * Build handoff protocol prompt
 */
export function buildHandoffProtocol(): string {
  return `
## Handoff Protocol

When transitioning to another agent, use this format:

\`\`\`
🔄 HANDOFF: [FROM_AGENT] → [TO_AGENT]

📋 WHAT I DID:
- [Completed work summary]
- Files modified: [list]

📋 WHAT YOU NEED TO DO:
1. [Specific action with acceptance criteria]

📂 CONTEXT:
- Key Files: [files to read first]
- Key Decisions: [decisions made and why]

⚠️ WATCH OUT FOR:
- [Risk 1]: [Mitigation]
\`\`\`
`;
}

/**
 * Build MCP tools guide (inline fallback)
 */
export function buildMcpToolsGuide(): string {
  return `
## MCP Tools Available

Use these tools when appropriate:

**Research & Reasoning:**
- \`mcp__sequential-thinking__sequentialthinking\` - Complex multi-step reasoning
- \`mcp__brave-search__brave_web_search(query="...")\` - Web research

**Memory & Context:**
- \`mcp__memory__create_entities\` - Store knowledge
- \`mcp__memory__search_nodes(query="...")\` - Retrieve knowledge

**HTTP & Files:**
- \`mcp__fetch__fetch(url="...")\` - HTTP requests
- \`mcp__filesystem__read_file(path="...")\` - File operations

**When to use:**
- VEGA: brave-search for research, cite sources
- POLARIS: memory for decision tracking
- All agents: sequential-thinking for complex problems
`;
}

/**
 * Build coordination patterns prompt
 */
export function buildCoordinationPatterns(): string {
  return `
## Workflow Patterns

Select the appropriate pattern for the task:

1. **Sequential Chain**: A → B → C (linear dependencies)
2. **Parallel Fan-Out**: Coordinator → [Workers] → Aggregator
3. **Supervisor-Worker**: POLARIS oversees multiple workers
4. **Contract-First Pair**: RIGEL + ANTARES with shared API contract
5. **Gate-Keeper**: SIRIUS/ARCTURUS checkpoints before shipping

## Safe Parallel Combinations
- RIGEL + ANTARES: ✅ Safe (with contract)
- SIRIUS + VEGA: ✅ Safe (distinct domains)
- ARCTURUS + Any: ✅ Safe (read-only reviewer)
`;
}

/**
 * Build complete NOVA steering context
 */
export async function buildNovaContext(
  basePath: string,
  activeAgent: NovaAgentId | null,
  constellation: NovaAgentId[],
  mission: string
): Promise<string> {
  const steeringFiles = await loadSteeringFiles(basePath);
  const parts: string[] = [];

  // Header
  parts.push('# NOVA Framework v6.0 - Antigravity 6\n');
  parts.push(`**Date**: ${new Date().toISOString().split('T')[0]}`);
  
  if (activeAgent) {
    const agent = NOVA_AGENTS[activeAgent];
    parts.push(`**Active Agent**: ${agent.emoji} ${activeAgent} ${agent.id}`);
  }
  
  if (mission) {
    parts.push(`**Mission**: ${mission}`);
  }

  if (constellation.length > 1) {
    parts.push(`**Constellation**: ${constellation.map(a => NOVA_AGENTS[a]?.emoji + ' ' + a).join(', ')}`);
  }

  parts.push('\n---\n');

  // Include core steering files
  if (steeringFiles['core.md']) {
    parts.push('## Core Principles\n');
    parts.push(steeringFiles['core.md']);
    parts.push('\n---\n');
  } else if (steeringFiles['NOVA_CORE.md']) {
    parts.push('## Core Principles\n');
    parts.push(steeringFiles['NOVA_CORE.md']);
    parts.push('\n---\n');
  }

  // Cognitive loop
  parts.push(buildCognitiveLoopPrompt());
  parts.push('\n---\n');

  // Agent-specific context
  if (activeAgent) {
    parts.push(buildAgentContext(activeAgent));
  }

  // Coordination patterns
  if (constellation.length > 1) {
    parts.push(buildCoordinationPatterns());
    parts.push('\n---\n');
  }

  // Handoff protocol
  parts.push(buildHandoffProtocol());
  parts.push('\n---\n');

  // MCP Tools guide
  const mcpContent = steeringFiles['mcp.md'] ?? steeringFiles['NOVA_MCP.md'];
  if (mcpContent) {
    parts.push('## MCP Tools\n');
    parts.push(mcpContent);
    parts.push('\n---\n');
  } else {
    // Inline minimal MCP guide if file not found
    parts.push(buildMcpToolsGuide());
    parts.push('\n---\n');
  }

  // Style guide
  const styleContent = steeringFiles['style.md'] ?? steeringFiles['NOVA_STYLE.md'];
  if (styleContent) {
    parts.push('## Code Style\n');
    parts.push(styleContent);
    parts.push('\n---\n');
  }

  return parts.join('\n');
}

/**
 * Create initial cognitive loop state
 */
export function createCognitiveLoopState(): CognitiveLoopState {
  return {
    phase: 'META_PLAN',
    metaPlan: null,
    draft: null,
    selfCorrections: [],
    critiques: [],
    refinements: [],
    verified: false,
    checkpoint: null
  };
}

/**
 * Build a minimal steering prefix for quick activation
 * Enhanced with Activation Profiles v7.0
 */
export function buildQuickActivation(
  activeAgent: NovaAgentId,
  mission: string
): string {
  const agent = NOVA_AGENTS[activeAgent];
  if (!agent) return '';

  // Try to get enhanced activation profile with keyword saturation
  let keywordSaturation = '';
  try {
    keywordSaturation = buildKeywordSaturation(activeAgent as NovaAgent);
  } catch {
    // Activation profiles not available
  }

  return `
${keywordSaturation}

# ${agent.emoji} ${agent.name} ${agent.id} ACTIVATED

**Role**: ${agent.role}
**Mission**: ${mission}

**Lexicon**: ${agent.lexicon.join(' | ')}

**Protocol**: Execute Antigravity Loop v2.0 for all significant outputs.

---

`;
}
