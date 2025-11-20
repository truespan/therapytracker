/**
 * Admin Setup Script
 * 
 * This script sets up the admin account with a secure password.
 * Run this after executing the admin migration SQL.
 * 
 * Usage:
 *   node backend/database/scripts/setup_admin.js
 * 
 * Default credentials:
 *   Email: admin@therapytracker.com
 *   Password: Admin@123
 */

const bcrypt = require('bcrypt');
const db = require('../../src/config/database');

const ADMIN_EMAIL = 'admin@therapytracker.com';
const ADMIN_PASSWORD = 'Admin@123';
const SALT_ROUNDS = 10;

async function setupAdmin() {
  try {
    console.log('🔧 Setting up admin account...\n');

    // Check if admin exists
    const adminCheck = await db.query(
      'SELECT id FROM admins WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (adminCheck.rows.length === 0) {
      console.error('❌ Error: Admin record not found in database.');
      console.error('   Please run the migration first: backend/database/migrations/add_admin_support.sql');
      process.exit(1);
    }

    const adminId = adminCheck.rows[0].id;
    console.log(`✓ Found admin record (ID: ${adminId})`);

    // Generate password hash
    console.log('🔐 Generating secure password hash...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, SALT_ROUNDS);
    console.log(`✓ Password hash generated`);

    // Update auth credentials
    const result = await db.query(
      `UPDATE auth_credentials 
       SET password_hash = $1 
       WHERE user_type = 'admin' AND reference_id = $2
       RETURNING id`,
      [passwordHash, adminId]
    );

    if (result.rows.length === 0) {
      console.error('❌ Error: Could not update admin credentials');
      process.exit(1);
    }

    console.log('✓ Admin credentials updated successfully\n');
    console.log('✅ Admin setup complete!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📋 Admin Login Credentials:');
    console.log('   Email:    ' + ADMIN_EMAIL);
    console.log('   Password: ' + ADMIN_PASSWORD);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
    console.log('⚠️  IMPORTANT: Change the default password after first login!\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error setting up admin:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the setup
setupAdmin();

