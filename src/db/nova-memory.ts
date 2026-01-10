/**
 * NOVA Memory System v7.0
 * Three-tier cognitive memory: Episodic, Procedural, Reflections
 * 
 * Based on research: Reflexion, MemGPT, Graphiti patterns
 */
import { pool } from './connection';

// ============================================================================
// TYPES
// ============================================================================

export type NovaAgent = 'POLARIS' | 'VEGA' | 'SIRIUS' | 'RIGEL' | 'ANTARES' | 'ARCTURUS';
export type EventType = 'task' | 'error' | 'handoff' | 'feedback' | 'decision';
export type Outcome = 'success' | 'failure' | 'partial';
export type AgentStatus = 'idle' | 'active' | 'blocked' | 'waiting';

export interface EpisodicMemory {
  id: string;
  timestamp: Date;
  agent: NovaAgent;
  eventType: EventType;
  action: string;
  context?: string;
  outcome?: Outcome;
  lesson?: string;
  tags: string[];
  accessCount: number;
  lastAccessed?: Date;
  importance: number;
  archived: boolean;
  conversationId?: string;
  sessionId?: string;
}

export interface ProcedureStep {
  order: number;
  action: string;
  expectedOutcome: string;
  fallback?: string;
}

export interface ProceduralMemory {
  id: string;
  name: string;
  description?: string;
  agent: NovaAgent;
  steps: ProcedureStep[];
  prerequisites: string[];
  triggers: string[];
  successCount: number;
  failureCount: number;
  confidence: number;
  version: number;
  createdAt: Date;
  updatedAt: Date;
  lastUsed?: Date;
}

export interface Reflection {
  id: string;
  timestamp: Date;
  agent: NovaAgent;
  taskType: string;
  taskDescription?: string;
  attemptNumber: number;
  outcome: string;
  rootCause: string;
  specificError?: string;
  correctionAction: string;
  correctionReasoning?: string;
  correctionConfidence: number;
  keywords: string[];
  timesRetrieved: number;
  timesHelped: number;
  timesFailed: number;
  effectivenessScore: number;
  sessionId?: string;
}

export interface AgentState {
  agent: NovaAgent;
  status: AgentStatus;
  currentTask?: string;
  parallelSlot?: number;
  filesLocked: string[];
  progress: number;
  lastActive?: Date;
  contextSnapshot: Record<string, unknown>;
}

// ============================================================================
// EPISODIC MEMORY OPERATIONS
// ============================================================================

export async function createEpisodicMemory(data: {
  agent: NovaAgent;
  eventType: EventType;
  action: string;
  context?: string;
  outcome?: Outcome;
  lesson?: string;
  tags?: string[];
  importance?: number;
  conversationId?: string;
  sessionId?: string;
}): Promise<EpisodicMemory> {
  const result = await pool.query(
    `INSERT INTO nova_episodic_memory 
     (agent, event_type, action, context, outcome, lesson, tags, importance, conversation_id, session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8, $9, $10)
     RETURNING *`,
    [
      data.agent,
      data.eventType,
      data.action,
      data.context || null,
      data.outcome || null,
      data.lesson || null,
      JSON.stringify(data.tags || []),
      data.importance || 50,
      data.conversationId || null,
      data.sessionId || null,
    ]
  );
  
  console.log(`[NOVA:Memory] Created episodic memory: ${data.eventType} by ${data.agent}`);
  return mapEpisodicRow(result.rows[0] as Record<string, unknown>);
}

export async function getRecentEpisodicMemories(
  agent?: NovaAgent,
  limit = 10
): Promise<EpisodicMemory[]> {
  const query = agent
    ? `SELECT * FROM nova_episodic_memory WHERE agent = $1 AND archived = false 
       ORDER BY timestamp DESC LIMIT $2`
    : `SELECT * FROM nova_episodic_memory WHERE archived = false 
       ORDER BY timestamp DESC LIMIT $1`;
  
  const params = agent ? [agent, limit] : [limit];
  const result = await pool.query(query, params);
  
  return result.rows.map(r => mapEpisodicRow(r as Record<string, unknown>));
}

export async function searchEpisodicByTags(
  tags: string[],
  limit = 5
): Promise<EpisodicMemory[]> {
  const result = await pool.query(
    `SELECT * FROM nova_episodic_memory 
     WHERE tags ?| $1 AND archived = false
     ORDER BY importance DESC, timestamp DESC
     LIMIT $2`,
    [tags, limit]
  );
  
  // Update access counts
  const ids = result.rows.map(r => r.id);
  if (ids.length > 0) {
    await pool.query(
      `UPDATE nova_episodic_memory 
       SET access_count = access_count + 1, last_accessed = NOW()
       WHERE id = ANY($1)`,
      [ids]
    );
  }
  
  return result.rows.map(r => mapEpisodicRow(r as Record<string, unknown>));
}

export async function getErrorPatterns(
  agent?: NovaAgent,
  limit = 5
): Promise<EpisodicMemory[]> {
  const query = agent
    ? `SELECT * FROM nova_episodic_memory 
       WHERE agent = $1 AND event_type = 'error' AND archived = false
       ORDER BY timestamp DESC LIMIT $2`
    : `SELECT * FROM nova_episodic_memory 
       WHERE event_type = 'error' AND archived = false
       ORDER BY timestamp DESC LIMIT $1`;
  
  const params = agent ? [agent, limit] : [limit];
  const result = await pool.query(query, params);
  
  return result.rows.map(r => mapEpisodicRow(r as Record<string, unknown>));
}

// ============================================================================
// PROCEDURAL MEMORY OPERATIONS
// ============================================================================

export async function createProceduralMemory(data: {
  name: string;
  description?: string;
  agent: NovaAgent;
  steps: ProcedureStep[];
  prerequisites?: string[];
  triggers?: string[];
}): Promise<ProceduralMemory> {
  const result = await pool.query(
    `INSERT INTO nova_procedural_memory 
     (name, description, agent, steps, prerequisites, triggers, confidence)
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, 0.6)
     RETURNING *`,
    [
      data.name,
      data.description || null,
      data.agent,
      JSON.stringify(data.steps),
      JSON.stringify(data.prerequisites || []),
      JSON.stringify(data.triggers || []),
    ]
  );
  
  console.log(`[NOVA:Memory] Created procedural memory: ${data.name} for ${data.agent}`);
  return mapProceduralRow(result.rows[0] as Record<string, unknown>);
}

export async function findProcedureByTriggers(
  keywords: string[],
  agent?: NovaAgent,
  minConfidence = 0.5
): Promise<ProceduralMemory[]> {
  const query = agent
    ? `SELECT * FROM nova_procedural_memory 
       WHERE agent = $1 AND triggers ?| $2 AND confidence >= $3
       ORDER BY confidence DESC LIMIT 5`
    : `SELECT * FROM nova_procedural_memory 
       WHERE triggers ?| $1 AND confidence >= $2
       ORDER BY confidence DESC LIMIT 5`;
  
  const params = agent ? [agent, keywords, minConfidence] : [keywords, minConfidence];
  const result = await pool.query(query, params);
  
  return result.rows.map(r => mapProceduralRow(r as Record<string, unknown>));
}

export async function updateProcedureOutcome(
  id: string,
  success: boolean
): Promise<void> {
  // Bayesian confidence update: (successes + 1) / (total + 2)
  const field = success ? 'success_count' : 'failure_count';
  
  await pool.query(
    `UPDATE nova_procedural_memory 
     SET ${field} = ${field} + 1,
         confidence = (success_count + 1.0) / (success_count + failure_count + 2.0),
         last_used = NOW(),
         updated_at = NOW()
     WHERE id = $1`,
    [id]
  );
  
  console.log(`[NOVA:Memory] Updated procedure ${id}: ${success ? 'success' : 'failure'}`);
}

export async function getHighConfidenceProcedures(
  agent?: NovaAgent,
  minConfidence = 0.7
): Promise<ProceduralMemory[]> {
  const query = agent
    ? `SELECT * FROM nova_procedural_memory 
       WHERE agent = $1 AND confidence >= $2
       ORDER BY confidence DESC`
    : `SELECT * FROM nova_procedural_memory 
       WHERE confidence >= $1
       ORDER BY confidence DESC`;
  
  const params = agent ? [agent, minConfidence] : [minConfidence];
  const result = await pool.query(query, params);
  
  return result.rows.map(r => mapProceduralRow(r as Record<string, unknown>));
}

// ============================================================================
// REFLECTION OPERATIONS (Reflexion pattern)
// ============================================================================

export async function createReflection(data: {
  agent: NovaAgent;
  taskType: string;
  taskDescription?: string;
  attemptNumber?: number;
  outcome: string;
  rootCause: string;
  specificError?: string;
  correctionAction: string;
  correctionReasoning?: string;
  correctionConfidence?: number;
  keywords?: string[];
  sessionId?: string;
}): Promise<Reflection> {
  const result = await pool.query(
    `INSERT INTO nova_reflections 
     (agent, task_type, task_description, attempt_number, outcome, root_cause, 
      specific_error, correction_action, correction_reasoning, correction_confidence,
      keywords, session_id)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::jsonb, $12)
     RETURNING *`,
    [
      data.agent,
      data.taskType,
      data.taskDescription || null,
      data.attemptNumber || 1,
      data.outcome,
      data.rootCause,
      data.specificError || null,
      data.correctionAction,
      data.correctionReasoning || null,
      data.correctionConfidence || 0.5,
      JSON.stringify(data.keywords || []),
      data.sessionId || null,
    ]
  );
  
  console.log(`[NOVA:Memory] Created reflection for ${data.agent}: ${data.taskType}`);
  return mapReflectionRow(result.rows[0] as Record<string, unknown>);
}

export async function findRelevantReflections(
  taskType: string,
  keywords: string[],
  limit = 3
): Promise<Reflection[]> {
  const result = await pool.query(
    `SELECT * FROM nova_reflections 
     WHERE (task_type = $1 OR keywords ?| $2)
     AND effectiveness_score > 0.3
     ORDER BY effectiveness_score DESC, times_helped DESC
     LIMIT $3`,
    [taskType, keywords, limit]
  );
  
  // Update retrieval count
  const ids = result.rows.map(r => r.id);
  if (ids.length > 0) {
    await pool.query(
      `UPDATE nova_reflections 
       SET times_retrieved = times_retrieved + 1
       WHERE id = ANY($1)`,
      [ids]
    );
  }
  
  return result.rows.map(r => mapReflectionRow(r as Record<string, unknown>));
}

export async function updateReflectionEffectiveness(
  id: string,
  helped: boolean
): Promise<void> {
  const field = helped ? 'times_helped' : 'times_failed';
  
  await pool.query(
    `UPDATE nova_reflections 
     SET ${field} = ${field} + 1,
         effectiveness_score = (times_helped + 1.0) / (times_retrieved + 2.0)
     WHERE id = $1`,
    [id]
  );
}

// ============================================================================
// AGENT STATE OPERATIONS
// ============================================================================

export async function getAgentState(agent: NovaAgent): Promise<AgentState | null> {
  const result = await pool.query(
    `SELECT * FROM nova_agent_state WHERE agent = $1`,
    [agent]
  );
  
  if (!result.rows[0]) return null;
  return mapAgentStateRow(result.rows[0] as Record<string, unknown>);
}

export async function updateAgentState(
  agent: NovaAgent,
  updates: Partial<Omit<AgentState, 'agent'>>
): Promise<void> {
  const setClauses: string[] = ['updated_at = NOW()'];
  const values: unknown[] = [];
  let paramIndex = 1;
  
  if (updates.status !== undefined) {
    setClauses.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }
  if (updates.currentTask !== undefined) {
    setClauses.push(`current_task = $${paramIndex++}`);
    values.push(updates.currentTask);
  }
  if (updates.parallelSlot !== undefined) {
    setClauses.push(`parallel_slot = $${paramIndex++}`);
    values.push(updates.parallelSlot);
  }
  if (updates.filesLocked !== undefined) {
    setClauses.push(`files_locked = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(updates.filesLocked));
  }
  if (updates.progress !== undefined) {
    setClauses.push(`progress = $${paramIndex++}`);
    values.push(updates.progress);
  }
  if (updates.contextSnapshot !== undefined) {
    setClauses.push(`context_snapshot = $${paramIndex++}::jsonb`);
    values.push(JSON.stringify(updates.contextSnapshot));
  }
  
  // Always update last_active when state changes
  setClauses.push('last_active = NOW()');
  
  values.push(agent);
  
  await pool.query(
    `UPDATE nova_agent_state SET ${setClauses.join(', ')} WHERE agent = $${paramIndex}`,
    values
  );
}

export async function getAllAgentStates(): Promise<AgentState[]> {
  const result = await pool.query(`SELECT * FROM nova_agent_state ORDER BY agent`);
  return result.rows.map(r => mapAgentStateRow(r as Record<string, unknown>));
}

// ============================================================================
// MEMORY MAINTENANCE
// ============================================================================

export async function archiveOldMemories(daysOld = 90): Promise<number> {
  const result = await pool.query(
    `UPDATE nova_episodic_memory 
     SET archived = true, archived_at = NOW()
     WHERE archived = false 
     AND timestamp < NOW() - INTERVAL '${daysOld} days'
     AND importance < 70`,
    []
  );
  
  const count = result.rowCount || 0;
  if (count > 0) {
    console.log(`[NOVA:Memory] Archived ${count} old episodic memories`);
  }
  return count;
}

export async function decayMemoryImportance(): Promise<void> {
  // Reduce importance of memories not accessed in 30 days
  await pool.query(
    `UPDATE nova_episodic_memory 
     SET importance = GREATEST(importance - 5, 10)
     WHERE archived = false 
     AND (last_accessed IS NULL OR last_accessed < NOW() - INTERVAL '30 days')
     AND importance > 10`
  );
}

export async function getMemoryStats(): Promise<{
  episodicCount: number;
  proceduralCount: number;
  reflectionCount: number;
  avgConfidence: number;
  avgEffectiveness: number;
}> {
  const [episodic, procedural, reflections] = await Promise.all([
    pool.query(`SELECT COUNT(*) as count FROM nova_episodic_memory WHERE archived = false`),
    pool.query(`SELECT COUNT(*) as count, AVG(confidence) as avg_conf FROM nova_procedural_memory`),
    pool.query(`SELECT COUNT(*) as count, AVG(effectiveness_score) as avg_eff FROM nova_reflections`),
  ]);
  
  return {
    episodicCount: parseInt(episodic.rows[0]?.count || '0', 10),
    proceduralCount: parseInt(procedural.rows[0]?.count || '0', 10),
    reflectionCount: parseInt(reflections.rows[0]?.count || '0', 10),
    avgConfidence: parseFloat(procedural.rows[0]?.avg_conf || '0'),
    avgEffectiveness: parseFloat(reflections.rows[0]?.avg_eff || '0'),
  };
}

// ============================================================================
// ROW MAPPERS
// ============================================================================

function mapEpisodicRow(row: Record<string, unknown>): EpisodicMemory {
  return {
    id: row.id as string,
    timestamp: row.timestamp as Date,
    agent: row.agent as NovaAgent,
    eventType: row.event_type as EventType,
    action: row.action as string,
    context: row.context as string | undefined,
    outcome: row.outcome as Outcome | undefined,
    lesson: row.lesson as string | undefined,
    tags: (row.tags as string[]) || [],
    accessCount: row.access_count as number,
    lastAccessed: row.last_accessed as Date | undefined,
    importance: row.importance as number,
    archived: row.archived as boolean,
    conversationId: row.conversation_id as string | undefined,
    sessionId: row.session_id as string | undefined,
  };
}

function mapProceduralRow(row: Record<string, unknown>): ProceduralMemory {
  return {
    id: row.id as string,
    name: row.name as string,
    description: row.description as string | undefined,
    agent: row.agent as NovaAgent,
    steps: row.steps as ProcedureStep[],
    prerequisites: (row.prerequisites as string[]) || [],
    triggers: (row.triggers as string[]) || [],
    successCount: row.success_count as number,
    failureCount: row.failure_count as number,
    confidence: row.confidence as number,
    version: row.version as number,
    createdAt: row.created_at as Date,
    updatedAt: row.updated_at as Date,
    lastUsed: row.last_used as Date | undefined,
  };
}

function mapReflectionRow(row: Record<string, unknown>): Reflection {
  return {
    id: row.id as string,
    timestamp: row.timestamp as Date,
    agent: row.agent as NovaAgent,
    taskType: row.task_type as string,
    taskDescription: row.task_description as string | undefined,
    attemptNumber: row.attempt_number as number,
    outcome: row.outcome as string,
    rootCause: row.root_cause as string,
    specificError: row.specific_error as string | undefined,
    correctionAction: row.correction_action as string,
    correctionReasoning: row.correction_reasoning as string | undefined,
    correctionConfidence: row.correction_confidence as number,
    keywords: (row.keywords as string[]) || [],
    timesRetrieved: row.times_retrieved as number,
    timesHelped: row.times_helped as number,
    timesFailed: row.times_failed as number,
    effectivenessScore: row.effectiveness_score as number,
    sessionId: row.session_id as string | undefined,
  };
}

function mapAgentStateRow(row: Record<string, unknown>): AgentState {
  return {
    agent: row.agent as NovaAgent,
    status: row.status as AgentStatus,
    currentTask: row.current_task as string | undefined,
    parallelSlot: row.parallel_slot as number | undefined,
    filesLocked: (row.files_locked as string[]) || [],
    progress: row.progress as number,
    lastActive: row.last_active as Date | undefined,
    contextSnapshot: (row.context_snapshot as Record<string, unknown>) || {},
  };
}

