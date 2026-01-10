/**
 * Telegram Job Notifier
 * 
 * Sends progress updates and completion notifications to Telegram
 * when background jobs are processed.
 * 
 * @author ANTARES Ξ148478
 */
import type { Job } from '../db/job-queue';
import type { JobWorker, JobResult } from './job-worker';
import type { IPlatformAdapter } from '../types';

// ============================================================================
// TYPES
// ============================================================================

export interface TelegramNotifierConfig {
  /** Minimum interval between progress updates (ms) */
  minProgressIntervalMs?: number;
  /** Show progress bar in updates */
  showProgressBar?: boolean;
  /** Include job ID in messages */
  showJobId?: boolean;
}

/** Enhanced progress data with phase information */
export interface JobProgressData {
  percent: number;
  message: string;
  phase?: string;
  agent?: string;
  mission?: string;
}

// ============================================================================
// PROGRESS TEMPLATES
// ============================================================================

const TEMPLATES = {
  queued: (jobId: string, _jobType: string, mission?: string) => 
`🔄 **Task Queued**

${mission ? `📋 ${mission}\n\n` : ''}Your request is being processed in the background.
${jobId ? `Job: \`${jobId.slice(0, 8)}\`` : ''}

💡 I'll notify you when it's complete.`,

  started: (jobId: string, agent?: string, mission?: string) =>
`⚡ **Processing Started**
${agent ? `🤖 Agent: **${agent}**\n` : ''}${mission ? `📋 ${mission}\n` : ''}${jobId ? `Job: \`${jobId.slice(0, 8)}\`` : ''}

Working on your request...`,

  progress: (
    _jobId: string, 
    percent: number, 
    message: string, 
    showBar = true,
    phase?: string,
    agent?: string
  ) => {
    const bar = showBar 
      ? '█'.repeat(Math.floor(percent / 10)) + '░'.repeat(10 - Math.floor(percent / 10))
      : '';
    const agentLine = agent ? `🤖 **${agent}**\n` : '';
    const phaseLine = phase ? `${phase}\n` : '';
    return `${agentLine}⏳ [${bar}] ${percent}%
${phaseLine}${message}`;
  },

  completed: (jobId: string, durationSecs: number, message?: string, agent?: string) => {
    const mins = Math.floor(durationSecs / 60);
    const secs = durationSecs % 60;
    const duration = mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
    return `✅ **Task Complete**
${agent ? `🤖 ${agent}\n` : ''}${jobId ? `Job: \`${jobId.slice(0, 8)}\`\n` : ''}⏱️ Duration: ${duration}
${message ? `\n${message}` : ''}`;
  },

  failed: (jobId: string, error: string, agent?: string) =>
`❌ **Task Failed**
${agent ? `🤖 ${agent}\n` : ''}${jobId ? `Job: \`${jobId.slice(0, 8)}\`\n` : ''}Error: ${error}

💡 Try breaking the task into smaller steps, or use /reset to start fresh.`,
};

// ============================================================================
// TELEGRAM NOTIFIER CLASS
// ============================================================================

export class TelegramJobNotifier {
  private platform: IPlatformAdapter;
  private config: Required<TelegramNotifierConfig>;
  private lastProgressUpdate = new Map<string, number>();
  private lastProgressPercent = new Map<string, number>();

  constructor(platform: IPlatformAdapter, config: TelegramNotifierConfig = {}) {
    this.platform = platform;
    this.config = {
      minProgressIntervalMs: config.minProgressIntervalMs ?? 30000,
      showProgressBar: config.showProgressBar ?? true,
      showJobId: config.showJobId ?? true,
    };
  }

  /**
   * Attach to a JobWorker to receive events
   */
  attachToWorker(worker: JobWorker): void {
    worker.on('jobStarted', (job: Job) => this.onJobStarted(job));
    worker.on('jobProgress', (job: Job, progress: JobProgressData) => 
      this.onJobProgress(job, progress));
    worker.on('jobCompleted', (job: Job, result: JobResult) => this.onJobCompleted(job, result));
    worker.on('jobFailed', (job: Job, error: string) => this.onJobFailed(job, error));
    
    console.log('[TelegramNotifier] Attached to JobWorker');
  }

  /**
   * Send queued notification
   */
  async notifyQueued(
    conversationId: string, 
    jobId: string, 
    jobType: string,
    mission?: string
  ): Promise<void> {
    const message = TEMPLATES.queued(
      this.config.showJobId ? jobId : '',
      jobType,
      mission
    );
    await this.sendSafe(conversationId, message);
  }

  // ==========================================================================
  // EVENT HANDLERS
  // ==========================================================================

  private async onJobStarted(job: Job): Promise<void> {
    if (!job.conversation_id) return;

    const metadata = job.metadata as Record<string, unknown> | undefined;
    const payload = job.payload as Record<string, unknown> | undefined;
    const agent = job.agent || metadata?.novaAgent as string || payload?.novaAgent as string;
    const mission = payload?.novaMission as string;
    
    const message = TEMPLATES.started(
      this.config.showJobId ? job.id : '',
      agent,
      mission
    );
    
    await this.sendSafe(job.conversation_id, message);
  }

  private async onJobProgress(
    job: Job, 
    progress: JobProgressData
  ): Promise<void> {
    if (!job.conversation_id) return;

    // Rate limit progress updates (but always allow phase changes)
    const lastUpdate = this.lastProgressUpdate.get(job.id) || 0;
    const timeSinceLastUpdate = Date.now() - lastUpdate;
    
    // Allow update if: enough time passed OR phase changed significantly
    if (timeSinceLastUpdate < this.config.minProgressIntervalMs) {
      // Skip unless it's a significant phase change (>10% progress)
      const lastPercent = this.lastProgressPercent.get(job.id) || 0;
      if (progress.percent - lastPercent < 10) {
        return;
      }
    }
    
    this.lastProgressUpdate.set(job.id, Date.now());
    this.lastProgressPercent.set(job.id, progress.percent);

    const message = TEMPLATES.progress(
      this.config.showJobId ? job.id : '',
      progress.percent,
      progress.message,
      this.config.showProgressBar,
      progress.phase,
      progress.agent
    );
    
    await this.sendSafe(job.conversation_id, message);
  }

  private async onJobCompleted(job: Job, result: JobResult): Promise<void> {
    if (!job.conversation_id) return;

    // Clean up rate limit tracking
    this.lastProgressUpdate.delete(job.id);
    this.lastProgressPercent.delete(job.id);

    const durationSecs = Math.round(result.durationMs / 1000);
    const resultData = result.result as Record<string, unknown> | undefined;
    const resultMessage = resultData?.message as string;
    const agent = job.agent || (job.payload as Record<string, unknown>)?.novaAgent as string;
    
    // If we have a result message, send it directly
    if (resultMessage) {
      await this.sendSafe(job.conversation_id, resultMessage);
    } else {
      const message = TEMPLATES.completed(
        this.config.showJobId ? job.id : '',
        durationSecs,
        undefined,
        agent
      );
      await this.sendSafe(job.conversation_id, message);
    }
  }

  private async onJobFailed(job: Job, error: string): Promise<void> {
    if (!job.conversation_id) return;

    // Clean up rate limit tracking
    this.lastProgressUpdate.delete(job.id);
    this.lastProgressPercent.delete(job.id);

    const agent = job.agent || (job.payload as Record<string, unknown>)?.novaAgent as string;
    const message = TEMPLATES.failed(
      this.config.showJobId ? job.id : '',
      error,
      agent
    );
    
    await this.sendSafe(job.conversation_id, message);
  }

  // ==========================================================================
  // HELPERS
  // ==========================================================================

  private async sendSafe(conversationId: string, message: string): Promise<void> {
    try {
      await this.platform.sendMessage(conversationId, message);
    } catch (error) {
      console.error('[TelegramNotifier] Failed to send message:', error);
    }
  }
}

// ============================================================================
// FACTORY FUNCTION
// ============================================================================

/**
 * Create and attach a Telegram notifier to a JobWorker
 */
export function createTelegramNotifier(
  platform: IPlatformAdapter,
  worker: JobWorker,
  config?: TelegramNotifierConfig
): TelegramJobNotifier {
  const notifier = new TelegramJobNotifier(platform, config);
  notifier.attachToWorker(worker);
  return notifier;
}
