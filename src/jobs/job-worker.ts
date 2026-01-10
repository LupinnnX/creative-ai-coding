/**
 * NOVA Job Worker Service
 * 
 * Background worker for processing async jobs with Droid integration.
 * Enables unlimited task complexity by decoupling execution from response.
 * 
 * Features:
 * - Concurrent job processing with configurable parallelism
 * - Progress tracking and Telegram notifications
 * - Graceful shutdown with job completion
 * - Automatic retry with exponential backoff
 * - Circuit breaker for Droid failures
 * 
 * @author ANTARES Ξ148478
 */
import { EventEmitter } from 'events';
import {
  Job,
  claimNextJob,
  completeJob,
  failJob,
  addJobLog,
  getJob,
} from '../db/job-queue';
import { DroidClient, type DroidClientOptions } from '../clients/droid';
import type { MessageChunk } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface JobWorkerConfig {
  /** Poll interval in milliseconds (default: 5000) */
  pollIntervalMs?: number;
  /** Maximum concurrent jobs (default: 1) */
  maxConcurrent?: number;
  /** Job types to process (default: all) */
  jobTypes?: string[];
  /** Progress update interval in ms (default: 30000) */
  progressIntervalMs?: number;
  /** Enable verbose logging (default: false) */
  verbose?: boolean;
}

export interface JobProgress {
  jobId: string;
  percent: number;
  message: string;
  startedAt: Date;
}

export interface JobResult {
  success: boolean;
  result?: Record<string, unknown>;
  error?: string;
  durationMs: number;
}

type JobHandler = (job: Job, worker: JobWorker) => Promise<JobResult>;

// ============================================================================
// JOB WORKER CLASS
// ============================================================================

export class JobWorker extends EventEmitter {
  private running = false;
  private activeJobs = new Map<string, { job: Job; abortController: AbortController }>();
  private pollTimer: NodeJS.Timeout | null = null;
  private handlers = new Map<string, JobHandler>();
  private config: Required<JobWorkerConfig>;

  constructor(config: JobWorkerConfig = {}) {
    super();
    this.config = {
      pollIntervalMs: config.pollIntervalMs ?? 5000,
      maxConcurrent: config.maxConcurrent ?? 1,
      jobTypes: config.jobTypes ?? [],
      progressIntervalMs: config.progressIntervalMs ?? 30000,
      verbose: config.verbose ?? false,
    };

    // Register default handlers
    this.registerHandler('droid_exec', this.handleDroidExec.bind(this));
    this.registerHandler('nova_mission', this.handleDroidExec.bind(this));
  }

  // ==========================================================================
  // LIFECYCLE
  // ==========================================================================

  /**
   * Start the job worker
   */
  async start(): Promise<void> {
    if (this.running) {
      console.log('[JobWorker] Already running');
      return;
    }

    this.running = true;
    console.log('[JobWorker] Starting...', {
      pollInterval: this.config.pollIntervalMs,
      maxConcurrent: this.config.maxConcurrent,
      jobTypes: this.config.jobTypes.length ? this.config.jobTypes : 'all',
    });

    this.emit('started');
    this.poll();
  }

  /**
   * Stop the job worker gracefully
   * Waits for active jobs to complete (with timeout)
   */
  async stop(timeoutMs = 30000): Promise<void> {
    if (!this.running) return;

    console.log('[JobWorker] Stopping...');
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    // Wait for active jobs to complete
    if (this.activeJobs.size > 0) {
      console.log(`[JobWorker] Waiting for ${this.activeJobs.size} active jobs...`);
      
      const deadline = Date.now() + timeoutMs;
      while (this.activeJobs.size > 0 && Date.now() < deadline) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // Force abort remaining jobs
      if (this.activeJobs.size > 0) {
        console.log(`[JobWorker] Force aborting ${this.activeJobs.size} jobs`);
        for (const [jobId, { abortController }] of this.activeJobs) {
          abortController.abort();
          await failJob(jobId, 'Worker shutdown - job aborted', true);
        }
      }
    }

    console.log('[JobWorker] Stopped');
    this.emit('stopped');
  }

  /**
   * Check if worker is running
   */
  isRunning(): boolean {
    return this.running;
  }

  /**
   * Get count of active jobs
   */
  getActiveJobCount(): number {
    return this.activeJobs.size;
  }

  // ==========================================================================
  // JOB HANDLERS
  // ==========================================================================

  /**
   * Register a custom job handler
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.handlers.set(jobType, handler);
    console.log(`[JobWorker] Registered handler for '${jobType}'`);
  }

  // ==========================================================================
  // POLLING & PROCESSING
  // ==========================================================================

  private poll(): void {
    if (!this.running) return;

    // Check if we can take more jobs
    if (this.activeJobs.size < this.config.maxConcurrent) {
      this.claimAndProcess().catch(err => {
        console.error('[JobWorker] Poll error:', err);
      });
    }

    // Schedule next poll
    this.pollTimer = setTimeout(() => this.poll(), this.config.pollIntervalMs);
  }

  private async claimAndProcess(): Promise<void> {
    const jobTypes = this.config.jobTypes.length ? this.config.jobTypes : undefined;
    const job = await claimNextJob(jobTypes);

    if (!job) {
      if (this.config.verbose) {
        console.log('[JobWorker] No pending jobs');
      }
      return;
    }

    console.log(`[JobWorker] Processing job ${job.id} (${job.job_type})`);
    await addJobLog(job.id, 'info', 'Job claimed by worker');

    const abortController = new AbortController();
    this.activeJobs.set(job.id, { job, abortController });
    this.emit('jobStarted', job);

    try {
      const handler = this.handlers.get(job.job_type);
      if (!handler) {
        throw new Error(`No handler registered for job type: ${job.job_type}`);
      }

      const result = await handler(job, this);

      if (result.success) {
        await completeJob(job.id, result.result || {});
        await addJobLog(job.id, 'info', `Job completed in ${result.durationMs}ms`);
        this.emit('jobCompleted', job, result);
      } else {
        await failJob(job.id, result.error || 'Unknown error', true);
        await addJobLog(job.id, 'error', result.error || 'Unknown error');
        this.emit('jobFailed', job, result.error);
      }
    } catch (error) {
      const err = error as Error;
      console.error(`[JobWorker] Job ${job.id} error:`, err);
      await failJob(job.id, err.message, true);
      await addJobLog(job.id, 'error', err.message, { stack: err.stack });
      this.emit('jobFailed', job, err.message);
    } finally {
      this.activeJobs.delete(job.id);
    }
  }

  // ==========================================================================
  // DROID EXECUTION HANDLER
  // ==========================================================================

  /**
   * Handle Droid execution jobs
   * This is the core handler for AI tasks
   */
  private async handleDroidExec(job: Job): Promise<JobResult> {
    const startTime = Date.now();
    const payload = job.payload as {
      prompt: string;
      cwd: string;
      sessionId?: string;
      droidOptions?: DroidClientOptions;
      novaAgent?: string;
      novaMission?: string;
    };

    if (!payload.prompt || !payload.cwd) {
      return {
        success: false,
        error: 'Missing required payload: prompt and cwd',
        durationMs: Date.now() - startTime,
      };
    }

    const missionName = payload.novaMission 
      ? payload.novaMission.substring(0, 50) + (payload.novaMission.length > 50 ? '...' : '')
      : 'Processing task';
    const agentName = payload.novaAgent || 'Agent';

    await addJobLog(job.id, 'info', 'Starting Droid execution (Infinite Patience mode)', {
      promptLength: payload.prompt.length,
      cwd: payload.cwd,
      novaAgent: payload.novaAgent,
      novaMission: payload.novaMission,
    });

    // Phase detection patterns for meaningful progress updates
    const PHASE_PATTERNS = [
      { pattern: /🎯\s*PLANNING|planning|analyzing|understanding/i, phase: '🎯 Planning', percent: 10 },
      { pattern: /🔬\s*RESEARCH|researching|investigating|exploring/i, phase: '🔬 Researching', percent: 20 },
      { pattern: /🏗️\s*BUILD|building|creating|implementing|developing/i, phase: '🏗️ Building', percent: 40 },
      { pattern: /writing|coding|generating/i, phase: '✍️ Writing code', percent: 50 },
      { pattern: /testing|test|verifying/i, phase: '🧪 Testing', percent: 70 },
      { pattern: /✨\s*REVIEW|reviewing|checking|validating/i, phase: '✨ Reviewing', percent: 80 },
      { pattern: /✅\s*COMPLETE|complete|done|finished|success/i, phase: '✅ Completing', percent: 95 },
    ];

    let currentPhase = '⚡ Starting';
    let currentPercent = 5;
    let lastPhaseUpdate = '';

    // Build Droid client options with EXTENDED TIMEOUT for background jobs
    const droidOptions: DroidClientOptions = {
      ...payload.droidOptions,
      timeoutMs: 0, // Infinite patience: 1 hour timeout for background jobs
      onProgress: (elapsed: number, message: string) => {
        // Detect phase from message content
        for (const { pattern, phase, percent } of PHASE_PATTERNS) {
          if (pattern.test(message)) {
            currentPhase = phase;
            currentPercent = Math.max(currentPercent, percent);
            break;
          }
        }

        // Build descriptive progress message
        const progressMsg = `${currentPhase}: ${missionName}`;
        
        // Only emit if phase changed or significant time passed
        if (progressMsg !== lastPhaseUpdate) {
          lastPhaseUpdate = progressMsg;
          this.emit('jobProgress', job, {
            percent: currentPercent,
            message: progressMsg,
            phase: currentPhase,
            agent: agentName,
            mission: missionName,
          });
        }
        
        addJobLog(job.id, 'info', message, { 
          elapsedSeconds: elapsed,
          phase: currentPhase,
          percent: currentPercent,
        }).catch(() => {});
      },
    };

    const droid = new DroidClient(droidOptions);
    const chunks: MessageChunk[] = [];
    let sessionId: string | undefined;

    // Emit initial progress
    this.emit('jobProgress', job, {
      percent: 5,
      message: `⚡ Starting: ${missionName}`,
      phase: '⚡ Starting',
      agent: agentName,
      mission: missionName,
    });

    try {
      for await (const chunk of droid.sendQuery(
        payload.prompt,
        payload.cwd,
        payload.sessionId
      )) {
        chunks.push(chunk);

        // Track session ID
        if (chunk.type === 'result' && chunk.sessionId) {
          sessionId = chunk.sessionId;
        }

        // Detect phase from assistant messages
        if (chunk.type === 'assistant' && chunk.content) {
          for (const { pattern, phase, percent } of PHASE_PATTERNS) {
            if (pattern.test(chunk.content)) {
              if (phase !== currentPhase) {
                currentPhase = phase;
                currentPercent = Math.max(currentPercent, percent);
                const progressMsg = `${currentPhase}: ${missionName}`;
                this.emit('jobProgress', job, {
                  percent: currentPercent,
                  message: progressMsg,
                  phase: currentPhase,
                  agent: agentName,
                  mission: missionName,
                });
                lastPhaseUpdate = progressMsg;
              }
              break;
            }
          }
        }
      }

      // Extract final result
      const assistantMessages = chunks
        .filter(c => c.type === 'assistant' && c.content)
        .map(c => c.content as string);

      const systemMessages = chunks
        .filter(c => c.type === 'system' && c.content)
        .map(c => c.content as string);

      const finalMessage = assistantMessages.length > 0
        ? assistantMessages[assistantMessages.length - 1]
        : systemMessages.join('\n\n');

      // Check for errors in the response
      const hasError = chunks.some(c => 
        c.type === 'assistant' && 
        c.content?.includes('⚠️') && 
        (c.content?.includes('failed') || c.content?.includes('error'))
      );

      if (hasError && !finalMessage) {
        return {
          success: false,
          error: 'Droid execution failed - no valid response',
          durationMs: Date.now() - startTime,
        };
      }

      return {
        success: true,
        result: {
          message: finalMessage,
          sessionId,
          chunksCount: chunks.length,
          assistantMessagesCount: assistantMessages.length,
        },
        durationMs: Date.now() - startTime,
      };
    } catch (error) {
      const err = error as Error;
      return {
        success: false,
        error: `Droid execution error: ${err.message}`,
        durationMs: Date.now() - startTime,
      };
    }
  }

  // ==========================================================================
  // PROGRESS REPORTING
  // ==========================================================================

  /**
   * Update job progress (for external callers)
   */
  async updateProgress(jobId: string, percent: number, message: string): Promise<void> {
    await addJobLog(jobId, 'info', message, { percent });
    
    const entry = this.activeJobs.get(jobId);
    if (entry) {
      this.emit('jobProgress', entry.job, { percent, message });
    }
  }

  /**
   * Get current progress for a job
   */
  async getJobProgress(jobId: string): Promise<JobProgress | null> {
    const job = await getJob(jobId);
    if (!job) return null;

    // Check if job is actively being processed
    const isActive = this.activeJobs.has(jobId);
    
    return {
      jobId,
      percent: job.status === 'completed' ? 100 : (job.status === 'running' ? (isActive ? 50 : 25) : 0),
      message: job.status === 'completed' 
        ? 'Completed' 
        : (job.status === 'running' ? 'Processing...' : 'Pending'),
      startedAt: job.started_at || job.created_at,
    };
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

let workerInstance: JobWorker | null = null;

/**
 * Get or create the singleton JobWorker instance
 */
export function getJobWorker(config?: JobWorkerConfig): JobWorker {
  if (!workerInstance) {
    workerInstance = new JobWorker(config);
  }
  return workerInstance;
}

/**
 * Start the global job worker
 */
export async function startJobWorker(config?: JobWorkerConfig): Promise<JobWorker> {
  const worker = getJobWorker(config);
  await worker.start();
  return worker;
}

/**
 * Stop the global job worker
 */
export async function stopJobWorker(): Promise<void> {
  if (workerInstance) {
    await workerInstance.stop();
    workerInstance = null;
  }
}
