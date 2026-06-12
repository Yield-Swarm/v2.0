// services/startup-migrate.js — Runs database migrations on startup

const { pool } = require('../db/index');

async function runMigrations() {
  if (!process.env.DATABASE_URL) {
    console.warn('[migrate] No DATABASE_URL — skipping migrations');
    return;
  }

  try {
    const client = await pool.connect();
    try {
      // Create core tables if they don't exist
      await client.query(`
        CREATE TABLE IF NOT EXISTS audit_logs (
          id SERIAL PRIMARY KEY,
          actor_type VARCHAR(50) NOT NULL,
          actor_ip INET,
          action VARCHAR(100) NOT NULL,
          resource_type VARCHAR(100),
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS council_engine_reviews (
          id SERIAL PRIMARY KEY,
          task_id VARCHAR(200) NOT NULL,
          outcome VARCHAR(50),
          total_weight INTEGER,
          threshold INTEGER,
          duration_ms INTEGER,
          api_calls INTEGER,
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS council_engine_votes (
          id SERIAL PRIMARY KEY,
          review_id INTEGER REFERENCES council_engine_reviews(id),
          llm_name VARCHAR(50),
          vote VARCHAR(20),
          weight INTEGER,
          rationale TEXT,
          confidence NUMERIC(3,2),
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS agent_mail_identities (
          id SERIAL PRIMARY KEY,
          agent_id VARCHAR(200) UNIQUE NOT NULL,
          agent_email VARCHAR(255),
          cohort VARCHAR(50),
          status VARCHAR(20) DEFAULT 'active',
          created_at TIMESTAMP DEFAULT NOW()
        )
      `);

      await client.query(`
        CREATE TABLE IF NOT EXISTS cloud_infrastructure (
          id SERIAL PRIMARY KEY,
          provider VARCHAR(50) NOT NULL,
          status VARCHAR(50),
          region VARCHAR(100),
          service VARCHAR(100),
          cost_monthly NUMERIC(10,2),
          updated_at TIMESTAMP DEFAULT NOW()
        )
      `);

      console.log('[migrate] Core tables ensured');
    } finally {
      client.release();
    }
  } catch (err) {
    console.error('[migrate] Migration error:', err.message);
  }
}

module.exports = runMigrations();
