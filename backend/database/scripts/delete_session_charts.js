/**
 * Delete Session-Based Charts Script
 *
 * This script deletes all old session-based charts from the shared_charts table.
 * Only questionnaire_comparison charts will remain.
 *
 * Usage:
 *   node backend/database/scripts/delete_session_charts.js
 */

const fs = require('fs');
const path = require('path');
const db = require('../../src/config/database');

async function deleteSessionCharts() {
  console.log('🗑️  Deleting Session-Based Charts...\n');

  try {
    // First, count how many session-based charts exist
    console.log('📊 Checking for session-based charts...');
    const countResult = await db.query(`
      SELECT COUNT(*) as count
      FROM shared_charts
      WHERE chart_type IN ('radar_default', 'comparison')
    `);

    const chartCount = parseInt(countResult.rows[0].count);
    console.log(`   Found ${chartCount} session-based charts to delete\n`);

    if (chartCount === 0) {
      console.log('✅ No session-based charts found. Database is already clean!\n');
      process.exit(0);
    }

    // Show breakdown by chart type
    const breakdownResult = await db.query(`
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
    const deleteResult = await db.query(`
      DELETE FROM shared_charts
      WHERE chart_type IN ('radar_default', 'comparison')
      RETURNING id
    `);

    const deletedCount = deleteResult.rows.length;
    console.log(`✅ Successfully deleted ${deletedCount} session-based charts\n`);

    // Show remaining charts
    const remainingResult = await db.query(`
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
    process.exit(1);
  } finally {
    process.exit(0);
  }
}

// Run deletion
deleteSessionCharts();
