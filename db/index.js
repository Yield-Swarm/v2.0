// db/index.js — PostgreSQL connection pool
// All DB queries go through this pool.

const { Pool } = require('pg');

const DATABASE_URL = process.env.DATABASE_URL;
let pool;

if (DATABASE_URL) {
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });

  pool.on('error', (err) => {
    console.error('[db] unexpected pool error:', err.message);
  });

  console.log('[db] PostgreSQL pool initialized');
} else {
  console.warn('[db] DATABASE_URL not set — DB operations will fail gracefully');
  // Export a mock pool that logs and returns empty results
  pool = {
    query: async () => ({ rows: [], rowCount: 0 }),
    connect: async () => ({ query: async () => ({ rows: [] }), release: () => {} }),
    end: async () => {},
    on: () => {},
  };
}

module.exports = { pool };
