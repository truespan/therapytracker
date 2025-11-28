/**
 * Admin Account Creator for Render.com
 *
 * This script creates the initial admin account in the database.
 * Run this after database migrations are complete.
 *
 * Usage:
 *   node create_admin.js [DATABASE_URL] [ADMIN_EMAIL] [ADMIN_PASSWORD]
 *
 * Examples:
 *   node create_admin.js
 *   node create_admin.js "postgresql://..." admin@company.com SecurePass123
 *
 * If not provided, it will use:
 *   - DATABASE_URL from environment
 *   - admin@therapytracker.com as email
 *   - Admin@123 as password (CHANGE THIS IMMEDIATELY AFTER FIRST LOGIN!)
 */

const { Client } = require('pg');
const bcrypt = require('bcrypt');

// Get parameters from command line or use defaults
const DATABASE_URL = process.argv[2] || process.env.DATABASE_URL;
const ADMIN_EMAIL = process.argv[3] || 'admin@therapytracker.com';
const ADMIN_PASSWORD = process.argv[4] || 'Admin@123';
const ADMIN_NAME = 'Super Admin';

if (!DATABASE_URL) {
  console.error('❌ Error: DATABASE_URL not provided');
  console.error('Usage: node create_admin.js [DATABASE_URL] [ADMIN_EMAIL] [ADMIN_PASSWORD]');
  console.error('   Or set DATABASE_URL environment variable');
  process.exit(1);
}

async function createAdmin() {
  const client = new Client({
    connectionString: DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔌 Connecting to database...');
    await client.connect();
    console.log('✅ Connected to database\n');

    // Check if admin already exists
    console.log('🔍 Checking if admin already exists...');
    const existingAdmin = await client.query(
      'SELECT id, email FROM admins WHERE email = $1',
      [ADMIN_EMAIL]
    );

    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin already exists with this email');
      console.log(`   Email: ${ADMIN_EMAIL}`);
      console.log('\n❓ Do you want to update the password for this admin? (not yet implemented)');
      console.log('   To create a new admin, use a different email address.\n');
      process.exit(0);
    }

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('✅ Password hashed\n');

    // Create admin record
    console.log('👤 Creating admin record...');
    const adminResult = await client.query(
      'INSERT INTO admins (name, email) VALUES ($1, $2) RETURNING id, name, email, created_at',
      [ADMIN_NAME, ADMIN_EMAIL]
    );
    const admin = adminResult.rows[0];
    console.log('✅ Admin record created:');
    console.log(`   ID: ${admin.id}`);
    console.log(`   Name: ${admin.name}`);
    console.log(`   Email: ${admin.email}`);
    console.log(`   Created: ${admin.created_at}\n`);

    // Create auth credentials
    console.log('🔑 Creating authentication credentials...');
    await client.query(
      'INSERT INTO auth_credentials (user_type, reference_id, email, password_hash) VALUES ($1, $2, $3, $4)',
      ['admin', admin.id, ADMIN_EMAIL, passwordHash]
    );
    console.log('✅ Authentication credentials created\n');

    // Success message
    console.log('🎉 Admin account created successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ' + ADMIN_EMAIL);
    console.log('🔒 Password: ' + ADMIN_PASSWORD);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    if (ADMIN_PASSWORD === 'Admin@123') {
      console.log('⚠️  WARNING: Using default password!');
      console.log('   Please change this password immediately after first login.\n');
    }

    console.log('📝 Next steps:');
    console.log('   1. Navigate to your application');
    console.log('   2. Login with the credentials above');
    console.log('   3. Change the default password');
    console.log('   4. Create your first organization');

  } catch (error) {
    console.error('\n❌ Error creating admin account:');
    console.error(error.message);

    if (error.code === '23505') {
      console.error('\n💡 This error usually means:');
      console.error('   - An admin with this email already exists');
      console.error('   - Use a different email or delete the existing admin');
    }

    process.exit(1);
  } finally {
    await client.end();
    console.log('\n🔌 Database connection closed');
  }
}

// Run admin creation
console.log('🚀 Starting admin account creation...\n');
createAdmin().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
