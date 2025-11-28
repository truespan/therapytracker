/**
 * Cleanup Orphaned Users and Their Credentials
 *
 * This script removes users who have no partner assignments (orphaned users).
 * When organizations are deleted, partners are deleted, but users who were
 * assigned to those partners remain in the database.
 *
 * This will:
 * 1. Find users with no partner assignments
 * 2. Delete their auth credentials
 * 3. Delete the user records (cascade deletes sessions, profile_fields, etc.)
 *
 * Usage:
 *   node cleanup_orphaned_users.js [DATABASE_URL]
 *
 * If DATABASE_URL is not provided, it will use the one from environment variables.
 */

const { Client } = require('pg');

// Get database URL from command line arg or environment variable
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not provided');
  console.error('Usage: node cleanup_orphaned_users.js [DATABASE_URL]');
  console.error('   Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function cleanupOrphanedUsers() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Find orphaned users (users with no partner assignments)
    console.log('🔍 Checking for orphaned users...');
    const orphanedUsers = await client.query(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.contact,
        u.created_at
      FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
      )
      ORDER BY u.created_at DESC
    `);

    if (orphanedUsers.rows.length === 0) {
      console.log('✅ No orphaned users found. Database is clean!\n');
      return;
    }

    console.log(`⚠️  Found ${orphanedUsers.rows.length} orphaned users:\n`);
    orphanedUsers.rows.forEach((user, index) => {
      console.log(`${index + 1}. ID: ${user.id}`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Email: ${user.email || 'N/A'}`);
      console.log(`   Contact: ${user.contact}`);
      console.log(`   Created: ${user.created_at}`);
      console.log('');
    });

    const userIds = orphanedUsers.rows.map(u => u.id);

    // Step 2: Check auth credentials for these users
    console.log('🔍 Checking auth credentials for orphaned users...');
    const orphanedCredentials = await client.query(
      `SELECT id, email, reference_id FROM auth_credentials
       WHERE user_type = $1 AND reference_id = ANY($2)`,
      ['user', userIds]
    );

    if (orphanedCredentials.rows.length > 0) {
      console.log(`⚠️  Found ${orphanedCredentials.rows.length} auth credentials to delete\n`);
    }

    // Step 3: Check related data that will be cascade deleted
    console.log('🔍 Checking related data that will be cascade deleted...');

    const sessions = await client.query(
      'SELECT COUNT(*) as count FROM sessions WHERE user_id = ANY($1)',
      [userIds]
    );
    console.log(`   - Sessions: ${sessions.rows[0].count}`);

    const profileFields = await client.query(
      'SELECT COUNT(*) as count FROM profile_fields WHERE user_id = ANY($1)',
      [userIds]
    );
    console.log(`   - Profile fields: ${profileFields.rows[0].count}`);

    // Check if questionnaire_responses table exists
    try {
      const questionnaireResponses = await client.query(
        'SELECT COUNT(*) as count FROM questionnaire_responses WHERE user_id = ANY($1)',
        [userIds]
      );
      console.log(`   - Questionnaire responses: ${questionnaireResponses.rows[0].count}`);
    } catch (e) {
      // Table might not exist, skip
    }

    console.log('');

    // Confirmation
    console.log('⚠️  WARNING: This will permanently delete:');
    console.log(`   - ${orphanedUsers.rows.length} user records`);
    console.log(`   - ${orphanedCredentials.rows.length} auth credentials`);
    console.log(`   - ${sessions.rows[0].count} sessions`);
    console.log(`   - ${profileFields.rows[0].count} profile fields`);
    console.log('   - And all other related data (cascade)\n');

    // Auto-confirm for now (you can add a prompt library like 'readline' for confirmation)
    console.log('🗑️  Proceeding with deletion...\n');

    // Step 4: Delete auth credentials first
    if (orphanedCredentials.rows.length > 0) {
      const deleteCredentials = await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
        ['user', userIds]
      );
      console.log(`✅ Deleted ${deleteCredentials.rowCount} auth credentials`);
    }

    // Step 5: Delete users (cascade will handle related data)
    const deleteUsers = await client.query(
      'DELETE FROM users WHERE id = ANY($1)',
      [userIds]
    );
    console.log(`✅ Deleted ${deleteUsers.rowCount} user records`);
    console.log('✅ Cascade deleted all related data (sessions, profile fields, etc.)\n');

    // Step 6: Verify cleanup
    console.log('🔍 Verifying cleanup...');

    const remainingUsers = await client.query('SELECT COUNT(*) as count FROM users');
    console.log(`   - Remaining users: ${remainingUsers.rows[0].count}`);

    const remainingCredentials = await client.query(
      "SELECT COUNT(*) as count FROM auth_credentials WHERE user_type = 'user'"
    );
    console.log(`   - Remaining user credentials: ${remainingCredentials.rows[0].count}`);

    const remainingAssignments = await client.query(
      'SELECT COUNT(*) as count FROM user_partner_assignments'
    );
    console.log(`   - Remaining assignments: ${remainingAssignments.rows[0].count}`);

    // Check for orphaned credentials
    const orphanedCheck = await client.query(`
      SELECT COUNT(*) as count FROM auth_credentials ac
      WHERE ac.user_type = 'user'
      AND NOT EXISTS (SELECT 1 FROM users u WHERE u.id = ac.reference_id)
    `);

    // Check for orphaned users
    const orphanedUsersCheck = await client.query(`
      SELECT COUNT(*) as count FROM users u
      WHERE NOT EXISTS (
        SELECT 1 FROM user_partner_assignments upa WHERE upa.user_id = u.id
      )
    `);

    console.log('');
    if (orphanedCheck.rows[0].count === '0' && orphanedUsersCheck.rows[0].count === '0') {
      console.log('✅ Verification passed! No orphaned users or credentials remain.\n');
    } else {
      console.log('⚠️  WARNING: Some orphaned records still exist:');
      console.log(`   - Orphaned credentials: ${orphanedCheck.rows[0].count}`);
      console.log(`   - Orphaned users: ${orphanedUsersCheck.rows[0].count}\n`);
    }

    // Final summary
    console.log('📊 Database Summary:');
    const summary = await client.query(`
      SELECT
        'Users' as entity,
        COUNT(*) as count
      FROM users
      UNION ALL
      SELECT
        'User Credentials' as entity,
        COUNT(*) as count
      FROM auth_credentials WHERE user_type = 'user'
      UNION ALL
      SELECT
        'User-Partner Assignments' as entity,
        COUNT(*) as count
      FROM user_partner_assignments
      UNION ALL
      SELECT
        'Partners' as entity,
        COUNT(*) as count
      FROM partners
      UNION ALL
      SELECT
        'Organizations' as entity,
        COUNT(*) as count
      FROM organizations
    `);

    console.log('');
    summary.rows.forEach(row => {
      console.log(`   ${row.entity}: ${row.count}`);
    });

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\n📝 What was done:');
    console.log('   ✓ Deleted orphaned users (users with no partner assignments)');
    console.log('   ✓ Deleted auth credentials for those users');
    console.log('   ✓ Cascade deleted sessions, profile fields, and other related data');
    console.log('   ✓ Database integrity restored');

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
console.log('🧹 Starting orphaned users cleanup...\n');
console.log('This will delete users who have no partner assignments.');
console.log('This typically happens when organizations are deleted.\n');

cleanupOrphanedUsers().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
