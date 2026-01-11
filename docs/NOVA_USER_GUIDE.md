# NOVA Framework User Guide v6.0

**Date**: January 1, 2026  
**Agents**: POLARIS Ξ8890 (Strategy) + VEGA Ξ172167 (Research)

---

## What is NOVA?

NOVA (Network of Virtual Agents) is a multi-agent AI coordination system with 6 specialized agents working together on complex development tasks. Each agent has distinct expertise and can be activated via keywords or commands.

---

## Quick Start (5 Minutes)

### 1. Activate an Agent

```bash
# Via command
/activate POLARIS Build a user authentication system

# Via natural language
activate VEGA (Research best database for real-time features)
```

### 2. The NOVA Agents

| Agent | Role | When to Use |
|-------|------|-------------|
| ⭐ **POLARIS** | Strategic Commander | Project planning, task delegation |
| 🔭 **VEGA** | Navigator & Architect | Research, architecture decisions |
| ✨ **SIRIUS** | Design Sovereign | UI/UX design, accessibility |
| 🔷 **RIGEL** | Frontend Prime | React, TypeScript, components |
| ❤️ **ANTARES** | Backend Prime | APIs, databases, integrations |
| 🛡️ **ARCTURUS** | Guardian | Security, testing, code review |

### 3. Basic Commands

```bash
/team              # Show all agents
/activate <agent>  # Activate single agent
/constellation     # Activate multiple agents
/status            # Current agent & mission
/deactivate        # Deactivate current agent
```

---

## Agent Activation Examples

### POLARIS - Strategy & Planning
```bash
/activate POLARIS Plan migration from monolith to microservices
/activate POLARIS Orchestrate full-stack feature development
```

### VEGA - Research & Architecture
```bash
/activate VEGA Which database is best for real-time features?
/activate VEGA Research authentication patterns for mobile apps
```

### SIRIUS - Design (Has VETO Power)
```bash
/activate SIRIUS Redesign the dashboard for better UX
/activate SIRIUS Review accessibility compliance
```

### RIGEL - Frontend Development
```bash
/activate RIGEL Build login form with validation
/activate RIGEL Optimize React component performance
```

### ANTARES - Backend Development
```bash
/activate ANTARES Create REST API for user management
/activate ANTARES Design database schema for e-commerce
```

### ARCTURUS - Security & Testing (Has VETO Power)
```bash
/activate ARCTURUS Security audit before release
/activate ARCTURUS Review code for edge cases
```

---

## Constellation Mode (Multi-Agent)

Activate multiple agents for complex tasks:

```bash
/constellation POLARIS VEGA Research and design auth architecture
/constellation RIGEL ANTARES Build full-stack user profile feature
```

---

## The Cognitive Loop v2.0

Every significant task follows this cognitive cycle:

```
0. META-PLAN     → "How should I approach this?"
1. DRAFT         → Generate initial solution
2. SELF-CORRECT  → "What mistakes did I just make?"
3. CRITIQUE      → "What would a Principal Engineer reject?"
4. REFINE        → Address each critique
5. VERIFY        → Prove it works
6. CHECKPOINT    → Record reasoning
```

View the loop: `/nova-loop`

---

## Handoff Between Agents

When transitioning work between agents:

```bash
/handoff RIGEL Implement the login component based on SIRIUS design
```

The handoff includes:
- What was completed
- What needs to be done
- Key context and files
- Risks to watch for

---

## Cognitive Checkpoints

Save important reasoning for future reference:

```bash
/nova-checkpoint "Decided to use PostgreSQL for ACID compliance"
/nova-checkpoints  # View saved checkpoints
/nova-clear        # Reset all NOVA state
```

---

## Self-Healing Error Debugger

When errors occur, ARCTURUS + VEGA automatically activate:

1. **Classify** - Identify error category (NETWORK, AUTH, SYNTAX, etc.)
2. **Decompose** - First-principles analysis
3. **Search Memory** - Find similar past errors
4. **Generate Hypotheses** - Rank possible causes
5. **Suggest Fixes** - Confidence-scored solutions

Commands:
```bash
/nova_debug        # View debug memory stats
/nova_debug_clear  # Clear debug memory
```

---

## Best Practices

### 1. Start with POLARIS for Complex Tasks
Let POLARIS decompose and delegate to specialists.

### 2. Use VEGA for Technology Decisions
Always research before committing to architecture.

### 3. Respect VETO Power
SIRIUS (UI/UX) and ARCTURUS (Security) can veto releases.

### 4. Save Checkpoints
Document key decisions for future reference.

### 5. Use Constellation for Full-Stack Work
Combine frontend + backend agents for efficiency.

---

## Workflow Patterns

### Sequential Chain
```
VEGA (research) → SIRIUS (design) → RIGEL (implement) → ARCTURUS (validate)
```

### Parallel Fan-Out
```
POLARIS (divide) → [RIGEL || ANTARES] → POLARIS (aggregate)
```

### Contract-First Pair
```
ANTARES (API contract) ↔ RIGEL (Frontend implementation)
```

### Gate-Keeper
```
[Work] → SIRIUS (Design Gate) → [Work] → ARCTURUS (Quality Gate) → [Ship]
```

---

## Troubleshooting

### Agent Not Responding
```bash
/deactivate
/activate <agent> <mission>
```

### Reset NOVA State
```bash
/nova-clear
```

### View Current Status
```bash
/status
```

---

*"Activate with keywords. Ship legendary work."*

**NOVA Framework v6.0** | January 2026
