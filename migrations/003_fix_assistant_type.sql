-- Creative AI-Driven Coding Development - Fix Assistant Type Default
-- Version: 3.0
-- Description: Fix 'claude' to 'droid' for all existing records
-- Date: December 30, 2025
-- Issue: "Unknown assistant type: claude. Supported type: 'droid'"

-- Fix existing conversations with 'claude' type
UPDATE remote_agent_conversations 
SET ai_assistant_type = 'droid' 
WHERE ai_assistant_type = 'claude';

-- Fix existing codebases with 'claude' type
UPDATE remote_agent_codebases 
SET ai_assistant_type = 'droid' 
WHERE ai_assistant_type = 'claude';

-- Fix existing sessions with 'claude' type
UPDATE remote_agent_sessions 
SET ai_assistant_type = 'droid' 
WHERE ai_assistant_type = 'claude';

-- Change default for conversations table
ALTER TABLE remote_agent_conversations 
ALTER COLUMN ai_assistant_type SET DEFAULT 'droid';

-- Change default for codebases table
ALTER TABLE remote_agent_codebases 
ALTER COLUMN ai_assistant_type SET DEFAULT 'droid';

-- Log the fix
DO $$
DECLARE
  conv_count INTEGER;
  codebase_count INTEGER;
  session_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO conv_count FROM remote_agent_conversations WHERE ai_assistant_type = 'droid';
  SELECT COUNT(*) INTO codebase_count FROM remote_agent_codebases WHERE ai_assistant_type = 'droid';
  SELECT COUNT(*) INTO session_count FROM remote_agent_sessions WHERE ai_assistant_type = 'droid';
  
  RAISE NOTICE 'Fixed assistant types - Conversations: %, Codebases: %, Sessions: %', 
    conv_count, codebase_count, session_count;
END $$;
