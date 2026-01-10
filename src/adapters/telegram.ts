/**
 * Telegram platform adapter using Telegraf SDK
 * Handles message sending with 4096 character limit splitting
 * 
 * MULTI-USER SUPPORT (v2.1):
 * - Conversation ID format: `{chatId}:{userId}` for proper user isolation
 * - Each user gets their own session even in group chats
 * - Supports concurrent users with independent contexts
 */
import { Telegraf, Context } from 'telegraf';
import { IPlatformAdapter } from '../types';

const MAX_LENGTH = 4096;
const SAFETY_MARGIN = 100;
const MAX_CHUNK_LENGTH = MAX_LENGTH - SAFETY_MARGIN;

/**
 * Extract user info from Telegram context
 */
export interface TelegramUserInfo {
  chatId: string;
  userId: string;
  username?: string;
  firstName?: string;
  isGroup: boolean;
}

/**
 * Parse a composite conversation ID back to its components
 * Format: `{chatId}:{userId}` or legacy `{chatId}`
 */
export function parseConversationId(conversationId: string): { chatId: string; userId?: string } {
  const parts = conversationId.split(':');
  if (parts.length >= 2) {
    return { chatId: parts[0], userId: parts[1] };
  }
  return { chatId: conversationId };
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Sanitize message for Telegram plain text display
 * Removes markdown formatting that doesn't render properly
 */
function sanitizeForTelegram(message: string): string {
  let text = message;
  
  // Remove bold markdown **text** → text
  text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  
  // Remove italic markdown *text* or _text_ → text (but not bullet points)
  text = text.replace(/(?<!\n)(?<!\s)\*([^*\n]+)\*(?!\*)/g, '$1');
  text = text.replace(/_([^_\n]+)_/g, '$1');
  
  // Remove inline code backticks for single words (keep code blocks)
  text = text.replace(/`([^`\n]{1,30})`/g, '$1');
  
  // Remove "✅ Complete" or similar completion phrases at the end
  text = text.replace(/\n*✅\s*(Complete|Done|Finished)!?\s*$/gi, '');
  text = text.replace(/\n*Complete\s*✅\s*$/gi, '');
  
  // Clean up excessive newlines
  text = text.replace(/\n{3,}/g, '\n\n');
  
  return text.trim();
}

function splitTelegramMessage(message: string): string[] {
  const chunks: string[] = [];

  // Sanitize message before splitting
  const text = sanitizeForTelegram(message || '');
  if (!text) return [];
  if (text.length <= MAX_CHUNK_LENGTH) return [text];

  let start = 0;
  while (start < text.length) {
    const hardEnd = Math.min(start + MAX_CHUNK_LENGTH, text.length);

    // Prefer splitting at a newline to preserve formatting.
    const newlineEnd = text.lastIndexOf('\n', hardEnd - 1);
    const end = newlineEnd > start ? newlineEnd : hardEnd;

    const chunk = text.slice(start, end);
    if (chunk) chunks.push(chunk);

    start = end;
    if (text[start] === '\n') start += 1;
  }

  return chunks;
}

async function sendWithRetry(
  bot: Telegraf['telegram'],
  chatId: number,
  message: string
): Promise<void> {
  const startTime = Date.now();
  try {
    await bot.sendMessage(chatId, message);
    console.log(`[Telegram:DIAG] sendMessage OK chatId=${chatId} latency=${Date.now() - startTime}ms`);
  } catch (error) {
    const e = error as {
      response?: {
        error_code?: number;
        description?: string;
        parameters?: { retry_after?: number };
      };
      message?: string;
      code?: string;
    };

    // DIAGNOSTIC: Log all Telegram API errors with full context
    console.error(`[Telegram:DIAG] sendMessage FAILED chatId=${chatId}`, {
      errorCode: e.response?.error_code,
      description: e.response?.description,
      retryAfter: e.response?.parameters?.retry_after,
      message: e.message,
      code: e.code,
      latency: Date.now() - startTime,
    });

    const retryAfter = e.response?.parameters?.retry_after;
    const isRateLimited = e.response?.error_code === 429 && typeof retryAfter === 'number';

    if (isRateLimited) {
      console.log(`[Telegram:DIAG] Rate limited, waiting ${retryAfter}s before retry`);
      await sleep(Math.max(1, retryAfter) * 1000);
      await bot.sendMessage(chatId, message);
      return;
    }

    // DIAGNOSTIC: Check for network-related errors
    const isNetworkError = e.code === 'ECONNRESET' || 
                           e.code === 'ETIMEDOUT' || 
                           e.code === 'ENOTFOUND' ||
                           e.code === 'EAI_AGAIN' ||
                           e.message?.includes('getaddrinfo') ||
                           e.message?.includes('ECONNREFUSED');
    
    if (isNetworkError) {
      console.error(`[Telegram:DIAG] NETWORK ERROR DETECTED - VPS connectivity issue suspected`, {
        code: e.code,
        message: e.message,
      });
    }

    throw error;
  }
}

export class TelegramAdapter implements IPlatformAdapter {
  private bot: Telegraf;
  private streamingMode: 'stream' | 'batch';

  constructor(token: string, mode: 'stream' | 'batch' = 'stream') {
    // Disable handler timeout to support long-running AI operations
    // Default is 90 seconds which is too short for complex coding tasks
    this.bot = new Telegraf(token, {
      handlerTimeout: Infinity,
    });
    this.streamingMode = mode;
    console.log(`[Telegram] Adapter initialized (mode: ${mode}, timeout: disabled)`);
  }

  /**
   * Send a message to a Telegram chat
   * Automatically splits messages longer than 4096 characters
   * 
   * NOTE: conversationId format is `{chatId}:{userId}` but we only need chatId for sending
   */
  async sendMessage(conversationId: string, message: string): Promise<void> {
    // Extract chatId from composite conversationId (format: chatId:userId)
    const { chatId } = parseConversationId(conversationId);
    const id = Number.parseInt(chatId, 10);
    if (!Number.isFinite(id)) {
      throw new Error(`Invalid Telegram chatId: ${chatId} (from conversationId: ${conversationId})`);
    }

    const chunks = splitTelegramMessage(message);
    for (const chunk of chunks) {
      await sendWithRetry(this.bot.telegram, id, chunk);
    }
  }

  /**
   * Get the Telegraf bot instance
   */
  getBot(): Telegraf {
    return this.bot;
  }

  /**
   * Get the configured streaming mode
   */
  getStreamingMode(): 'stream' | 'batch' {
    return this.streamingMode;
  }

  /**
   * Get platform type
   */
  getPlatformType(): string {
    return 'telegram';
  }

  /**
   * Extract user info from Telegram context
   * Returns structured info for multi-user tracking
   */
  getUserInfo(ctx: Context): TelegramUserInfo {
    if (!ctx.chat) {
      throw new Error('No chat in context');
    }
    if (!ctx.from) {
      throw new Error('No user (from) in context');
    }

    const chatId = ctx.chat.id.toString();
    const userId = ctx.from.id.toString();
    const isGroup = ctx.chat.type === 'group' || ctx.chat.type === 'supergroup';

    return {
      chatId,
      userId,
      username: ctx.from.username,
      firstName: ctx.from.first_name,
      isGroup,
    };
  }

  /**
   * Extract conversation ID from Telegram context
   * 
   * MULTI-USER FORMAT: `{chatId}:{userId}`
   * This ensures each user gets their own session, even in group chats.
   * 
   * - Private chat: chatId equals userId, but format is consistent
   * - Group chat: chatId is group ID, userId is the sender
   */
  getConversationId(ctx: Context): string {
    const info = this.getUserInfo(ctx);
    // Composite ID ensures per-user isolation
    return `${info.chatId}:${info.userId}`;
  }

  /**
   * Get just the chat ID (for legacy compatibility or sending messages)
   */
  getChatId(ctx: Context): string {
    if (!ctx.chat) {
      throw new Error('No chat in context');
    }
    return ctx.chat.id.toString();
  }

  /**
   * Start the bot with exponential backoff retry
   * Handles transient network issues (ETIMEDOUT, ECONNRESET, DNS failures)
   */
  async start(): Promise<void> {
    const maxRetries = parseInt(process.env.TELEGRAM_START_RETRIES || '5', 10);
    const baseDelayMs = parseInt(process.env.TELEGRAM_RETRY_DELAY_MS || '5000', 10);
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      console.log(`[Telegram:DIAG] Bot launch attempt ${attempt}/${maxRetries} at ${new Date().toISOString()}`);
      
      try {
        // Test network connectivity first
        await this.testTelegramConnectivity();
        
        // Drop pending updates on startup to prevent reprocessing messages after container restart
        await this.bot.launch({
          dropPendingUpdates: true,
        });
        
        console.log('[Telegram] Bot started (polling mode, pending updates dropped)');
        console.log(`[Telegram:DIAG] Bot launch SUCCESS at ${new Date().toISOString()} (attempt ${attempt})`);
        return; // Success!
        
      } catch (error) {
        const e = error as { message?: string; code?: string; response?: { error_code?: number; description?: string } };
        
        const isNetworkError = e.code === 'ETIMEDOUT' || 
                               e.code === 'ECONNRESET' || 
                               e.code === 'ENOTFOUND' ||
                               e.code === 'EAI_AGAIN' ||
                               e.code === 'ECONNREFUSED' ||
                               e.message?.includes('getaddrinfo') ||
                               e.message?.includes('network');
        
        console.error(`[Telegram:DIAG] Bot launch FAILED at ${new Date().toISOString()}`, {
          attempt,
          maxRetries,
          message: e.message,
          code: e.code,
          errorCode: e.response?.error_code,
          description: e.response?.description,
          isNetworkError,
        });
        
        // If it's the last attempt or not a network error, throw
        if (attempt === maxRetries) {
          console.error(`[Telegram:DIAG] All ${maxRetries} attempts exhausted. Giving up.`);
          throw error;
        }
        
        if (!isNetworkError) {
          // Non-network errors (auth, rate limit) should fail immediately
          console.error(`[Telegram:DIAG] Non-network error detected, not retrying.`);
          throw error;
        }
        
        // Exponential backoff: 5s, 10s, 20s, 40s, 80s...
        const delayMs = baseDelayMs * Math.pow(2, attempt - 1);
        console.log(`[Telegram:DIAG] Network error detected. Retrying in ${delayMs}ms...`);
        await sleep(delayMs);
      }
    }
  }

  /**
   * Test basic connectivity to Telegram API before full launch
   * This helps diagnose network issues faster
   */
  private async testTelegramConnectivity(): Promise<void> {
    const https = await import('https');
    const dns = await import('dns');
    const { promisify } = await import('util');
    const lookup = promisify(dns.lookup);
    
    // Step 1: DNS resolution test
    try {
      const result = await lookup('api.telegram.org');
      console.log(`[Telegram:DIAG] DNS resolution OK: api.telegram.org -> ${result.address}`);
    } catch (error) {
      const e = error as { code?: string; message?: string };
      console.error(`[Telegram:DIAG] DNS resolution FAILED for api.telegram.org`, {
        code: e.code,
        message: e.message,
      });
      throw new Error(`DNS resolution failed: ${e.message}`);
    }
    
    // Step 2: TCP connectivity test (simple HTTPS HEAD request)
    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: 'api.telegram.org',
          port: 443,
          path: '/',
          method: 'HEAD',
          timeout: 10000,
        },
        (res) => {
          console.log(`[Telegram:DIAG] TCP connectivity OK: api.telegram.org:443 (status: ${res.statusCode})`);
          res.resume();
          resolve();
        }
      );
      
      req.on('error', (error) => {
        const e = error as { code?: string; message?: string };
        console.error(`[Telegram:DIAG] TCP connectivity FAILED to api.telegram.org:443`, {
          code: e.code,
          message: e.message,
        });
        reject(error);
      });
      
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('TCP connectivity test timeout (10s)'));
      });
      
      req.end();
    });
  }

  /**
   * Stop the bot gracefully
   */
  stop(): void {
    this.bot.stop();
    console.log('[Telegram] Bot stopped');
  }
}
