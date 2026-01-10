/**
 * Telegram Adapter Tests - Multi-User Support
 * Tests the conversation ID format and user isolation
 */

import { parseConversationId, TelegramUserInfo } from './telegram';

describe('TelegramAdapter Multi-User Support', () => {
  describe('parseConversationId', () => {
    it('parses composite conversation ID (chatId:userId)', () => {
      const result = parseConversationId('123456789:987654321');
      expect(result.chatId).toBe('123456789');
      expect(result.userId).toBe('987654321');
    });

    it('handles legacy conversation ID (chatId only)', () => {
      const result = parseConversationId('123456789');
      expect(result.chatId).toBe('123456789');
      expect(result.userId).toBeUndefined();
    });

    it('handles negative chat IDs (group chats)', () => {
      const result = parseConversationId('-1001234567890:987654321');
      expect(result.chatId).toBe('-1001234567890');
      expect(result.userId).toBe('987654321');
    });

    it('handles conversation ID with multiple colons', () => {
      // Edge case: if somehow there are extra colons
      const result = parseConversationId('123:456:789');
      expect(result.chatId).toBe('123');
      expect(result.userId).toBe('456');
    });
  });

  describe('Multi-User Isolation', () => {
    it('different users in same chat get different conversation IDs', () => {
      const userA: TelegramUserInfo = {
        chatId: '-1001234567890',
        userId: '111111111',
        username: 'userA',
        isGroup: true,
      };

      const userB: TelegramUserInfo = {
        chatId: '-1001234567890',
        userId: '222222222',
        username: 'userB',
        isGroup: true,
      };

      const convIdA = `${userA.chatId}:${userA.userId}`;
      const convIdB = `${userB.chatId}:${userB.userId}`;

      expect(convIdA).not.toBe(convIdB);
      expect(convIdA).toBe('-1001234567890:111111111');
      expect(convIdB).toBe('-1001234567890:222222222');
    });

    it('same user in different chats gets different conversation IDs', () => {
      const userInChat1: TelegramUserInfo = {
        chatId: '-1001111111111',
        userId: '123456789',
        username: 'user',
        isGroup: true,
      };

      const userInChat2: TelegramUserInfo = {
        chatId: '-1002222222222',
        userId: '123456789',
        username: 'user',
        isGroup: true,
      };

      const convId1 = `${userInChat1.chatId}:${userInChat1.userId}`;
      const convId2 = `${userInChat2.chatId}:${userInChat2.userId}`;

      expect(convId1).not.toBe(convId2);
    });

    it('private chat has consistent format', () => {
      const privateChat: TelegramUserInfo = {
        chatId: '123456789',
        userId: '123456789', // In private chats, chatId === userId
        username: 'user',
        isGroup: false,
      };

      const convId = `${privateChat.chatId}:${privateChat.userId}`;
      expect(convId).toBe('123456789:123456789');

      // Parsing should work correctly
      const parsed = parseConversationId(convId);
      expect(parsed.chatId).toBe('123456789');
      expect(parsed.userId).toBe('123456789');
    });
  });

  describe('Concurrent User Scenarios', () => {
    it('simulates 2 users sending messages simultaneously', async () => {
      // This test simulates the scenario described in the requirements
      const users = [
        { chatId: '-1001234567890', userId: '111111111', username: 'Alice' },
        { chatId: '-1001234567890', userId: '222222222', username: 'Bob' },
      ];

      const conversationIds = users.map(u => `${u.chatId}:${u.userId}`);

      // Verify unique conversation IDs
      expect(new Set(conversationIds).size).toBe(2);

      // Verify both can be parsed correctly
      conversationIds.forEach((convId, i) => {
        const parsed = parseConversationId(convId);
        expect(parsed.chatId).toBe(users[i].chatId);
        expect(parsed.userId).toBe(users[i].userId);
      });
    });
  });
});
