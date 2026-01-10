-- Migration: 006_nova_jobs
-- Description: Infinite Patience job queue system
-- Author: ANTARES Ξ148478

-- Nova Jobs Table
CREATE TABLE IF NOT EXISTS nova_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type VARCHAR(50) NOT NULL,
  job_name VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  priority INTEGER NOT NULL DEFAULT 50,
  payload JSONB NOT NULL DEFAULT '{}',
  result JSONB,
  error_message TEXT,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 3,
  retry_after TIMESTAMPTZ,
  conversation_id VARCHAR(255),
  session_id UUID,
  agent VARCHAR(50),
  user_identifier VARCHAR(255),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  timeout_seconds INTEGER NOT NULL DEFAULT 300,
  metadata JSONB NOT NULL DEFAULT '{}'
);

-- Job Logs Table
CREATE TABLE IF NOT EXISTS nova_job_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES nova_jobs(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  level VARCHAR(10) NOT NULL,
  message TEXT NOT NULL,
  data JSONB
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_nova_jobs_status ON nova_jobs(status);
CREATE INDEX IF NOT EXISTS idx_nova_jobs_conversation ON nova_jobs(conversation_id);
CREATE INDEX IF NOT EXISTS idx_nova_jobs_user ON nova_jobs(user_identifier);
CREATE INDEX IF NOT EXISTS idx_nova_jobs_created ON nova_jobs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_nova_jobs_priority ON nova_jobs(priority DESC, created_at ASC) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_nova_job_logs_job ON nova_job_logs(job_id);
