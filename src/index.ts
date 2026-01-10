/**
 * Creative AI-Driven Coding Development - Main Entry Point
 * Telegram + Droid (Factory) with GLM Coding Plan
 */

// Load environment variables FIRST, before any other imports
import * as dotenv from 'dotenv';
dotenv.config();

import { spawnSync } from 'child_process';
import express from 'express';
import { TelegramAdapter } from './adapters/telegram';
import { TestAdapter } from './adapters/test';
import { GitHubAdapter } from './adapters/github';
import { handleMessage } from './orchestrator/orchestrator';
import { pool } from './db/connection';
import { ConversationLockManager } from './utils/conversation-lock';
import { keepAliveManager } from './utils/keep-alive';
import { startJobWorker, stopJobWorker, getJobWorker, createTelegramNotifier } from './jobs';

// DIAGNOSTIC: Global error handlers for uncaught exceptions
process.on('uncaughtException', (error) => {
  console.error(`[App:DIAG] UNCAUGHT EXCEPTION at ${new Date().toISOString()}`, {
    name: error.name,
    message: error.message,
    stack: error.stack?.slice(0, 1000),
  });
  // Don't exit - let the process continue if possible
});

process.on('unhandledRejection', (reason, _promise) => {
  console.error(`[App:DIAG] UNHANDLED REJECTION at ${new Date().toISOString()}`, {
    reason: reason instanceof Error ? { name: reason.name, message: reason.message, stack: reason.stack?.slice(0, 500) } : reason,
  });
});

// DIAGNOSTIC: Memory usage logging
setInterval(() => {
  const mem = process.memoryUsage();
  const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
  const heapTotalMB = Math.round(mem.heapTotal / 1024 / 1024);
  const rssMB = Math.round(mem.rss / 1024 / 1024);
  
  if (heapUsedMB > 400 || rssMB > 500) {
    console.warn(`[App:DIAG] HIGH MEMORY USAGE`, {
      heapUsedMB,
      heapTotalMB,
      rssMB,
      externalMB: Math.round(mem.external / 1024 / 1024),
    });
  }
}, 60000); // Check every minute

// Helper function to format uptime
function formatUptime(ms: number): string {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) return `${days}d ${hours % 24}h ${minutes % 60}m`;
  if (hours > 0) return `${hours}h ${minutes % 60}m ${seconds % 60}s`;
  if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
  return `${seconds}s`;
}

async function main(): Promise<void> {
  console.log('[App] Starting Creative AI-Driven Coding Development (Telegram + Droid)');

  const telegramAllowlist = (process.env.TELEGRAM_ALLOWLIST || '')
    .split(',')
    .map(s => s.trim())
    .filter(Boolean);

  // Validate required environment variables
  const required = ['DATABASE_URL', 'TELEGRAM_BOT_TOKEN'];
  const missing = required.filter(v => !process.env[v]);
  if (missing.length > 0) {
    console.error('[App] Missing required environment variables:', missing.join(', '));
    console.error('[App] Please check .env.example for required configuration');
    process.exit(1);
  }

  // Validate Droid AI assistant credentials
  const droidBin = process.env.DROID_BIN || 'droid';
  const droidVersion = spawnSync(droidBin, ['--version'], { stdio: 'ignore' });
  const hasDroidCli = droidVersion.status === 0;
  const hasFactoryApiKey = Boolean(process.env.FACTORY_API_KEY);

  if (!hasDroidCli && !hasFactoryApiKey) {
    console.error('[App] Droid CLI not found and FACTORY_API_KEY not set.');
    console.error('[App] Install Droid CLI: irm https://app.factory.ai/cli/windows | iex');
    console.error('[App] Or set FACTORY_API_KEY in your environment.');
    process.exit(1);
  }

  if (hasDroidCli) {
    console.log('[App] Droid CLI detected.');
    if (hasFactoryApiKey) {
      console.log('[App] FACTORY_API_KEY configured for authentication.');
    } else {
      console.log('[App] Ensure Droid is authenticated (run `droid` once to login).');
    }
  } else {
    console.log('[App] Using FACTORY_API_KEY for Droid authentication.');
  }

  // Test database connection
  try {
    await pool.query('SELECT 1');
    console.log('[Database] Connected successfully');
  } catch (error) {
    console.error('[Database] Connection failed:', error);
    process.exit(1);
  }

  // Initialize conversation lock manager
  const maxConcurrent = parseInt(process.env.MAX_CONCURRENT_CONVERSATIONS || '10');
  const lockManager = new ConversationLockManager(maxConcurrent);
  console.log(`[App] Lock manager initialized (max concurrent: ${maxConcurrent})`);

  // Start keep-alive system
  keepAliveManager.start();
  console.log('[App] Keep-alive system initialized');

  // Initialize platform adapter (Telegram) - must be before job worker for notifications
  const streamingMode = (process.env.TELEGRAM_STREAMING_MODE || 'stream') as 'stream' | 'batch';
  const telegram = new TelegramAdapter(process.env.TELEGRAM_BOT_TOKEN!, streamingMode);

  // Start job worker for background task processing (Infinite Patience mode)
  const asyncJobsEnabled = process.env.NOVA_ASYNC_JOBS_ENABLED === 'true';
  if (asyncJobsEnabled) {
    const worker = await startJobWorker({
      pollIntervalMs: parseInt(process.env.JOB_POLL_INTERVAL_MS || '5000', 10),
      maxConcurrent: parseInt(process.env.JOB_MAX_CONCURRENT || '3', 10),
      verbose: process.env.JOB_VERBOSE === 'true',
    });
    
    // Set up Telegram notifications for job completion
    createTelegramNotifier(telegram, worker);
    
    console.log('[App] Job worker started (Infinite Patience mode)');
  } else {
    console.log('[App] Job worker disabled (set NOVA_ASYNC_JOBS_ENABLED=true to enable)');
  }

  // Initialize test adapter
  const testAdapter = new TestAdapter();
  await testAdapter.start();

  // Initialize GitHub adapter (conditional)
  let github: GitHubAdapter | null = null;
  if (process.env.GITHUB_TOKEN && process.env.WEBHOOK_SECRET) {
    github = new GitHubAdapter(process.env.GITHUB_TOKEN, process.env.WEBHOOK_SECRET);
    await github.start();
  } else {
    console.log('[GitHub] Adapter not initialized (missing GITHUB_TOKEN or WEBHOOK_SECRET)');
  }

  // Setup Express server
  const app = express();
  const port = process.env.PORT || 3000;

  // GitHub webhook endpoint (must use raw body for signature verification)
  // IMPORTANT: Register BEFORE express.json() to prevent body parsing
  if (github) {
    app.post('/webhooks/github', express.raw({ type: 'application/json' }), async (req, res) => {
      try {
        const signature = req.headers['x-hub-signature-256'] as string;
        if (!signature) {
          return res.status(400).json({ error: 'Missing signature header' });
        }

        const payload = (req.body as Buffer).toString('utf-8');

        // Process async (fire-and-forget for fast webhook response)
        github.handleWebhook(payload, signature).catch(error => {
          console.error('[GitHub] Webhook processing error:', error);
        });

        return res.status(200).send('OK');
      } catch (error) {
        console.error('[GitHub] Webhook endpoint error:', error);
        return res.status(500).json({ error: 'Internal server error' });
      }
    });
    console.log('[Express] GitHub webhook endpoint registered');
  }

  // JSON parsing for all other endpoints
  app.use(express.json());

  // Health check endpoints
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get('/health/db', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ok', database: 'connected' });
    } catch (_error) {
      res.status(500).json({ status: 'error', database: 'disconnected' });
    }
  });

  app.get('/health/concurrency', (_req, res) => {
    try {
      const stats = lockManager.getStats();
      res.json({
        status: 'ok',
        ...stats,
      });
    } catch (_error) {
      res.status(500).json({ status: 'error', reason: 'Failed to get stats' });
    }
  });

  // Keep-alive system health endpoint
  app.get('/health/keepalive', (_req, res) => {
    try {
      const stats = keepAliveManager.getStats();
      const isHealthy = keepAliveManager.isHealthy();
      
      res.status(isHealthy ? 200 : 503).json({
        status: isHealthy ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        keepAlive: {
          enabled: stats.config.enabled,
          healthy: isHealthy,
          uptime: {
            ms: stats.uptimeMs,
            formatted: formatUptime(stats.uptimeMs),
          },
          lastHeartbeat: stats.lastHeartbeat?.toISOString() || null,
          heartbeatCount: stats.heartbeatCount,
          stats: {
            dbPings: { success: stats.dbPingCount, failures: stats.dbPingFailures },
            selfPings: { success: stats.selfPingCount, failures: stats.selfPingFailures },
            externalPings: { success: stats.externalPingCount, failures: stats.externalPingFailures },
            watchdogNotifications: stats.watchdogNotifications,
          },
          recentErrors: stats.errors.slice(-5),
          config: {
            intervalMs: stats.config.intervalMs,
            watchdogEnabled: stats.config.watchdogEnabled,
            externalPingEnabled: stats.config.externalPingEnabled,
          },
        },
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ 
        status: 'error', 
        reason: 'Failed to get keep-alive stats',
        error: e.message,
      });
    }
  });

  // Job worker health endpoint
  app.get('/health/jobs', async (_req, res) => {
    try {
      const worker = getJobWorker();
      const { getJobQueueStats } = await import('./db/job-queue');
      const queueStats = await getJobQueueStats(24);
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        worker: {
          running: worker.isRunning(),
          activeJobs: worker.getActiveJobCount(),
        },
        queue: queueStats,
        infinitePatience: {
          enabled: process.env.NOVA_ASYNC_JOBS_ENABLED === 'true',
          version: '1.0.0',
          description: 'Background job processing for complex tasks',
        },
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ 
        status: 'error', 
        reason: 'Failed to get job stats',
        error: e.message,
      });
    }
  });

  // Multi-user diagnostics endpoint
  app.get('/health/users', async (_req, res) => {
    try {
      const { getActiveSessionsCount, getActiveSessionsByUser } = await import('./db/sessions');
      const lockStats = lockManager.getStats();
      const sessionCount = await getActiveSessionsCount();
      const sessionsByUser = await getActiveSessionsByUser();
      
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        concurrency: {
          activeConversations: lockStats.active,
          maxConcurrent: lockStats.maxConcurrent,
          queuedMessages: lockStats.queuedTotal,
        },
        sessions: {
          totalActive: sessionCount,
          byUser: sessionsByUser,
        },
        multiUserSupport: {
          enabled: true,
          version: '2.1',
          conversationIdFormat: 'chatId:userId',
        },
      });
    } catch (error) {
      const e = error as Error;
      res.status(500).json({ 
        status: 'error', 
        reason: 'Failed to get user stats',
        error: e.message,
      });
    }
  });

  // Test adapter endpoints
  app.post('/test/message', async (req, res) => {
    try {
      const { conversationId, message } = req.body;
      if (!conversationId || !message) {
        return res.status(400).json({ error: 'conversationId and message required' });
      }

      await testAdapter.receiveMessage(conversationId, message);

      // Process the message through orchestrator (non-blocking)
      lockManager
        .acquireLock(conversationId, async () => {
          await handleMessage(testAdapter, conversationId, message);
        })
        .catch(error => {
          console.error('[Test] Message handling error:', error);
        });

      return res.json({ success: true, conversationId, message });
    } catch (error) {
      console.error('[Test] Endpoint error:', error);
      return res.status(500).json({ error: 'Internal server error' });
    }
  });

  app.get('/test/messages/:conversationId', (req, res) => {
    const messages = testAdapter.getSentMessages(req.params.conversationId);
    res.json({ conversationId: req.params.conversationId, messages });
  });

  app.delete('/test/messages/:conversationId?', (req, res) => {
    testAdapter.clearMessages(req.params.conversationId);
    res.json({ success: true });
  });

  app.listen(port, () => {
    console.log(`[Express] Health check server listening on port ${port}`);
  });

  // Handle text messages
  telegram.getBot().on('text', async ctx => {
    const messageTimestamp = Date.now();
    
    // Extract user info for multi-user support
    let userInfo: { chatId: string; userId: string; username?: string; firstName?: string; isGroup: boolean };
    try {
      userInfo = telegram.getUserInfo(ctx);
    } catch (error) {
      console.error('[App:DIAG] Failed to extract user info:', error);
      return;
    }
    
    const { chatId, userId, username, firstName, isGroup } = userInfo;
    
    // DIAGNOSTIC: Log incoming message with full user context
    console.log(`[App:DIAG] Incoming text message`, {
      userId,
      username,
      chatId,
      isGroup,
      messageLength: ctx.message.text?.length,
      timestamp: new Date().toISOString(),
    });

    if (telegramAllowlist.length > 0) {
      if (!userId || !telegramAllowlist.includes(userId)) {
        console.log(`[App:DIAG] Message blocked by allowlist`, { userId, allowlist: telegramAllowlist });
        return;
      }
    }

    // Composite conversation ID: chatId:userId for per-user isolation
    const conversationId = telegram.getConversationId(ctx);
    const message = ctx.message.text;

    if (!message) return;

    // Log multi-user context
    console.log(`[App:DIAG] Processing message`, {
      conversationId,
      userId,
      username: username || firstName || 'unknown',
      isGroup,
    });

    // Fire-and-forget: handler returns immediately, processing happens async
    lockManager
      .acquireLock(conversationId, async () => {
        const handlerStart = Date.now();
        try {
          // Pass user context for database tracking
          await handleMessage(telegram, conversationId, message, undefined, {
            userId,
            username: username || firstName,
          });
          console.log(`[App:DIAG] Message handled successfully`, {
            conversationId,
            userId,
            durationMs: Date.now() - handlerStart,
            totalLatencyMs: Date.now() - messageTimestamp,
          });
        } catch (error) {
          const e = error as Error;
          console.error(`[App:DIAG] handleMessage FAILED`, {
            conversationId,
            userId,
            error: e.message,
            stack: e.stack?.slice(0, 500),
            durationMs: Date.now() - handlerStart,
          });
          throw error;
        }
      })
      .catch(error => {
        console.error('[Telegram] Failed to process message:', error);
      });
  });

  telegram.getBot().command('btm', async ctx => {
    if (telegramAllowlist.length > 0) {
      const fromId = ctx.from?.id?.toString();
      if (!fromId || !telegramAllowlist.includes(fromId)) {
        return;
      }
    }

    const chatId = telegram.getChatId(ctx); // Use raw chat ID for sending
    const keyboard = {
      inline_keyboard: [
        [
          { text: 'Spec: ON', callback_data: 'btm:spec:on' },
          { text: 'Spec: OFF', callback_data: 'btm:spec:off' },
        ],
        [
          { text: 'Reasoning: High', callback_data: 'btm:r:high' },
          { text: 'Reasoning: Low', callback_data: 'btm:r:low' },
          { text: 'Reasoning: Off', callback_data: 'btm:r:off' },
        ],
        [{ text: 'Model: Droid Core (GLM-4.7)', callback_data: 'btm:m:glm-4.7' }],
        [
          { text: 'Model: GPT-5.2', callback_data: 'btm:m:gpt-5.2' },
          { text: 'Model: Gemini 3 Flash', callback_data: 'btm:m:gemini-3-flash' },
        ],
        [
          { text: 'SpecModel: (auto)', callback_data: 'btm:specmodel:auto' },
          { text: 'Status', callback_data: 'btm:status' },
        ],
      ],
    };

    await telegram
      .getBot()
      .telegram.sendMessage(parseInt(chatId), 'Buttons (btm):', { reply_markup: keyboard });
  });

  telegram.getBot().action(/^btm:/, async ctx => {
    try {
      if (telegramAllowlist.length > 0) {
        const fromId = ctx.from?.id?.toString();
        if (!fromId || !telegramAllowlist.includes(fromId)) {
          try {
            await ctx.answerCbQuery('Not authorized');
          } catch {
            // ignore
          }
          return;
        }
      }

      const conversationId = telegram.getConversationId(ctx);
      const data = ctx.callbackQuery && 'data' in ctx.callbackQuery ? ctx.callbackQuery.data : '';
      const parts = typeof data === 'string' ? data.split(':') : [];

      // btm:<kind>:<value>
      const kind = parts[1];
      const value = parts[2];

      const reply = async (text: string): Promise<void> => {
        await ctx.answerCbQuery();
        await telegram.sendMessage(conversationId, text);
      };

      // Ensure we have an active session metadata to store settings
      // (commands expect a session; easiest path is to create one by prompting the user)
      if (kind === 'status') {
        await reply('Use /status to see current settings.');
        return;
      }

      // We store settings on the active session (see /droid-* commands). If no active session yet,
      // ask user to send any message first.
      const { getOrCreateConversation } = await import('./db/conversations');
      const { getActiveSession } = await import('./db/sessions');
      const { handleCommand } = await import('./handlers/command-handler');

      const conv = await getOrCreateConversation('telegram', conversationId);
      const session = await getActiveSession(conv.id);
      if (!session) {
        await reply(
          'No active session yet. Send any message first (or /status), then press buttons again.'
        );
        return;
      }

      if (kind === 'spec' && (value === 'on' || value === 'off')) {
        const r = await handleCommand(conv, `/droid-spec ${value}`);
        await reply(r.message);
        return;
      }

      if (kind === 'r' && value && ['high', 'low', 'off'].includes(value)) {
        const r = await handleCommand(conv, `/droid-reasoning ${value}`);
        await reply(r.message);
        return;
      }

      if (kind === 'm') {
        // Map button values to Droid CLI model IDs
        const modelId =
          value === 'glm-4.7'
            ? 'glm-4.7'
            : value === 'gpt-5.2'
              ? 'gpt-5.2'
              : value === 'gemini-3-flash'
                ? 'gemini-3-flash-preview'
                : undefined;

        if (!modelId) {
          await reply('Unknown model button.');
          return;
        }

        // Switch assistant to droid implicitly
        await handleCommand(conv, '/ai droid');
        const r = await handleCommand(conv, `/droid-model ${modelId}`);
        await reply(r.message);
        return;
      }

      if (kind === 'specmodel') {
        // Auto-pick spec model based on main model provider restrictions.
        // - If main is OpenAI (gpt-5.2) => spec must be OpenAI
        // - Otherwise default to same as main
        const m = session.metadata || {};
        const main = typeof m.droidModel === 'string' ? m.droidModel : '';
        const specModel = main === 'gpt-5.2' ? 'gpt-5.2' : main;
        if (!specModel) {
          await reply('Set a main model first.');
          return;
        }

        const r = await handleCommand(conv, `/droid-spec-model ${specModel}`);
        await reply(r.message);
        return;
      }

      await reply('Unknown button action.');
    } catch (error) {
      console.error('[Telegram] btm action error:', error);
      try {
        await ctx.answerCbQuery('Error');
      } catch {
        // ignore
      }
    }
  });

  // Start bot
  await telegram.start();

  // Graceful shutdown
  const shutdown = (): void => {
    console.log('[App] Shutting down gracefully...');
    keepAliveManager.stop();
    stopJobWorker(); // Stop job worker
    telegram.stop();
    pool.end().then(() => {
      console.log('[Database] Connection pool closed');
      process.exit(0);
    });
  };

  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);

  console.log('[App] Creative AI-Driven Coding Development is ready!');
  console.log('[App] Send messages to your Telegram bot to get started');
  console.log('[App] Test endpoint available: POST http://localhost:' + port + '/test/message');
}

// Run the application
main().catch(error => {
  console.error('[App] Fatal error:', error);
  process.exit(1);
});
