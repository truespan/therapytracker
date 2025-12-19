const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  // CRITICAL: Force UTC timezone for all connections
  // This must be set BEFORE any queries run
  connectionTimeoutMillis: 5000,
  application_name: 'therapy_tracker'
});

// CRITICAL: Set timezone SYNCHRONOUSLY on every new connection BEFORE it's used
pool.on('connect', (client) => {
  console.log('Connected to PostgreSQL database');
  // Use synchronous query to set timezone IMMEDIATELY
  client.query("SET timezone TO 'UTC'", (err) => {
    if (err) {
      console.error('❌ Failed to set timezone to UTC:', err);
      // This is critical - if we can't set UTC, we should fail
      throw new Error('Failed to set database timezone to UTC');
    } else {
      console.log('✅ Database session timezone set to UTC');
    }
  });
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
  process.exit(-1);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  end: () => pool.end(),
  pool,
  
  // Transaction support
  async getClient() {
    const client = await pool.connect();
    // Timezone should already be set by pool.on('connect'), but double-check
    await client.query("SET timezone TO 'UTC'");
    return client;
  },

  async transaction(callback) {
    const client = await pool.connect();
    try {
      // Timezone should already be set by pool.on('connect'), but double-check
      await client.query("SET timezone TO 'UTC'");
      await client.query('BEGIN');
      const result = await callback(client);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }
};

