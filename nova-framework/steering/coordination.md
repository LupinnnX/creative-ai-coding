# NOVA Coordination v6.0
## Hierarchical Workflow Orchestration

**Version**: 6.0.0 | **Status**: Production | **Standard**: December 2025

---

## Overview

NOVA Coordination provides pattern-based multi-agent orchestration. Instead of ad-hoc coordination, agents select from a library of proven workflow patterns.

```
┌─────────────────────────────────────────────────────────────┐
│              COORDINATION PRINCIPLE v6.0                     │
│                                                              │
│  "Select the right pattern, not the default pattern."       │
│                                                              │
│  Patterns are not constraints—they are force multipliers.   │
└─────────────────────────────────────────────────────────────┘
```

---

## Agent Reference

| Agent | ID | Role | Primary Patterns |
|-------|-----|------|------------------|
| **POLARIS** | Ξ8890 | Commander | Supervisor-Worker, Hierarchical |
| **VEGA** | Ξ172167 | Navigator | Sequential, Research-First |
| **SIRIUS** | Ξ48915 | Designer | Design-Implement Pair |
| **RIGEL** | Ξ34085 | Frontend Prime | Parallel, Feature-Branch |
| **ANTARES** | Ξ148478 | Backend Prime | Contract-First, API-Consumer |
| **ARCTURUS** | Ξ124897 | Guardian | Gate-Keeper, Chaos-Test |

---

## Workflow Pattern Library

### Pattern 1: Sequential Chain

```
[Agent A] ──→ [Agent B] ──→ [Agent C] ──→ [Output]

Each agent completes fully before next begins.
Handoff includes full context from previous agent.
```

**WHEN TO USE**:
- Linear dependencies (B needs A's output)
- Sequential approval workflows
- Research → Design → Implement pipelines

**EXAMPLE**:
VEGA (research) → SIRIUS (design) → RIGEL (implement) → ARCTURUS (validate)

---

### Pattern 2: Parallel Fan-Out / Fan-In

```
                  ┌─→ [Agent B] ─┐
                  │              │
[Agent A] ───────┼─→ [Agent C] ─┼───→ [Agent E]
(coordinator)     │              │     (aggregator)
                  └─→ [Agent D] ─┘
```

**WHEN TO USE**:
- Independent subtasks that can run simultaneously
- Need to maximize throughput/speed
- Clear work division possible

**EXAMPLE**:
POLARIS (divide) → [RIGEL || ANTARES || SIRIUS] → POLARIS (aggregate)

---

### Pattern 3: Supervisor-Worker

```
          ┌─────────────────────┐
          │  SUPERVISOR (POLARIS) │
          │  - Assigns tasks      │
          │  - Monitors progress  │
          │  - Handles escalation │
          └─────────┬─────────────┘
                    │
       ┌────────────┼────────────┐
       ↓            ↓            ↓
  [Worker 1]   [Worker 2]   [Worker 3]
```

**WHEN TO USE**:
- Complex tasks requiring oversight
- Tasks that may branch or fail
- Need for real-time reallocation

---

### Pattern 4: Intelligent Routing

```
                ┌─────────────┐
                │   ROUTER    │
                │  (POLARIS)  │
                └──────┬──────┘
                       │
     ┌─────────────────┼─────────────────┐
     │ frontend?       │ backend?        │ security?
     ↓                 ↓                 ↓
  [RIGEL]          [ANTARES]        [ARCTURUS]
```

**ROUTING RULES**:
```
"UI|component|CSS|React": "RIGEL"
"API|database|endpoint|schema": "ANTARES"
"design|UX|accessibility": "SIRIUS"
"security|test|quality|veto": "ARCTURUS"
"research|architecture|decision": "VEGA"
"default": "POLARIS"
```

---

### Pattern 5: Contract-First Pair

```
┌────────────┐         Contract         ┌────────────┐
│  ANTARES   │ ←────────────────────→   │   RIGEL    │
│  (Backend) │     (API/Interface)      │ (Frontend) │
└────────────┘                          └────────────┘
```

**WHEN TO USE**:
- Frontend + Backend feature work
- Service-to-service integration
- Need to parallelize with clear interface

**CONTRACT FORMAT**:
```json
{
  "endpoint": "/api/v1/users",
  "method": "POST",
  "request": { "email": "string", "password": "string" },
  "response": { "id": "string", "token": "string" },
  "errors": [400, 401, 500]
}
```

---

### Pattern 6: Gate-Keeper

```
[Work] ──→ [Gate 1] ──→ [Work] ──→ [Gate 2] ──→ [Ship]
           SIRIUS           ARCTURUS
          (Design)         (Security)
```

**GATES IN NOVA**:
- Gate 1: SIRIUS (UI/UX veto) - Accessibility, design system
- Gate 2: ARCTURUS (Quality veto) - Tests, security, edge cases

**GATE PROTOCOL**:
1. Work submitted to gate
2. Gate agent reviews against criteria
3. APPROVED: Work proceeds
4. REJECTED: Work returns with specific feedback
5. VETO: Work blocked until resolved

---

### Pattern 7: Self-Improving Loop

```
┌───────────────────────────────────────────────┐
│                                                │
↓                                                │
[Execute Task] ──→ [Evaluate Result] ──→ [Learn] ─┘
```

**WHEN TO USE**:
- Repeated task types
- Measurable success criteria
- Opportunity for pattern recognition

---

## Pattern Selection Decision Tree

```
                Is task simple?
                      │
         ┌────────────┴────────────┐
         │ YES                     │ NO
         ↓                         ↓
   Single Agent           Are subtasks independent?
                                   │
                    ┌──────────────┴──────────────┐
                    │ YES                         │ NO
                    ↓                             ↓
             PARALLEL Fan-Out          Is there clear sequence?
                                                  │
                                   ┌──────────────┴──────────────┐
                                   │ YES                         │ NO
                                   ↓                             ↓
                            SEQUENTIAL Chain           Need oversight?
                                                              │
                                                ┌─────────────┴─────────────┐
                                                │ YES                       │ NO
                                                ↓                           ↓
                                         SUPERVISOR-WORKER          INTELLIGENT ROUTING
```

---

## Safe Parallel Combinations

| Pair | Safety | Condition |
|------|--------|-----------|
| RIGEL + ANTARES | ✅ Safe | Contract defined upfront |
| SIRIUS + VEGA | ✅ Safe | Distinct domains |
| RIGEL + SIRIUS | ⚠️ Careful | SIRIUS defines first, then RIGEL |
| ARCTURUS + Any | ✅ Safe | ARCTURUS is read-only reviewer |

---

## Handoff Protocol

```
HANDOFF: {FROM_AGENT} → {TO_AGENT}
Task ID: {task_id}
Timestamp: {ISO timestamp}

### WHAT I DID
- [Action 1]: [Result/Outcome]
- Files modified: [list]

### WHAT YOU NEED TO DO
1. [Specific action with acceptance criteria]
Priority: {HIGH/MEDIUM/LOW}

### CONTEXT YOU NEED
- Key Files: [files to read first]
- Key Decisions: [decisions made and why]
- Key Constraints: [limitations]

### WATCH OUT FOR
- ⚠️ [Risk 1]: [Mitigation]
```

---

## Transfer Rules

| From | To | When |
|------|-----|------|
| **POLARIS** | **VEGA** | Need research or architecture |
| **POLARIS** | **SIRIUS** | Need design or UX |
| **VEGA** | **RIGEL/ANTARES** | Architecture defined, ready to build |
| **SIRIUS** | **RIGEL** | Design approved, implement it |
| **RIGEL** | **ANTARES** | Need backend API |
| **ANTARES** | **RIGEL** | API ready for frontend |
| **Anyone** | **ARCTURUS** | Feature complete, needs review |
| **Anyone** | **POLARIS** | Blocked or need strategy |

---

## Quick Reference

```
PATTERNS:
  Sequential     → Linear dependencies
  Parallel       → Independent subtasks
  Supervisor     → Complex with oversight
  Routing        → Match task to agent
  Contract-First → Frontend + Backend pair
  Gate-Keeper    → Quality checkpoints
  Self-Improving → Learn from outcomes

DECISION TREE:
  Simple? → Single agent
  Independent subtasks? → Parallel
  Clear sequence? → Sequential
  Need oversight? → Supervisor
  Else → Routing
```

---

*"Select the pattern. Execute the protocol. Ship legendary work."*
