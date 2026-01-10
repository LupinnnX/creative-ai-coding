# Multi-User Telegram Support v2.1

**Date**: December 31, 2025  
**Status**: Production Ready  
**NOVA Agents**: POLARIS (Strategy), VEGA (Research), ANTARES (Implementation)

## Overview

This document describes the multi-user support implementation for the Telegram agent, enabling 2+ users to interact with the bot simultaneously with proper session isolation.

## Architecture

### Conversation ID Format

**Before (v2.0)**: `{chatId}` - All users in a group shared the same session  
**After (v2.1)**: `{chatId}:{userId}` - Each user gets their own isolated session

```
Private Chat:  123456789:123456789  (chatId equals userId)
Group Chat:    -1001234567890:111111111  (User A)
               -1001234567890:222222222  (User B)
```

### Session Isolation

Each user maintains:
- Independent conversation history
- Separate NOVA agent activation state
- Individual model/reasoning settings
- Isolated codebase context

### Concurrency Model

```
┌─────────────────────────────────────────────────────────────┐
│                  ConversationLockManager                     │
├─────────────────────────────────────────────────────────────┤
│  MAX_CONCURRENT: 10 (configurable via env)                  │
│                                                              │
│  Per-User Ordering:                                          │
│  - Messages from same user process sequentially              │
│  - Messages from different users process in parallel         │
│                                                              │
│  Global Capacity:                                            │
│  - When at max capacity, new requests are queued             │
│  - Queue processes FIFO when capacity frees up               │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### Conversations Table
```sql
-- Added in migration 002
telegram_user_id VARCHAR(50)      -- Telegram user ID
telegram_username VARCHAR(255)    -- Telegram username
```

### Sessions Table
```sql
-- Added in migration 002
user_identifier VARCHAR(255)      -- User ID for tracking
platform_username VARCHAR(255)    -- Username for display
```

## API Endpoints

### Health Check: Multi-User Status
```
GET /health/users
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-12-31T12:00:00.000Z",
  "concurrency": {
    "activeConversations": 2,
    "maxConcurrent": 10,
    "queuedMessages": 0
  },
  "sessions": {
    "totalActive": 3,
    "byUser": [
      { "user_identifier": "111111111", "platform_username": "Alice", "session_count": 1 },
      { "user_identifier": "222222222", "platform_username": "Bob", "session_count": 2 }
    ]
  },
  "multiUserSupport": {
    "enabled": true,
    "version": "2.1",
    "conversationIdFormat": "chatId:userId"
  }
}
```

## Configuration

### Environment Variables

```bash
# Maximum concurrent conversations (default: 10)
MAX_CONCURRENT_CONVERSATIONS=10

# Telegram allowlist (optional, comma-separated user IDs)
TELEGRAM_ALLOWLIST=111111111,222222222
```

## Usage Scenarios

### Scenario 1: Two Users in Private Chats
```
User A (private): chatId=111, userId=111 → convId=111:111
User B (private): chatId=222, userId=222 → convId=222:222

Result: Fully isolated, parallel processing
```

### Scenario 2: Two Users in Same Group
```
Group Chat: chatId=-1001234567890

User A: convId=-1001234567890:111111111
User B: convId=-1001234567890:222222222

Result: Each user has own session, parallel processing
```

### Scenario 3: Same User in Multiple Groups
```
User A in Group 1: convId=-1001111111111:123456789
User A in Group 2: convId=-1002222222222:123456789

Result: Separate sessions per group
```

## Diagnostics

### Log Format
```
[App:DIAG] Incoming text message {
  userId: "111111111",
  username: "Alice",
  chatId: "-1001234567890",
  isGroup: true,
  messageLength: 50,
  timestamp: "2025-12-31T12:00:00.000Z"
}

[App:DIAG] Processing message {
  conversationId: "-1001234567890:111111111",
  userId: "111111111",
  username: "Alice",
  isGroup: true
}
```

### Monitoring Queries
```sql
-- Active sessions by user
SELECT user_identifier, platform_username, COUNT(*) 
FROM remote_agent_sessions 
WHERE active = true 
GROUP BY user_identifier, platform_username;

-- Conversations by Telegram user
SELECT telegram_user_id, telegram_username, COUNT(*) 
FROM remote_agent_conversations 
WHERE platform_type = 'telegram' 
GROUP BY telegram_user_id, telegram_username;
```

## Migration Notes

### Backward Compatibility
- Legacy conversation IDs (without `:userId`) are handled gracefully
- `parseConversationId()` returns `{ chatId, userId: undefined }` for legacy IDs
- Existing sessions continue to work

### Upgrade Path
1. Deploy new code
2. Run migration 002 if not already applied
3. New conversations will use the composite ID format
4. Existing conversations will be updated on next message

## Testing

Run the multi-user tests:
```bash
npm test -- --testPathPattern="telegram.test"
```

## Troubleshooting

### Issue: Users sharing sessions in groups
**Cause**: Old code using `ctx.chat.id` only  
**Fix**: Ensure using `telegram.getConversationId(ctx)` which returns `chatId:userId`

### Issue: Messages not being delivered
**Cause**: Using composite ID for `sendMessage`  
**Fix**: `sendMessage` now extracts `chatId` from composite ID automatically

### Issue: High memory usage with many users
**Cause**: Too many concurrent sessions  
**Fix**: Adjust `MAX_CONCURRENT_CONVERSATIONS` environment variable
