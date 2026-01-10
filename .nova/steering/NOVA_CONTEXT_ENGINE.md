# NOVA Context Engine v7.0
## Dynamic Context Injection & Agentic RAG

**Version**: 7.0.0 | **Status**: Production | **Standard**: January 2026

---

## Overview

The Context Engine is NOVA's intelligence layer—it ensures every agent has exactly the right information at the right time. No more context dumping. No more hallucinated APIs.

```
┌─────────────────────────────────────────────────────────────┐
│                 CONTEXT ENGINE PRINCIPLE                     │
│                                                              │
│  "Load what you need. Verify what you use. Prune the rest." │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    CONTEXT ENGINE                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           1. TASK ANALYSIS                           │    │
│  │  • Extract keywords from task                        │    │
│  │  • Identify required domains                         │    │
│  │  • Determine context types needed                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           2. MULTI-SOURCE RETRIEVAL                  │    │
│  │  • Codebase files (local)                            │    │
│  │  • Documentation (Context7)                          │    │
│  │  • Memory (episodic/semantic/procedural)            │    │
│  │  • Web search (current info)                         │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           3. RELEVANCE FILTERING                     │    │
│  │  • Score each result                                 │    │
│  │  • Remove duplicates                                 │    │
│  │  • Prioritize by task alignment                      │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           4. CONTEXT INJECTION                       │    │
│  │  • Budget-aware loading                              │    │
│  │  • Structured formatting                             │    │
│  │  • Source attribution                                │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           5. CONTINUOUS PRUNING                      │    │
│  │  • Remove stale context                              │    │
│  │  • Summarize verbose sections                        │    │
│  │  • Maintain budget headroom                          │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Dynamic Context Injection Protocol

### Step 1: Task Keyword Extraction

```
INPUT: "Add OAuth login with Google provider"

EXTRACTED:
  Primary: [OAuth, login, Google, authentication]
  Secondary: [provider, social-login, identity]
  Domain: [auth, security, frontend, backend]
  
CONTEXT TYPES NEEDED:
  ✓ Existing auth code (local)
  ✓ OAuth library docs (Context7)
  ✓ Google OAuth setup (web search)
  ✓ Security patterns (SPICA memory)
```

### Step 2: Source Selection Matrix

| Context Type | Source | Priority | Budget |
|--------------|--------|----------|--------|
| Existing code patterns | Local codebase | HIGH | 30% |
| Library documentation | Context7 MCP | HIGH | 25% |
| Best practices | Web search | MEDIUM | 15% |
| Past decisions | Semantic memory | MEDIUM | 15% |
| Similar tasks | Episodic memory | LOW | 10% |
| Procedures | Procedural memory | LOW | 5% |

### Step 3: Retrieval Execution

```
PARALLEL RETRIEVAL:
  Thread 1: Search local codebase for auth patterns
  Thread 2: Query Context7 for OAuth library docs
  Thread 3: Search web for Google OAuth 2026 best practices
  Thread 4: Query memory for past auth decisions

MERGE RESULTS:
  • Deduplicate overlapping information
  • Rank by relevance score
  • Apply budget constraints
```

### Step 4: Injection Format

```markdown
## Injected Context for Task: OAuth Login

### Existing Auth Patterns (Local)
```typescript
// From src/auth/local-auth.ts
export async function authenticateUser(credentials: Credentials) {
  // ... existing pattern
}
```

### Library Documentation (Context7)
```
OAuth 2.0 with Google (v4.0.0):
- Use `google-auth-library` package
- Required scopes: ['email', 'profile']
- Token refresh: automatic with credentials
```

### Best Practices (Web - January 2026)
- Use PKCE flow for public clients
- Store tokens in httpOnly cookies
- Implement token rotation

### Past Decisions (Memory)
- ADR-007: Chose JWT over sessions for stateless auth
- Security review: SPICA approved OAuth flow 2025-11-15
```

---

## Context7 Integration

### Auto-Query Triggers

```
TRIGGER: Import statement detected
  import { OAuth2Client } from 'google-auth-library';
  → Query Context7: "google-auth-library OAuth2Client"

TRIGGER: Unknown API usage
  client.verifyIdToken({ ... })
  → Query Context7: "google-auth-library verifyIdToken parameters"

TRIGGER: Error with library
  Error: Invalid token signature
  → Query Context7: "google-auth-library token verification errors"

TRIGGER: Version mismatch suspected
  → Query Context7: "google-auth-library latest version breaking changes"
```

### Query Format

```
CONTEXT7 QUERY TEMPLATE:
{
  "library": "{package-name}",
  "topic": "{specific-topic}",
  "version": "{version-or-latest}",
  "include_examples": true
}

EXAMPLE:
{
  "library": "google-auth-library",
  "topic": "OAuth2Client authentication flow",
  "version": "latest",
  "include_examples": true
}
```

### Response Handling

```
ON SUCCESS:
  • Inject docs into context
  • Cache for session
  • Note version for consistency

ON PARTIAL:
  • Use available info
  • Flag gaps for web search
  • Note uncertainty

ON FAILURE:
  • Fall back to web search
  • Use training knowledge with disclaimer
  • Flag for human verification
```

---

## Agentic RAG Pipeline

### Traditional RAG vs Agentic RAG

```
TRADITIONAL RAG:
  Query → Vector Search → Top-K → Generate
  (Static, single-pass, no reasoning)

AGENTIC RAG (NOVA):
  Query → Intent Analysis → Strategy Selection
       → Multi-Source Planning → Parallel Retrieval
       → Relevance Scoring → Synthesis
       → Self-Correction → Confidence Check
       → Generate (or iterate)
```

### Implementation

```
┌─────────────────────────────────────────────────────────────┐
│                  AGENTIC RAG PIPELINE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. INTENT ANALYSIS (VEGA)                                  │
│     "What is the user really asking for?"                   │
│     "What information would fully answer this?"             │
│                                                              │
│  2. STRATEGY SELECTION                                       │
│     □ Code search (grep, AST)                               │
│     □ Documentation lookup (Context7)                       │
│     □ Web research (Brave)                                  │
│     □ Memory retrieval (episodic/semantic)                  │
│     □ Expert consultation (agent handoff)                   │
│                                                              │
│  3. PARALLEL RETRIEVAL                                       │
│     Execute selected strategies concurrently                │
│     Timeout: 10s per source                                 │
│                                                              │
│  4. RELEVANCE SCORING                                        │
│     Score each result 0-100:                                │
│     - Keyword match: 30%                                    │
│     - Semantic similarity: 30%                              │
│     - Source authority: 20%                                 │
│     - Recency: 20%                                          │
│                                                              │
│  5. SYNTHESIS                                                │
│     Merge top results into coherent context                 │
│     Resolve contradictions                                  │
│     Note confidence levels                                  │
│                                                              │
│  6. SELF-CORRECTION                                          │
│     "Did I miss anything obvious?"                          │
│     "Are there contradictions?"                             │
│     "Is confidence high enough to proceed?"                 │
│                                                              │
│  7. OUTPUT or ITERATE                                        │
│     Confidence ≥ 80%: Proceed with context                  │
│     Confidence < 80%: Refine query, retry                   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Context Budget Management

### Budget Allocation (200K context)

```
SYSTEM LAYER: 25% (50K tokens)
├── Agent persona & keywords: 10K
├── Cognition rules: 10K
├── Coordination protocols: 10K
├── Tool definitions: 10K
└── Reserved: 10K

TASK LAYER: 40% (80K tokens)
├── Current task requirements: 20K
├── Active file contents: 40K
├── Injected documentation: 15K
└── Reserved: 5K

HISTORY LAYER: 20% (40K tokens)
├── Recent conversation: 20K
├── Handoff context: 10K
├── Reasoning checkpoints: 5K
└── Reserved: 5K

SCRATCH LAYER: 15% (30K tokens)
├── Working drafts: 15K
├── Self-correction notes: 10K
└── Reserved: 5K
```

### Pruning Priority

```
PRUNE FIRST (Low value):
  ✗ Verbose explanations already acknowledged
  ✗ Duplicate information across sources
  ✗ Exploratory branches that led nowhere
  ✗ Old conversation turns (summarize instead)

SUMMARIZE (Medium value):
  ○ Long file contents → extract relevant sections
  ○ Historical context → compress to key decisions
  ○ Documentation → keep examples, trim prose

NEVER PRUNE (High value):
  ✓ Current task requirements
  ✓ Active file contents being modified
  ✓ Agent activation keywords
  ✓ Error messages and stack traces
  ✓ Handoff context from previous agent
```

---

## Per-Agent Context Profiles

### VEGA (Research)
```
PRIMARY SOURCES:
  • Web search (Brave) - 40%
  • Documentation (Context7) - 30%
  • Academic papers - 20%
  • Memory (semantic) - 10%

CONTEXT STYLE:
  • Comprehensive
  • Multiple perspectives
  • Source citations required
```

### RIGEL (Frontend)
```
PRIMARY SOURCES:
  • Local codebase (components) - 50%
  • Documentation (React, TypeScript) - 30%
  • Design specs (SIRIUS) - 15%
  • Memory (procedural) - 5%

CONTEXT STYLE:
  • Code-heavy
  • Type definitions included
  • Component patterns
```

### ANTARES (Backend)
```
PRIMARY SOURCES:
  • Local codebase (API, DB) - 50%
  • Documentation (frameworks) - 25%
  • Schema definitions - 15%
  • Memory (procedural) - 10%

CONTEXT STYLE:
  • API contracts
  • Database schemas
  • Error handling patterns
```

### ARCTURUS (Quality)
```
PRIMARY SOURCES:
  • Local codebase (all) - 40%
  • Test patterns - 25%
  • Security advisories - 20%
  • Memory (episodic - past bugs) - 15%

CONTEXT STYLE:
  • Edge cases emphasized
  • Security considerations
  • Test coverage gaps
```

---

## Quick Reference

```
CONTEXT ENGINE FLOW:
  1. Analyze task → Extract keywords
  2. Select sources → Plan retrieval
  3. Retrieve parallel → Score relevance
  4. Inject context → Format for agent
  5. Prune continuously → Maintain budget

CONTEXT7 TRIGGERS:
  • Import statements
  • Unknown APIs
  • Library errors
  • Version questions

BUDGET SPLIT:
  System: 25% | Task: 40% | History: 20% | Scratch: 15%

PRUNING ORDER:
  First: Duplicates, dead ends, verbose
  Then: Summarize history, long files
  Never: Current task, active files, keywords
```

---

*"Right context. Right time. Right agent."*
