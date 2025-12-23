#!/usr/bin/env node

const { Client } = require('pg');
require('dotenv').config();

async function runMigration() {
  console.log('🚀 Starting Google OAuth Migration...\n');
  
  const client = new Client({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/therapy_tracker'
  });
  
  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    
    // Check current schema
    console.log('📋 Checking current schema...');
    const checkResult = await client.query(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'auth_credentials' 
      AND column_name IN ('google_id', 'is_google_user', 'password_hash')
    `);
    
    console.log('Current columns found:', checkResult.rows.length);
    checkResult.rows.forEach(row => {
      console.log(`  - ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
    });
    
    if (checkResult.rows.length < 3) {
      console.log('\n🔧 Applying migration...\n');
      
      // Add google_id column
      try {
        await client.query(`ALTER TABLE auth_credentials ADD COLUMN google_id VARCHAR(255)`);
        console.log('✅ Added google_id column');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('⚠️  google_id column already exists');
        } else {
          throw err;
        }
      }
      
      // Add is_google_user column
      try {
        await client.query(`ALTER TABLE auth_credentials ADD COLUMN is_google_user BOOLEAN DEFAULT FALSE`);
        console.log('✅ Added is_google_user column');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('⚠️  is_google_user column already exists');
        } else {
          throw err;
        }
      }
      
      // Make password_hash nullable
      try {
        await client.query(`ALTER TABLE auth_credentials ALTER COLUMN password_hash DROP NOT NULL`);
        console.log('✅ Made password_hash nullable');
      } catch (err) {
        console.log('⚠️  Could not modify password_hash:', err.message);
      }
      
      // Create index
      try {
        await client.query(`CREATE INDEX idx_auth_credentials_google_id ON auth_credentials(google_id) WHERE google_id IS NOT NULL`);
        console.log('✅ Created index on google_id');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('⚠️  Index already exists');
        } else {
          throw err;
        }
      }
      
      // Add unique constraint
      try {
        await client.query(`ALTER TABLE auth_credentials ADD CONSTRAINT auth_credentials_google_id_unique UNIQUE (google_id)`);
        console.log('✅ Added unique constraint on google_id');
      } catch (err) {
        if (err.message.includes('already exists')) {
          console.log('⚠️  Unique constraint already exists');
        } else {
          throw err;
        }
      }
      
      console.log('\n🎉 Migration completed successfully!');
      
      // Verify final state
      const verifyResult = await client.query(`
        SELECT column_name, data_type, is_nullable 
        FROM information_schema.columns 
        WHERE table_name = 'auth_credentials' 
        AND column_name IN ('google_id', 'is_google_user', 'password_hash')
      `);
      
      console.log('\n📊 Final schema:');
      verifyResult.rows.forEach(row => {
        console.log(`  ✅ ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });
      
    } else {
      console.log('\n✅ Migration already applied. All columns present.');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    console.error('Stack:', error.stack);
    process.exit(1);
  } finally {
    await client.end();
    console.log('\n👋 Database connection closed.');
  }
}

runMigration();