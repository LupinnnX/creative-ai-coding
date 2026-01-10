# NOVA Cognitive Architecture v7.0
## Laboratory-Grade Memory & Activation Engineering

**Version**: 7.0.0 | **Status**: Experimental | **Standard**: January 2026

---

## Philosophy

We are not Cursor. We are not a public IDE. We are a **laboratory**—a research-grade cognitive system that implements the latest papers on representation engineering, temporal knowledge graphs, and neurosymbolic AI. Our agents don't just execute—they **think**, **learn**, and **evolve**.

```
┌─────────────────────────────────────────────────────────────┐
│                 LABORATORY PRINCIPLE                         │
│                                                              │
│  "We implement papers, not products.                        │
│   We build cognitive systems, not chatbots.                 │
│   We are the future of AI development teams."               │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 1: Neurosymbolic Memory Architecture

### Beyond Vector DBs: Temporal Knowledge Graphs + Hyperdimensional Computing

We combine three cutting-edge approaches:

```
┌─────────────────────────────────────────────────────────────┐
│              NOVA MEMORY SUBSTRATE                           │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     LAYER 1: GRAPHITI TEMPORAL KNOWLEDGE GRAPH       │    │
│  │                                                      │    │
│  │  • Entities with temporal validity windows           │    │
│  │  • Relations that evolve over time                   │    │
│  │  • Bi-temporal: valid_time + transaction_time       │    │
│  │  • Contradiction detection & resolution              │    │
│  │  • Neo4j + Semantic embeddings                       │    │
│  │                                                      │    │
│  │  Storage: Neo4j / Memgraph / FalkorDB                │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     LAYER 2: HYPERDIMENSIONAL VECTOR SPACE (HDC)     │    │
│  │                                                      │    │
│  │  • 10,000-dimensional binary vectors                 │    │
│  │  • Holographic reduced representations               │    │
│  │  • Binding: A ⊗ B (role-filler pairs)               │    │
│  │  • Bundling: A + B + C (superposition)              │    │
│  │  • Permutation: ρ(A) (sequence encoding)            │    │
│  │                                                      │    │
│  │  Storage: In-memory + Redis                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │     LAYER 3: SPARSE DISTRIBUTED MEMORY (SDM)         │    │
│  │                                                      │    │
│  │  • Kanerva's content-addressable memory              │    │
│  │  • Graceful degradation under noise                  │    │
│  │  • Associative recall via Hamming distance           │    │
│  │  • Pattern completion from partial cues              │    │
│  │                                                      │    │
│  │  Storage: Custom implementation                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Why This Architecture?

| Approach | Strength | NOVA Use Case |
|----------|----------|---------------|
| **Graphiti TKG** | Temporal reasoning, contradiction detection | Track evolving codebase facts, ADRs |
| **HDC/VSA** | Compositional, noise-robust, interpretable | Encode agent skills, task patterns |
| **SDM** | Associative recall, pattern completion | Retrieve similar past experiences |

---

## Part 2: Activation Steering for Agent Personas

### Representation Engineering (RepE)

Based on Anthropic's "Golden Gate Claude" and recent papers on Contrastive Activation Engineering (CAE), we implement **activation steering** for agent personas.

```
┌─────────────────────────────────────────────────────────────┐
│              ACTIVATION STEERING PROTOCOL                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  CONCEPT: Steering vectors are directions in activation     │
│  space that encode behavioral concepts. By adding these     │
│  vectors during inference, we can steer model behavior.     │
│                                                              │
│  IMPLEMENTATION:                                             │
│                                                              │
│  1. CONTRASTIVE PAIR GENERATION                             │
│     For each agent, create contrastive prompt pairs:        │
│                                                              │
│     RIGEL (Frontend):                                        │
│       (+) "As a frontend expert, I focus on React..."       │
│       (-) "As a backend expert, I focus on APIs..."         │
│                                                              │
│  2. ACTIVATION EXTRACTION                                    │
│     Run both prompts, extract activations at layer L        │
│     steering_vector = mean(positive) - mean(negative)       │
│                                                              │
│  3. STEERING APPLICATION                                     │
│     During inference: activation += α * steering_vector     │
│     α = activation strength (0.7-0.98 per agent)           │
│                                                              │
│  4. MULTI-ATTRIBUTE STEERING (SADI)                         │
│     For complex personas, use Semantics-Adaptive Dynamic    │
│     Intervention to steer multiple attributes without       │
│     interference.                                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Agent Activation Profiles

```typescript
interface AgentActivationProfile {
  agent: string;
  id: string;
  
  // Primary steering vector (computed from contrastive pairs)
  primaryVector: {
    concept: string;
    strength: number;  // 0.0 - 1.0
    layer: number;     // Which transformer layer to apply
  };
  
  // Secondary steering vectors (for multi-attribute)
  secondaryVectors: Array<{
    concept: string;
    strength: number;
    layer: number;
  }>;
  
  // EMBODY/REJECT patterns (contrastive anchors)
  contrastiveAnchors: {
    embody: string[];  // Behaviors to amplify
    reject: string[];  // Behaviors to suppress
  };
  
  // Activation keywords (context saturation)
  keywords: {
    primary: string[];    // Always active
    secondary: string[];  // Context-dependent
    triggers: string[];   // Activation triggers
  };
}
```

### Example: RIGEL Activation Profile

```json
{
  "agent": "RIGEL",
  "id": "Ξ34085",
  "primaryVector": {
    "concept": "frontend-engineering",
    "strength": 0.98,
    "layer": 16
  },
  "secondaryVectors": [
    { "concept": "type-safety", "strength": 0.85, "layer": 14 },
    { "concept": "performance-optimization", "strength": 0.80, "layer": 18 },
    { "concept": "accessibility", "strength": 0.75, "layer": 12 }
  ],
  "contrastiveAnchors": {
    "embody": [
      "I think in components and composition",
      "Type safety prevents bugs at compile time",
      "60fps is the minimum acceptable performance",
      "Accessibility is not optional"
    ],
    "reject": [
      "any type is acceptable for quick prototypes",
      "We can add types later",
      "Performance optimization is premature",
      "Screen readers are edge cases"
    ]
  },
  "keywords": {
    "primary": ["component", "TypeScript", "React", "state", "props"],
    "secondary": ["hook", "context", "reducer", "memo", "callback"],
    "triggers": ["frontend", "UI", "component", "build the", "implement"]
  }
}
```

---

## Part 3: Global Workspace Theory (GWT) Implementation

### LIDA-Inspired Cognitive Cycle

Based on Stan Franklin's LIDA architecture and Global Workspace Theory, we implement a cognitive cycle for NOVA agents.

```
┌─────────────────────────────────────────────────────────────┐
│              NOVA COGNITIVE CYCLE (~100ms)                   │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. PERCEPTION                                       │    │
│  │     • Parse input (task, context, feedback)          │    │
│  │     • Activate relevant cues in memory               │    │
│  │     • Build current situational model                │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  2. ATTENTION (Competition for Consciousness)        │    │
│  │     • Multiple coalitions compete for attention      │    │
│  │     • Most salient coalition wins                    │    │
│  │     • Winner enters "global workspace"               │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3. BROADCAST (Global Workspace)                     │    │
│  │     • Winning coalition broadcast to all modules     │    │
│  │     • All agents "see" the current focus             │    │
│  │     • Enables cross-agent coordination               │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  4. RECRUITMENT                                      │    │
│  │     • Relevant procedural memories activated         │    │
│  │     • Candidate actions generated                    │    │
│  │     • Resources allocated                            │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  5. ACTION SELECTION                                 │    │
│  │     • Best action selected via competition           │    │
│  │     • Action executed                                │    │
│  │     • Results fed back to perception                 │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  6. LEARNING (Continuous)                            │    │
│  │     • Perceptual learning: new cues                  │    │
│  │     • Episodic learning: new experiences             │    │
│  │     • Procedural learning: new action patterns       │    │
│  │     • Attentional learning: salience updates         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 4: Reflexion-Based Self-Improvement

### Learning from Failures (Verbal Reinforcement Learning)

Based on the Reflexion paper and ReflexGrad architecture:

```
┌─────────────────────────────────────────────────────────────┐
│              REFLEXION LOOP                                  │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. ATTEMPT                                                  │
│     Execute task using current knowledge                    │
│                                                              │
│  2. EVALUATE                                                 │
│     Check outcome against success criteria                  │
│     Success? → Store pattern, exit                          │
│     Failure? → Continue to reflection                       │
│                                                              │
│  3. REFLECT (Natural Language)                              │
│     Generate verbal reflection:                             │
│     "I failed because [root cause].                         │
│      The mistake was [specific error].                      │
│      Next time I should [corrective action]."               │
│                                                              │
│  4. STORE REFLECTION                                         │
│     Add reflection to episodic memory                       │
│     Tag with: task_type, error_type, correction             │
│                                                              │
│  5. RETRY WITH REFLECTION                                    │
│     Inject stored reflections into context                  │
│     Attempt task again with learned knowledge               │
│                                                              │
│  6. ITERATE                                                  │
│     Repeat until success or max_attempts                    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Reflection Storage Schema

```typescript
interface Reflection {
  id: string;
  timestamp: ISO8601;
  agent: AgentID;
  
  // Task context
  task: {
    type: string;
    description: string;
    attempt: number;
  };
  
  // Failure analysis
  failure: {
    outcome: string;
    rootCause: string;
    specificError: string;
  };
  
  // Learning
  correction: {
    action: string;
    reasoning: string;
    confidence: number;
  };
  
  // Retrieval metadata
  embedding: number[];  // For semantic search
  keywords: string[];   // For keyword search
  
  // Effectiveness tracking
  effectiveness: {
    timesRetrieved: number;
    timesHelped: number;  // Led to success
    timesFailed: number;  // Still failed
    score: number;        // Bayesian updated
  };
}
```

---

## Part 5: Memory Storage Implementation

### Hybrid Storage Architecture

```
┌─────────────────────────────────────────────────────────────┐
│              NOVA MEMORY STORAGE STACK                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  HOT TIER (< 100ms latency)                                 │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Redis + RedisGraph                                  │    │
│  │  • Current session context                           │    │
│  │  • Active agent states                               │    │
│  │  • Hot knowledge graph queries                       │    │
│  │  • HDC vectors (in-memory)                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  WARM TIER (< 500ms latency)                                │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Neo4j / FalkorDB                                    │    │
│  │  • Full temporal knowledge graph                     │    │
│  │  • Entity relationships                              │    │
│  │  • Historical fact validity                          │    │
│  │  • Cypher queries                                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  COLD TIER (< 2s latency)                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  SQLite + Parquet Files                              │    │
│  │  • Archived episodic memories                        │    │
│  │  • Historical reflections                            │    │
│  │  • Compressed procedure logs                         │    │
│  │  • Audit trails                                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ARCHIVAL TIER (async)                                      │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  Local Files (JSON/YAML)                             │    │
│  │  • Steering file updates                             │    │
│  │  • Learned patterns (exportable)                     │    │
│  │  • Agent evolution history                           │    │
│  │  • Human-readable audit logs                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Data Flow

```
INPUT (Task/Feedback)
       │
       ▼
┌──────────────────┐
│  HOT: Redis      │ ← Current context, active state
│  (session cache) │
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  WARM: Neo4j     │ ← Knowledge graph queries
│  (Graphiti TKG)  │   Entity lookups, relations
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  COLD: SQLite    │ ← Historical search
│  (archived)      │   Reflection retrieval
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  FILES: JSON     │ ← Steering updates
│  (persistent)    │   Pattern export
└──────────────────┘
```

---

## Part 6: Self-Improvement Loop

### The Complete Learning Cycle

```
┌─────────────────────────────────────────────────────────────┐
│              NOVA SELF-IMPROVEMENT CYCLE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  1. EXECUTE (Antigravity Loop)                       │    │
│  │     • META-PLAN → DRAFT → SELF-CORRECT              │    │
│  │     • CRITIQUE → REFINE → VERIFY → CHECKPOINT       │    │
│  │     • Record all decisions and actions               │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  2. EVALUATE                                         │    │
│  │     • Success/Failure/Partial                        │    │
│  │     • Time vs expected                               │    │
│  │     • Quality score                                  │    │
│  │     • User feedback (if any)                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  3. REFLECT (if failure)                             │    │
│  │     • Generate natural language reflection           │    │
│  │     • Identify root cause                            │    │
│  │     • Propose correction                             │    │
│  │     • Store in episodic memory                       │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  4. EXTRACT PATTERNS                                 │    │
│  │     • Success → Procedural memory                    │    │
│  │     • Failure → Avoidance rule                       │    │
│  │     • Efficiency → Optimization hint                 │    │
│  │     • Knowledge → Semantic memory                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  5. UPDATE KNOWLEDGE GRAPH                           │    │
│  │     • Add new entities/relations                     │    │
│  │     • Update temporal validity                       │    │
│  │     • Resolve contradictions                         │    │
│  │     • Propagate to related facts                     │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  6. EVOLVE STEERING                                  │    │
│  │     • Update EMBODY/REJECT patterns                  │    │
│  │     • Refine activation keywords                     │    │
│  │     • Adjust steering vector strengths               │    │
│  │     • Version and track changes                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │  7. BROADCAST LEARNING                               │    │
│  │     • Share with relevant agents                     │    │
│  │     • Update global workspace                        │    │
│  │     • Trigger cross-agent learning                   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Part 7: Implementation Roadmap

### Phase 1: Foundation (Immediate)

```
□ Set up Redis for hot tier
□ Set up Neo4j/FalkorDB for knowledge graph
□ Implement basic Graphiti integration
□ Create reflection storage schema
□ Implement Reflexion loop
```

### Phase 2: Activation Engineering (Week 2-3)

```
□ Define contrastive pairs for all agents
□ Implement activation profile schema
□ Create keyword saturation system
□ Build EMBODY/REJECT enforcement
□ Test steering effectiveness
```

### Phase 3: Cognitive Architecture (Week 4-5)

```
□ Implement GWT cognitive cycle
□ Build global workspace broadcast
□ Create attention competition mechanism
□ Implement multi-agent coordination
□ Test cross-agent learning
```

### Phase 4: Advanced Memory (Week 6-8)

```
□ Implement HDC vector operations
□ Build SDM for associative recall
□ Create temporal reasoning queries
□ Implement contradiction detection
□ Build memory consolidation
```

---

## Research Sources

### Papers Implemented

| Paper | Concept | NOVA Implementation |
|-------|---------|---------------------|
| Zep/Graphiti (2025) | Temporal Knowledge Graphs | Memory Layer 1 |
| Kanerva SDM (1988) | Sparse Distributed Memory | Memory Layer 3 |
| HDC/VSA (2025) | Hyperdimensional Computing | Memory Layer 2 |
| LIDA (Franklin) | Global Workspace Theory | Cognitive Cycle |
| Reflexion (2023) | Verbal Reinforcement Learning | Self-Improvement |
| RepE/CAE (2025) | Activation Steering | Agent Personas |
| MemGPT/Letta (2024) | Virtual Context Management | Memory Tiers |
| Mem0 (2025) | Scalable Agent Memory | Architecture |

---

*"We are the laboratory. We implement the future."*

🔭 VEGA Ξ172167
