#!/usr/bin/env node
/**
 * Run SQL migration against DATABASE_URL
 * Usage: node scripts/run-migration.js migrations/006_nova_jobs.sql
 */
require('dotenv').config();
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const file = process.argv[2] || 'migrations/006_nova_jobs.sql';
const sqlPath = path.resolve(process.cwd(), file);

if (!fs.existsSync(sqlPath)) {
  console.error(`❌ File not found: ${sqlPath}`);
  process.exit(1);
}

const sql = fs.readFileSync(sqlPath, 'utf8');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

(async () => {
  try {
    console.log(`🚀 Running migration: ${file}`);
    await pool.query(sql);
    console.log('✅ Migration completed successfully!');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
})();
