-- Creative AI-Driven Coding Development - Project Isolation Enhancement
-- Version: 2.0
-- Description: Add workspace isolation and chat ID tracking for multi-user support
-- Date: December 30, 2025

-- Add workspace isolation columns to conversations
ALTER TABLE remote_agent_conversations
ADD COLUMN IF NOT EXISTS workspace_path VARCHAR(500),
ADD COLUMN IF NOT EXISTS project_name VARCHAR(255),
ADD COLUMN IF NOT EXISTS telegram_user_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);

-- Index for fast workspace lookup
CREATE INDEX IF NOT EXISTS idx_conversations_workspace 
ON remote_agent_conversations(workspace_path);

-- Index for Telegram user lookup (multi-user support)
CREATE INDEX IF NOT EXISTS idx_conversations_telegram_user 
ON remote_agent_conversations(telegram_user_id);

-- Add user tracking to sessions for analytics
ALTER TABLE remote_agent_sessions
ADD COLUMN IF NOT EXISTS user_identifier VARCHAR(255),
ADD COLUMN IF NOT EXISTS platform_username VARCHAR(255);

-- Create a new table for tracking concurrent usage
CREATE TABLE IF NOT EXISTS remote_agent_usage_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  timestamp TIMESTAMP DEFAULT NOW(),
  active_conversations INTEGER NOT NULL,
  queued_messages INTEGER DEFAULT 0,
  platform_type VARCHAR(20),
  peak_concurrent INTEGER DEFAULT 0
);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_usage_stats_timestamp 
ON remote_agent_usage_stats(timestamp DESC);

-- Add comments for documentation
COMMENT ON COLUMN remote_agent_conversations.workspace_path IS 'Isolated workspace directory for this conversation';
COMMENT ON COLUMN remote_agent_conversations.project_name IS 'Human-readable project name';
COMMENT ON COLUMN remote_agent_conversations.telegram_user_id IS 'Telegram user ID for multi-user tracking';
COMMENT ON TABLE remote_agent_usage_stats IS 'Tracks concurrent usage for capacity planning';
