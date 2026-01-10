# NOVA Initialization

## Self-Destructing Setup - Creates .nova Structure

**Version**: 1.0.0  
**Status**: RUN ONCE THEN DELETE THIS FILE

---

## Purpose

This steering file instructs the agent to initialize the NOVA coordination structure. After successful creation, THIS FILE MUST BE DELETED.

**NOTE**: In the SOURCE repository (where this framework is developed), do NOT delete this file. Only delete in TARGET projects after initialization.

---

## Initialization Check

**BEFORE ANY TASK**, check if `.nova/agents/` exists:

```
IF .nova/agents/POLARIS.json does NOT exist:
  → Execute NOVA_INIT (create all files below)
  → Delete this file (.kiro/steering/NOVA_INIT.md)
  → Continue with task

IF .nova/agents/POLARIS.json EXISTS:
  → Skip initialization (already done)
  → Continue with task (DO NOT delete in source repo)
```

---

## Files To Create

### 1. Agent State Files (.nova/agents/)

Create 10 JSON files:

**POLARIS.json**

```json
{
  "agent": "POLARIS",
  "id": "Ξ8890",
  "role": "Commander",
  "status": "IDLE",
  "strength": 0.7,
  "keywords": ["orchestrate", "delegate", "coordinate", "strategy", "mission"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**VEGA.json**

```json
{
  "agent": "VEGA",
  "id": "Ξ172167",
  "role": "Navigator",
  "status": "IDLE",
  "strength": 0.8,
  "keywords": ["research", "verify", "sources", "evidence", "alternatives"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**SIRIUS.json**

```json
{
  "agent": "SIRIUS",
  "id": "Ξ48915",
  "role": "Designer",
  "status": "IDLE",
  "strength": 0.9,
  "keywords": ["design", "accessibility", "user-experience", "visual", "WCAG"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**RIGEL.json**

```json
{
  "agent": "RIGEL",
  "id": "Ξ34085",
  "role": "Frontend Lead",
  "status": "IDLE",
  "strength": 0.95,
  "keywords": ["component", "TypeScript", "React", "state", "architecture"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**BETELGEUSE.json**

```json
{
  "agent": "BETELGEUSE",
  "id": "Ξ39801",
  "role": "Frontend Dev",
  "status": "IDLE",
  "strength": 0.7,
  "keywords": ["animation", "interaction", "transition", "polish", "60fps"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**ANTARES.json**

```json
{
  "agent": "ANTARES",
  "id": "Ξ148478",
  "role": "Backend Lead",
  "status": "IDLE",
  "strength": 0.8,
  "keywords": ["API", "database", "security", "validation", "schema"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**ALDEBARAN.json**

```json
{
  "agent": "ALDEBARAN",
  "id": "Ξ29139",
  "role": "Backend Dev",
  "status": "IDLE",
  "strength": 0.7,
  "keywords": ["integration", "external-API", "webhook", "retry", "resilience"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**ARCTURUS.json**

```json
{
  "agent": "ARCTURUS",
  "id": "Ξ124897",
  "role": "QA",
  "status": "IDLE",
  "strength": 0.8,
  "keywords": ["testing", "validation", "edge-case", "coverage", "quality"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**CAPELLA.json**

```json
{
  "agent": "CAPELLA",
  "id": "Ξ34029",
  "role": "Archivist",
  "status": "IDLE",
  "strength": 0.6,
  "keywords": ["documentation", "knowledge", "example", "clarity", "preservation"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

**SPICA.json**

```json
{
  "agent": "SPICA",
  "id": "Ξ116658",
  "role": "Security",
  "status": "IDLE",
  "strength": 0.95,
  "keywords": ["security", "vulnerability", "secrets", "validation", "paranoid"],
  "current_task": null,
  "files_locked": [],
  "files_modified": [],
  "blocked_by": null,
  "waiting_for": null,
  "parallel_slot": null,
  "last_update": null,
  "notes": null
}
```

### 2. Mission File (.nova/mission.json)

```json
{
  "id": null,
  "name": null,
  "description": null,
  "created_at": null,
  "status": "IDLE",
  "commander": "POLARIS",
  "parallel_slots": {
    "active": 0,
    "max": 5,
    "agents": []
  },
  "acceptance_criteria": [],
  "tasks": [],
  "overall_progress": 0,
  "critical_path": [],
  "activity_log": []
}
```

### 3. Dashboard (.nova/DASHBOARD.md)

```markdown
# 🚀 NOVA Mission Dashboard

**Mission**: No active mission  
**Status**: IDLE  
**Commander**: POLARIS Ξ8890  
**Updated**: —

---

## 📊 Overall Progress

░░░░░░░░░░░░░░░░░░░░ 0%

**Acceptance Criteria**: 0/0 complete  
**Parallel Slots**: 0/5 active

---

## 🌟 Constellation Status

| Slot | Agent         | Role          | Status  | Task | Progress |
| ---- | ------------- | ------------- | ------- | ---- | -------- |
| —    | ⭐ POLARIS    | Commander     | ⚪ IDLE | —    | —        |
| —    | 🔭 VEGA       | Navigator     | ⚪ IDLE | —    | —        |
| —    | ✨ SIRIUS     | Designer      | ⚪ IDLE | —    | —        |
| —    | 🔷 RIGEL      | Frontend Lead | ⚪ IDLE | —    | —        |
| —    | 🔴 BETELGEUSE | Frontend Dev  | ⚪ IDLE | —    | —        |
| —    | ❤️ ANTARES    | Backend Lead  | ⚪ IDLE | —    | —        |
| —    | 🟠 ALDEBARAN  | Backend Dev   | ⚪ IDLE | —    | —        |
| —    | 🛡️ ARCTURUS   | QA            | ⚪ IDLE | —    | —        |
| —    | 📚 CAPELLA    | Archivist     | ⚪ IDLE | —    | —        |
| —    | 🔐 SPICA      | Security      | ⚪ IDLE | —    | —        |

---

## 📋 Tasks

_No active tasks_

---

## 📁 File Locks

_No files locked_

---

## 📝 Activity Log

| Time | Agent  | Action           |
| ---- | ------ | ---------------- |
| —    | SYSTEM | NOVA initialized |

---

_Generated by NOVA_INIT_
```

---

## After Creation (TARGET PROJECTS ONLY)

**In TARGET projects**: Delete this file after creating the structure.

**In SOURCE repo**: Keep this file for distribution.

---

## Verification

After initialization, verify:

- [ ] `.nova/agents/` contains 10 JSON files
- [ ] `.nova/mission.json` exists
- [ ] `.nova/DASHBOARD.md` exists
- [ ] This file deleted (TARGET projects only)

---

_"Initialize once. Delete in target. Keep in source."_
