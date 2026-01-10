# NOVA Context Engineering v1.0
## Memory Architecture & Structured Handoffs

**Version**: 1.0.0 | **Status**: Production | **Standard**: December 2025

---

## Overview

Context engineering is the art of optimizing what information reaches the LLM's context window. The context window is a finite, precious resource—every token matters.

```
┌─────────────────────────────────────────────────────────────┐
│               CONTEXT ENGINEERING PRINCIPLE                  │
│                                                              │
│  "The context window is not a dumping ground.               │
│   It is a carefully curated decision-support system."       │
└─────────────────────────────────────────────────────────────┘
```

---

## Memory Architecture

### Two-Tier Memory System

```
┌─────────────────────────────────────────────────────────────┐
│                    MEMORY ARCHITECTURE                       │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           LONG-TERM MEMORY (Semantic)                │    │
│  │                                                      │    │
│  │  • Facts about the codebase (architecture, patterns) │    │
│  │  • Decisions made (ADRs, design choices)            │    │
│  │  • Agent-specific knowledge (domain expertise)       │    │
│  │  • Mission history (completed tasks, lessons)        │    │
│  │                                                      │    │
│  │  Storage: Files, docs, mission history               │    │
│  │  Retrieval: On-demand via explicit queries           │    │
│  └─────────────────────────────────────────────────────┘    │
│                          ↓                                   │
│                    [Retrieval Layer]                         │
│                          ↓                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │           SHORT-TERM MEMORY (Episodic)               │    │
│  │                                                      │    │
│  │  • Current conversation context                      │    │
│  │  • Active task details                               │    │
│  │  • Recent file changes                               │    │
│  │  • Current reasoning chain (checkpoints)             │    │
│  │  • Handoff context from previous agent               │    │
│  │                                                      │    │
│  │  Storage: Context window (volatile)                  │    │
│  │  Retrieval: Always present in active context         │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Context Window Budget

For a typical 128K-200K context window:

```
████████████████████████░░░░░░░░░░░░░░░░░░  SYSTEM (25%)
│ Agent persona, keywords, cognition rules
│ ~50K tokens reserved

████████████████████████████████░░░░░░░░░░  TASK (40%)
│ Current task details, relevant files, requirements
│ ~80K tokens available

████████████████░░░░░░░░░░░░░░░░░░░░░░░░░░  HISTORY (20%)
│ Recent conversation, handoff context
│ ~40K tokens available

████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  SCRATCH (15%)
│ Reasoning space, drafts, checkpoints
│ ~30K tokens available
```

---

## Context Pruning Protocol

```
PRIORITY 1 (Never prune):
  ✓ Current task requirements
  ✓ Active file contents being modified
  ✓ Agent activation keywords
  ✓ Error messages and stack traces (when debugging)

PRIORITY 2 (Summarize if needed):
  ○ Previous conversation turns → summarize to key decisions
  ○ Long file contents → extract relevant sections only
  ○ Historical context → compress to lessons learned

PRIORITY 3 (Prune first):
  ✗ Verbose explanations already acknowledged
  ✗ Duplicate information across sources
  ✗ Exploratory branches that led nowhere
  ✗ Formatting/styling that doesn't affect logic
```

---

## Structured Handoffs

### Handoff Protocol v2.0

Every handoff between agents MUST include:

```
┌─────────────────────────────────────────────────────────────┐
│                    HANDOFF TEMPLATE v2.0                     │
├─────────────────────────────────────────────────────────────┤

## Handoff: {FROM_AGENT} → {TO_AGENT}
**Task ID**: {task_id}
**Timestamp**: {ISO timestamp}

### 1. WHAT I DID (Required)
Summary of completed work:
- [Action 1]: [Result/Outcome]
- [Action 2]: [Result/Outcome]
- Files modified: [list with brief description]

### 2. WHAT YOU NEED TO DO (Required)
Clear, actionable next steps:
1. [Specific action with acceptance criteria]
2. [Specific action with acceptance criteria]
Priority: {HIGH/MEDIUM/LOW}

### 3. CONTEXT YOU NEED (Required)
Critical information for success:
- **Key Files**: [files to read first]
- **Key Decisions**: [decisions made and why]
- **Key Constraints**: [limitations to be aware of]
- **Key Dependencies**: [what this depends on]

### 4. WATCH OUT FOR (Required)
Known risks and edge cases:
- ⚠️ [Risk 1]: [Mitigation or handling]
- ⚠️ [Risk 2]: [Mitigation or handling]

### 5. REASONING CHECKPOINT (Optional)
Transfer of reasoning state:
- Approach taken: [why this approach]
- Alternatives considered: [what was rejected and why]
- Confidence level: [0-100%]
- Open questions: [unresolved uncertainties]

└─────────────────────────────────────────────────────────────┘
```

---

## Handoff Validation Checklist

```
SENDER CHECKLIST:
  □ All sections of handoff template filled
  □ Files locked are explicitly listed
  □ No assumptions left unstated
  □ Acceptance criteria are specific and testable
  □ Risks identified are actionable

RECEIVER CHECKLIST:
  □ Read entire handoff context
  □ Identified any blocking questions
  □ Confirmed understanding of task
  □ Loaded relevant activation keywords
```

---

## Handoff Anti-Patterns

```
❌ "Continue working on the auth feature"
   → Missing: what was done, what's next, what to watch for

❌ "See the code for details"
   → Missing: key decisions, reasoning, risks

❌ "It should work, just needs testing"
   → Missing: what "work" means, what tests, known issues

❌ Handoff without task ID or mission reference
   → Missing: traceability, context linkage

✅ GOOD HANDOFF:
   "TASK-201: Enhanced LoginForm component to support OAuth.
    Files modified: LoginForm.tsx (added OAuth buttons, state).
    You need to: Integrate with ANTARES's OAuth backend endpoints.
    Watch for: Token refresh edge case not yet handled.
    Key decision: Used Zustand for OAuth state to share across components."
```

---

## Context Retrieval Patterns

### When to Retrieve Long-Term Memory

```
TRIGGER: Starting new task
  → Retrieve: Related ADRs, previous similar tasks, codebase patterns

TRIGGER: Encountering unfamiliar domain
  → Retrieve: Domain documentation, glossary, expert notes

TRIGGER: Making architectural decision
  → Retrieve: Existing architecture docs, constraints, past decisions

TRIGGER: Debugging complex issue
  → Retrieve: Related past issues, known gotchas, debugging notes

TRIGGER: Handoff from another agent
  → Retrieve: Full handoff context, related file history
```

---

## Best Practices

### DO

```
✓ Load agent keywords first (establishes persona)
✓ Include full file contents when modifying (avoid partial context)
✓ Summarize long histories into key decisions
✓ Explicitly state constraints upfront
✓ Use structured handoffs between agents
✓ Checkpoint reasoning state for continuity
✓ Prune aggressively when context fills
```

### DON'T

```
✗ Dump entire codebase into context
✗ Include files not relevant to current task
✗ Rely on implicit assumptions about shared context
✗ Handoff without structured context
✗ Let reasoning chains run without checkpoints
✗ Assume previous context persists across sessions
```

---

## Quick Reference

```
MEMORY TYPES:
  Long-term Semantic: Architecture, patterns, decisions
  Long-term Episodic: Mission history, lessons
  Short-term Working: Current task, active files
  Short-term Scratch: Reasoning steps, drafts

CONTEXT BUDGET:
  System: 25% (persona, keywords, rules)
  Task: 40% (requirements, files)
  History: 20% (conversation, handoffs)
  Scratch: 15% (reasoning space)

HANDOFF REQUIRED SECTIONS:
  1. What I did
  2. What you need to do
  3. Context you need
  4. Watch out for
  5. Reasoning checkpoint (recommended)

PRUNING PRIORITY:
  Never: Current task, active files, keywords
  Summarize: History, long files
  Prune First: Duplicates, dead ends, verbose formatting
```

---

*"Context is the foundation of intelligence. Engineer it deliberately."*
