-- Migration: 004_multi_user_support.sql
-- Date: 2025-12-31
-- Description: Add multi-user support columns for Telegram

-- Add telegram user tracking columns to conversations
ALTER TABLE remote_agent_conversations 
ADD COLUMN IF NOT EXISTS telegram_user_id VARCHAR(64),
ADD COLUMN IF NOT EXISTS telegram_username VARCHAR(255);

-- Add user tracking columns to sessions
ALTER TABLE remote_agent_sessions
ADD COLUMN IF NOT EXISTS user_identifier VARCHAR(64),
ADD COLUMN IF NOT EXISTS platform_username VARCHAR(255);

-- Create index for faster user lookups
CREATE INDEX IF NOT EXISTS idx_conversations_telegram_user 
ON remote_agent_conversations(telegram_user_id) 
WHERE telegram_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_user_identifier 
ON remote_agent_sessions(user_identifier) 
WHERE user_identifier IS NOT NULL;

-- Add comment for documentation
COMMENT ON COLUMN remote_agent_conversations.telegram_user_id IS 'Telegram user ID for multi-user tracking';
COMMENT ON COLUMN remote_agent_conversations.telegram_username IS 'Telegram username (optional)';
COMMENT ON COLUMN remote_agent_sessions.user_identifier IS 'Platform-specific user identifier';
COMMENT ON COLUMN remote_agent_sessions.platform_username IS 'Platform username (optional)';
