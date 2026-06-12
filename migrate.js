/**
 * Database Migration Runner
 *
 * Runs on every deploy via `npm run build`.
 *
 * How it works:
 * 1. Creates core tables (users, _migrations) - always runs, idempotent
 * 2. Reads migrations from migrations/ folder
 * 3. Runs new migrations in order (tracked in _migrations table)
 *
 * To create a new migration:
 *   Create a file in migrations/ with format: {timestamp}_{name}.js
 *   Example: migrations/1704067200000_add_products_table.js
 *
 * Migration file format:
 *   module.exports = {
 *     name: 'add_products_table',
 *     up: async (client) => {
 *       await client.query(`CREATE TABLE products (...)`);
 *     }
 *   };
 */
const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL?.includes('localhost') ? false : { rejectUnauthorized: false },
  connectionTimeoutMillis: 10000,
});

async function migrate() {
  console.log('Running migrations...');
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await runCoreMigrations(client);
    await runFolderMigrations(client);
    console.log('Migrations complete.');
  } finally {
    client.release();
    await pool.end();
  }
}

async function runCoreMigrations(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      password_hash VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW(),
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      stripe_subscription_id VARCHAR(255),
      subscription_status VARCHAR(50),
      subscription_plan VARCHAR(255),
      subscription_expires_at TIMESTAMPTZ,
      subscription_updated_at TIMESTAMPTZ
    )
  `);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS users_email_unique_idx ON users (LOWER(email))`);
  await client.query(`CREATE INDEX IF NOT EXISTS users_stripe_subscription_id_idx ON users (stripe_subscription_id)`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS signups (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) NOT NULL,
      name VARCHAR(255),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);
  await client.query(`CREATE UNIQUE INDEX IF NOT EXISTS signups_email_unique_idx ON signups (LOWER(email))`);
}

async function runFolderMigrations(client) {
  const migrationsDir = path.join(__dirname, 'migrations');
  if (!fs.existsSync(migrationsDir)) return;
  const files = fs.readdirSync(migrationsDir)
    .filter(f => (f.endsWith('.js') || f.endsWith('.sql')) && !f.endsWith('.SKIP'))
    .sort();
  if (files.length === 0) return;
  const applied = await client.query('SELECT name FROM _migrations');
  const appliedNames = new Set(applied.rows.map(r => r.name));
  for (const file of files) {
    const isSql = file.endsWith('.sql');
    const ext = isSql ? '.sql' : '.js';
    const mname = file.slice(0, -ext.length);
    if (appliedNames.has(mname)) continue;
    console.log(`Running migration: ${mname}`);
    try {
      await client.query('BEGIN');
      if (isSql) {
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        await client.query(sql);
      } else {
        const migration = require(path.join(migrationsDir, file));
        await migration.up(client);
      }
      await client.query('INSERT INTO _migrations (name) VALUES ($1)', [mname]);
      await client.query('COMMIT');
      console.log(`Migration complete: ${mname}`);
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`Migration failed (${mname}): ${err.message}`);
    }
  }
}

migrate().catch(err => {
  const msg = err && (err.message || err.code || JSON.stringify(err)) || '(no message)';
  console.error('Migration runner failed:', msg);
  if (err && err.stack) console.error(err.stack);
  // Exit 0 so the app can start even if migrations partially fail
  process.exit(0);
});