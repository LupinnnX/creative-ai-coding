# 🔭 VEGA Research Plan: GLM-4.7 Context Burn Problem

## Problem Statement

The Telegram agent times out on complex tasks. Hypothesis: GLM-4.7's 200K context window gets "burned" (exhausted) during long sessions, causing:
- Slow responses → timeout
- Degraded quality
- Memory confusion

---

## CRITICAL FINDING: NOVA Steering Files = ~53K Tokens

The `.nova/steering/` directory contains 16 markdown files totaling ~53,000 tokens.
Combined with system prompt (~3K) = **~56K tokens PER MESSAGE**.

At 200K context limit: **Only ~3-4 exchanges before context exhaustion.**

---

## Research Questions

### RQ1: How does GLM-4.7 context accumulation work?
- [ ] Does Droid CLI maintain session context between calls?
- [ ] How much context is sent per request?
- [ ] Is there context compression or summarization?
- [ ] What happens when context exceeds 200K?

### RQ2: What is our current context usage pattern?
- [ ] Measure typical prompt sizes sent to Droid
- [ ] Track session length (messages per session)
- [ ] Identify what's included: system prompt + history + user message
- [ ] Calculate: Are we hitting 200K?

### RQ3: What causes the timeout specifically?
- [ ] Is it context size → slow inference?
- [ ] Is it reasoning depth (high reasoning effort)?
- [ ] Is it tool use loops (Droid calling tools repeatedly)?
- [ ] Is it network/API latency?

### RQ4: What are best practices for long-context LLMs?
- [ ] Research: GLM-4.7 official documentation on context management
- [ ] Research: How other agents handle context windows
- [ ] Research: Context compression techniques (summarization, RAG)
- [ ] Research: Session management patterns

---

## Investigation Tasks

### Task 1: Measure Current Context Usage
```
Files to analyze:
- src/orchestrator/orchestrator.ts (what gets sent to Droid)
- src/prompts/ (system prompt sizes)
- src/db/sessions.ts (session/history management)
```

Questions:
1. What is the system prompt size?
2. How much conversation history is included?
3. Is there any truncation logic?

### Task 2: Analyze Droid CLI Behavior
```
Commands to test:
- droid exec with small prompt → measure response time
- droid exec with large prompt → measure response time
- droid exec with session resume → check context accumulation
```

Questions:
1. Does `-s sessionId` accumulate all previous context?
2. Is there a way to see current context size?
3. Does Droid have built-in context management?

### Task 3: Research GLM-4.7 Specifics
```
Search topics:
- "GLM-4.7 context window management"
- "GLM-4.7 long context performance"
- "Factory AI Droid context limits"
- "200K context LLM best practices 2026"
```

### Task 4: Identify Solutions
Based on findings, evaluate:

| Solution | Complexity | Impact |
|----------|------------|--------|
| Context summarization | Medium | High |
| Session reset after N messages | Low | Medium |
| Sliding window (keep last N messages) | Low | Medium |
| RAG for long-term memory | High | High |
| Task decomposition (smaller prompts) | Medium | High |
| Model switching (simpler model for simple tasks) | Low | Medium |

---

## Hypotheses to Test

### H1: Context Accumulation
> Each Droid session accumulates ALL previous messages, eventually hitting 200K

Test: Check if session resume sends full history

### H2: System Prompt Bloat
> Our NOVA system prompts are too large, leaving little room for conversation

Test: Measure system prompt token count

### H3: Reasoning Overhead
> High reasoning effort + large context = exponential slowdown

Test: Compare response times with reasoning off vs high

### H4: Tool Loop Explosion
> Droid enters tool-calling loops that generate massive internal context

Test: Monitor Droid logs for tool call patterns

---

## Success Criteria

Research is complete when we can answer:
1. **Root cause**: Why exactly does the timeout happen?
2. **Metrics**: How much context are we using vs available?
3. **Solution**: What's the best fix for our architecture?

---

## Output Deliverables

1. `CONTEXT_BURN_FINDINGS.md` - Research results
2. `CONTEXT_MANAGEMENT_PLAN.md` - Implementation plan
3. Code changes to fix the issue

---

🔭 VEGA Ξ172167
Navigator & Architect


---

## NEW RESEARCH DIRECTION: Multi-Agent Architecture with ACP Protocol

### RQ5: Can we use multiple AI backends instead of just Droid CLI?

Current architecture is single-agent (Droid/GLM-4.7 only). This creates:
- Single point of failure
- Context burn on one model
- No specialization by task type

**Research: Alternative Agent Backends (January 2026)**

| Agent | Strengths | BYOK Support | Protocol |
|-------|-----------|--------------|----------|
| Claude Code (Anthropic) | Reasoning, code review | Yes | Native API |
| Cursor Agent | IDE integration, fast edits | Yes | LSP-based |
| Aider | Git-native, multi-file | Yes | CLI |
| OpenHands (ex-OpenDevin) | Full autonomy, browser | Yes | A2A |
| SWE-Agent | Benchmark leader, research | Yes | Custom |
| Zen/ACP Agents | Multi-agent coordination | Yes | ACP Protocol |

### RQ6: What is the ACP (Agent Communication Protocol)?

**Research Topics:**
- [ ] Zen's ACP protocol specification
- [ ] How ACP enables agent-to-agent communication
- [ ] ACP vs A2A (Google's Agent-to-Agent) protocol
- [ ] MCP (Model Context Protocol) integration with ACP
- [ ] Multi-agent orchestration patterns

### RQ7: How to implement BYOK (Bring Your Own Key) multi-agent?

**Architecture Options:**

```
Option A: Router Pattern
┌─────────────────────────────────────────────┐
│  NOVA Orchestrator                          │
│  ┌─────────────────────────────────────┐   │
│  │  Task Router (complexity-based)      │   │
│  └──────────┬──────────┬───────────────┘   │
│             │          │                    │
│      ┌──────▼───┐ ┌────▼────┐ ┌─────────┐  │
│      │ Droid    │ │ Claude  │ │ Aider   │  │
│      │ GLM-4.7  │ │ Code    │ │         │  │
│      │ (complex)│ │ (review)│ │ (edits) │  │
│      └──────────┘ └─────────┘ └─────────┘  │
└─────────────────────────────────────────────┘

Option B: ACP Constellation
┌─────────────────────────────────────────────┐
│  ACP Bus (Agent Communication Protocol)     │
│  ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐ ┌─────┐  │
│  │POLAR│ │VEGA │ │RIGEL│ │ANTAR│ │ARCTU│  │
│  │ IS  │ │     │ │     │ │ ES  │ │ RUS │  │
│  └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘ └──┬──┘  │
│     │       │       │       │       │      │
│  ┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐ ┌──▼──┐  │
│  │Droid│ │Claude│ │Cursor│ │Droid│ │Claude│ │
│  └─────┘ └─────┘ └─────┘ └─────┘ └─────┘  │
└─────────────────────────────────────────────┘
```

### RQ8: What are the top coding agents on benchmarks (Jan 2026)?

**Research: SWE-Bench Leaderboard January 2026**
- [ ] Top 10 agents by resolve rate
- [ ] Which support BYOK?
- [ ] Which have open-source implementations?
- [ ] Integration complexity assessment

**Research: Aider Polyglot Leaderboard**
- [ ] Best models for code editing
- [ ] Cost vs performance trade-offs
- [ ] Context window efficiency

---

## Investigation Tasks (Updated)

### Task 5: Research ACP Protocol
```
Search topics:
- "ACP Agent Communication Protocol 2026"
- "Zen AI agent protocol"
- "Multi-agent coordination protocols"
- "A2A vs ACP vs MCP comparison"
```

### Task 6: Evaluate Alternative Agents
```
For each agent (Claude Code, Aider, OpenHands, SWE-Agent):
1. Installation/setup complexity
2. BYOK configuration
3. API/CLI interface
4. Context management approach
5. Integration with existing NOVA architecture
```

### Task 7: Design Multi-Agent Router
```
Requirements:
- Route by task complexity
- Route by task type (research vs code vs review)
- Fallback chain if primary agent fails
- Unified response format (NOVA style)
- Session continuity across agents
```

---

## Hypotheses (Updated)

### H5: Multi-Agent Distribution
> Distributing tasks across multiple agents prevents context burn on any single model

Test: Implement router that sends research to Claude, code to Droid, review to Aider

### H6: ACP Enables True Constellation
> ACP protocol allows NOVA agents to be backed by different AI models while maintaining coordination

Test: Implement ACP bus with 2+ different backends

### H7: Specialization Improves Quality
> Using specialized agents for specific tasks (VEGA→Claude for research, RIGEL→Cursor for frontend) produces better results than one generalist

Test: Compare quality metrics between single-agent and multi-agent approaches

---

## Key Files to Investigate

```
src/clients/droid.ts          - Current single-agent implementation
src/orchestrator/orchestrator.ts - Where routing logic would go
src/types.ts                  - IAssistantClient interface (abstraction point)
```

---

## Success Criteria (Updated)

Research is complete when we can answer:
1. **Root cause**: Why exactly does the timeout happen? ✓ (Context burn)
2. **Metrics**: How much context are we using vs available? ✓ (~56K/200K per message)
3. **Solution Options**:
   - [ ] LITE context mode (implemented, needs testing)
   - [ ] Multi-agent routing (needs research)
   - [ ] ACP protocol integration (needs research)
   - [ ] BYOK agent alternatives (needs research)

---

🔭 VEGA Ξ172167
Navigator & Architect
