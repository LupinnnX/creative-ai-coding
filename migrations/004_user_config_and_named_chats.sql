-- Migration: User Config & Named Chats
-- Version: 4.0
-- Description: Persist user config across sessions, add named chats

-- Add user_config to conversations (persists across session resets)
ALTER TABLE remote_agent_conversations 
ADD COLUMN IF NOT EXISTS user_config JSONB DEFAULT '{}'::jsonb;

-- Add chat_name to sessions for named chats
ALTER TABLE remote_agent_sessions
ADD COLUMN IF NOT EXISTS chat_name VARCHAR(100) DEFAULT 'default';

-- CRITICAL: Update existing NULL values to 'default' (migration fix)
UPDATE remote_agent_sessions SET chat_name = 'default' WHERE chat_name IS NULL;

-- Add index for finding chats by name
CREATE INDEX IF NOT EXISTS idx_remote_agent_sessions_chat_name 
ON remote_agent_sessions(conversation_id, chat_name, active);

-- Comment explaining the structure
COMMENT ON COLUMN remote_agent_conversations.user_config IS 
'Persistent user config (GitHub token, preferences) that survives session resets';

COMMENT ON COLUMN remote_agent_sessions.chat_name IS 
'Named chat identifier for multi-chat support. Users can have multiple named chats.';
