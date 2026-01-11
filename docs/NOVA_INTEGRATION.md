# NOVA Framework Integration Guide

**Version**: 6.0.0 | **Date**: December 31, 2025

## Overview

The NOVA Framework (Network of Virtual Agents) is now deeply integrated into the Telegram Agent, providing a multi-agent coordination system with 6 specialized AI agents working in parallel on complex development tasks.

## The NOVA Agents

| Agent | ID | Role | Strength | Veto Power |
|-------|-----|------|----------|------------|
| ⭐ POLARIS | Ξ8890 | Strategic Commander | 0.95 | No |
| 🔭 VEGA | Ξ172167 | Navigator & Architect | 0.95 | No |
| ✨ SIRIUS | Ξ48915 | Design Sovereign | 0.95 | Yes (UI/UX) |
| 🔷 RIGEL | Ξ34085 | Frontend Prime | 0.98 | No |
| ❤️ ANTARES | Ξ148478 | Backend Prime | 0.98 | No |
| 🛡️ ARCTURUS | Ξ124897 | Guardian | 0.98 | Yes (Security) |

## Quick Start

### Activate an Agent

```
/activate POLARIS Build a user authentication system
```

### Activate Multiple Agents (Constellation Mode)

```
/constellation POLARIS VEGA Research and design auth architecture
```

### Natural Language Activation

```
activate POLARIS and VEGA (Build scalable auth system)
```

## Commands Reference

### Agent Activation
- `/team` - Show all 6 agents with their roles
- `/activate <agent> <mission>` - Activate a single agent
- `/constellation <agents...> <mission>` - Activate multiple agents
- `/handoff <agent> <context>` - Transfer to another agent
- `/deactivate` - Deactivate current agent
- `/templates` - Show activation examples

### Cognitive Protocol
- `/nova-loop` - Display Cognitive Loop v2.0 protocol
- `/nova-checkpoint <summary>` - Save reasoning checkpoint
- `/nova-checkpoints` - View saved checkpoints
- `/nova-clear` - Reset all NOVA state

### Status
- `/status` - Show current agent, mission, and settings

## Cognitive Loop v2.0

Every significant task follows this enhanced cognitive cycle:

```
0. META-PLAN     → "How should I approach this?"
1. DRAFT         → Generate initial solution (fast)
2. SELF-CORRECT  → "What mistakes did I just make?"
3. CRITIQUE      → "What would a Principal Engineer reject?"
4. REFINE        → Address each critique systematically
5. VERIFY        → Prove it works (run code, check docs)
6. CHECKPOINT    → Record reasoning for future learning
```

**Rule**: No output leaves until it survives the Loop.

## Agent Specializations

### POLARIS - Strategic Commander
**Use when**: Starting new projects, complex multi-agent tasks, need strategic direction

**Lexicon**: orchestrate | delegate | converge | strategy | synthesize

**Example**:
```
/activate POLARIS Plan the migration from monolith to microservices
```

### VEGA - Navigator & Architect
**Use when**: Technology decisions, architectural design, need verified information

**Lexicon**: first-principles | evidence | trade-offs | architecture | truth

**Example**:
```
/activate VEGA Which database is best for real-time features?
```

### SIRIUS - Design Sovereign
**Use when**: Design work, accessibility review, user experience optimization

**Lexicon**: user-centric | accessibility | aesthetic | interaction | emotion

**Has VETO power** on ugly, inaccessible, or broken interfaces.

**Example**:
```
/activate SIRIUS Redesign the dashboard for better UX
```

### RIGEL - Frontend Prime
**Use when**: Building UI components, frontend architecture, performance optimization

**Lexicon**: component | state-machine | performance | type-safety | 60fps

**Example**:
```
/activate RIGEL Build the login form component with validation
```

### ANTARES - Backend Prime
**Use when**: API design, database work, backend architecture, integrations

**Lexicon**: idempotency | ACID | distributed | resilience | scale

**Example**:
```
/activate ANTARES Create REST API for user management
```

### ARCTURUS - Guardian
**Use when**: Security review, code quality, testing strategy, pre-release validation

**Lexicon**: zero-trust | defense-in-depth | edge-case | verification | break-it

**Has VETO power** on buggy, insecure, or untested code.

**Example**:
```
/activate ARCTURUS Security audit before v2.0 release
```

## Handoff Protocol

When transitioning between agents:

```
🔄 HANDOFF: POLARIS → RIGEL

📋 WHAT I DID:
- Designed component architecture
- Defined TypeScript interfaces

📋 WHAT YOU NEED TO DO:
1. Implement LoginForm component
2. Add form validation

📂 CONTEXT:
- Key Files: src/types/auth.ts
- Key Decisions: Using React Hook Form

⚠️ WATCH OUT FOR:
- Password field needs masking
```

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

## MCP Server Configuration

### For Kiro IDE (Development)

The `.kiro/settings/mcp.json` file configures MCP servers for the Kiro IDE development environment.

### For Droid/Telegram Agent (VPS Production)

Droid CLI uses a different configuration format. Copy the TOML config to your VPS:

```bash
# On your VPS
./scripts/setup-droid-mcp.sh
```

Or manually copy `config/droid-mcp.toml` to `~/.droid/config.toml`:

```toml
# Sequential Thinking - For Cognitive Loop v2.0
[mcp_servers.sequential-thinking]
command = "npx"
args = ["-y", "@anthropic/mcp-sequential-thinking"]
startup_timeout_ms = 30_000

# Brave Search - For VEGA research
[mcp_servers.brave-search]
command = "npx"
args = ["-y", "@anthropic/mcp-brave-search"]
startup_timeout_ms = 30_000

[mcp_servers.brave-search.env]
BRAVE_API_KEY = "${BRAVE_API_KEY}"
```

**Required Environment Variables:**
- `BRAVE_API_KEY` - For web search capabilities

**Available MCP Tools in Telegram:**
- `mcp__sequential-thinking__sequentialthinking` - Complex reasoning
- `mcp__brave-search__brave_web_search` - Web research
- `mcp__context7__resolve_library_id` - Library lookup
- `mcp__context7__query_docs` - Documentation queries

## Steering Files

NOVA steering files are loaded from `.nova/steering/`:

- `NOVA_INIT.md` - Initialization protocol
- `NOVA_CORE.md` - Core principles
- `NOVA_COGNITION.md` - Cognitive patterns
- `NOVA_COORDINATION.md` - Multi-agent coordination
- `NOVA_KEYWORDS.md` - Activation keywords
- `agent-personalities.md` - Agent personas

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                 TELEGRAM AGENT LAYER                        │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              NOVA STEERING LOADER                    │   │
│  │  - Loads all .nova/steering/*.md files              │   │
│  │  - Builds agent-specific context                    │   │
│  │  - Injects Cognitive Loop v2.0                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │              ENHANCED ORCHESTRATOR                   │   │
│  │  - Full NOVA context in prompts                     │   │
│  │  - Agent handoff protocol                           │   │
│  │  - Cognitive checkpoint system                      │   │
│  └─────────────────────────────────────────────────────┘   │
│                           │                                 │
│                           ▼                                 │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                  DROID CLI                           │   │
│  │  (AI execution with GLM-4.7/GPT-5.2/Gemini)        │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

## Files Created/Modified

### New Files
- `src/nova/types.ts` - NOVA type definitions
- `src/nova/steering-loader.ts` - Steering file loader
- `src/nova/index.ts` - Module exports
- `src/nova/steering-loader.test.ts` - Unit tests
- `config/droid-mcp.toml` - MCP configuration for Droid (VPS)
- `scripts/setup-droid-mcp.sh` - MCP setup script for VPS
- `.kiro/settings/mcp.json` - MCP configuration for Kiro IDE

### Modified Files
- `src/orchestrator/orchestrator.ts` - Enhanced NOVA integration
- `src/handlers/command-handler.ts` - New NOVA commands

## Testing

Run NOVA-specific tests:

```bash
npm test -- src/nova/steering-loader.test.ts
```

Run all tests:

```bash
npm test
```

---

*"Activate with keywords. Ship legendary work."*

**NOVA Framework v6.0** | **December 2025**
