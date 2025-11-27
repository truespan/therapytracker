// Quick script to check if verification columns exist in partners table
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'therapy_tracker',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

async function checkSchema() {
  try {
    const result = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'partners'
      AND column_name IN ('verification_token', 'verification_token_expires', 'email_verified', 'is_active')
      ORDER BY column_name
    `);

    console.log('Checking partners table schema...\n');

    const expectedColumns = ['verification_token', 'verification_token_expires', 'email_verified', 'is_active'];
    const foundColumns = result.rows.map(row => row.column_name);

    expectedColumns.forEach(col => {
      const found = result.rows.find(row => row.column_name === col);
      if (found) {
        console.log(`✓ ${col} (${found.data_type}) - EXISTS`);
      } else {
        console.log(`❌ ${col} - MISSING - Migration not run!`);
      }
    });

    if (result.rows.length < expectedColumns.length) {
      console.log('\n❌ ISSUE: Missing columns! You need to run the migration:');
      console.log('   backend/database/migrations/add_partner_management_features.sql');
    } else {
      console.log('\n✓ All required columns exist');
    }

    await pool.end();
  } catch (error) {
    console.error('Error checking schema:', error.message);
    await pool.end();
  }
}

checkSchema();
