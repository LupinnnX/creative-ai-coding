/**
 * VPS Keep-Alive System
 * Multi-layer approach to prevent VPS inactivity shutdown
 * 
 * Layers:
 * 1. Application heartbeat with real work (DB ping, health check)
 * 2. Systemd watchdog notification
 * 3. Network activity generation
 * 4. Comprehensive activity logging
 */

import { execSync } from 'child_process';
import http from 'http';
import https from 'https';
import { pool } from '../db/connection';

interface KeepAliveConfig {
  enabled: boolean;
  intervalMs: number;
  watchdogEnabled: boolean;
  externalPingEnabled: boolean;
  externalPingUrls: string[];
  healthEndpoint: string;
  port: number;
}

interface KeepAliveStats {
  startTime: Date;
  lastHeartbeat: Date | null;
  heartbeatCount: number;
  dbPingCount: number;
  dbPingFailures: number;
  watchdogNotifications: number;
  externalPingCount: number;
  externalPingFailures: number;
  selfPingCount: number;
  selfPingFailures: number;
  errors: string[];
}

class KeepAliveManager {
  private config: KeepAliveConfig;
  private stats: KeepAliveStats;
  private intervalHandle: NodeJS.Timeout | null = null;
  private isRunning = false;

  constructor() {
    this.config = {
      enabled: process.env.KEEP_ALIVE_ENABLED !== 'false',
      intervalMs: parseInt(process.env.KEEP_ALIVE_INTERVAL || '60000', 10),
      watchdogEnabled: process.env.WATCHDOG_ENABLED !== 'false',
      externalPingEnabled: process.env.KEEP_ALIVE_EXTERNAL_PING === 'true',
      externalPingUrls: (process.env.KEEP_ALIVE_EXTERNAL_URLS || '').split(',').filter(Boolean),
      healthEndpoint: '/health',
      port: parseInt(process.env.PORT || '3000', 10),
    };

    this.stats = {
      startTime: new Date(),
      lastHeartbeat: null,
      heartbeatCount: 0,
      dbPingCount: 0,
      dbPingFailures: 0,
      watchdogNotifications: 0,
      externalPingCount: 0,
      externalPingFailures: 0,
      selfPingCount: 0,
      selfPingFailures: 0,
      errors: [],
    };
  }

  /**
   * Start the keep-alive system
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('[KeepAlive] Disabled via KEEP_ALIVE_ENABLED=false');
      return;
    }

    if (this.isRunning) {
      console.log('[KeepAlive] Already running');
      return;
    }

    this.isRunning = true;
    console.log('[KeepAlive] Starting keep-alive system', {
      intervalMs: this.config.intervalMs,
      watchdogEnabled: this.config.watchdogEnabled,
      externalPingEnabled: this.config.externalPingEnabled,
    });

    // Initial heartbeat after a short delay (let the app fully start)
    setTimeout(() => this.heartbeat(), 5000);

    // Regular heartbeat interval
    this.intervalHandle = setInterval(() => this.heartbeat(), this.config.intervalMs);

    console.log('[KeepAlive] System started successfully');
  }

  /**
   * Stop the keep-alive system
   */
  stop(): void {
    if (this.intervalHandle) {
      clearInterval(this.intervalHandle);
      this.intervalHandle = null;
    }
    this.isRunning = false;
    console.log('[KeepAlive] System stopped');
  }

  /**
   * Main heartbeat function - performs all keep-alive activities
   */
  private async heartbeat(): Promise<void> {
    const heartbeatStart = Date.now();
    this.stats.heartbeatCount++;
    this.stats.lastHeartbeat = new Date();

    console.log(`[KeepAlive] Heartbeat #${this.stats.heartbeatCount} at ${this.stats.lastHeartbeat.toISOString()}`);

    try {
      // Layer 1: Database ping (keeps connection pool warm)
      await this.pingDatabase();

      // Layer 2: Self health check (validates app is responding)
      await this.selfHealthCheck();

      // Layer 3: Systemd watchdog notification
      if (this.config.watchdogEnabled) {
        this.notifyWatchdog();
      }

      // Layer 4: External ping (generates network activity)
      if (this.config.externalPingEnabled && this.config.externalPingUrls.length > 0) {
        await this.pingExternalUrls();
      }

      const duration = Date.now() - heartbeatStart;
      console.log(`[KeepAlive] Heartbeat #${this.stats.heartbeatCount} completed in ${duration}ms`);

    } catch (error) {
      const e = error as Error;
      const errorMsg = `Heartbeat #${this.stats.heartbeatCount} failed: ${e.message}`;
      console.error(`[KeepAlive] ${errorMsg}`);
      this.stats.errors.push(`${new Date().toISOString()}: ${errorMsg}`);
      
      // Keep only last 100 errors
      if (this.stats.errors.length > 100) {
        this.stats.errors = this.stats.errors.slice(-100);
      }
    }
  }

  /**
   * Ping the database to keep connections warm
   */
  private async pingDatabase(): Promise<void> {
    try {
      const start = Date.now();
      await pool.query('SELECT 1 as heartbeat, NOW() as server_time');
      this.stats.dbPingCount++;
      console.log(`[KeepAlive] DB ping successful (${Date.now() - start}ms)`);
    } catch (error) {
      this.stats.dbPingFailures++;
      const e = error as Error;
      console.error(`[KeepAlive] DB ping failed: ${e.message}`);
      throw error;
    }
  }

  /**
   * Self health check via HTTP
   */
  private async selfHealthCheck(): Promise<void> {
    return new Promise((resolve, reject) => {
      const start = Date.now();
      const req = http.get(
        `http://127.0.0.1:${this.config.port}${this.config.healthEndpoint}`,
        { timeout: 10000 },
        (res) => {
          if (res.statusCode === 200) {
            this.stats.selfPingCount++;
            console.log(`[KeepAlive] Self health check OK (${Date.now() - start}ms)`);
            res.resume(); // Consume response
            resolve();
          } else {
            this.stats.selfPingFailures++;
            reject(new Error(`Health check returned ${res.statusCode}`));
          }
        }
      );

      req.on('error', (error) => {
        this.stats.selfPingFailures++;
        reject(error);
      });

      req.on('timeout', () => {
        this.stats.selfPingFailures++;
        req.destroy();
        reject(new Error('Health check timeout'));
      });
    });
  }

  /**
   * Notify systemd watchdog that the service is alive
   */
  private notifyWatchdog(): void {
    try {
      // Check if running under systemd with watchdog enabled
      const watchdogUsec = process.env.WATCHDOG_USEC;
      if (!watchdogUsec) {
        // Not running under systemd watchdog, skip silently
        return;
      }

      // Use systemd-notify to send watchdog ping
      execSync('systemd-notify --ready WATCHDOG=1', { 
        stdio: 'ignore',
        timeout: 5000 
      });
      this.stats.watchdogNotifications++;
      console.log('[KeepAlive] Systemd watchdog notified');
    } catch (error) {
      // Watchdog notification is optional, don't fail the heartbeat
      const e = error as Error;
      console.warn(`[KeepAlive] Watchdog notification failed (non-critical): ${e.message}`);
    }
  }

  /**
   * Ping external URLs to generate network activity
   */
  private async pingExternalUrls(): Promise<void> {
    for (const url of this.config.externalPingUrls) {
      try {
        await this.pingUrl(url);
        this.stats.externalPingCount++;
      } catch (error) {
        this.stats.externalPingFailures++;
        const e = error as Error;
        console.warn(`[KeepAlive] External ping to ${url} failed: ${e.message}`);
      }
    }
  }

  /**
   * Ping a single URL
   */
  private pingUrl(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const start = Date.now();

      const req = client.get(url, { timeout: 10000 }, (res) => {
        console.log(`[KeepAlive] External ping to ${url}: ${res.statusCode} (${Date.now() - start}ms)`);
        res.resume();
        resolve();
      });

      req.on('error', reject);
      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Timeout'));
      });
    });
  }

  /**
   * Get current statistics
   */
  getStats(): KeepAliveStats & { uptimeMs: number; config: KeepAliveConfig } {
    return {
      ...this.stats,
      uptimeMs: Date.now() - this.stats.startTime.getTime(),
      config: this.config,
    };
  }

  /**
   * Check if the system is healthy
   */
  isHealthy(): boolean {
    if (!this.isRunning) return false;
    if (!this.stats.lastHeartbeat) return false;
    
    // Consider unhealthy if last heartbeat was more than 3x the interval ago
    const maxAge = this.config.intervalMs * 3;
    const age = Date.now() - this.stats.lastHeartbeat.getTime();
    return age < maxAge;
  }
}

// Singleton instance
export const keepAliveManager = new KeepAliveManager();

// Export for testing
export { KeepAliveManager, KeepAliveConfig, KeepAliveStats };
