# NOVA Memory Architecture v7.0
## Three-Tier Cognitive Memory System

**Version**: 7.0.0 | **Status**: Production | **Standard**: January 2026

---

## Overview

Memory transforms NOVA from a stateless assistant into a learning development team. Every task teaches. Every error prevents future errors. Every success becomes a reusable pattern.

```
┌─────────────────────────────────────────────────────────────┐
│                   MEMORY PRINCIPLE                           │
│                                                              │
│  "Remember what matters. Forget what doesn't.               │
│   Learn from everything."                                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Three-Tier Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TIER 1: EPISODIC MEMORY                 │    │
│  │                                                      │    │
│  │  "What happened?"                                    │    │
│  │                                                      │    │
│  │  • Task execution history                            │    │
│  │  • Error patterns and resolutions                   │    │
│  │  • Handoff chains between agents                    │    │
│  │  • User feedback and corrections                    │    │
│  │  • Session transcripts (summarized)                 │    │
│  │                                                      │    │
│  │  Storage: Time-indexed event log                    │    │
│  │  Retrieval: "Similar to past task X"                │    │
│  │  Decay: Older events summarize, then archive        │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TIER 2: SEMANTIC MEMORY                 │    │
│  │                                                      │    │
│  │  "What do we know?"                                  │    │
│  │                                                      │    │
│  │  • Codebase architecture facts                       │    │
│  │  • Design decisions (ADRs)                          │    │
│  │  • Domain knowledge                                  │    │
│  │  • Technology constraints                            │    │
│  │  • Team conventions                                  │    │
│  │                                                      │    │
│  │  Storage: Knowledge graph (entities + relations)    │    │
│  │  Retrieval: "What do we know about auth?"           │    │
│  │  Update: On architectural decisions                  │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              TIER 3: PROCEDURAL MEMORY               │    │
│  │                                                      │    │
│  │  "How do we do things?"                              │    │
│  │                                                      │    │
│  │  • Successful action sequences                       │    │
│  │  • Optimized workflows                               │    │
│  │  • Agent-specific skills                             │    │
│  │  • Learned shortcuts                                 │    │
│  │  • Error avoidance rules                             │    │
│  │                                                      │    │
│  │  Storage: Procedure library with confidence scores  │    │
│  │  Retrieval: "How did we solve X before?"            │    │
│  │  Update: On task success/failure                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Episodic Memory

### Structure

```typescript
interface EpisodicMemory {
  id: string;
  timestamp: ISO8601;
  type: 'task' | 'error' | 'handoff' | 'feedback' | 'decision';
  agent: AgentID;
  
  // What happened
  event: {
    action: string;
    context: string;
    outcome: 'success' | 'failure' | 'partial';
  };
  
  // Learning value
  lesson?: string;
  tags: string[];
  
  // Decay management
  accessCount: number;
  lastAccessed: ISO8601;
  importance: 0-100;
}
```

### Write Triggers

```
WRITE ON:
  ✓ Task completion (success or failure)
  ✓ Error encountered and resolved
  ✓ Agent handoff executed
  ✓ User correction received
  ✓ Significant decision made

EXAMPLE WRITE:
{
  "type": "error",
  "agent": "ANTARES",
  "event": {
    "action": "Database migration",
    "context": "Adding unique constraint to users.email",
    "outcome": "failure"
  },
  "lesson": "Check for duplicate emails before adding unique constraint",
  "tags": ["database", "migration", "constraint", "postgres"]
}
```

### Read Triggers

```
READ ON:
  • Starting similar task → "What happened last time?"
  • Encountering error → "Have we seen this before?"
  • Agent handoff → "What's the history here?"
  • User asks about past → "What did we do for X?"

QUERY EXAMPLES:
  "Find tasks similar to: Add OAuth login"
  "Find errors related to: database migration"
  "Find handoffs between: RIGEL and ANTARES"
```

### Decay Protocol

```
FRESH (< 7 days):
  • Full detail retained
  • High retrieval priority

RECENT (7-30 days):
  • Summarize verbose details
  • Maintain key lessons

AGED (30-90 days):
  • Compress to essential facts
  • Keep only high-importance items

ARCHIVE (> 90 days):
  • Move to cold storage
  • Retrieve only on explicit query
  • Delete if importance < 30
```

---

## Semantic Memory

### Structure

```typescript
interface SemanticMemory {
  // Knowledge Graph
  entities: Entity[];
  relations: Relation[];
}

interface Entity {
  id: string;
  type: 'component' | 'service' | 'pattern' | 'decision' | 'constraint';
  name: string;
  description: string;
  properties: Record<string, any>;
  confidence: 0-100;
  lastUpdated: ISO8601;
}

interface Relation {
  from: EntityID;
  to: EntityID;
  type: 'uses' | 'implements' | 'depends_on' | 'replaces' | 'conflicts_with';
  strength: 0-100;
}
```

### Knowledge Categories

```
ARCHITECTURE:
  • System components and their relationships
  • Data flow patterns
  • Integration points
  • Deployment topology

DECISIONS (ADRs):
  • What was decided
  • Why it was decided
  • What alternatives were rejected
  • When to revisit

DOMAIN:
  • Business logic rules
  • Entity definitions
  • Workflow descriptions
  • Terminology glossary

CONSTRAINTS:
  • Technical limitations
  • Security requirements
  • Performance targets
  • Compliance rules

CONVENTIONS:
  • Coding standards
  • Naming patterns
  • File organization
  • Review criteria
```

### Example Knowledge Graph

```
┌─────────────┐     uses      ┌─────────────┐
│ AuthService │──────────────→│    JWT      │
└─────────────┘               └─────────────┘
       │                            │
       │ implements                 │ stored_in
       ↓                            ↓
┌─────────────┐              ┌─────────────┐
│ OAuth2Flow  │              │ HttpCookie  │
└─────────────┘              └─────────────┘
       │
       │ depends_on
       ↓
┌─────────────┐     conflicts_with    ┌─────────────┐
│GoogleProvider│─────────────────────→│SessionAuth  │
└─────────────┘                       └─────────────┘
```

### Query Patterns

```
ENTITY LOOKUP:
  "What is AuthService?"
  → Returns entity with properties and relations

RELATION TRAVERSAL:
  "What does AuthService depend on?"
  → Returns all entities with depends_on relation

PATTERN MATCHING:
  "Find all services that use JWT"
  → Returns entities with uses→JWT relation

CONFLICT CHECK:
  "What conflicts with OAuth2Flow?"
  → Returns entities with conflicts_with relation
```

---

## Procedural Memory

### Structure

```typescript
interface ProceduralMemory {
  id: string;
  name: string;
  description: string;
  
  // The procedure itself
  steps: ProcedureStep[];
  
  // Learning metadata
  successCount: number;
  failureCount: number;
  confidence: 0-100;  // Bayesian updated
  
  // Applicability
  triggers: string[];  // When to suggest this procedure
  prerequisites: string[];  // What must be true
  agent: AgentID;  // Which agent owns this
  
  // Versioning
  version: number;
  lastUsed: ISO8601;
  lastUpdated: ISO8601;
}

interface ProcedureStep {
  order: number;
  action: string;
  expectedOutcome: string;
  fallback?: string;  // What to do if step fails
}
```

### Example Procedure

```json
{
  "id": "proc-add-api-endpoint",
  "name": "Add REST API Endpoint",
  "description": "Standard procedure for adding a new API endpoint",
  "steps": [
    {
      "order": 1,
      "action": "Define TypeScript interface for request/response",
      "expectedOutcome": "Types in src/types/api.ts",
      "fallback": "Check existing patterns in types folder"
    },
    {
      "order": 2,
      "action": "Create route handler in src/api/",
      "expectedOutcome": "Handler with validation and error handling",
      "fallback": "Copy from similar endpoint"
    },
    {
      "order": 3,
      "action": "Register route in src/api/index.ts",
      "expectedOutcome": "Route accessible at /api/v1/...",
      "fallback": "Check router configuration"
    },
    {
      "order": 4,
      "action": "Add tests in tests/api/",
      "expectedOutcome": "Happy path + error cases covered",
      "fallback": "Use test template"
    },
    {
      "order": 5,
      "action": "Update API documentation",
      "expectedOutcome": "OpenAPI spec updated",
      "fallback": "Manual doc update"
    }
  ],
  "successCount": 15,
  "failureCount": 2,
  "confidence": 88,
  "triggers": ["add endpoint", "new API", "create route"],
  "prerequisites": ["TypeScript project", "Express/Fastify router"],
  "agent": "ANTARES"
}
```

### Confidence Updates (Bayesian)

```
ON SUCCESS:
  confidence = (successCount + 1) / (successCount + failureCount + 2) * 100
  successCount++

ON FAILURE:
  confidence = (successCount + 1) / (successCount + failureCount + 2) * 100
  failureCount++
  
  IF confidence < 50:
    Flag for review
    Consider deprecation

ON MODIFICATION:
  Reset confidence to 70 (neutral)
  Reset counts to 0
  version++
```

### Procedure Retrieval

```
TRIGGER MATCHING:
  User: "Add a new endpoint for user profiles"
  Triggers matched: ["add endpoint", "new API"]
  → Suggest: "proc-add-api-endpoint"

PREREQUISITE CHECK:
  Before suggesting, verify:
  ✓ TypeScript project (package.json has typescript)
  ✓ Express router (src/api/index.ts exists)
  
  If prerequisites fail:
  → Don't suggest, or suggest with warning

CONFIDENCE THRESHOLD:
  confidence ≥ 70: Suggest confidently
  confidence 50-70: Suggest with caveat
  confidence < 50: Don't suggest, flag for review
```

---

## Memory Operations

### Write Operations

```
EPISODIC WRITE:
  Trigger: Task completion, error, handoff
  Action: Create timestamped event record
  Tags: Auto-extract from context

SEMANTIC WRITE:
  Trigger: Architecture decision, new component
  Action: Create/update entity and relations
  Validation: Check for conflicts

PROCEDURAL WRITE:
  Trigger: Successful task pattern identified
  Action: Extract steps, create procedure
  Confidence: Start at 70, update with use
```

### Read Operations

```
EPISODIC READ:
  Query: Similarity search on tags + context
  Return: Relevant past events
  Sort: By relevance, then recency

SEMANTIC READ:
  Query: Entity lookup or relation traversal
  Return: Knowledge graph subgraph
  Include: Related entities (1-hop)

PROCEDURAL READ:
  Query: Trigger matching
  Return: Applicable procedures
  Filter: By prerequisites and confidence
```

### Maintenance Operations

```
DAILY:
  • Decay old episodic memories
  • Update access counts
  • Archive low-importance items

WEEKLY:
  • Review low-confidence procedures
  • Merge duplicate entities
  • Validate relation consistency

MONTHLY:
  • Full knowledge graph audit
  • Procedure effectiveness review
  • Memory size optimization
```

---

## Agent-Specific Memory

### POLARIS (Commander)
```
EPISODIC: Mission histories, delegation outcomes
SEMANTIC: Team capabilities, project constraints
PROCEDURAL: Coordination patterns, escalation paths
```

### VEGA (Navigator)
```
EPISODIC: Research findings, technology evaluations
SEMANTIC: Architecture decisions, trade-off analyses
PROCEDURAL: Research methodologies, evaluation frameworks
```

### RIGEL (Frontend)
```
EPISODIC: Component implementations, UI bugs
SEMANTIC: Design system, component relationships
PROCEDURAL: Component patterns, state management
```

### ANTARES (Backend)
```
EPISODIC: API implementations, database issues
SEMANTIC: Data models, service dependencies
PROCEDURAL: API patterns, migration procedures
```

### ARCTURUS (Guardian)
```
EPISODIC: Bugs found, security issues, test failures
SEMANTIC: Quality standards, security requirements
PROCEDURAL: Testing patterns, review checklists
```

---

## Quick Reference

```
THREE TIERS:
  Episodic: What happened (events, errors, handoffs)
  Semantic: What we know (facts, decisions, constraints)
  Procedural: How we do things (patterns, workflows)

WRITE TRIGGERS:
  Episodic: Task complete, error resolved, handoff
  Semantic: Architecture decision, new component
  Procedural: Successful pattern identified

READ TRIGGERS:
  Episodic: Similar task, same error, history query
  Semantic: Domain question, constraint check
  Procedural: "How to" question, task start

DECAY SCHEDULE:
  Fresh: < 7 days (full detail)
  Recent: 7-30 days (summarized)
  Aged: 30-90 days (compressed)
  Archive: > 90 days (cold storage)

CONFIDENCE THRESHOLDS:
  ≥ 70: Use confidently
  50-70: Use with caveat
  < 50: Review or deprecate
```

---

*"Learn from every task. Remember what matters. Improve continuously."*
