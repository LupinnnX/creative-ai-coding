# 🎯 NOVA Timeout Solution Architecture
## Strategic Plan for Unlimited Task Complexity

**Status**: 🔬 RESEARCHING → 🏗️ PLANNING
**Commanders**: ⭐ POLARIS Ξ8890 + 🔭 VEGA Ξ172167
**Date**: January 6, 2026

---

## 📋 Problem Statement

The Telegram agent cannot complete complex or semi-complex requests because the Droid CLI times out after 5-15 minutes (configurable via `DROID_MAX_TIMEOUT_MS`). This fundamentally limits NOVA's ability to handle:

- Multi-step NOVA missions
- Deep research tasks
- Complex code generation
- Large refactoring operations
- Any task requiring extended AI reasoning

**Root Cause**: Synchronous execution model - Telegram waits for Droid CLI to complete before responding.

---

## 🔬 Research Findings (January 2026)

### 1. Telegram Bot API 9.3 (December 31, 2025)
- **NEW**: `sendMessageDraft` method for streaming partial messages
- Allows real-time progress updates while AI is processing
- Perfect for showing "thinking" indicators

### 2. Industry Patterns
| Pattern | Source | Applicability |
|---------|--------|---------------|
| Fire-and-Forget + Polling | OpenAI Community | ⭐⭐⭐⭐⭐ |
| SSE Streaming | PraisonAI | ⭐⭐⭐ (limited by Telegram) |
| Task Queues (BullMQ/Redis) | ByteBytego | ⭐⭐⭐⭐⭐ |
| Durable Execution (Temporal) | Enterprise | ⭐⭐⭐ (overkill) |
| Task Decomposition | Agentic AI | ⭐⭐⭐⭐⭐ |

### 3. Key Insight
> "The best AI agents don't wait - they acknowledge, process in background, and notify on completion."

---

## 🏗️ Proposed Architecture Options

### Option A: Async Job Queue (RECOMMENDED)
```
┌─────────────────────────────────────────────────────────────┐
│                    ASYNC JOB ARCHITECTURE                    │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Message                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Telegram   │───▶│ Orchestrator│───▶│  Job Queue  │     │
│  │  Adapter    │    │             │    │  (SQLite)   │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│       │                                       │              │
│       │ Immediate ACK                         │              │
│       │ "🔄 Processing..."                    ▼              │
│       │                              ┌─────────────┐        │
│       │                              │   Worker    │        │
│       │                              │  (Droid)    │        │
│       │                              └─────────────┘        │
│       │                                       │              │
│       │◀──────────────────────────────────────┘              │
│       │ Progress Updates + Final Result                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- No timeout limits - jobs run until completion
- Progress updates keep user informed
- Resilient to crashes (jobs persist in DB)
- Can queue multiple tasks
- Works with existing infrastructure (SQLite/PostgreSQL)

**Cons**:
- More complex implementation
- Requires background worker process

### Option B: Streaming with Progress Updates
```
┌─────────────────────────────────────────────────────────────┐
│                  STREAMING ARCHITECTURE                      │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  User Message                                                │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Telegram   │───▶│ Orchestrator│───▶│   Droid     │     │
│  │  Adapter    │    │             │    │   Client    │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│       ▲                                       │              │
│       │                                       │              │
│       │◀──────── Progress Chunks ─────────────┘              │
│       │  "🔧 Reading files..."                               │
│       │  "💭 Analyzing code..."                              │
│       │  "📝 Writing solution..."                            │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- Simpler implementation
- Real-time feedback
- Uses existing streaming mode

**Cons**:
- Still limited by Droid CLI timeout
- Telegram connection can drop on long operations
- No persistence if process crashes

### Option C: Task Decomposition (NOVA-Native)
```
┌─────────────────────────────────────────────────────────────┐
│              TASK DECOMPOSITION ARCHITECTURE                 │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Complex Task: "Build authentication system"                 │
│       │                                                      │
│       ▼                                                      │
│  ┌─────────────┐                                            │
│  │  POLARIS    │  Decomposes into subtasks                  │
│  │  Planner    │                                            │
│  └─────────────┘                                            │
│       │                                                      │
│       ├──▶ Subtask 1: "Design auth schema" (2 min)          │
│       ├──▶ Subtask 2: "Create user model" (3 min)           │
│       ├──▶ Subtask 3: "Implement JWT" (4 min)               │
│       └──▶ Subtask 4: "Add middleware" (3 min)              │
│                                                              │
│  Each subtask completes within timeout!                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

**Pros**:
- Works within existing timeout limits
- Natural fit for NOVA multi-agent system
- Better error isolation
- Incremental progress visible

**Cons**:
- Requires intelligent task decomposition
- May lose context between subtasks
- Not all tasks decompose cleanly

### Option D: Hybrid (RECOMMENDED FINAL)
```
┌─────────────────────────────────────────────────────────────┐
│                   HYBRID ARCHITECTURE                        │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   LAYER 1: QUICK PATH                │    │
│  │  Simple tasks (< 5 min) → Direct execution          │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   LAYER 2: DECOMPOSITION             │    │
│  │  Medium tasks → POLARIS breaks into subtasks        │    │
│  │  Each subtask runs in quick path                    │    │
│  └─────────────────────────────────────────────────────┘    │
│                          │                                   │
│                          ▼                                   │
│  ┌─────────────────────────────────────────────────────┐    │
│  │                   LAYER 3: ASYNC QUEUE               │    │
│  │  Complex/Long tasks → Background job with updates   │    │
│  │  User gets immediate ACK + progress notifications   │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

---

## 📊 Recommendation: Hybrid Approach (Option D)

### Phase 1: Async Job Queue (Week 1-2)
Implement background job processing for immediate relief.

### Phase 2: Progress Streaming (Week 2-3)
Add real-time progress updates via Telegram.

### Phase 3: Smart Decomposition (Week 3-4)
Integrate POLARIS-based task decomposition.

---

## 🗄️ Database Schema Changes

```sql
-- New table for async jobs
CREATE TABLE nova_jobs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  conversation_id TEXT NOT NULL,
  session_id TEXT,
  
  -- Job details
  status TEXT NOT NULL DEFAULT 'pending', -- pending, running, completed, failed, cancelled
  priority INTEGER DEFAULT 0,
  
  -- Task info
  task_type TEXT NOT NULL, -- 'droid_exec', 'nova_mission', 'decomposed_subtask'
  prompt TEXT NOT NULL,
  cwd TEXT NOT NULL,
  
  -- NOVA context
  nova_agent TEXT,
  nova_mission TEXT,
  parent_job_id TEXT, -- For decomposed subtasks
  
  -- Execution tracking
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  progress INTEGER DEFAULT 0, -- 0-100
  progress_message TEXT,
  
  -- Results
  result TEXT,
  error TEXT,
  
  -- Metadata
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (conversation_id) REFERENCES remote_agent_conversations(id),
  FOREIGN KEY (session_id) REFERENCES remote_agent_sessions(id),
  FOREIGN KEY (parent_job_id) REFERENCES nova_jobs(id)
);

-- Index for efficient job polling
CREATE INDEX idx_nova_jobs_status ON nova_jobs(status, priority DESC, created_at);
CREATE INDEX idx_nova_jobs_conversation ON nova_jobs(conversation_id, status);
```

---

## 🔧 Implementation Plan

### 1. Job Queue Service (`src/jobs/job-queue.ts`)
```typescript
interface NovaJob {
  id: string;
  conversationId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  taskType: 'droid_exec' | 'nova_mission' | 'decomposed_subtask';
  prompt: string;
  cwd: string;
  novaAgent?: string;
  progress: number;
  progressMessage?: string;
  result?: string;
  error?: string;
}

class JobQueue {
  async enqueue(job: Omit<NovaJob, 'id' | 'status'>): Promise<string>;
  async getJob(id: string): Promise<NovaJob | null>;
  async updateProgress(id: string, progress: number, message?: string): Promise<void>;
  async complete(id: string, result: string): Promise<void>;
  async fail(id: string, error: string): Promise<void>;
  async getNextPending(): Promise<NovaJob | null>;
}
```

### 2. Job Worker (`src/jobs/job-worker.ts`)
```typescript
class JobWorker {
  private running = false;
  private currentJob: NovaJob | null = null;
  
  async start(): Promise<void>;
  async stop(): Promise<void>;
  
  private async processJob(job: NovaJob): Promise<void> {
    // 1. Update status to 'running'
    // 2. Execute Droid CLI (no timeout!)
    // 3. Stream progress updates to Telegram
    // 4. Complete or fail job
  }
}
```

### 3. Orchestrator Changes (`src/orchestrator/orchestrator.ts`)
```typescript
// Add complexity estimation
function estimateComplexity(prompt: string): 'quick' | 'medium' | 'complex' {
  const length = prompt.length;
  const hasNovaAgent = /activate|constellation/i.test(prompt);
  const hasMultiStep = /then|after|finally|phase/i.test(prompt);
  
  if (length < 500 && !hasNovaAgent && !hasMultiStep) return 'quick';
  if (length < 2000 && !hasMultiStep) return 'medium';
  return 'complex';
}

// Route based on complexity
async function handleMessage(...) {
  const complexity = estimateComplexity(message);
  
  if (complexity === 'quick') {
    // Direct execution (existing path)
    return await executeDirectly(message);
  }
  
  if (complexity === 'medium') {
    // Try decomposition first
    const subtasks = await decomposeTask(message);
    if (subtasks.length > 1) {
      return await executeSubtasks(subtasks);
    }
  }
  
  // Complex: Queue for background processing
  const jobId = await jobQueue.enqueue({
    conversationId,
    taskType: 'nova_mission',
    prompt: message,
    cwd,
    novaAgent: session.metadata?.novaActiveAgent,
  });
  
  await platform.sendMessage(conversationId, 
    `🔄 **Task Queued** (Job: ${jobId.slice(0, 8)})\n\n` +
    `Your request is being processed in the background.\n` +
    `I'll notify you when it's complete.\n\n` +
    `💡 Use \`/job ${jobId.slice(0, 8)}\` to check status.`
  );
}
```

### 4. New Commands
```
/job <id>        - Check job status
/jobs            - List pending/running jobs
/cancel <id>     - Cancel a pending job
/priority <id> <n> - Change job priority
```

### 5. Telegram Progress Updates
```typescript
// In job worker, periodically send updates
async function sendProgressUpdate(job: NovaJob): Promise<void> {
  const progressBar = '█'.repeat(job.progress / 10) + '░'.repeat(10 - job.progress / 10);
  
  await telegramAdapter.sendMessage(job.conversationId,
    `⏳ **Job ${job.id.slice(0, 8)}** [${progressBar}] ${job.progress}%\n` +
    `${job.progressMessage || 'Processing...'}`
  );
}
```

---

## 📈 Expected Outcomes

| Metric | Before | After |
|--------|--------|-------|
| Max Task Duration | 15 min | Unlimited |
| User Feedback | Timeout error | Progress updates |
| Task Success Rate | ~60% (complex) | ~95% |
| User Experience | Frustrating | Smooth |

---

## ⚠️ Risks & Mitigations

| Risk | Mitigation |
|------|------------|
| Worker crashes mid-job | Jobs persist in DB, can resume |
| Too many queued jobs | Priority system + limits |
| Progress updates spam | Rate limit to 1/minute |
| Memory leaks in worker | Periodic restart, monitoring |

---

## ▶️ Next Steps

1. **Create migration** for `nova_jobs` table
2. **Implement JobQueue** service
3. **Implement JobWorker** with Droid integration
4. **Modify Orchestrator** for complexity routing
5. **Add Telegram commands** for job management
6. **Test with complex NOVA missions**
7. **Deploy and monitor**

---

## 💡 Quick Wins (Immediate)

While building the full solution, these quick fixes help:

1. **Increase timeout** to 30 minutes (`DROID_MAX_TIMEOUT_MS=1800000`)
2. **Add "typing" indicator** while processing
3. **Better timeout message** with decomposition suggestions

---

*"No task too complex. No timeout too short. NOVA adapts."*

⭐ POLARIS Ξ8890 + 🔭 VEGA Ξ172167


---

## 🔬 Technical Deep Dive: Droid Client Modifications

### Current Flow (Blocking)
```
User → Telegram → Orchestrator → DroidClient.sendQuery() → [BLOCKS 5-15 min] → Response
```

### New Flow (Async)
```
User → Telegram → Orchestrator → JobQueue.enqueue() → ACK (immediate)
                                        ↓
                              JobWorker.processJob()
                                        ↓
                              DroidClient.sendQuery() (no timeout)
                                        ↓
                              Progress Updates → Telegram
                                        ↓
                              Final Result → Telegram
```

### Modified DroidClient for Background Jobs

```typescript
// src/clients/droid.ts - Add async execution mode

export interface DroidJobOptions extends DroidClientOptions {
  onProgress?: (progress: number, message: string) => Promise<void>;
  onChunk?: (chunk: MessageChunk) => Promise<void>;
  signal?: AbortSignal; // For cancellation
}

export class DroidClient implements IAssistantClient {
  // ... existing code ...

  /**
   * Execute without timeout - for background job processing
   * Emits progress updates via callbacks
   */
  async *sendQueryAsync(
    prompt: string,
    cwd: string,
    options: DroidJobOptions = {}
  ): AsyncGenerator<MessageChunk> {
    const droidBin = this.options.bin ?? envString('DROID_BIN') ?? 'droid';
    
    // Build args (same as sendQuery)
    const args = this.buildArgs(prompt, cwd, options);
    
    const child = spawn(droidBin, args, {
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Handle cancellation
    if (options.signal) {
      options.signal.addEventListener('abort', () => {
        child.kill('SIGTERM');
      });
    }

    let stdout = '';
    let stderr = '';
    let lastProgressUpdate = Date.now();
    const PROGRESS_INTERVAL = 30000; // 30 seconds

    child.stdout.on('data', async (data: string) => {
      stdout += data;
      
      // Emit progress updates periodically
      if (Date.now() - lastProgressUpdate > PROGRESS_INTERVAL) {
        lastProgressUpdate = Date.now();
        
        // Estimate progress from output patterns
        const progress = this.estimateProgress(stdout);
        const message = this.extractProgressMessage(stdout);
        
        if (options.onProgress) {
          await options.onProgress(progress, message);
        }
      }
    });

    child.stderr.on('data', (data: string) => {
      stderr += data;
    });

    // NO TIMEOUT - wait for completion
    const exitCode = await new Promise<number>((resolve, reject) => {
      child.on('error', reject);
      child.on('close', code => resolve(code ?? 1));
    });

    // Parse and yield result (same as sendQuery)
    yield* this.parseOutput(stdout, stderr, exitCode);
  }

  private estimateProgress(stdout: string): number {
    // Heuristic progress estimation based on output patterns
    const lines = stdout.split('\n').length;
    const hasToolCalls = /🔧|💭|📝/.test(stdout);
    const hasResult = /result|complete|done/i.test(stdout);
    
    if (hasResult) return 90;
    if (hasToolCalls) return Math.min(70, 20 + lines * 2);
    return Math.min(50, 10 + lines);
  }

  private extractProgressMessage(stdout: string): string {
    // Extract last meaningful line for progress message
    const lines = stdout.trim().split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i].trim();
      if (line && !line.startsWith('{') && line.length < 100) {
        return line;
      }
    }
    return 'Processing...';
  }
}
```

---

## 🎯 Task Decomposition Engine

### POLARIS Decomposition Prompt

```typescript
// src/nova/task-decomposer.ts

const DECOMPOSITION_PROMPT = `
You are POLARIS, the Strategic Commander of NOVA.

Analyze this task and determine if it should be decomposed into smaller subtasks.

RULES:
1. Only decompose if the task would take > 5 minutes
2. Each subtask should be completable in < 5 minutes
3. Subtasks should be independent when possible
4. Preserve context between subtasks
5. Return JSON format

TASK:
{task}

RESPOND WITH JSON:
{
  "shouldDecompose": boolean,
  "reason": "why decompose or not",
  "estimatedMinutes": number,
  "subtasks": [
    {
      "order": 1,
      "description": "what to do",
      "prompt": "exact prompt for this subtask",
      "dependsOn": [], // order numbers of dependencies
      "estimatedMinutes": number
    }
  ]
}
`;

export async function decomposeTask(
  task: string,
  cwd: string
): Promise<DecompositionResult> {
  const droid = new DroidClient({ reasoningEffort: 'low' });
  const prompt = DECOMPOSITION_PROMPT.replace('{task}', task);
  
  let result = '';
  for await (const chunk of droid.sendQuery(prompt, cwd)) {
    if (chunk.type === 'assistant') {
      result += chunk.content;
    }
  }
  
  return JSON.parse(extractJson(result));
}
```

### Subtask Execution Flow

```typescript
// src/jobs/subtask-executor.ts

export async function executeSubtasks(
  subtasks: Subtask[],
  context: ExecutionContext
): Promise<string[]> {
  const results: string[] = [];
  const completed = new Set<number>();
  
  for (const subtask of subtasks) {
    // Check dependencies
    const depsReady = subtask.dependsOn.every(dep => completed.has(dep));
    if (!depsReady) {
      throw new Error(`Dependencies not met for subtask ${subtask.order}`);
    }
    
    // Build context from previous results
    const contextPrompt = buildContextPrompt(subtask, results);
    
    // Execute subtask
    await context.sendProgress(
      `🔄 Subtask ${subtask.order}/${subtasks.length}: ${subtask.description}`
    );
    
    const result = await executeSubtask(contextPrompt, context);
    results.push(result);
    completed.add(subtask.order);
    
    await context.sendProgress(
      `✅ Subtask ${subtask.order} complete`
    );
  }
  
  return results;
}
```

---

## 📱 Telegram UX Improvements

### Progress Message Templates

```typescript
// src/adapters/telegram-progress.ts

export const PROGRESS_TEMPLATES = {
  queued: (jobId: string) => `
🔄 **Task Queued**

Your request is being processed in the background.
Job ID: \`${jobId.slice(0, 8)}\`

💡 Commands:
• \`/job ${jobId.slice(0, 8)}\` - Check status
• \`/cancel ${jobId.slice(0, 8)}\` - Cancel task
`,

  started: (jobId: string, agent?: string) => `
⚡ **Processing Started**
${agent ? `Agent: ${agent}` : ''}
Job: \`${jobId.slice(0, 8)}\`

I'll update you on progress...
`,

  progress: (jobId: string, percent: number, message: string) => {
    const bar = '█'.repeat(Math.floor(percent / 10)) + 
                '░'.repeat(10 - Math.floor(percent / 10));
    return `
⏳ **Progress** [${bar}] ${percent}%
${message}
`;
  },

  completed: (jobId: string, duration: string) => `
✅ **Task Complete**
Job: \`${jobId.slice(0, 8)}\`
Duration: ${duration}
`,

  failed: (jobId: string, error: string) => `
❌ **Task Failed**
Job: \`${jobId.slice(0, 8)}\`
Error: ${error}

💡 Try breaking the task into smaller steps.
`,
};
```

### Typing Indicator

```typescript
// Send "typing" action while processing
async function showTypingIndicator(
  bot: Telegraf,
  chatId: number,
  durationMs: number
): Promise<void> {
  const interval = setInterval(() => {
    bot.telegram.sendChatAction(chatId, 'typing');
  }, 4000); // Telegram typing indicator lasts ~5 seconds
  
  setTimeout(() => clearInterval(interval), durationMs);
}
```

---

## 🔄 Migration Path

### Week 1: Foundation
- [ ] Create `nova_jobs` table migration
- [ ] Implement `JobQueue` service
- [ ] Add basic job commands (`/job`, `/jobs`)

### Week 2: Worker
- [ ] Implement `JobWorker` with Droid integration
- [ ] Add progress tracking and updates
- [ ] Integrate with Telegram adapter

### Week 3: Smart Routing
- [ ] Add complexity estimation
- [ ] Implement task decomposition
- [ ] Route tasks based on complexity

### Week 4: Polish
- [ ] Add cancellation support
- [ ] Implement priority queue
- [ ] Performance tuning and monitoring

---

## 🧪 Testing Strategy

```typescript
// tests/jobs/job-queue.test.ts

describe('JobQueue', () => {
  it('should enqueue and retrieve jobs', async () => {
    const queue = new JobQueue();
    const jobId = await queue.enqueue({
      conversationId: 'test-123',
      taskType: 'droid_exec',
      prompt: 'Test prompt',
      cwd: '/workspace',
    });
    
    const job = await queue.getJob(jobId);
    expect(job?.status).toBe('pending');
  });

  it('should process jobs in priority order', async () => {
    // ...
  });

  it('should handle job cancellation', async () => {
    // ...
  });
});

describe('TaskDecomposer', () => {
  it('should decompose complex tasks', async () => {
    const result = await decomposeTask(
      'Build a complete authentication system with JWT, refresh tokens, and password reset',
      '/workspace'
    );
    
    expect(result.shouldDecompose).toBe(true);
    expect(result.subtasks.length).toBeGreaterThan(1);
  });

  it('should not decompose simple tasks', async () => {
    const result = await decomposeTask(
      'Add a console.log statement',
      '/workspace'
    );
    
    expect(result.shouldDecompose).toBe(false);
  });
});
```

---

*Architecture complete. Ready for implementation.*

⭐ POLARIS Ξ8890 + 🔭 VEGA Ξ172167
