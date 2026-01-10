/**
 * NOVA Job System
 * 
 * Async job queue and worker for background task processing.
 * Enables unlimited task complexity by decoupling execution from response.
 * 
 * @author ANTARES Ξ148478
 */

export {
  JobWorker,
  JobWorkerConfig,
  JobProgress,
  JobResult,
  getJobWorker,
  startJobWorker,
  stopJobWorker,
} from './job-worker';

export {
  TelegramJobNotifier,
  createTelegramNotifier,
} from './telegram-notifier';

// Re-export job queue operations for convenience
export {
  Job,
  JobStatus,
  JobLog,
  JobLogLevel,
  JobQueueStats,
  CreateJobInput,
  createJob,
  getJob,
  claimNextJob,
  completeJob,
  failJob,
  cancelJob,
  retryJob,
  getJobsByConversation,
  getJobsByStatus,
  getJobsByUser,
  getJobQueueStats,
  getPendingJobsCount,
  getRunningJobsCount,
  addJobLog,
  getJobLogs,
  cleanupOldJobs,
  timeoutStaleJobs,
  updateJobPriority,
} from '../db/job-queue';
