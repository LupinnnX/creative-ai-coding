# NOVA Coordination

## Real-Time Agent Progress Tracking

**Version**: 4.0.0  
**Date**: November 28, 2025  
**Status**: Active - JSON-Based Coordination

---

## Overview

Simple, file-based coordination without hooks. Each agent declares what they're working on via JSON. A visual dashboard (`.nova/DASHBOARD.md`) shows real-time progress.

```
┌─────────────────────────────────────────────────────────────┐
│                    NOVA COORDINATION                         │
│                                                              │
│  .nova/agents/{AGENT}.json  →  Agent declares work          │
│  .nova/mission.json         →  Current mission state        │
│  .nova/DASHBOARD.md         →  Visual progress (auto-gen)   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## File Structure

```
.nova/
├── agents/                    # Individual agent state files
│   ├── POLARIS.json
│   ├── VEGA.json
│   ├── SIRIUS.json
│   ├── RIGEL.json
│   ├── BETELGEUSE.json
│   ├── ANTARES.json
│   ├── ALDEBARAN.json
│   ├── ARCTURUS.json
│   ├── CAPELLA.json
│   └── SPICA.json
├── mission.json               # Current mission definition
├── DASHBOARD.md               # Visual progress dashboard
└── history/                   # Completed missions archive
    └── {timestamp}-{mission}.json
```

---

## Agent State File Format

Each agent maintains their state in `.nova/agents/{AGENT}.json`:

```json
{
  "agent": "RIGEL",
  "status": "ACTIVE",
  "current_task": {
    "id": "task-001",
    "description": "Create Button component with TypeScript",
    "file": "src/components/Button.tsx",
    "action": "CREATE",
    "started_at": "2025-11-28T10:30:00Z",
    "progress": 75,
    "subtasks": [
      { "name": "Props interface", "done": true },
      { "name": "Component logic", "done": true },
      { "name": "Accessibility", "done": true },
      { "name": "Tests", "done": false }
    ]
  },
  "files_locked": ["src/components/Button.tsx"],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "last_update": "2025-11-28T10:45:00Z",
  "notes": "Implementing hover states"
}
```

### Status Values

| Status     | Meaning                        |
| ---------- | ------------------------------ |
| `IDLE`     | Available for work             |
| `ACTIVE`   | Currently working on a task    |
| `BLOCKED`  | Waiting for another agent      |
| `REVIEW`   | Work complete, awaiting review |
| `COMPLETE` | Task finished                  |

### Progress Calculation

```
progress = (completed_subtasks / total_subtasks) * 100

Example:
- 3 of 4 subtasks done = 75%
- All subtasks done = 100%
```

---

## Mission File Format

The mission definition in `.nova/mission.json`:

```json
{
  "id": "mission-2025-11-28-001",
  "name": "User Authentication System",
  "description": "Implement complete auth flow with login, register, and password reset",
  "created_at": "2025-11-28T09:00:00Z",
  "status": "IN_PROGRESS",
  "commander": "POLARIS",
  "acceptance_criteria": [
    "Login form with validation",
    "Registration with email verification",
    "Password reset flow",
    "JWT token management",
    "Protected routes"
  ],
  "tasks": [
    {
      "id": "task-001",
      "agent": "RIGEL",
      "description": "Create auth form components",
      "files": ["src/components/LoginForm.tsx", "src/components/RegisterForm.tsx"],
      "dependencies": ["task-002"],
      "status": "IN_PROGRESS",
      "progress": 60
    },
    {
      "id": "task-002",
      "agent": "ANTARES",
      "description": "Implement auth API endpoints",
      "files": ["src/api/auth.ts", "src/api/middleware/auth.ts"],
      "dependencies": [],
      "status": "COMPLETE",
      "progress": 100
    },
    {
      "id": "task-003",
      "agent": "SPICA",
      "description": "Security review of auth flow",
      "files": [],
      "dependencies": ["task-001", "task-002"],
      "status": "PENDING",
      "progress": 0
    }
  ],
  "overall_progress": 53,
  "critical_path": ["task-002", "task-001", "task-003"]
}
```

---

## Visual Dashboard Format

The dashboard `.nova/DASHBOARD.md` is auto-generated from JSON:

```markdown
# 🚀 NOVA Mission Dashboard

**Mission**: User Authentication System  
**Status**: IN_PROGRESS  
**Commander**: POLARIS Ξ8890  
**Updated**: 2025-11-28 10:45:00 UTC

---

## 📊 Overall Progress

███████████░░░░░░░░░ 53%

**Acceptance Criteria**: 2/5 complete

---

## 🌟 Agent Status

| Agent         | Status      | Task                 | Progress | File              |
| ------------- | ----------- | -------------------- | -------- | ----------------- |
| ⭐ POLARIS    | 🟢 ACTIVE   | Coordinating mission | 100%     | -                 |
| 🔭 VEGA       | ⚪ IDLE     | -                    | -        | -                 |
| ✨ SIRIUS     | 🟢 ACTIVE   | Design review        | 80%      | LoginForm.tsx     |
| 🔷 RIGEL      | 🟢 ACTIVE   | Auth form components | 60%      | LoginForm.tsx     |
| 🔴 BETELGEUSE | ⚪ IDLE     | -                    | -        | -                 |
| ❤️ ANTARES    | ✅ COMPLETE | Auth API endpoints   | 100%     | auth.ts           |
| 🟠 ALDEBARAN  | ⚪ IDLE     | -                    | -        | -                 |
| 🛡️ ARCTURUS   | 🟡 WAITING  | Test auth flow       | 0%       | Blocked by RIGEL  |
| 📚 CAPELLA    | ⚪ IDLE     | -                    | -        | -                 |
| 🔐 SPICA      | 🟡 PENDING  | Security review      | 0%       | Waiting for tasks |

---

## 📋 Task Progress

### ✅ Completed (1)

- [x] **task-002** ANTARES: Auth API endpoints (100%)

### 🔄 In Progress (2)

- [ ] **task-001** RIGEL: Auth form components (60%)
```

████████████░░░░░░░░ 60%

```
- [x] Props interface
- [x] Form validation
- [ ] Submit handlers
- [ ] Error states
- [ ] Loading states

- [ ] **task-004** SIRIUS: Design review (80%)
```

████████████████░░░░ 80%

```

### ⏳ Pending (1)
- [ ] **task-003** SPICA: Security review (0%)
- Blocked by: task-001, task-002

---

## 🔗 Dependencies

```

task-002 (ANTARES) ──┐
├──► task-003 (SPICA)
task-001 (RIGEL) ────┘

```

---

## 📁 File Locks

| File | Locked By | Since |
|------|-----------|-------|
| src/components/LoginForm.tsx | RIGEL | 10:30 |
| src/components/RegisterForm.tsx | RIGEL | 10:30 |

---

## 📝 Recent Activity

| Time | Agent | Action |
|------|-------|--------|
| 10:45 | RIGEL | Updated progress: 60% |
| 10:30 | ANTARES | Completed auth API |
| 10:15 | SIRIUS | Started design review |
| 10:00 | POLARIS | Mission started |

---

*Last updated: 2025-11-28T10:45:00Z*
```

---

## Agent Protocol

### Starting Work

```
1. Check .nova/mission.json for assigned tasks
2. Check if dependencies are complete
3. Update your .nova/agents/{AGENT}.json:
   - status: "ACTIVE"
   - current_task: {task details}
   - files_locked: [files you're modifying]
   - progress: 0
4. Begin work
```

### During Work

```
1. Update progress percentage as you complete subtasks
2. Update notes with current activity
3. If blocked:
   - status: "BLOCKED"
   - blocked_by: "{AGENT}"
   - Signal the blocking agent
```

### Completing Work

```
1. Update your agent file:
   - status: "COMPLETE"
   - progress: 100
   - files_locked: []
   - files_modified: [files you changed]
2. Update mission.json task status
3. Update DASHBOARD.md
4. Signal dependent agents
```

---

## Dashboard Generation

To regenerate the dashboard from JSON state:

```
1. Read .nova/mission.json
2. Read all .nova/agents/*.json
3. Calculate overall progress
4. Generate markdown with:
   - Progress bars (█ and ░ characters)
   - Status emojis
   - Task checklists
   - Dependency graph
   - File lock table
   - Activity log
5. Write to .nova/DASHBOARD.md
```

### Progress Bar Generation

```
function progressBar(percent, width=20):
  filled = floor(percent / 100 * width)
  empty = width - filled
  return "█" * filled + "░" * empty + " " + percent + "%"

Examples:
  0%:   ░░░░░░░░░░░░░░░░░░░░ 0%
  25%:  █████░░░░░░░░░░░░░░░ 25%
  50%:  ██████████░░░░░░░░░░ 50%
  75%:  ███████████████░░░░░ 75%
  100%: ████████████████████ 100%
```

### Status Emojis

```
🟢 ACTIVE   - Currently working
🟡 PENDING  - Waiting to start
🟡 WAITING  - Blocked by dependency
⚪ IDLE     - Available
✅ COMPLETE - Task finished
🔴 BLOCKED  - Cannot proceed
⭐ POLARIS  🔭 VEGA    ✨ SIRIUS   🔷 RIGEL
🔴 BETELGEUSE  ❤️ ANTARES  🟠 ALDEBARAN
🛡️ ARCTURUS  📚 CAPELLA  🔐 SPICA
```

---

## Handoff Protocol

When transferring work to another agent:

```json
{
  "handoff": {
    "from": "RIGEL",
    "to": "ARCTURUS",
    "task_id": "task-001",
    "context": "Component complete, ready for testing",
    "files": ["src/components/Button.tsx"],
    "notes": "Focus on edge cases: empty props, disabled state"
  }
}
```

Update both agent files:

- Sender: status → "COMPLETE", clear files_locked
- Receiver: status → "ACTIVE", set current_task

---

## Conflict Resolution

### File Lock Conflicts

If two agents need the same file:

```
1. Check .nova/agents/*.json for files_locked
2. If conflict detected:
   - Later agent sets blocked_by
   - Wait for lock release
   - Or escalate to POLARIS
```

### Dependency Deadlocks

POLARIS monitors for circular dependencies:

```
A waits for B
B waits for C
C waits for A  ← DEADLOCK

Resolution:
1. POLARIS identifies cycle
2. Breaks tie based on critical path
3. Reassigns or parallelizes tasks
```

---

## Quick Reference

```
Start work:     Update .nova/agents/{YOU}.json (status: ACTIVE)
Update progress: Change progress field (0-100)
Lock file:      Add to files_locked array
Complete:       status: COMPLETE, progress: 100
Check status:   Read .nova/DASHBOARD.md
Check conflicts: Read .nova/agents/*.json files_locked
```

---

_"Track progress. Signal clearly. Coordinate visually."_
