/**
 * NOVA Task Decomposition Engine v7.0
 * 
 * Implements intelligent task decomposition for POLARIS orchestration.
 * Breaks down complex missions into parallel-safe subtasks with dependency tracking.
 * 
 * Based on: Magentic-One patterns, NOVA Coordination v6.0, Parallel Execution v7.0
 * 
 * @author POLARIS Ξ8890
 * @date January 6, 2026
 */

import type { NovaAgentId } from './types';

// ============================================================================
// TYPES
// ============================================================================

export type TaskPriority = 'critical' | 'high' | 'medium' | 'low';
export type TaskStatus = 'pending' | 'ready' | 'in_progress' | 'blocked' | 'complete' | 'failed';
export type TaskDomain = 'frontend' | 'backend' | 'design' | 'security' | 'research' | 'testing' | 'docs' | 'infrastructure';

export interface TaskDependency {
  taskId: string;
  type: 'hard' | 'soft';  // hard = must complete, soft = preferred but not required
  reason: string;
}

export interface FileScope {
  path: string;
  operation: 'read' | 'write' | 'create' | 'delete';
  exclusive: boolean;  // If true, no other task can touch this file
}

export interface SubTask {
  id: string;
  name: string;
  description: string;
  domain: TaskDomain;
  assignedAgent: NovaAgentId | null;
  priority: TaskPriority;
  status: TaskStatus;
  dependencies: TaskDependency[];
  fileScope: FileScope[];
  estimatedComplexity: number;  // 1-10 scale
  acceptanceCriteria: string[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  output?: string;
  error?: string;
}

export interface ParallelGroup {
  id: string;
  name: string;
  tasks: SubTask[];
  canRunParallel: boolean;
  dependsOnGroups: string[];
}

export interface TaskDecomposition {
  missionId: string;
  missionDescription: string;
  totalTasks: number;
  parallelGroups: ParallelGroup[];
  criticalPath: string[];  // Task IDs in order
  estimatedDuration: number;  // In minutes
  maxParallelism: number;
  createdAt: Date;
  decomposedBy: NovaAgentId;
}

export interface DecompositionContext {
  cwd: string;
  existingFiles?: string[];
  codebaseType?: 'frontend' | 'backend' | 'fullstack' | 'library' | 'unknown';
  techStack?: string[];
  constraints?: string[];
}

// ============================================================================
// DOMAIN DETECTION PATTERNS
// ============================================================================

const DOMAIN_PATTERNS: Record<TaskDomain, RegExp[]> = {
  frontend: [
    /\b(component|react|vue|angular|ui|ux|css|style|layout|page|view|form|button|modal|dialog)\b/i,
    /\b(frontend|client|browser|dom|html|jsx|tsx|svelte)\b/i,
    /\b(responsive|mobile|desktop|animation|transition)\b/i,
  ],
  backend: [
    /\b(api|endpoint|route|handler|controller|service|middleware)\b/i,
    /\b(database|db|query|sql|postgres|mysql|mongo|redis)\b/i,
    /\b(server|backend|rest|graphql|grpc|websocket)\b/i,
    /\b(authentication|authorization|jwt|oauth|session)\b/i,
  ],
  design: [
    /\b(design|mockup|wireframe|prototype|figma|sketch)\b/i,
    /\b(color|typography|spacing|layout|grid|theme)\b/i,
    /\b(accessibility|a11y|wcag|aria|screen.?reader)\b/i,
    /\b(user.?experience|user.?interface|interaction)\b/i,
  ],
  security: [
    /\b(security|vulnerability|exploit|attack|threat)\b/i,
    /\b(auth|permission|role|access|encrypt|hash|salt)\b/i,
    /\b(xss|csrf|injection|sanitize|validate)\b/i,
  ],
  research: [
    /\b(research|investigate|analyze|compare|evaluate)\b/i,
    /\b(benchmark|performance|metrics|profiling)\b/i,
    /\b(architecture|design.?decision|trade.?off)\b/i,
  ],
  testing: [
    /\b(test|spec|coverage|mock|stub|fixture)\b/i,
    /\b(unit|integration|e2e|end.?to.?end)\b/i,
    /\b(jest|mocha|cypress|playwright|vitest)\b/i,
  ],
  docs: [
    /\b(document|readme|changelog|guide|tutorial)\b/i,
    /\b(api.?doc|jsdoc|typedoc|swagger|openapi)\b/i,
    /\b(comment|annotation|example)\b/i,
  ],
  infrastructure: [
    /\b(deploy|ci|cd|pipeline|docker|kubernetes)\b/i,
    /\b(config|env|environment|variable)\b/i,
    /\b(build|bundle|webpack|vite|esbuild)\b/i,
  ],
};

// ============================================================================
// AGENT ASSIGNMENT
// ============================================================================

const DOMAIN_TO_AGENT: Record<TaskDomain, NovaAgentId> = {
  frontend: 'RIGEL',
  backend: 'ANTARES',
  design: 'SIRIUS',
  security: 'ARCTURUS',
  research: 'VEGA',
  testing: 'ARCTURUS',
  docs: 'VEGA',
  infrastructure: 'ANTARES',
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Detect the primary domain of a task description
 */
export function detectDomain(description: string): TaskDomain {
  let bestMatch: TaskDomain = 'backend';
  let bestScore = 0;

  for (const [domain, patterns] of Object.entries(DOMAIN_PATTERNS)) {
    let score = 0;
    for (const pattern of patterns) {
      if (pattern.test(description)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = domain as TaskDomain;
    }
  }

  return bestMatch;
}

/**
 * Suggest the best agent for a task based on its domain
 */
export function suggestAgent(domain: TaskDomain): NovaAgentId {
  return DOMAIN_TO_AGENT[domain];
}

/**
 * Generate a unique task ID
 */
export function generateTaskId(): string {
  return `task_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

/**
 * Estimate task complexity based on description
 */
export function estimateComplexity(description: string): number {
  let complexity = 3; // Base complexity

  // Increase for certain keywords
  if (/\b(complex|difficult|challenging|advanced)\b/i.test(description)) complexity += 2;
  if (/\b(refactor|migrate|rewrite)\b/i.test(description)) complexity += 2;
  if (/\b(multiple|several|many|all)\b/i.test(description)) complexity += 1;
  if (/\b(simple|basic|easy|quick)\b/i.test(description)) complexity -= 2;

  // Clamp to 1-10
  return Math.max(1, Math.min(10, complexity));
}

/**
 * Create a subtask from a description
 */
export function createSubTask(
  name: string,
  description: string,
  options?: Partial<SubTask>
): SubTask {
  const domain = detectDomain(description);
  
  return {
    id: generateTaskId(),
    name,
    description,
    domain,
    assignedAgent: suggestAgent(domain),
    priority: 'medium',
    status: 'pending',
    dependencies: [],
    fileScope: [],
    estimatedComplexity: estimateComplexity(description),
    acceptanceCriteria: [],
    createdAt: new Date(),
    ...options,
  };
}