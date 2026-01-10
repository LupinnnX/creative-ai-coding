/**
 * Tests for VPS Keep-Alive System
 */

import { KeepAliveManager } from './keep-alive';

// Mock dependencies
jest.mock('../db/connection', () => ({
  pool: {
    query: jest.fn().mockResolvedValue({ rows: [{ heartbeat: 1 }] }),
  },
}));

jest.mock('child_process', () => ({
  execSync: jest.fn(),
}));

describe('KeepAliveManager', () => {
  let manager: KeepAliveManager;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.KEEP_ALIVE_ENABLED;
    delete process.env.KEEP_ALIVE_INTERVAL;
    delete process.env.WATCHDOG_ENABLED;
    delete process.env.KEEP_ALIVE_EXTERNAL_PING;
    delete process.env.WATCHDOG_USEC;
  });

  afterEach(() => {
    if (manager) {
      manager.stop();
    }
  });

  describe('initialization', () => {
    it('should initialize with default config', () => {
      manager = new KeepAliveManager();
      const stats = manager.getStats();

      expect(stats.config.enabled).toBe(true);
      expect(stats.config.intervalMs).toBe(60000);
      expect(stats.config.watchdogEnabled).toBe(true);
      expect(stats.config.externalPingEnabled).toBe(false);
    });

    it('should respect KEEP_ALIVE_ENABLED=false', () => {
      process.env.KEEP_ALIVE_ENABLED = 'false';
      manager = new KeepAliveManager();
      const stats = manager.getStats();

      expect(stats.config.enabled).toBe(false);
    });

    it('should respect custom interval', () => {
      process.env.KEEP_ALIVE_INTERVAL = '30000';
      manager = new KeepAliveManager();
      const stats = manager.getStats();

      expect(stats.config.intervalMs).toBe(30000);
    });

    it('should parse external URLs', () => {
      process.env.KEEP_ALIVE_EXTERNAL_PING = 'true';
      process.env.KEEP_ALIVE_EXTERNAL_URLS = 'https://example.com,https://test.com';
      manager = new KeepAliveManager();
      const stats = manager.getStats();

      expect(stats.config.externalPingEnabled).toBe(true);
      expect(stats.config.externalPingUrls).toEqual(['https://example.com', 'https://test.com']);
    });
  });

  describe('start/stop', () => {
    it('should not start when disabled', () => {
      process.env.KEEP_ALIVE_ENABLED = 'false';
      manager = new KeepAliveManager();
      manager.start();

      expect(manager.isHealthy()).toBe(false);
    });

    it('should stop cleanly', () => {
      manager = new KeepAliveManager();
      manager.start();
      manager.stop();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('getStats', () => {
    it('should return initial stats', () => {
      manager = new KeepAliveManager();
      const stats = manager.getStats();

      expect(stats.heartbeatCount).toBe(0);
      expect(stats.dbPingCount).toBe(0);
      expect(stats.dbPingFailures).toBe(0);
      expect(stats.lastHeartbeat).toBeNull();
      expect(stats.errors).toEqual([]);
      expect(stats.uptimeMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe('isHealthy', () => {
    it('should return false when not running', () => {
      manager = new KeepAliveManager();
      expect(manager.isHealthy()).toBe(false);
    });

    it('should return false when disabled', () => {
      process.env.KEEP_ALIVE_ENABLED = 'false';
      manager = new KeepAliveManager();
      manager.start();
      expect(manager.isHealthy()).toBe(false);
    });
  });
});
