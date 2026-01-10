# 📱 Telegram UX Enhancement Plan

**Mission**: Transform raw AI output into beautiful, scannable, actionable messages  
**Agent**: SIRIUS Ξ48915 (Designer) + POLARIS Ξ8890 (Commander)  
**Date**: December 30, 2025  
**Status**: ✅ IMPLEMENTED

---

## 🎯 Problem Statement

Current Telegram messages are:
- Raw AI output dumps (walls of text)
- No visual hierarchy
- No clear next steps
- Hard to scan quickly
- Missing progress indicators
- No methodology guidance

---

## ✅ Implementation Complete

### Files Created

| File | Purpose |
|------|---------|
| `src/prompts/system-prompt.ts` | LLM instructions for formatting |
| `src/utils/message-formatter.ts` | Message formatting utilities |
| `AGENTS.md` | Droid CLI project conventions |
| `docs/TELEGRAM_UX_ENHANCEMENT_PLAN.md` | This document |

### Key Features Implemented

1. **System Prompt Injection** - Every AI request includes formatting instructions
2. **NOVA Agent Context** - Agent-specific instructions when activated
3. **Files Worked Tracking** - LLM instructed to always list files
4. **Next Steps Generation** - Always suggest 2-3 actions
5. **Phase Indicators** - Visual status headers
6. **AGENTS.md** - Droid CLI auto-reads this for conventions

---

## 🌟 Vision: The "Glanceable Agent" Pattern

Every message should answer in 3 seconds:
1. **What happened?** (Status)
2. **What's important?** (Summary)
3. **What's next?** (Actions)

---

## 📐 Design System

### Message Structure Template

```
┌─────────────────────────────────────┐
│ 🎯 STATUS HEADER                    │  ← Phase/Status indicator
├─────────────────────────────────────┤
│                                     │
│ 📋 SUMMARY                          │  ← 2-3 sentence TL;DR
│ Key insight or result               │
│                                     │
├─────────────────────────────────────┤
│ 📊 DETAILS (collapsible)            │  ← Expandable details
│ • Point 1                           │
│ • Point 2                           │
│ • Point 3                           │
├─────────────────────────────────────┤
│ ▶️ NEXT STEPS                       │  ← Always present
│ 1. Suggested action                 │
│ 2. Alternative path                 │
│                                     │
│ 💡 Tip: Quick command suggestion    │
└─────────────────────────────────────┘
```

### Emoji System (Semantic Icons)

| Category | Emoji | Meaning |
|----------|-------|---------|
| **Status** | ✅ | Success/Complete |
| | ⏳ | In Progress |
| | ❌ | Error/Failed |
| | ⚠️ | Warning |
| | 💡 | Tip/Suggestion |
| **Actions** | 🔧 | Tool execution |
| | 📝 | Writing/Editing |
| | 🔍 | Searching/Reading |
| | 📂 | File operations |
| | 🚀 | Deployment/Launch |
| **Phases** | 🎯 | Planning |
| | 🔬 | Research |
| | 🏗️ | Building |
| | ✨ | Review/Polish |
| | 🛡️ | Testing/Security |
| **NOVA** | ⭐ | POLARIS |
| | 🔭 | VEGA |
| | ✨ | SIRIUS |
| | 🔷 | RIGEL |
| | ❤️ | ANTARES |
| | 🛡️ | ARCTURUS |

---

## 🔄 Agentic Methodology: DRAFT Loop

Every AI response should follow this pattern:

### Phase 1: DRAFT (Initial Response)
```
🎯 PLANNING

📋 Understanding your request...
[Brief restatement of the task]

🔍 Analyzing:
• Codebase structure
• Dependencies
• Existing patterns

⏳ Generating initial approach...
```

### Phase 2: CRITIQUE (Self-Review)
```
🔬 REVIEWING

📋 Checking the approach...

✅ Strengths:
• Point 1
• Point 2

⚠️ Concerns:
• Potential issue 1
• Edge case to handle

🔄 Refining...
```

### Phase 3: REFINE (Improved Solution)
```
🏗️ IMPLEMENTING

📋 Executing refined plan...

📝 Changes:
• file1.ts - Added function
• file2.ts - Updated import

🔧 Running: npm test
```

### Phase 4: VERIFY (Confirmation)
```
✅ COMPLETE

📋 Task finished successfully!

📊 Summary:
• 3 files modified
• 2 tests added
• Build passing

▶️ NEXT STEPS:
1. Review changes: /status
2. Run full tests: /command-invoke test
3. Commit: /command-invoke commit "feat: add auth"

💡 Tip: Use /reset to start a new task
```

---

## 📦 Implementation Plan

### Phase 1: Message Formatter Module

Create `src/utils/message-formatter.ts`:

```typescript
interface FormattedMessage {
  status: 'planning' | 'researching' | 'building' | 'reviewing' | 'complete' | 'error';
  summary: string;
  details?: string[];
  nextSteps?: string[];
  tip?: string;
  novaAgent?: string;
}

function formatAgentMessage(msg: FormattedMessage): string {
  // Build structured message
}
```

### Phase 2: Response Parser

Create `src/utils/response-parser.ts`:

```typescript
interface ParsedResponse {
  phase: string;
  summary: string;
  toolCalls: ToolCall[];
  filesModified: string[];
  suggestedNextSteps: string[];
}

function parseAIResponse(raw: string): ParsedResponse {
  // Extract structure from raw AI output
}
```

### Phase 3: Progress Tracker

Create `src/utils/progress-tracker.ts`:

```typescript
interface TaskProgress {
  phase: number;
  totalPhases: number;
  currentAction: string;
  startTime: Date;
  toolsUsed: string[];
}

function formatProgressUpdate(progress: TaskProgress): string {
  // Format progress bar and status
}
```

### Phase 4: Next Steps Generator

Create `src/utils/next-steps.ts`:

```typescript
interface Context {
  lastCommand: string;
  codebaseState: string;
  sessionMetadata: Record<string, unknown>;
}

function generateNextSteps(context: Context): string[] {
  // Suggest relevant next actions
}
```

---

## 📝 Message Templates

### 1. Task Start
```
🎯 Starting: [Task Name]

📋 I'll help you [brief description]

⏳ Phase 1/4: Planning...

💡 This may take a moment for complex tasks
```

### 2. Tool Execution (Compact)
```
🔧 [Tool] → [Brief result]
```

### 3. Progress Update
```
⏳ Progress: ████████░░ 80%

📋 Currently: [Current action]
✅ Done: [Completed items]
```

### 4. Error with Recovery
```
❌ Error: [Brief error]

📋 What happened:
[1-2 sentence explanation]

▶️ To fix this:
1. [Recovery step 1]
2. [Recovery step 2]

💡 Or try: /reset and start fresh
```

### 5. Success with Next Steps
```
✅ Done: [Task name]

📋 Summary:
[2-3 sentence result]

📊 Changes:
• [Change 1]
• [Change 2]

▶️ Next steps:
1. [Suggested action 1]
2. [Suggested action 2]

💡 Quick: [Relevant command]
```

### 6. NOVA Agent Activation
```
⭐ POLARIS Activated

📋 Mission: [Mission summary]

🎯 Strategy:
1. [Phase 1]
2. [Phase 2]
3. [Phase 3]

▶️ Beginning Phase 1...

💡 Use /deactivate to switch agents
```

---

## 🎨 Visual Improvements

### 1. Compact Tool Notifications
Before:
```
🔧 BASH
npm install express
```

After:
```
🔧 npm install express ✅
```

### 2. File Changes Summary
Before:
```
I've made changes to the following files:
- src/index.ts
- src/utils/helper.ts
- package.json
```

After:
```
📝 Modified 3 files:
├── src/index.ts (added auth middleware)
├── src/utils/helper.ts (new function)
└── package.json (added dependency)
```

### 3. Progress Indicators
```
⏳ ━━━━━━━━━━░░░░░░░░░░ 50%
   Planning → Building → Testing → Done
              ▲
```

### 4. Collapsible Details (Telegram Spoiler)
```
📋 Summary: Added user authentication

<spoiler>
📊 Technical Details:
• JWT tokens with 24h expiry
• bcrypt password hashing
• Rate limiting: 100 req/min
</spoiler>
```

---

## 📋 Implementation Checklist

### Week 1: Foundation
- [ ] Create `message-formatter.ts` module
- [ ] Define message templates
- [ ] Implement emoji system
- [ ] Add status header formatting

### Week 2: Intelligence
- [ ] Create `response-parser.ts`
- [ ] Extract structure from AI output
- [ ] Detect phases automatically
- [ ] Parse tool calls

### Week 3: Next Steps
- [ ] Create `next-steps.ts` generator
- [ ] Context-aware suggestions
- [ ] Command recommendations
- [ ] Error recovery paths

### Week 4: Polish
- [ ] Progress tracking
- [ ] Compact tool notifications
- [ ] File tree formatting
- [ ] Testing & refinement

---

## 🔧 Configuration Options

Add to `.env`:
```env
# Telegram UX Settings
TELEGRAM_MESSAGE_STYLE=enhanced  # enhanced | minimal | verbose
TELEGRAM_SHOW_PROGRESS=true
TELEGRAM_SHOW_TOOL_CALLS=compact  # compact | full | hidden
TELEGRAM_ALWAYS_SHOW_NEXT_STEPS=true
```

---

## 📊 Success Metrics

| Metric | Current | Target |
|--------|---------|--------|
| Message scan time | ~30s | <5s |
| Next step clarity | Low | High |
| Error recovery rate | ~50% | >90% |
| User satisfaction | Unknown | Measure |

---

## 🚀 Quick Wins (Implement First)

1. **Status headers** - Add phase emoji to every message
2. **Next steps footer** - Always suggest 2-3 actions
3. **Compact tools** - One-line tool notifications
4. **Error recovery** - Always show fix suggestions

---

*Plan created by SIRIUS Ξ48915 + POLARIS Ξ8890*
*"Make every message a delight to read"*
