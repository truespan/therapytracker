/**
 * Admin Migration Verification Script
 * 
 * This script checks if the admin migration has been executed successfully.
 * 
 * Usage:
 *   node backend/database/scripts/verify_admin_migration.js
 */

const db = require('../../src/config/database');

async function verifyMigration() {
  console.log('🔍 Verifying Admin Migration...\n');
  
  let allChecksPass = true;

  try {
    // Check 1: Verify admins table exists
    console.log('1️⃣  Checking if admins table exists...');
    try {
      const tableCheck = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'admins'
        );
      `);
      
      if (tableCheck.rows[0].exists) {
        console.log('   ✅ Admins table exists\n');
      } else {
        console.log('   ❌ Admins table NOT found\n');
        allChecksPass = false;
      }
    } catch (error) {
      console.log('   ❌ Error checking admins table:', error.message, '\n');
      allChecksPass = false;
    }

    // Check 2: Verify admin record exists
    console.log('2️⃣  Checking if admin record exists...');
    try {
      const adminCheck = await db.query(
        "SELECT * FROM admins WHERE email = 'admin@therapytracker.com'"
      );
      
      if (adminCheck.rows.length > 0) {
        const admin = adminCheck.rows[0];
        console.log('   ✅ Admin record found');
        console.log('      ID:', admin.id);
        console.log('      Name:', admin.name);
        console.log('      Email:', admin.email);
        console.log('      Created:', admin.created_at, '\n');
      } else {
        console.log('   ❌ Admin record NOT found\n');
        allChecksPass = false;
      }
    } catch (error) {
      console.log('   ❌ Error checking admin record:', error.message, '\n');
      allChecksPass = false;
    }

    // Check 3: Verify organizations table has new columns
    console.log('3️⃣  Checking organizations table columns...');
    try {
      const columnsCheck = await db.query(`
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = 'organizations' 
        AND column_name IN ('gst_no', 'subscription_plan', 'is_active', 'deactivated_at', 'deactivated_by')
        ORDER BY column_name;
      `);
      
      const foundColumns = columnsCheck.rows.map(r => r.column_name);
      const requiredColumns = ['gst_no', 'subscription_plan', 'is_active', 'deactivated_at', 'deactivated_by'];
      
      console.log('   Found columns:', foundColumns.join(', '));
      
      const missingColumns = requiredColumns.filter(col => !foundColumns.includes(col));
      
      if (missingColumns.length === 0) {
        console.log('   ✅ All new columns exist\n');
      } else {
        console.log('   ❌ Missing columns:', missingColumns.join(', '), '\n');
        allChecksPass = false;
      }
    } catch (error) {
      console.log('   ❌ Error checking columns:', error.message, '\n');
      allChecksPass = false;
    }

    // Check 4: Verify auth_credentials supports admin user type
    console.log('4️⃣  Checking auth_credentials constraint...');
    try {
      const constraintCheck = await db.query(`
        SELECT con.conname, pg_get_constraintdef(con.oid) as definition
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        WHERE rel.relname = 'auth_credentials'
        AND con.contype = 'c'
        AND con.conname LIKE '%user_type%';
      `);
      
      if (constraintCheck.rows.length > 0) {
        const constraint = constraintCheck.rows[0];
        const supportsAdmin = constraint.definition.includes("'admin'");
        
        if (supportsAdmin) {
          console.log('   ✅ user_type constraint includes admin\n');
        } else {
          console.log('   ⚠️  user_type constraint may not include admin');
          console.log('      Definition:', constraint.definition, '\n');
          allChecksPass = false;
        }
      } else {
        console.log('   ⚠️  Could not find user_type constraint\n');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking constraint:', error.message, '\n');
    }

    // Check 5: Verify admin auth credentials
    console.log('5️⃣  Checking admin auth credentials...');
    try {
      const authCheck = await db.query(
        "SELECT id, user_type, reference_id, email, LEFT(password_hash, 30) as hash_preview FROM auth_credentials WHERE user_type = 'admin'"
      );
      
      if (authCheck.rows.length > 0) {
        const auth = authCheck.rows[0];
        console.log('   ✅ Admin auth credentials found');
        console.log('      Auth ID:', auth.id);
        console.log('      User Type:', auth.user_type);
        console.log('      Reference ID:', auth.reference_id);
        console.log('      Email:', auth.email);
        console.log('      Password Hash Preview:', auth.hash_preview + '...');
        
        // Check if it's the placeholder hash
        if (auth.hash_preview.includes('placeholder')) {
          console.log('      ⚠️  WARNING: Placeholder password detected!');
          console.log('      ⚠️  Run setup script: node database/scripts/setup_admin.js\n');
          allChecksPass = false;
        } else {
          console.log('      ✅ Password hash appears to be set correctly\n');
        }
      } else {
        console.log('   ❌ Admin auth credentials NOT found\n');
        allChecksPass = false;
      }
    } catch (error) {
      console.log('   ❌ Error checking auth credentials:', error.message, '\n');
      allChecksPass = false;
    }

    // Check 6: Verify indexes
    console.log('6️⃣  Checking indexes...');
    try {
      const indexCheck = await db.query(`
        SELECT indexname 
        FROM pg_indexes 
        WHERE tablename IN ('admins', 'organizations')
        AND indexname IN ('idx_admins_email', 'idx_organizations_is_active');
      `);
      
      const foundIndexes = indexCheck.rows.map(r => r.indexname);
      console.log('   Found indexes:', foundIndexes.join(', ') || 'none');
      
      if (foundIndexes.includes('idx_admins_email')) {
        console.log('   ✅ idx_admins_email exists');
      } else {
        console.log('   ⚠️  idx_admins_email not found');
      }
      
      if (foundIndexes.includes('idx_organizations_is_active')) {
        console.log('   ✅ idx_organizations_is_active exists\n');
      } else {
        console.log('   ⚠️  idx_organizations_is_active not found\n');
      }
    } catch (error) {
      console.log('   ⚠️  Error checking indexes:', error.message, '\n');
    }

    // Final summary
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (allChecksPass) {
      console.log('✅ MIGRATION VERIFIED SUCCESSFULLY!');
      console.log('\n📋 Next Steps:');
      console.log('   1. Run: node backend/database/scripts/setup_admin.js');
      console.log('   2. Login with:');
      console.log('      Email: admin@therapytracker.com');
      console.log('      Password: Admin@123');
    } else {
      console.log('❌ MIGRATION NOT COMPLETE OR HAS ISSUES');
      console.log('\n📋 Action Required:');
      console.log('   Run the migration:');
      console.log('   psql -U postgres -d therapy_tracker -f backend/database/migrations/add_admin_support.sql');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error during verification:', error);
  } finally {
    process.exit(0);
  }
}

// Run verification
verifyMigration();

