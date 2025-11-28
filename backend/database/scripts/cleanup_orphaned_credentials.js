/**
 * Cleanup Orphaned Authentication Credentials
 *
 * This script removes auth credentials for users, partners, and organizations
 * that no longer exist in their respective tables.
 *
 * This is needed if organizations were deleted before the fix that properly
 * cleans up user credentials during organization deletion.
 *
 * Usage:
 *   node cleanup_orphaned_credentials.js [DATABASE_URL]
 *
 * If DATABASE_URL is not provided, it will use the one from environment variables.
 */

const { Client } = require('pg');

// Get database URL from command line arg or environment variable
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not provided');
  console.error('Usage: node cleanup_orphaned_credentials.js [DATABASE_URL]');
  console.error('   Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function cleanupOrphanedCredentials() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Step 1: Find orphaned user credentials
    console.log('🔍 Checking for orphaned user credentials...');
    const orphanedUsers = await client.query(`
      SELECT
        ac.id as auth_id,
        ac.reference_id as user_id,
        ac.email
      FROM auth_credentials ac
      WHERE ac.user_type = 'user'
      AND NOT EXISTS (
        SELECT 1 FROM users u WHERE u.id = ac.reference_id
      )
    `);

    if (orphanedUsers.rows.length > 0) {
      console.log(`⚠️  Found ${orphanedUsers.rows.length} orphaned user credentials:`);
      orphanedUsers.rows.forEach(row => {
        console.log(`   - User ID: ${row.user_id}, Email: ${row.email}`);
      });

      // Delete orphaned user credentials
      const deleteUsers = await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id NOT IN (SELECT id FROM users)',
        ['user']
      );
      console.log(`✅ Deleted ${deleteUsers.rowCount} orphaned user credentials\n`);
    } else {
      console.log('✅ No orphaned user credentials found\n');
    }

    // Step 2: Find orphaned partner credentials
    console.log('🔍 Checking for orphaned partner credentials...');
    const orphanedPartners = await client.query(`
      SELECT
        ac.id as auth_id,
        ac.reference_id as partner_id,
        ac.email
      FROM auth_credentials ac
      WHERE ac.user_type = 'partner'
      AND NOT EXISTS (
        SELECT 1 FROM partners p WHERE p.id = ac.reference_id
      )
    `);

    if (orphanedPartners.rows.length > 0) {
      console.log(`⚠️  Found ${orphanedPartners.rows.length} orphaned partner credentials:`);
      orphanedPartners.rows.forEach(row => {
        console.log(`   - Partner ID: ${row.partner_id}, Email: ${row.email}`);
      });

      // Delete orphaned partner credentials
      const deletePartners = await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id NOT IN (SELECT id FROM partners)',
        ['partner']
      );
      console.log(`✅ Deleted ${deletePartners.rowCount} orphaned partner credentials\n`);
    } else {
      console.log('✅ No orphaned partner credentials found\n');
    }

    // Step 3: Find orphaned organization credentials
    console.log('🔍 Checking for orphaned organization credentials...');
    const orphanedOrgs = await client.query(`
      SELECT
        ac.id as auth_id,
        ac.reference_id as org_id,
        ac.email
      FROM auth_credentials ac
      WHERE ac.user_type = 'organization'
      AND NOT EXISTS (
        SELECT 1 FROM organizations o WHERE o.id = ac.reference_id
      )
    `);

    if (orphanedOrgs.rows.length > 0) {
      console.log(`⚠️  Found ${orphanedOrgs.rows.length} orphaned organization credentials:`);
      orphanedOrgs.rows.forEach(row => {
        console.log(`   - Organization ID: ${row.org_id}, Email: ${row.email}`);
      });

      // Delete orphaned organization credentials
      const deleteOrgs = await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id NOT IN (SELECT id FROM organizations)',
        ['organization']
      );
      console.log(`✅ Deleted ${deleteOrgs.rowCount} orphaned organization credentials\n`);
    } else {
      console.log('✅ No orphaned organization credentials found\n');
    }

    // Step 4: Check for orphaned admin credentials (if admin table exists)
    console.log('🔍 Checking for orphaned admin credentials...');
    try {
      const orphanedAdmins = await client.query(`
        SELECT
          ac.id as auth_id,
          ac.reference_id as admin_id,
          ac.email
        FROM auth_credentials ac
        WHERE ac.user_type = 'admin'
        AND NOT EXISTS (
          SELECT 1 FROM admins a WHERE a.id = ac.reference_id
        )
      `);

      if (orphanedAdmins.rows.length > 0) {
        console.log(`⚠️  Found ${orphanedAdmins.rows.length} orphaned admin credentials:`);
        orphanedAdmins.rows.forEach(row => {
          console.log(`   - Admin ID: ${row.admin_id}, Email: ${row.email}`);
        });

        // Delete orphaned admin credentials
        const deleteAdmins = await client.query(
          'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id NOT IN (SELECT id FROM admins)',
          ['admin']
        );
        console.log(`✅ Deleted ${deleteAdmins.rowCount} orphaned admin credentials\n`);
      } else {
        console.log('✅ No orphaned admin credentials found\n');
      }
    } catch (error) {
      console.log('⚠️  Admins table not found, skipping admin credential check\n');
    }

    // Final report
    console.log('📊 Final Report:');
    const summary = await client.query(`
      SELECT
        user_type,
        COUNT(*) as count
      FROM auth_credentials
      GROUP BY user_type
      ORDER BY user_type
    `);

    console.log('\n✅ Remaining authentication credentials:');
    summary.rows.forEach(row => {
      console.log(`   - ${row.user_type}: ${row.count}`);
    });

    console.log('\n🎉 Cleanup completed successfully!');
    console.log('\n📝 What was done:');
    console.log('   ✓ Removed auth credentials for deleted users');
    console.log('   ✓ Removed auth credentials for deleted partners');
    console.log('   ✓ Removed auth credentials for deleted organizations');
    console.log('   ✓ Database integrity restored');

  } catch (error) {
    console.error('\n❌ Error during cleanup:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run cleanup
console.log('🧹 Starting orphaned credentials cleanup...\n');
cleanupOrphanedCredentials().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
