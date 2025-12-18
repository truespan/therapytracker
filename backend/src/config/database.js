const { Pool } = require('pg');
require('dotenv').config();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection and set timezone to UTC for ALL connections
pool.on('connect', async (client) => {
  console.log('Connected to PostgreSQL database');
  // CRITICAL: Set timezone to UTC to prevent timezone conversion issues
  // This ensures all TIMESTAMPTZ values are handled in UTC
  try {
    await client.query("SET timezone = 'UTC'");
    console.log('Database session timezone set to UTC');
  } catch (err) {
    console.error('Failed to set timezone to UTC:', err);
  }
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
    // Ensure timezone is set for this client
    await client.query("SET timezone = 'UTC'");
    return client;
  },

  async transaction(callback) {
    const client = await pool.connect();
    try {
      // Ensure timezone is set before beginning transaction
      await client.query("SET timezone = 'UTC'");
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

