/**
 * Database operations for conversations
 * 
 * MULTI-USER SUPPORT (v2.1):
 * - Stores telegram_user_id and telegram_username for tracking
 * - Supports composite conversation IDs (chatId:userId)
 * 
 * USER CONFIG (v2.2):
 * - Persistent user_config survives session resets
 * - Stores GitHub tokens, preferences, etc.
 */
import { pool } from './connection';
import { Conversation } from '../types';

/**
 * User info for Telegram conversations
 */
export interface TelegramUserContext {
  userId: string;
  username?: string;
}

/**
 * User config that persists across session resets
 */
export interface UserConfig {
  autonomyConfig?: string; // Serialized autonomy config with GitHub token
  preferences?: Record<string, unknown>;
}

export async function getOrCreateConversation(
  platformType: string,
  platformId: string,
  codebaseId?: string,
  userContext?: TelegramUserContext
): Promise<Conversation> {
  const existing = await pool.query<Conversation>(
    'SELECT * FROM remote_agent_conversations WHERE platform_type = $1 AND platform_conversation_id = $2',
    [platformType, platformId]
  );

  if (existing.rows[0]) {
    // Update user info if provided and changed
    if (userContext && platformType === 'telegram') {
      const conv = existing.rows[0];
      // Check if we need to update (avoid unnecessary writes)
      const needsUpdate = await pool.query<{ telegram_user_id: string | null }>(
        'SELECT telegram_user_id FROM remote_agent_conversations WHERE id = $1',
        [conv.id]
      );
      
      if (needsUpdate.rows[0]?.telegram_user_id !== userContext.userId) {
        await pool.query(
          `UPDATE remote_agent_conversations 
           SET telegram_user_id = $1, telegram_username = $2, updated_at = NOW() 
           WHERE id = $3`,
          [userContext.userId, userContext.username || null, conv.id]
        );
        console.log(`[Conversations] Updated user info for ${platformId}: userId=${userContext.userId}`);
      }
    }
    return existing.rows[0];
  }

  // Determine assistant type from codebase or environment (default: droid)
  let assistantType = process.env.DEFAULT_AI_ASSISTANT || 'droid';
  if (codebaseId) {
    const codebase = await pool.query<{ ai_assistant_type: string }>(
      'SELECT ai_assistant_type FROM remote_agent_codebases WHERE id = $1',
      [codebaseId]
    );
    if (codebase.rows[0]?.ai_assistant_type) {
      assistantType = codebase.rows[0].ai_assistant_type;
    }
  }
  
  // Ensure we only use supported assistant types
  if (assistantType !== 'droid') {
    console.log(`[Conversations] Unsupported assistant type '${assistantType}', defaulting to 'droid'`);
    assistantType = 'droid';
  }

  // Create with user context if provided
  if (userContext && platformType === 'telegram') {
    const created = await pool.query<Conversation>(
      `INSERT INTO remote_agent_conversations 
       (platform_type, platform_conversation_id, ai_assistant_type, telegram_user_id, telegram_username) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [platformType, platformId, assistantType, userContext.userId, userContext.username || null]
    );
    console.log(`[Conversations] Created new conversation ${platformId} for user ${userContext.userId}`);
    return created.rows[0];
  }

  const created = await pool.query<Conversation>(
    'INSERT INTO remote_agent_conversations (platform_type, platform_conversation_id, ai_assistant_type) VALUES ($1, $2, $3) RETURNING *',
    [platformType, platformId, assistantType]
  );

  return created.rows[0];
}

export async function updateConversation(
  id: string,
  updates: Partial<Pick<Conversation, 'codebase_id' | 'cwd' | 'ai_assistant_type'>>
): Promise<void> {
  const fields: string[] = [];
  const values: (string | null)[] = [];
  let i = 1;

  if (updates.codebase_id !== undefined) {
    fields.push(`codebase_id = $${i++}`);
    values.push(updates.codebase_id);
  }
  if (updates.cwd !== undefined) {
    fields.push(`cwd = $${i++}`);
    values.push(updates.cwd);
  }
  if (updates.ai_assistant_type !== undefined) {
    fields.push(`ai_assistant_type = $${i++}`);
    values.push(updates.ai_assistant_type);
  }

  if (fields.length === 0) {
    return; // No updates
  }

  fields.push('updated_at = NOW()');
  values.push(id);

  await pool.query(
    `UPDATE remote_agent_conversations SET ${fields.join(', ')} WHERE id = $${i}`,
    values
  );
}


/**
 * Get user config from conversation (persists across resets)
 */
export async function getUserConfig(conversationId: string): Promise<UserConfig> {
  const result = await pool.query<{ user_config: UserConfig }>(
    'SELECT user_config FROM remote_agent_conversations WHERE id = $1',
    [conversationId]
  );
  return result.rows[0]?.user_config || {};
}

/**
 * Update user config (merges with existing)
 */
export async function updateUserConfig(
  conversationId: string,
  config: Partial<UserConfig>
): Promise<void> {
  await pool.query(
    `UPDATE remote_agent_conversations 
     SET user_config = user_config || $1::jsonb, updated_at = NOW() 
     WHERE id = $2`,
    [JSON.stringify(config), conversationId]
  );
  console.log(`[Conversations] Updated user_config for ${conversationId}`);
}
