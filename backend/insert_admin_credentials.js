const bcrypt = require('bcrypt');
const db = require('./src/config/database');
require('dotenv').config();

const ADMIN_EMAIL = 'admin@theraptrack.com';
const ADMIN_PASSWORD = 'Vajreshwari9$';
const ADMIN_NAME = 'Admin';

(async () => {
  try {
    console.log('🚀 Starting admin credentials insertion...\n');

    // Hash password
    console.log('🔐 Hashing password...');
    const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);
    console.log('✅ Password hashed\n');

    // Check/create admin record
    console.log('🔍 Checking if admin record exists...');
    let adminResult = await db.query(
      'SELECT id FROM admins WHERE email = $1',
      [ADMIN_EMAIL]
    );

    let adminId;
    if (adminResult.rows.length === 0) {
      // Create admin if doesn't exist
      console.log('👤 Creating admin record...');
      const newAdmin = await db.query(
        'INSERT INTO admins (name, email) VALUES ($1, $2) RETURNING id',
        [ADMIN_NAME, ADMIN_EMAIL]
      );
      adminId = newAdmin.rows[0].id;
      console.log('✅ Created admin record with ID:', adminId);
    } else {
      adminId = adminResult.rows[0].id;
      console.log('✅ Admin record exists with ID:', adminId);
    }

    // Insert/update auth credentials
    console.log('\n🔑 Inserting/updating authentication credentials...');
    await db.query(
      `INSERT INTO auth_credentials (user_type, reference_id, email, password_hash)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (email) DO UPDATE 
       SET password_hash = EXCLUDED.password_hash,
           user_type = EXCLUDED.user_type,
           reference_id = EXCLUDED.reference_id`,
      ['admin', adminId, ADMIN_EMAIL, passwordHash]
    );
    console.log('✅ Auth credentials inserted/updated successfully!\n');

    // Success message
    console.log('🎉 Admin account setup completed successfully!\n');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email:    ' + ADMIN_EMAIL);
    console.log('🔒 Password: ' + ADMIN_PASSWORD);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    await db.end();
    console.log('🔌 Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.code) {
      console.error('Error code:', error.code);
    }
    if (error.detail) {
      console.error('Error detail:', error.detail);
    }
    await db.end();
    process.exit(1);
  }
})();

