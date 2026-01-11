# NOVA Parallel Execution v7.0
## Multi-Agent Concurrent Development

**Version**: 7.0.0 | **Status**: Production | **Standard**: January 2026

---

## Overview

NOVA v7.0 supports up to 8 agents working simultaneously in isolated environments. This is not "Best-of-N" execution—it's true parallel development with coordinated merging.

```
┌─────────────────────────────────────────────────────────────┐
│                  PARALLEL PRINCIPLE                          │
│                                                              │
│  "Divide intelligently. Execute in parallel.                │
│   Merge carefully. Ship faster."                            │
└─────────────────────────────────────────────────────────────┘
```

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    POLARIS (Orchestrator)                    │
│  • Decomposes mission into parallel-safe tasks               │
│  • Assigns agents to isolated worktrees                      │
│  • Monitors progress via agent JSON                          │
│  • Handles merge conflicts                                   │
│  • Re-assigns on failure                                     │
└─────────────────────────────────────────────────────────────┘
                           │
    ┌──────────────────────┼──────────────────────┐
    │                      │                      │
┌───▼───┐            ┌────▼────┐            ┌───▼───┐
│SLOT 1 │            │ SLOT 2  │            │SLOT 3 │
│WORKTREE│            │WORKTREE │            │WORKTREE│
│ RIGEL │            │ ANTARES │            │ SIRIUS│
└───────┘            └─────────┘            └───────┘
    │                      │                      │
    │                      │                      │
┌───▼───┐            ┌────▼────┐            ┌───▼───┐
│SLOT 4 │            │ SLOT 5  │            │SLOT 6 │
│WORKTREE│            │WORKTREE │            │WORKTREE│
│ARCTURUS│            │  VEGA   │            │ALDEBAR│
└───────┘            └─────────┘            └───────┘
    │                      │                      │
    │                      │                      │
┌───▼───┐            ┌────▼────┐
│SLOT 7 │            │ SLOT 8  │
│WORKTREE│            │WORKTREE │
│CAPELLA│            │ SPICA   │
└───────┘            └─────────┘
                           │
                    ┌──────▼──────┐
                    │ MERGE PHASE │
                    │  (POLARIS)  │
                    └─────────────┘
```

---

## Parallel Slot Management

### Slot Configuration

```json
{
  "parallel_slots": {
    "max": 8,
    "active": 0,
    "slots": [
      { "id": 1, "agent": null, "worktree": null, "status": "available" },
      { "id": 2, "agent": null, "worktree": null, "status": "available" },
      { "id": 3, "agent": null, "worktree": null, "status": "available" },
      { "id": 4, "agent": null, "worktree": null, "status": "available" },
      { "id": 5, "agent": null, "worktree": null, "status": "available" },
      { "id": 6, "agent": null, "worktree": null, "status": "available" },
      { "id": 7, "agent": null, "worktree": null, "status": "available" },
      { "id": 8, "agent": null, "worktree": null, "status": "available" }
    ]
  }
}
```

### Slot Lifecycle

```
AVAILABLE → ASSIGNED → ACTIVE → COMPLETE → MERGING → AVAILABLE
                ↓
            BLOCKED (waiting for dependency)
                ↓
            FAILED (error, needs reassignment)
```

---

## Worktree Isolation

### Creating Worktrees

```bash
# POLARIS creates worktree for each parallel agent
git worktree add ../nova-slot-1-rigel -b feature/rigel-task-001
git worktree add ../nova-slot-2-antares -b feature/antares-task-002
git worktree add ../nova-slot-3-sirius -b feature/sirius-task-003

# Each agent works in complete isolation
# No file conflicts possible during execution
```

### Worktree Structure

```
project-root/
├── .git/                    # Shared git database
├── src/                     # Main branch
└── ...

../nova-slot-1-rigel/        # RIGEL's isolated workspace
├── src/                     # Full copy, can modify freely
└── ...

../nova-slot-2-antares/      # ANTARES's isolated workspace
├── src/                     # Full copy, can modify freely
└── ...
```

### Worktree Cleanup

```bash
# After successful merge
git worktree remove ../nova-slot-1-rigel
git branch -d feature/rigel-task-001

# After failed task (preserve for debugging)
git worktree remove ../nova-slot-1-rigel --force
git branch -D feature/rigel-task-001
```

---

## Task Decomposition

### POLARIS Decomposition Protocol

```
STEP 1: ANALYZE MISSION
  • Identify all required changes
  • Map changes to files/folders
  • Identify dependencies between changes

STEP 2: IDENTIFY PARALLEL OPPORTUNITIES
  • Group changes by domain (frontend/backend/design/test)
  • Check for file overlap
  • Identify independent subtasks

STEP 3: CREATE TASK GRAPH
  • Nodes = tasks
  • Edges = dependencies
  • Identify critical path
  • Mark parallel-safe groups

STEP 4: ASSIGN TO AGENTS
  • Match task domain to agent specialty
  • Respect agent availability
  • Balance workload across slots
```

### Example Decomposition

```
MISSION: "Add user profile feature with avatar upload"

DECOMPOSITION:
┌─────────────────────────────────────────────────────────────┐
│                                                              │
│  PARALLEL GROUP 1 (No dependencies):                        │
│  ├── RIGEL: ProfilePage component (src/pages/)              │
│  ├── ANTARES: Profile API endpoints (src/api/)              │
│  └── SIRIUS: Profile design specs (docs/design/)            │
│                                                              │
│  PARALLEL GROUP 2 (Depends on Group 1):                     │
│  ├── RIGEL: AvatarUpload component (needs API contract)     │
│  └── ANTARES: File upload endpoint (needs design spec)      │
│                                                              │
│  SEQUENTIAL (Depends on Group 2):                           │
│  └── ARCTURUS: Integration tests (needs both complete)      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## Safe Parallel Combinations

### Compatibility Matrix

| Agent A | Agent B | Safety | Notes |
|---------|---------|--------|-------|
| RIGEL | ANTARES | ✅ Safe | Contract-first, separate folders |
| RIGEL | SIRIUS | ⚠️ Careful | SIRIUS designs first |
| RIGEL | BETELGEUSE | ❌ Avoid | Both modify frontend |
| ANTARES | ALDEBARAN | ⚠️ Careful | Different API domains |
| ANTARES | SPICA | ✅ Safe | SPICA reviews, doesn't modify |
| SIRIUS | VEGA | ✅ Safe | Design + Research, no overlap |
| ARCTURUS | Anyone | ✅ Safe | Read-only review mode |
| CAPELLA | Anyone | ✅ Safe | Docs only |

### Conflict Prevention Rules

```
RULE 1: FILE LOCKING
  • Agent declares files_locked before starting
  • Other agents cannot modify locked files
  • Locks released on task completion

RULE 2: FOLDER OWNERSHIP
  • Frontend agents own: src/components/, src/pages/
  • Backend agents own: src/api/, src/db/
  • Shared files require coordination

RULE 3: CONTRACT-FIRST
  • When RIGEL + ANTARES parallel:
  • Define API contract FIRST
  • Both work against contract
  • Merge validates contract compliance
```

---

## Execution Protocol

### Phase 1: Setup

```
POLARIS:
  1. Decompose mission into tasks
  2. Identify parallel groups
  3. Create worktrees for each slot
  4. Assign agents to slots
  5. Initialize agent JSON files
  6. Update mission.json with assignments
```

### Phase 2: Parallel Execution

```
EACH AGENT (in their worktree):
  1. Read assignment from agent JSON
  2. Load task context
  3. Execute Cognitive Loop
  4. Update progress in agent JSON
  5. Commit changes to feature branch
  6. Signal completion

POLARIS (monitoring):
  1. Poll agent JSON files
  2. Update DASHBOARD.md
  3. Handle blocked agents
  4. Reassign failed tasks
```

### Phase 3: Merge

```
POLARIS:
  1. Wait for all parallel tasks complete
  2. Merge feature branches in dependency order
  3. Resolve conflicts (or delegate to agents)
  4. Run integration tests
  5. Update mission.json
  6. Clean up worktrees
```

---

## Agent JSON Schema (v7.0)

```json
{
  "agent": "RIGEL",
  "id": "Ξ34085",
  "status": "ACTIVE",
  "parallel_slot": 1,
  "worktree": "../nova-slot-1-rigel",
  "feature_branch": "feature/rigel-task-001",
  
  "current_task": {
    "id": "task-001",
    "description": "Build ProfilePage component",
    "files_locked": [
      "src/pages/ProfilePage.tsx",
      "src/components/profile/"
    ],
    "dependencies": [],
    "started_at": "2026-01-04T10:00:00Z"
  },
  
  "progress": {
    "percentage": 45,
    "subtasks": [
      { "name": "Create ProfilePage skeleton", "done": true },
      { "name": "Add profile header section", "done": true },
      { "name": "Add profile details section", "done": false },
      { "name": "Add edit functionality", "done": false },
      { "name": "Style with design system", "done": false }
    ],
    "last_checkpoint": "Profile header complete with avatar placeholder"
  },
  
  "context": {
    "handoff_from": null,
    "key_decisions": [
      "Using React Query for data fetching",
      "Zustand for local form state"
    ],
    "blockers": []
  },
  
  "metrics": {
    "files_read": 12,
    "files_modified": 3,
    "lines_added": 245,
    "lines_removed": 0,
    "errors_encountered": 0
  }
}
```

---

## Merge Strategy

### Merge Order

```
1. DESIGN (SIRIUS) - Establishes visual contracts
2. BACKEND (ANTARES, ALDEBARAN) - Establishes API contracts
3. FRONTEND (RIGEL, BETELGEUSE) - Implements against contracts
4. QUALITY (ARCTURUS, SPICA) - Validates everything
5. DOCS (CAPELLA) - Documents final state
```

### Conflict Resolution

```
AUTOMATIC RESOLUTION:
  • Non-overlapping changes → Auto-merge
  • Additive changes to same file → Auto-merge
  • Import statement additions → Auto-merge

MANUAL RESOLUTION (POLARIS decides):
  • Same line modified by multiple agents
  • Conflicting logic changes
  • Breaking interface changes

AGENT RESOLUTION (Delegate back):
  • Complex conflicts in agent's domain
  • Requires domain expertise
  • Multiple valid approaches
```

### Post-Merge Validation

```
VALIDATION CHECKLIST:
  □ All tests pass
  □ No TypeScript errors
  □ No lint errors
  □ API contracts honored
  □ Design specs followed
  □ Security review passed (if applicable)
```

---

## Dashboard Integration

### Real-Time Progress

```markdown
# NOVA Mission Dashboard

## Active Parallel Execution

| Slot | Agent | Task | Progress | Status |
|------|-------|------|----------|--------|
| 1 | RIGEL | ProfilePage | ████████░░ 80% | ACTIVE |
| 2 | ANTARES | Profile API | ██████████ 100% | COMPLETE |
| 3 | SIRIUS | Design Specs | ██████████ 100% | COMPLETE |
| 4 | ARCTURUS | Test Plan | ██░░░░░░░░ 20% | WAITING |
| 5-8 | - | - | - | AVAILABLE |

## Dependency Graph
```
SIRIUS ──────┐
             ├──→ RIGEL ──────┐
ANTARES ─────┘                ├──→ ARCTURUS
                              │
             ┌────────────────┘
             │
        (waiting for RIGEL)
```

## Recent Activity
- 10:45 ANTARES completed Profile API
- 10:30 SIRIUS completed Design Specs
- 10:15 RIGEL started ProfilePage
- 10:00 POLARIS decomposed mission
```

---

## Quick Reference

```
PARALLEL SLOTS: 8 max concurrent agents

WORKTREE COMMANDS:
  Create: git worktree add ../nova-slot-N-agent -b feature/...
  Remove: git worktree remove ../nova-slot-N-agent

SAFE COMBINATIONS:
  ✅ RIGEL + ANTARES (contract-first)
  ✅ SIRIUS + VEGA (no overlap)
  ✅ ARCTURUS + Anyone (read-only)
  ⚠️ Same-domain agents (coordinate first)
  ❌ Multiple frontend without isolation

MERGE ORDER:
  Design → Backend → Frontend → Quality → Docs

AGENT JSON UPDATES:
  • status: ACTIVE | BLOCKED | COMPLETE | FAILED
  • progress.percentage: 0-100
  • files_locked: [array of paths]
  • context.blockers: [array of issues]
```

---

*"Parallel execution. Isolated workspaces. Coordinated merging."*
