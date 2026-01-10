-- Creative AI-Driven Coding Development - Fix Assistant Type Default
-- Version: 3.0
-- Description: Change default ai_assistant_type from 'claude' to 'droid'
-- Date: December 30, 2025
-- Issue: New conversations default to 'claude' but only 'droid' is supported

-- Fix default for codebases table
ALTER TABLE remote_agent_codebases 
ALTER COLUMN ai_assistant_type SET DEFAULT 'droid';

-- Fix default for conversations table
ALTER TABLE remote_agent_conversations 
ALTER COLUMN ai_assistant_type SET DEFAULT 'droid';

-- Update existing records that have 'claude' to 'droid'
UPDATE remote_agent_codebases 
SET ai_assistant_type = 'droid' 
WHERE ai_assistant_type = 'claude';

UPDATE remote_agent_conversations 
SET ai_assistant_type = 'droid' 
WHERE ai_assistant_type = 'claude';

UPDATE remote_agent_sessions 
SET ai_assistant_type = 'droid' 
WHERE ai_assistant_type = 'claude';

-- Add comment for documentation
COMMENT ON COLUMN remote_agent_conversations.ai_assistant_type IS 'AI assistant type: droid (default). Claude support removed.';
