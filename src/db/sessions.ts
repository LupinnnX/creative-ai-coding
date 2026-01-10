/**
 * Database operations for sessions
 * 
 * MULTI-USER SUPPORT (v2.1):
 * - Tracks user_identifier and platform_username per session
 * - Enables per-user session isolation in group chats
 * 
 * NAMED CHATS (v2.2):
 * - Users can have multiple named chats
 * - Switch between chats without losing context
 */
import { pool } from './connection';
import { Session } from '../types';

/**
 * Get active session by chat name (default: 'default')
 * NOTE: Handles legacy NULL chat_name values by treating them as 'default'
 */
export async function getActiveSession(
  conversationId: string,
  chatName = 'default'
): Promise<Session | null> {
  const result = await pool.query<Session>(
    `SELECT * FROM remote_agent_sessions 
     WHERE conversation_id = $1 AND active = true 
     AND (chat_name = $2 OR (chat_name IS NULL AND $2 = 'default'))
     LIMIT 1`,
    [conversationId, chatName]
  );
  return result.rows[0] || null;
}

/**
 * Get all chats for a conversation (active and recent inactive)
 */
export async function listChats(conversationId: string): Promise<Array<{
  chat_name: string;
  active: boolean;
  started_at: Date;
  message_hint?: string;
}>> {
  const result = await pool.query<{
    chat_name: string;
    active: boolean;
    started_at: Date;
    metadata: Record<string, unknown>;
  }>(
    `SELECT DISTINCT ON (chat_name) chat_name, active, started_at, metadata
     FROM remote_agent_sessions 
     WHERE conversation_id = $1 
     ORDER BY chat_name, started_at DESC`,
    [conversationId]
  );
  return result.rows.map(row => ({
    chat_name: row.chat_name,
    active: row.active,
    started_at: row.started_at,
    message_hint: row.metadata?.lastMessage as string | undefined,
  }));
}

export async function createSession(data: {
  conversation_id: string;
  codebase_id?: string;
  assistant_session_id?: string;
  ai_assistant_type: string;
  user_identifier?: string;
  platform_username?: string;
  chat_name?: string;
}): Promise<Session> {
  const chatName = data.chat_name || 'default';
  const result = await pool.query<Session>(
    `INSERT INTO remote_agent_sessions 
     (conversation_id, codebase_id, ai_assistant_type, assistant_session_id, user_identifier, platform_username, chat_name) 
     VALUES ($1, $2, $3, $4, $5, $6, $7) 
     RETURNING *`,
    [
      data.conversation_id,
      data.codebase_id || null,
      data.ai_assistant_type,
      data.assistant_session_id || null,
      data.user_identifier || null,
      data.platform_username || null,
      chatName,
    ]
  );
  
  if (data.user_identifier) {
    console.log(`[Sessions] Created session '${chatName}' for user ${data.user_identifier}`);
  }
  
  return result.rows[0];
}

/**
 * Switch to a named chat (deactivate current, activate or create target)
 */
export async function switchChat(
  conversationId: string,
  chatName: string,
  aiAssistantType: string,
  userIdentifier?: string
): Promise<{ session: Session; created: boolean }> {
  // Deactivate current active session (any chat)
  await pool.query(
    `UPDATE remote_agent_sessions 
     SET active = false, ended_at = NOW() 
     WHERE conversation_id = $1 AND active = true`,
    [conversationId]
  );

  // Check if target chat exists (even if inactive)
  const existing = await pool.query<Session>(
    `SELECT * FROM remote_agent_sessions 
     WHERE conversation_id = $1 AND chat_name = $2 
     ORDER BY started_at DESC LIMIT 1`,
    [conversationId, chatName]
  );

  if (existing.rows[0]) {
    // Reactivate existing chat
    await pool.query(
      `UPDATE remote_agent_sessions SET active = true, ended_at = NULL WHERE id = $1`,
      [existing.rows[0].id]
    );
    console.log(`[Sessions] Switched to existing chat '${chatName}'`);
    return { session: { ...existing.rows[0], active: true }, created: false };
  }

  // Create new chat
  const newSession = await createSession({
    conversation_id: conversationId,
    ai_assistant_type: aiAssistantType,
    user_identifier: userIdentifier,
    chat_name: chatName,
  });
  console.log(`[Sessions] Created new chat '${chatName}'`);
  return { session: newSession, created: true };
}

export async function updateSession(id: string, sessionId: string): Promise<void> {
  await pool.query('UPDATE remote_agent_sessions SET assistant_session_id = $1 WHERE id = $2', [
    sessionId,
    id,
  ]);
}

export async function deactivateSession(id: string): Promise<void> {
  await pool.query(
    'UPDATE remote_agent_sessions SET active = false, ended_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function updateSessionMetadata(
  id: string,
  metadata: Record<string, unknown>
): Promise<void> {
  await pool.query(
    'UPDATE remote_agent_sessions SET metadata = metadata || $1::jsonb WHERE id = $2',
    [JSON.stringify(metadata), id]
  );
}

/**
 * Get active sessions count for monitoring
 */
export async function getActiveSessionsCount(): Promise<number> {
  const result = await pool.query<{ count: string }>(
    'SELECT COUNT(*) as count FROM remote_agent_sessions WHERE active = true'
  );
  return parseInt(result.rows[0]?.count || '0', 10);
}

/**
 * Get active sessions by user for diagnostics
 */
export async function getActiveSessionsByUser(): Promise<Array<{
  user_identifier: string | null;
  platform_username: string | null;
  session_count: number;
}>> {
  const result = await pool.query<{
    user_identifier: string | null;
    platform_username: string | null;
    session_count: string;
  }>(
    `SELECT user_identifier, platform_username, COUNT(*) as session_count 
     FROM remote_agent_sessions 
     WHERE active = true 
     GROUP BY user_identifier, platform_username`
  );
  return result.rows.map(row => ({
    ...row,
    session_count: parseInt(row.session_count, 10),
  }));
}
