/**
 * Cleanup script for orphaned auth_credentials
 * This script removes auth_credentials that reference deleted partners, organizations, or users
 */

const db = require('../../src/config/database');

async function cleanupOrphanedAuthCredentials() {
  try {
    console.log('Starting cleanup of orphaned auth_credentials...\n');

    // Find and display orphaned partner auth credentials
    const orphanedPartnersQuery = `
      SELECT
          ac.id,
          ac.email,
          ac.user_type,
          ac.reference_id
      FROM auth_credentials ac
      WHERE ac.user_type = 'partner'
        AND NOT EXISTS (
            SELECT 1 FROM partners p WHERE p.id = ac.reference_id
        )
    `;
    const orphanedPartners = await db.query(orphanedPartnersQuery);
    console.log(`Found ${orphanedPartners.rows.length} orphaned partner auth_credentials:`);
    orphanedPartners.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Email: ${row.email}, Reference ID: ${row.reference_id}`);
    });

    // Find and display orphaned organization auth credentials
    const orphanedOrgsQuery = `
      SELECT
          ac.id,
          ac.email,
          ac.user_type,
          ac.reference_id
      FROM auth_credentials ac
      WHERE ac.user_type = 'organization'
        AND NOT EXISTS (
            SELECT 1 FROM organizations o WHERE o.id = ac.reference_id
        )
    `;
    const orphanedOrgs = await db.query(orphanedOrgsQuery);
    console.log(`\nFound ${orphanedOrgs.rows.length} orphaned organization auth_credentials:`);
    orphanedOrgs.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Email: ${row.email}, Reference ID: ${row.reference_id}`);
    });

    // Find and display orphaned user auth credentials
    const orphanedUsersQuery = `
      SELECT
          ac.id,
          ac.email,
          ac.user_type,
          ac.reference_id
      FROM auth_credentials ac
      WHERE ac.user_type = 'user'
        AND NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = ac.reference_id
        )
    `;
    const orphanedUsers = await db.query(orphanedUsersQuery);
    console.log(`\nFound ${orphanedUsers.rows.length} orphaned user auth_credentials:`);
    orphanedUsers.rows.forEach(row => {
      console.log(`  - ID: ${row.id}, Email: ${row.email}, Reference ID: ${row.reference_id}`);
    });

    const totalOrphaned = orphanedPartners.rows.length + orphanedOrgs.rows.length + orphanedUsers.rows.length;

    if (totalOrphaned === 0) {
      console.log('\nNo orphaned auth_credentials found. Database is clean!');
      process.exit(0);
    }

    console.log(`\n${'='.repeat(60)}`);
    console.log(`Total orphaned auth_credentials to delete: ${totalOrphaned}`);
    console.log(`${'='.repeat(60)}\n`);

    // Delete orphaned partner auth credentials
    const deletePartnersResult = await db.query(`
      DELETE FROM auth_credentials
      WHERE user_type = 'partner'
        AND NOT EXISTS (
            SELECT 1 FROM partners p WHERE p.id = auth_credentials.reference_id
        )
    `);
    console.log(`Deleted ${deletePartnersResult.rowCount} orphaned partner auth_credentials`);

    // Delete orphaned organization auth credentials
    const deleteOrgsResult = await db.query(`
      DELETE FROM auth_credentials
      WHERE user_type = 'organization'
        AND NOT EXISTS (
            SELECT 1 FROM organizations o WHERE o.id = auth_credentials.reference_id
        )
    `);
    console.log(`Deleted ${deleteOrgsResult.rowCount} orphaned organization auth_credentials`);

    // Delete orphaned user auth credentials
    const deleteUsersResult = await db.query(`
      DELETE FROM auth_credentials
      WHERE user_type = 'user'
        AND NOT EXISTS (
            SELECT 1 FROM users u WHERE u.id = auth_credentials.reference_id
        )
    `);
    console.log(`Deleted ${deleteUsersResult.rowCount} orphaned user auth_credentials`);

    // Show summary
    console.log('\n' + '='.repeat(60));
    console.log('Cleanup completed successfully!');
    console.log('='.repeat(60) + '\n');

    const summaryResult = await db.query(`
      SELECT
          user_type,
          COUNT(*) as count
      FROM auth_credentials
      GROUP BY user_type
      ORDER BY user_type
    `);

    console.log('Remaining auth_credentials by type:');
    summaryResult.rows.forEach(row => {
      console.log(`  - ${row.user_type}: ${row.count}`);
    });

    process.exit(0);
  } catch (error) {
    console.error('Error during cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanupOrphanedAuthCredentials();
