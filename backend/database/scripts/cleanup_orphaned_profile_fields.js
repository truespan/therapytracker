/**
 * Cleanup Orphaned Profile Fields
 *
 * This script removes profile_fields that reference deleted partners or users
 * in their created_by_partner_id or created_by_user_id columns.
 *
 * These orphaned records exist because the columns don't have foreign key
 * constraints with CASCADE delete.
 *
 * Usage:
 *   node cleanup_orphaned_profile_fields.js [DATABASE_URL]
 *
 * If DATABASE_URL is not provided, it will use the one from environment variables.
 */

const { Client } = require('pg');

// Get database URL from command line arg or environment variable
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not provided');
  console.error('Usage: node cleanup_orphaned_profile_fields.js [DATABASE_URL]');
  console.error('   Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function cleanupOrphanedProfileFields() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Check for orphaned profile_fields created by deleted partners
    console.log('🔍 Checking for orphaned profile_fields...\n');

    const orphanedByPartners = await client.query(`
      SELECT
        pf.id,
        pf.field_name,
        pf.field_type,
        pf.is_default,
        pf.created_by_partner_id
      FROM profile_fields pf
      WHERE pf.created_by_partner_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id
      )
    `);

    const orphanedByUsers = await client.query(`
      SELECT
        pf.id,
        pf.field_name,
        pf.created_by_user_id
      FROM profile_fields pf
      WHERE pf.created_by_user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = pf.created_by_user_id
      )
    `);

    const orphanedUserAssignments = await client.query(`
      SELECT COUNT(*) as count
      FROM profile_fields pf
      WHERE pf.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.user_id)
    `);

    const orphanedSessionAssignments = await client.query(`
      SELECT COUNT(*) as count
      FROM profile_fields pf
      WHERE pf.session_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = pf.session_id)
    `);

    console.log('📊 Orphaned Profile Fields Summary:');
    console.log(`   - Created by deleted partners: ${orphanedByPartners.rows.length}`);
    console.log(`   - Created by deleted users: ${orphanedByUsers.rows.length}`);
    console.log(`   - Assigned to deleted users: ${orphanedUserAssignments.rows[0].count}`);
    console.log(`   - Assigned to deleted sessions: ${orphanedSessionAssignments.rows[0].count}\n`);

    if (orphanedByPartners.rows.length > 0) {
      console.log('⚠️  Profile fields created by deleted partners:');
      orphanedByPartners.rows.forEach((field, idx) => {
        console.log(`   ${idx + 1}. ID: ${field.id}, Name: "${field.field_name}", Type: ${field.field_type}, Is Default: ${field.is_default}, Partner ID: ${field.created_by_partner_id}`);
      });
      console.log('');
    }

    const totalOrphans =
      orphanedByPartners.rows.length +
      orphanedByUsers.rows.length +
      parseInt(orphanedUserAssignments.rows[0].count) +
      parseInt(orphanedSessionAssignments.rows[0].count);

    if (totalOrphans === 0) {
      console.log('✅ No orphaned profile_fields found. Database is clean!\n');
      return;
    }

    console.log(`⚠️  WARNING: This will permanently delete ${totalOrphans} orphaned profile field records\n`);
    console.log('🗑️  Proceeding with deletion...\n');

    // Step 2: Delete orphaned profile_fields created by deleted partners (non-default only)
    const deleteByPartner = await client.query(`
      DELETE FROM profile_fields
      WHERE created_by_partner_id IS NOT NULL
      AND is_default = false
      AND created_by_partner_id NOT IN (SELECT id FROM partners)
    `);

    if (deleteByPartner.rowCount > 0) {
      console.log(`✅ Deleted ${deleteByPartner.rowCount} profile fields created by deleted partners`);
    }

    // Step 3: Delete orphaned profile_fields created by deleted users
    const deleteByUser = await client.query(`
      DELETE FROM profile_fields
      WHERE created_by_user_id IS NOT NULL
      AND created_by_user_id NOT IN (SELECT id FROM users)
    `);

    if (deleteByUser.rowCount > 0) {
      console.log(`✅ Deleted ${deleteByUser.rowCount} profile fields created by deleted users`);
    }

    // Step 4: Delete profile_fields assigned to deleted users
    const deleteUserAssignments = await client.query(`
      DELETE FROM profile_fields
      WHERE user_id IS NOT NULL
      AND user_id NOT IN (SELECT id FROM users)
    `);

    if (deleteUserAssignments.rowCount > 0) {
      console.log(`✅ Deleted ${deleteUserAssignments.rowCount} profile fields assigned to deleted users`);
    }

    // Step 5: Delete profile_fields assigned to deleted sessions
    const deleteSessionAssignments = await client.query(`
      DELETE FROM profile_fields
      WHERE session_id IS NOT NULL
      AND session_id NOT IN (SELECT id FROM sessions)
    `);

    if (deleteSessionAssignments.rowCount > 0) {
      console.log(`✅ Deleted ${deleteSessionAssignments.rowCount} profile fields assigned to deleted sessions`);
    }

    console.log('');

    // Step 6: Verify cleanup
    console.log('🔍 Verifying cleanup...');

    const verifyPartners = await client.query(`
      SELECT COUNT(*) as count
      FROM profile_fields pf
      WHERE pf.created_by_partner_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM partners p WHERE p.id = pf.created_by_partner_id)
    `);

    const verifyUsers = await client.query(`
      SELECT COUNT(*) as count
      FROM profile_fields pf
      WHERE pf.created_by_user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.created_by_user_id)
    `);

    const verifyUserAssignments = await client.query(`
      SELECT COUNT(*) as count
      FROM profile_fields pf
      WHERE pf.user_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = pf.user_id)
    `);

    const verifySessionAssignments = await client.query(`
      SELECT COUNT(*) as count
      FROM profile_fields pf
      WHERE pf.session_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM sessions s WHERE s.id = pf.session_id)
    `);

    const allClean =
      verifyPartners.rows[0].count === '0' &&
      verifyUsers.rows[0].count === '0' &&
      verifyUserAssignments.rows[0].count === '0' &&
      verifySessionAssignments.rows[0].count === '0';

    if (allClean) {
      console.log('✅ Verification passed! All orphaned profile_fields have been cleaned up.\n');
    } else {
      console.log('⚠️  WARNING: Some orphaned records still exist:');
      console.log(`   - Created by deleted partners: ${verifyPartners.rows[0].count}`);
      console.log(`   - Created by deleted users: ${verifyUsers.rows[0].count}`);
      console.log(`   - Assigned to deleted users: ${verifyUserAssignments.rows[0].count}`);
      console.log(`   - Assigned to deleted sessions: ${verifySessionAssignments.rows[0].count}\n`);
    }

    // Final summary
    console.log('📊 Database Summary:');
    const summary = await client.query(`
      SELECT
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE is_default = true) as default_fields,
        COUNT(*) FILTER (WHERE is_default = false) as custom_fields,
        COUNT(*) FILTER (WHERE created_by_partner_id IS NOT NULL) as partner_created,
        COUNT(*) FILTER (WHERE user_id IS NOT NULL) as user_assigned
      FROM profile_fields
    `);

    const stats = summary.rows[0];
    console.log(`   Total profile fields: ${stats.total}`);
    console.log(`   - Default fields: ${stats.default_fields}`);
    console.log(`   - Custom fields: ${stats.custom_fields}`);
    console.log(`   - Created by partners: ${stats.partner_created}`);
    console.log(`   - Assigned to users: ${stats.user_assigned}`);

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\n📝 What was done:');
    console.log('   ✓ Deleted profile fields created by deleted partners');
    console.log('   ✓ Deleted profile fields created by deleted users');
    console.log('   ✓ Deleted profile fields assigned to deleted users');
    console.log('   ✓ Deleted profile fields assigned to deleted sessions');
    console.log('   ✓ Database integrity restored');
    console.log('\n💡 Next step: Run the migration to add foreign key constraints');
    console.log('   psql -f backend/database/migrations/fix_profile_fields_constraints.sql');

  } catch (error) {
    console.error('\n❌ Error during cleanup:');
    console.error(error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run cleanup
console.log('🧹 Starting orphaned profile_fields cleanup...\n');
cleanupOrphanedProfileFields().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
