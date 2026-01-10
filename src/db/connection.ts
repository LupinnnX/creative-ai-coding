/**
 * PostgreSQL connection pool configuration
 */
import { Pool } from 'pg';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// DIAGNOSTIC: Track pool statistics
let poolConnectCount = 0;
let poolErrorCount = 0;

pool.on('connect', () => {
  poolConnectCount++;
  console.log(`[Database:DIAG] New connection established (total connects: ${poolConnectCount})`);
});

pool.on('acquire', () => {
  console.log(`[Database:DIAG] Connection acquired from pool (total: ${pool.totalCount}, idle: ${pool.idleCount}, waiting: ${pool.waitingCount})`);
});

pool.on('remove', () => {
  console.log(`[Database:DIAG] Connection removed from pool (total: ${pool.totalCount}, idle: ${pool.idleCount})`);
});

// Handle pool errors
pool.on('error', err => {
  poolErrorCount++;
  console.error(`[Database:DIAG] Pool error #${poolErrorCount}`, {
    message: err.message,
    code: (err as NodeJS.ErrnoException).code,
    totalCount: pool.totalCount,
    idleCount: pool.idleCount,
    waitingCount: pool.waitingCount,
  });
  console.error('[Database] Unexpected error on idle client', err);
});

// DIAGNOSTIC: Periodic pool health check
setInterval(() => {
  if (pool.waitingCount > 0 || pool.totalCount >= 8) {
    console.warn(`[Database:DIAG] Pool pressure detected`, {
      total: pool.totalCount,
      idle: pool.idleCount,
      waiting: pool.waitingCount,
      max: 10,
    });
  }
}, 30000); // Check every 30 seconds
