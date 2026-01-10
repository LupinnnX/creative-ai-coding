/**
 * NOVA Reflexion Loop v7.0
 * 
 * Implements the Reflexion pattern for self-improvement through verbal reinforcement learning.
 * Auto-creates reflections when tasks fail, enabling learning from mistakes.
 * 
 * Based on: Reflexion paper (2023), ReflexGrad architecture
 * 
 * @author RIGEL Ξ34085
 * @date January 5, 2026
 */

import { 
  createReflection, 
  createEpisodicMemory,
  findRelevantReflections,
  updateReflectionEffectiveness,
  type NovaAgent,
  type EventType,
  type Outcome,
} from '../db/nova-memory';
import { classifyError, type ErrorCategory, type ErrorAnalysis } from './error-debugger';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskContext {
  agent: NovaAgent;
  taskType: string;
  taskDescription: string;
  sessionId?: string;
  conversationId?: string;
  attemptNumber?: number;
}

export interface TaskOutcome {
  success: boolean;
  partial?: boolean;
  error?: {
    code?: string;
    message: string;
    stack?: string;
  };
  duration?: number;
  output?: string;
}

export interface ReflexionResult {
  reflectionId?: string;
  episodicId?: string;
  priorReflections: Array<{
    id: string;
    correctionAction: string;
    effectiveness: number;
  }>;
  shouldRetry: boolean;
  injectedContext?: string;
}

// ============================================================================
// REFLEXION LOOP IMPLEMENTATION
// ============================================================================

/**
 * Main entry point for the Reflexion loop.
 * Call this after every task execution to enable learning.
 */
export async function processTaskOutcome(
  context: TaskContext,
  outcome: TaskOutcome
): Promise<ReflexionResult> {
  const result: ReflexionResult = {
    priorReflections: [],
    shouldRetry: false,
  };

  try {
    // 1. Always record episodic memory
    const eventType: EventType = outcome.success ? 'task' : 'error';
    const memoryOutcome: Outcome = outcome.success 
      ? 'success' 
      : outcome.partial 
        ? 'partial' 
        : 'failure';

    const episodic = await createEpisodicMemory({
      agent: context.agent,
      eventType,
      action: context.taskDescription,
      context: context.taskType,
      outcome: memoryOutcome,
      lesson: outcome.error?.message,
      tags: extractKeywords(context.taskType, context.taskDescription),
      importance: outcome.success ? 50 : 75, // Failures are more important to remember
      conversationId: context.conversationId,
      sessionId: context.sessionId,
    });

    result.episodicId = episodic.id;
    console.log(`[Reflexion] Recorded episodic memory: ${episodic.id}`);

    // 2. If failure, create reflection and check for prior learnings
    if (!outcome.success && outcome.error) {
      const reflection = await createReflectionFromError(context, outcome);
      result.reflectionId = reflection.id;

      // 3. Find relevant prior reflections
      const keywords = extractKeywords(context.taskType, context.taskDescription);
      const priorReflections = await findRelevantReflections(
        context.taskType,
        keywords,
        3
      );

      result.priorReflections = priorReflections.map(r => ({
        id: r.id,
        correctionAction: r.correctionAction,
        effectiveness: r.effectivenessScore,
      }));

      // 4. Determine if retry is worthwhile
      const attemptNum = context.attemptNumber || 1;
      const hasEffectiveReflections = priorReflections.some(r => r.effectivenessScore > 0.5);
      result.shouldRetry = attemptNum < 3 && hasEffectiveReflections;

      // 5. Build injected context for retry
      if (result.shouldRetry && priorReflections.length > 0) {
        result.injectedContext = buildReflectionContext(priorReflections);
      }

      console.log(`[Reflexion] Created reflection: ${reflection.id}, shouldRetry: ${result.shouldRetry}`);
    }

    return result;
  } catch (error) {
    console.error('[Reflexion] Error processing task outcome:', error);
    return result;
  }
}

/**
 * Create a reflection from an error analysis
 */
async function createReflectionFromError(
  context: TaskContext,
  outcome: TaskOutcome
): Promise<{ id: string }> {
  const error = outcome.error!;
  const category = classifyError(error);
  
  // Generate root cause analysis
  const rootCause = generateRootCause(error, category);
  const correctionAction = generateCorrectionAction(error, category);
  const keywords = extractKeywords(context.taskType, context.taskDescription);
  
  // Add error-specific keywords
  if (error.code) keywords.push(error.code.toLowerCase());
  keywords.push(category.toLowerCase());

  const reflection = await createReflection({
    agent: context.agent,
    taskType: context.taskType,
    taskDescription: context.taskDescription,
    attemptNumber: context.attemptNumber || 1,
    outcome: 'failure',
    rootCause,
    specificError: error.message,
    correctionAction,
    correctionReasoning: `Error category: ${category}. ${rootCause}`,
    correctionConfidence: getCorrectionConfidence(category),
    keywords,
    sessionId: context.sessionId,
  });

  return { id: reflection.id };
}

/**
 * Generate root cause from error and category
 */
function generateRootCause(
  error: { code?: string; message: string },
  category: ErrorCategory
): string {
  const rootCauses: Record<ErrorCategory, string> = {
    NETWORK: `Network communication failed: ${error.message}. Check connectivity, DNS, and server availability.`,
    AUTH: `Authentication/authorization failed: ${error.message}. Verify credentials and permissions.`,
    SYNTAX: `Code parsing failed: ${error.message}. Check syntax, brackets, and type annotations.`,
    RUNTIME: `Runtime error: ${error.message}. Check for null/undefined values and type mismatches.`,
    RESOURCE: `Resource access failed: ${error.message}. Verify file paths and permissions.`,
    CONFIG: `Configuration error: ${error.message}. Check environment variables and config files.`,
    DEPENDENCY: `Dependency error: ${error.message}. Run npm install and check package versions.`,
    STATE: `State management error: ${error.message}. Check for race conditions and stale data.`,
    UNKNOWN: `Unknown error: ${error.message}. Requires manual investigation.`,
  };

  return rootCauses[category];
}

/**
 * Generate correction action based on error category
 */
function generateCorrectionAction(
  _error: { code?: string; message: string },
  category: ErrorCategory
): string {
  const corrections: Record<ErrorCategory, string> = {
    NETWORK: 'Implement retry with exponential backoff. Add timeout handling. Verify endpoint URL.',
    AUTH: 'Refresh authentication token. Check token expiration. Verify API key permissions.',
    SYNTAX: 'Review code for syntax errors. Run linter. Check TypeScript types.',
    RUNTIME: 'Add null checks. Validate input data. Use optional chaining (?.).',
    RESOURCE: 'Verify file exists before access. Check directory permissions. Use absolute paths.',
    CONFIG: 'Set required environment variables. Validate config on startup. Add defaults.',
    DEPENDENCY: 'Run npm install. Check package.json versions. Clear node_modules and reinstall.',
    STATE: 'Add mutex/locks for concurrent access. Invalidate caches. Use transactions.',
    UNKNOWN: 'Log full error details. Add more specific error handling. Investigate stack trace.',
  };

  return corrections[category];
}

/**
 * Get confidence level for correction based on category
 */
function getCorrectionConfidence(category: ErrorCategory): number {
  const confidences: Record<ErrorCategory, number> = {
    NETWORK: 0.7,
    AUTH: 0.8,
    SYNTAX: 0.9,
    RUNTIME: 0.6,
    RESOURCE: 0.85,
    CONFIG: 0.9,
    DEPENDENCY: 0.85,
    STATE: 0.5,
    UNKNOWN: 0.3,
  };

  return confidences[category];
}

/**
 * Extract keywords from task type and description
 */
function extractKeywords(taskType: string, description: string): string[] {
  const text = `${taskType} ${description}`.toLowerCase();
  
  // Common programming keywords to extract
  const keywordPatterns = [
    /\b(api|endpoint|route|handler)\b/g,
    /\b(database|db|query|sql|postgres)\b/g,
    /\b(auth|login|token|jwt|session)\b/g,
    /\b(file|read|write|path|directory)\b/g,
    /\b(component|react|frontend|ui)\b/g,
    /\b(test|jest|spec|mock)\b/g,
    /\b(deploy|build|compile|bundle)\b/g,
    /\b(git|commit|push|branch)\b/g,
    /\b(error|exception|catch|throw)\b/g,
    /\b(async|await|promise|callback)\b/g,
  ];

  const keywords: Set<string> = new Set();
  
  for (const pattern of keywordPatterns) {
    const matches = text.match(pattern);
    if (matches) {
      matches.forEach(m => keywords.add(m));
    }
  }

  // Add task type as keyword
  keywords.add(taskType.toLowerCase().replace(/[^a-z0-9]/g, '-'));

  return Array.from(keywords).slice(0, 10);
}

/**
 * Build context string from prior reflections to inject into retry
 */
function buildReflectionContext(
  reflections: Array<{ correctionAction: string; effectivenessScore: number; taskType: string }>
): string {
  let context = '📚 PRIOR LEARNINGS (from similar failures):\n\n';

  for (const ref of reflections) {
    const effectiveness = (ref.effectivenessScore * 100).toFixed(0);
    context += `• [${effectiveness}% effective] ${ref.correctionAction}\n`;
  }

  context += '\n⚠️ Apply these learnings to avoid repeating past mistakes.';

  return context;
}

// ============================================================================
// FEEDBACK LOOP - Update reflection effectiveness
// ============================================================================

/**
 * Call this when a retry succeeds or fails to update reflection effectiveness
 */
export async function recordReflectionOutcome(
  reflectionId: string,
  helped: boolean
): Promise<void> {
  try {
    await updateReflectionEffectiveness(reflectionId, helped);
    console.log(`[Reflexion] Updated reflection ${reflectionId}: helped=${helped}`);
  } catch (error) {
    console.error('[Reflexion] Error updating reflection effectiveness:', error);
  }
}

// ============================================================================
// INTEGRATION WITH ERROR DEBUGGER
// ============================================================================

/**
 * Create reflection from ErrorAnalysis (from error-debugger)
 */
export async function createReflectionFromAnalysis(
  analysis: ErrorAnalysis,
  context: TaskContext
): Promise<string> {
  const keywords = extractKeywords(context.taskType, context.taskDescription);
  keywords.push(analysis.category.toLowerCase());
  
  if (analysis.error.code) {
    keywords.push(analysis.error.code.toLowerCase());
  }

  const reflection = await createReflection({
    agent: context.agent,
    taskType: context.taskType,
    taskDescription: context.taskDescription,
    attemptNumber: context.attemptNumber || 1,
    outcome: 'failure',
    rootCause: analysis.firstPrinciples.rootCause,
    specificError: analysis.error.message,
    correctionAction: analysis.suggestedFixes[0]?.description || 'Manual investigation required',
    correctionReasoning: analysis.firstPrinciples.whyItFailed,
    correctionConfidence: (analysis.suggestedFixes[0]?.confidence || 30) / 100,
    keywords,
    sessionId: context.sessionId,
  });

  console.log(`[Reflexion] Created reflection from analysis: ${reflection.id}`);
  return reflection.id;
}

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  processTaskOutcome,
  recordReflectionOutcome,
  createReflectionFromAnalysis,
};
