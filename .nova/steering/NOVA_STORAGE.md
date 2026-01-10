# NOVA Storage Implementation v7.0
## Practical Memory & Learning Infrastructure

**Version**: 7.0.0 | **Status**: Implementation Guide | **Standard**: January 2026

---

## Storage Stack Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    NOVA STORAGE STACK                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  PRIMARY: Graphiti + Neo4j (Temporal Knowledge Graph)       │
│  ├── Entities with bi-temporal validity                     │
│  ├── Relations that evolve over time                        │
│  ├── Contradiction detection                                │
│  └── Semantic + graph + temporal queries                    │
│                                                              │
│  SECONDARY: SQLite + JSON (Local Persistence)               │
│  ├── Episodic memories (reflections, events)               │
│  ├── Procedural patterns (learned workflows)               │
│  ├── Agent state snapshots                                  │
│  └── Steering evolution history                             │
│                                                              │
│  CACHE: In-Memory (Session State)                           │
│  ├── Current context window                                 │
│  ├── Active agent profiles                                  │
│  ├── Hot retrieval cache                                    │
│  └── Working memory buffer                                  │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Graphiti Integration

### Why Graphiti?

Graphiti (from Zep) is a temporal knowledge graph engine that:
- Maintains bi-temporal validity (when fact was true vs when we learned it)
- Detects and resolves contradictions automatically
- Supports hybrid queries (semantic + graph + temporal)
- Outperforms MemGPT on Deep Memory Retrieval benchmarks

### Setup

```bash
# Install Graphiti
pip install graphiti-core

# Or use with Neo4j
docker run -d --name neo4j \
  -p 7474:7474 -p 7687:7687 \
  -e NEO4J_AUTH=neo4j/password \
  neo4j:latest
```

### Schema Design

```python
# Entity Types for NOVA
ENTITY_TYPES = {
    "CodeComponent": {
        "properties": ["name", "type", "path", "description"],
        "temporal": True  # Track when component existed
    },
    "Decision": {
        "properties": ["title", "rationale", "alternatives", "outcome"],
        "temporal": True  # Track when decision was valid
    },
    "Pattern": {
        "properties": ["name", "steps", "confidence", "agent"],
        "temporal": True  # Track pattern evolution
    },
    "Agent": {
        "properties": ["name", "id", "role", "strength"],
        "temporal": False  # Agents are permanent
    },
    "Task": {
        "properties": ["description", "status", "outcome"],
        "temporal": True  # Track task lifecycle
    },
    "Reflection": {
        "properties": ["failure", "rootCause", "correction"],
        "temporal": True  # Track when reflection was created
    }
}

# Relation Types
RELATION_TYPES = {
    "USES": {"from": "CodeComponent", "to": "CodeComponent"},
    "DEPENDS_ON": {"from": "CodeComponent", "to": "CodeComponent"},
    "DECIDED_BY": {"from": "Decision", "to": "Agent"},
    "LEARNED_BY": {"from": "Pattern", "to": "Agent"},
    "EXECUTED_BY": {"from": "Task", "to": "Agent"},
    "REFLECTS_ON": {"from": "Reflection", "to": "Task"},
    "SUPERSEDES": {"from": "Decision", "to": "Decision"},
    "CONFLICTS_WITH": {"from": "any", "to": "any"}
}
```

### Graphiti Operations

```python
from graphiti_core import Graphiti
from graphiti_core.nodes import EpisodeType

# Initialize
graphiti = Graphiti(
    neo4j_uri="bolt://localhost:7687",
    neo4j_user="neo4j",
    neo4j_password="password"
)

# Add episode (learning event)
async def add_learning_episode(
    agent: str,
    content: str,
    episode_type: EpisodeType = EpisodeType.message
):
    """Add a learning episode to the knowledge graph."""
    await graphiti.add_episode(
        name=f"{agent}_learning_{timestamp()}",
        episode_body=content,
        source=EpisodeType.message,
        reference_time=datetime.now()
    )

# Query with temporal awareness
async def query_knowledge(
    query: str,
    as_of: datetime = None,
    limit: int = 10
):
    """Query knowledge graph with optional temporal filter."""
    results = await graphiti.search(
        query=query,
        num_results=limit,
        # Graphiti automatically handles temporal validity
    )
    return results

# Detect contradictions
async def check_contradiction(new_fact: str, entity: str):
    """Check if new fact contradicts existing knowledge."""
    existing = await graphiti.search(
        query=f"facts about {entity}",
        num_results=5
    )
    # Graphiti handles contradiction detection internally
    # Returns conflicting facts if any
    return existing
```

---

## Part 2: Local SQLite Storage

### Database Schema

```sql
-- Episodic Memory (What happened)
CREATE TABLE episodic_memory (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    event_type TEXT NOT NULL,  -- 'task', 'error', 'handoff', 'feedback'
    
    -- Event details
    action TEXT NOT NULL,
    context TEXT,
    outcome TEXT,  -- 'success', 'failure', 'partial'
    
    -- Learning
    lesson TEXT,
    tags TEXT,  -- JSON array
    
    -- Retrieval
    embedding BLOB,  -- Vector for semantic search
    
    -- Decay management
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT,
    importance INTEGER DEFAULT 50,
    
    -- Archival
    archived INTEGER DEFAULT 0,
    archived_at TEXT
);

-- Procedural Memory (How we do things)
CREATE TABLE procedural_memory (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    agent TEXT NOT NULL,
    
    -- The procedure
    steps TEXT NOT NULL,  -- JSON array
    prerequisites TEXT,   -- JSON array
    triggers TEXT,        -- JSON array
    
    -- Learning metadata
    success_count INTEGER DEFAULT 0,
    failure_count INTEGER DEFAULT 0,
    confidence REAL DEFAULT 0.5,
    
    -- Versioning
    version INTEGER DEFAULT 1,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    last_used TEXT
);

-- Reflections (Learning from failures)
CREATE TABLE reflections (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT NOT NULL,
    
    -- Task context
    task_type TEXT NOT NULL,
    task_description TEXT,
    attempt_number INTEGER,
    
    -- Failure analysis
    outcome TEXT NOT NULL,
    root_cause TEXT NOT NULL,
    specific_error TEXT,
    
    -- Correction
    correction_action TEXT NOT NULL,
    correction_reasoning TEXT,
    correction_confidence REAL,
    
    -- Retrieval
    embedding BLOB,
    keywords TEXT,  -- JSON array
    
    -- Effectiveness
    times_retrieved INTEGER DEFAULT 0,
    times_helped INTEGER DEFAULT 0,
    times_failed INTEGER DEFAULT 0,
    effectiveness_score REAL DEFAULT 0.5
);

-- Steering Evolution (Track changes)
CREATE TABLE steering_evolution (
    id TEXT PRIMARY KEY,
    timestamp TEXT NOT NULL,
    agent TEXT,  -- NULL for global changes
    
    -- Change details
    change_type TEXT NOT NULL,  -- 'embody_add', 'reject_add', 'keyword_add', etc.
    old_value TEXT,
    new_value TEXT,
    reason TEXT,
    
    -- Source
    triggered_by TEXT,  -- reflection_id, pattern_id, or 'manual'
    confidence REAL
);

-- Indexes
CREATE INDEX idx_episodic_agent ON episodic_memory(agent);
CREATE INDEX idx_episodic_type ON episodic_memory(event_type);
CREATE INDEX idx_episodic_timestamp ON episodic_memory(timestamp);
CREATE INDEX idx_procedural_agent ON procedural_memory(agent);
CREATE INDEX idx_procedural_triggers ON procedural_memory(triggers);
CREATE INDEX idx_reflections_agent ON reflections(agent);
CREATE INDEX idx_reflections_task_type ON reflections(task_type);
```

### TypeScript Interface

```typescript
// .nova/types/memory.ts

interface EpisodicMemory {
  id: string;
  timestamp: string;
  agent: string;
  eventType: 'task' | 'error' | 'handoff' | 'feedback';
  
  action: string;
  context?: string;
  outcome: 'success' | 'failure' | 'partial';
  
  lesson?: string;
  tags: string[];
  
  embedding?: number[];
  
  accessCount: number;
  lastAccessed?: string;
  importance: number;
  
  archived: boolean;
  archivedAt?: string;
}

interface ProceduralMemory {
  id: string;
  name: string;
  description?: string;
  agent: string;
  
  steps: ProcedureStep[];
  prerequisites: string[];
  triggers: string[];
  
  successCount: number;
  failureCount: number;
  confidence: number;
  
  version: number;
  createdAt: string;
  updatedAt: string;
  lastUsed?: string;
}

interface ProcedureStep {
  order: number;
  action: string;
  expectedOutcome: string;
  fallback?: string;
}

interface Reflection {
  id: string;
  timestamp: string;
  agent: string;
  
  taskType: string;
  taskDescription?: string;
  attemptNumber: number;
  
  outcome: string;
  rootCause: string;
  specificError?: string;
  
  correctionAction: string;
  correctionReasoning?: string;
  correctionConfidence: number;
  
  embedding?: number[];
  keywords: string[];
  
  timesRetrieved: number;
  timesHelped: number;
  timesFailed: number;
  effectivenessScore: number;
}
```

---

## Part 3: The Self-Improvement Loop

### Loop Implementation

```typescript
// .nova/core/self-improvement.ts

interface TaskExecution {
  taskId: string;
  agent: string;
  description: string;
  startTime: string;
  endTime?: string;
  
  actions: Action[];
  decisions: Decision[];
  
  outcome?: 'success' | 'failure' | 'partial';
  qualityScore?: number;
  userFeedback?: string;
}

interface Action {
  timestamp: string;
  type: string;
  details: string;
  result: string;
}

interface Decision {
  timestamp: string;
  question: string;
  choice: string;
  reasoning: string;
  alternatives: string[];
}

class SelfImprovementLoop {
  private graphiti: Graphiti;
  private db: Database;
  
  async execute(task: Task): Promise<TaskExecution> {
    const execution: TaskExecution = {
      taskId: generateId(),
      agent: task.agent,
      description: task.description,
      startTime: new Date().toISOString(),
      actions: [],
      decisions: []
    };
    
    try {
      // 1. EXECUTE with Antigravity Loop
      const result = await this.runAntigravityLoop(task, execution);
      
      // 2. EVALUATE
      execution.outcome = this.evaluateOutcome(result, task.criteria);
      execution.qualityScore = this.scoreQuality(result);
      execution.endTime = new Date().toISOString();
      
      // 3. REFLECT (if failure)
      if (execution.outcome === 'failure') {
        const reflection = await this.generateReflection(execution);
        await this.storeReflection(reflection);
      }
      
      // 4. EXTRACT PATTERNS
      const patterns = await this.extractPatterns(execution);
      await this.storePatterns(patterns);
      
      // 5. UPDATE KNOWLEDGE GRAPH
      await this.updateKnowledgeGraph(execution);
      
      // 6. EVOLVE STEERING (if significant learning)
      if (this.shouldEvolveSteering(execution)) {
        await this.evolveSteering(execution);
      }
      
      // 7. BROADCAST LEARNING
      await this.broadcastLearning(execution);
      
      return execution;
      
    } catch (error) {
      execution.outcome = 'failure';
      execution.endTime = new Date().toISOString();
      
      // Generate reflection for unexpected errors
      const reflection = await this.generateReflection(execution, error);
      await this.storeReflection(reflection);
      
      throw error;
    }
  }
  
  private async generateReflection(
    execution: TaskExecution,
    error?: Error
  ): Promise<Reflection> {
    // Use LLM to generate natural language reflection
    const prompt = `
      Task: ${execution.description}
      Outcome: ${execution.outcome}
      Actions taken: ${JSON.stringify(execution.actions)}
      ${error ? `Error: ${error.message}` : ''}
      
      Generate a reflection with:
      1. Root cause of failure
      2. Specific error made
      3. Corrective action for next time
    `;
    
    const response = await this.llm.generate(prompt);
    
    return {
      id: generateId(),
      timestamp: new Date().toISOString(),
      agent: execution.agent,
      taskType: this.classifyTaskType(execution.description),
      taskDescription: execution.description,
      attemptNumber: 1,
      outcome: execution.outcome,
      rootCause: response.rootCause,
      specificError: response.specificError,
      correctionAction: response.correction,
      correctionReasoning: response.reasoning,
      correctionConfidence: response.confidence,
      keywords: this.extractKeywords(execution),
      timesRetrieved: 0,
      timesHelped: 0,
      timesFailed: 0,
      effectivenessScore: 0.5
    };
  }
  
  private async extractPatterns(
    execution: TaskExecution
  ): Promise<ProceduralMemory[]> {
    if (execution.outcome !== 'success') return [];
    
    // Extract successful action sequences
    const steps = execution.actions.map((action, i) => ({
      order: i + 1,
      action: action.type,
      expectedOutcome: action.result
    }));
    
    // Check if similar pattern exists
    const existing = await this.findSimilarPattern(steps);
    
    if (existing) {
      // Update existing pattern
      existing.successCount++;
      existing.confidence = this.updateConfidence(existing);
      existing.lastUsed = new Date().toISOString();
      return [existing];
    }
    
    // Create new pattern
    return [{
      id: generateId(),
      name: this.generatePatternName(execution),
      description: execution.description,
      agent: execution.agent,
      steps,
      prerequisites: this.inferPrerequisites(execution),
      triggers: this.extractTriggers(execution.description),
      successCount: 1,
      failureCount: 0,
      confidence: 0.6,  // Start at 60%
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    }];
  }
  
  private updateConfidence(pattern: ProceduralMemory): number {
    // Bayesian update: (successes + 1) / (total + 2)
    const total = pattern.successCount + pattern.failureCount;
    return (pattern.successCount + 1) / (total + 2);
  }
  
  private async evolveSteering(execution: TaskExecution): Promise<void> {
    // Only evolve if we have high-confidence learning
    const patterns = await this.getHighConfidencePatterns(execution.agent);
    const reflections = await this.getEffectiveReflections(execution.agent);
    
    // Generate steering updates
    const updates: SteeringUpdate[] = [];
    
    // Add new EMBODY patterns from successful patterns
    for (const pattern of patterns) {
      if (pattern.confidence > 0.85) {
        updates.push({
          type: 'embody_add',
          agent: execution.agent,
          value: this.patternToEmbody(pattern),
          reason: `Pattern "${pattern.name}" has ${pattern.confidence * 100}% confidence`,
          triggeredBy: pattern.id
        });
      }
    }
    
    // Add new REJECT patterns from reflections
    for (const reflection of reflections) {
      if (reflection.effectivenessScore > 0.8) {
        updates.push({
          type: 'reject_add',
          agent: execution.agent,
          value: this.reflectionToReject(reflection),
          reason: `Reflection helped ${reflection.timesHelped} times`,
          triggeredBy: reflection.id
        });
      }
    }
    
    // Apply updates
    for (const update of updates) {
      await this.applySteeringUpdate(update);
    }
  }
}
```

---

## Part 4: Retrieval Strategies

### Multi-Modal Retrieval

```typescript
class MemoryRetrieval {
  
  async retrieveForTask(task: Task): Promise<RetrievalResult> {
    // 1. Semantic search (embeddings)
    const semanticResults = await this.semanticSearch(
      task.description,
      limit: 5
    );
    
    // 2. Keyword search (exact matches)
    const keywordResults = await this.keywordSearch(
      this.extractKeywords(task.description),
      limit: 5
    );
    
    // 3. Graph traversal (related entities)
    const graphResults = await this.graphTraversal(
      task.relatedEntities,
      depth: 2
    );
    
    // 4. Temporal query (recent relevant)
    const temporalResults = await this.temporalQuery(
      task.domain,
      since: '7d'
    );
    
    // 5. Reflection retrieval (past failures)
    const reflections = await this.retrieveReflections(
      task.type,
      limit: 3
    );
    
    // Merge and rank
    return this.mergeAndRank({
      semantic: semanticResults,
      keyword: keywordResults,
      graph: graphResults,
      temporal: temporalResults,
      reflections
    });
  }
  
  private async retrieveReflections(
    taskType: string,
    limit: number
  ): Promise<Reflection[]> {
    // Get reflections for similar task types
    const reflections = await this.db.query(`
      SELECT * FROM reflections
      WHERE task_type = ?
      AND effectiveness_score > 0.5
      ORDER BY effectiveness_score DESC, times_helped DESC
      LIMIT ?
    `, [taskType, limit]);
    
    // Update retrieval count
    for (const r of reflections) {
      await this.db.run(`
        UPDATE reflections
        SET times_retrieved = times_retrieved + 1
        WHERE id = ?
      `, [r.id]);
    }
    
    return reflections;
  }
}
```

---

## Part 5: File-Based Persistence

### Steering File Updates

```typescript
// When steering evolves, update the actual files

async function updateSteeringFile(
  agent: string,
  updates: SteeringUpdate[]
): Promise<void> {
  const filePath = `.nova/steering/agent-personalities.md`;
  const content = await fs.readFile(filePath, 'utf-8');
  
  // Parse existing EMBODY/REJECT sections
  const sections = parseSteeringSections(content);
  
  // Apply updates
  for (const update of updates) {
    if (update.type === 'embody_add') {
      sections[agent].embody.push(update.value);
    } else if (update.type === 'reject_add') {
      sections[agent].reject.push(update.value);
    }
  }
  
  // Regenerate file
  const newContent = generateSteeringFile(sections);
  await fs.writeFile(filePath, newContent);
  
  // Log evolution
  await logSteeringEvolution(updates);
}
```

### Pattern Export

```typescript
// Export learned patterns to shareable format

async function exportPatterns(agent: string): Promise<string> {
  const patterns = await db.query(`
    SELECT * FROM procedural_memory
    WHERE agent = ? AND confidence > 0.7
    ORDER BY confidence DESC
  `, [agent]);
  
  return yaml.stringify({
    agent,
    exportedAt: new Date().toISOString(),
    patterns: patterns.map(p => ({
      name: p.name,
      description: p.description,
      steps: JSON.parse(p.steps),
      confidence: p.confidence,
      successRate: p.success_count / (p.success_count + p.failure_count)
    }))
  });
}
```

---

## Quick Reference

```
STORAGE TIERS:
  Graphiti/Neo4j: Temporal knowledge graph (entities, relations)
  SQLite: Episodic memories, procedures, reflections
  Files: Steering updates, pattern exports

SELF-IMPROVEMENT LOOP:
  1. Execute (Antigravity Loop)
  2. Evaluate (success/failure/partial)
  3. Reflect (if failure, generate natural language)
  4. Extract (patterns from success)
  5. Update (knowledge graph)
  6. Evolve (steering files)
  7. Broadcast (cross-agent learning)

RETRIEVAL MODES:
  Semantic: Embedding similarity
  Keyword: Exact match
  Graph: Relation traversal
  Temporal: Time-based
  Reflection: Past failures

CONFIDENCE THRESHOLDS:
  > 0.85: Promote to steering
  > 0.70: Use confidently
  > 0.50: Use with monitoring
  < 0.50: Review or deprecate
```

---

*"Storage is memory. Memory is learning. Learning is evolution."*

🔭 VEGA Ξ172167
