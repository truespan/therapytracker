/**
 * Delete Session-Based Charts Script (Simple Version)
 *
 * This script deletes all old session-based charts from the shared_charts table.
 * Only questionnaire_comparison charts will remain.
 *
 * Usage:
 *   node backend/database/scripts/delete_session_charts_simple.js
 */

const { Pool } = require('pg');

// Direct connection configuration
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'therapy_tracker',
  password: 'Vajreshwari9$',
  port: 5432,
});

async function deleteSessionCharts() {
  console.log('🗑️  Deleting Session-Based Charts...\n');

  const client = await pool.connect();

  try {
    // First, count how many session-based charts exist
    console.log('📊 Checking for session-based charts...');
    const countResult = await client.query(`
      SELECT COUNT(*) as count
      FROM shared_charts
      WHERE chart_type IN ('radar_default', 'comparison')
    `);

    const chartCount = parseInt(countResult.rows[0].count);
    console.log(`   Found ${chartCount} session-based charts to delete\n`);

    if (chartCount === 0) {
      console.log('✅ No session-based charts found. Database is already clean!\n');
      return;
    }

    // Show breakdown by chart type
    const breakdownResult = await client.query(`
      SELECT chart_type, COUNT(*) as count
      FROM shared_charts
      WHERE chart_type IN ('radar_default', 'comparison')
      GROUP BY chart_type
    `);

    console.log('   Breakdown by type:');
    breakdownResult.rows.forEach(row => {
      console.log(`   - ${row.chart_type}: ${row.count} charts`);
    });
    console.log('');

    // Delete session-based charts
    console.log('⏳ Deleting session-based charts...');
    const deleteResult = await client.query(`
      DELETE FROM shared_charts
      WHERE chart_type IN ('radar_default', 'comparison')
      RETURNING id
    `);

    const deletedCount = deleteResult.rows.length;
    console.log(`✅ Successfully deleted ${deletedCount} session-based charts\n`);

    // Show remaining charts
    const remainingResult = await client.query(`
      SELECT COUNT(*) as count
      FROM shared_charts
    `);

    const remainingCount = parseInt(remainingResult.rows[0].count);
    console.log(`📋 ${remainingCount} questionnaire-based charts remain in the database\n`);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ DELETION COMPLETED!');
    console.log('\n📝 Summary:');
    console.log(`   - Deleted: ${deletedCount} session-based charts`);
    console.log(`   - Remaining: ${remainingCount} questionnaire-based charts`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during deletion:', error.message);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run deletion
deleteSessionCharts()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
