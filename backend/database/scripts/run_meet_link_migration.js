/**
 * Run the Google Meet migration from Node.js
 * This script executes the SQL migration to add meet_link column
 * Handles cases where daily_room_url may or may not exist
 */

const db = require('../../src/config/database');

async function runMigration() {
  console.log('🚀 Starting Google Meet migration...');
  
  try {
    // Check current schema state
    const columnCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'video_sessions' 
      AND column_name IN ('daily_room_url', 'meet_link')
      ORDER BY column_name
    `);
    
    const existingColumns = columnCheck.rows.map(row => row.column_name);
    const hasDailyRoomUrl = existingColumns.includes('daily_room_url');
    const hasMeetLink = existingColumns.includes('meet_link');
    
    console.log(`📊 Current schema state:`, {
      daily_room_url: hasDailyRoomUrl ? 'exists' : 'not found',
      meet_link: hasMeetLink ? 'exists' : 'not found'
    });
    
    // Step 1: Add meet_link column if it doesn't exist
    if (!hasMeetLink) {
      console.log('⏳ Adding meet_link column...');
      await db.query(`
        ALTER TABLE video_sessions 
        ADD COLUMN IF NOT EXISTS meet_link VARCHAR(500)
      `);
      console.log('✅ meet_link column added');
    } else {
      console.log('ℹ️  meet_link column already exists, skipping...');
    }
    
    // Step 2: Copy data from daily_room_url if it exists
    if (hasDailyRoomUrl) {
      console.log('⏳ Copying data from daily_room_url to meet_link...');
      const updateResult = await db.query(`
        UPDATE video_sessions 
        SET meet_link = daily_room_url 
        WHERE daily_room_url IS NOT NULL 
        AND meet_link IS NULL
      `);
      console.log(`✅ Data copied: ${updateResult.rowCount} rows updated`);
      
      // Step 3: Drop daily_room_url column
      console.log('⏳ Dropping daily_room_url column...');
      await db.query(`
        ALTER TABLE video_sessions 
        DROP COLUMN IF EXISTS daily_room_url
      `);
      console.log('✅ daily_room_url column dropped');
    } else {
      console.log('ℹ️  daily_room_url column not found, skipping data copy and drop...');
    }
    
    // Step 4: Add index for better performance
    console.log('⏳ Creating index on meet_link...');
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_video_sessions_meet_link 
      ON video_sessions(meet_link)
    `);
    console.log('✅ Index created on meet_link');
    
    // Step 5: Update comments
    console.log('⏳ Updating column comments...');
    await db.query(`
      COMMENT ON COLUMN video_sessions.meet_link IS 'Google Meet link for the video session, generated via Google Calendar API'
    `);
    console.log('✅ Column comments updated');
    
    console.log('🎉 Google Meet migration completed successfully!');
    
    // Verify the migration
    await verifyMigration();
    
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

async function verifyMigration() {
  console.log('\n🔍 Verifying migration...');
  
  try {
    // Check if meet_link column exists
    const meetLinkCheck = await db.query(`
      SELECT column_name, data_type, character_maximum_length
      FROM information_schema.columns 
      WHERE table_name = 'video_sessions' 
      AND column_name = 'meet_link'
    `);
    
    if (meetLinkCheck.rows.length > 0) {
      const columnInfo = meetLinkCheck.rows[0];
      console.log('✅ meet_link column exists:', {
        type: columnInfo.data_type,
        max_length: columnInfo.character_maximum_length
      });
    } else {
      console.log('❌ meet_link column not found');
    }
    
    // Check if daily_room_url column was dropped
    const dailyUrlCheck = await db.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'video_sessions' 
      AND column_name = 'daily_room_url'
    `);
    
    if (dailyUrlCheck.rows.length === 0) {
      console.log('✅ daily_room_url column was successfully dropped');
    } else {
      console.log('ℹ️  daily_room_url column still exists (migration skipped this step)');
    }
    
    // Check index
    const indexCheck = await db.query(`
      SELECT indexname 
      FROM pg_indexes 
      WHERE tablename = 'video_sessions' 
      AND indexname = 'idx_video_sessions_meet_link'
    `);
    
    if (indexCheck.rows.length > 0) {
      console.log('✅ Index idx_video_sessions_meet_link exists');
    } else {
      console.log('❌ Index idx_video_sessions_meet_link not found');
    }
    
    // Show sample data
    const sampleData = await db.query(`
      SELECT 
        id,
        title,
        meeting_room_id,
        meet_link,
        google_event_id,
        session_date
      FROM video_sessions 
      WHERE meet_link IS NOT NULL 
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (sampleData.rows.length > 0) {
      console.log(`📊 Found ${sampleData.rows.length} video sessions with meet_link:`);
      sampleData.rows.forEach(row => {
        console.log(`  - Session ${row.id}: ${row.title}`);
        console.log(`    Meet Link: ${row.meet_link}`);
      });
    } else {
      console.log('ℹ️  No video sessions with meet_link found yet (this is normal for new installations)');
    }
    
    // Show total count
    const countResult = await db.query(`
      SELECT 
        COUNT(*) as total_sessions,
        COUNT(meet_link) as sessions_with_meet_link
      FROM video_sessions
    `);
    
    const stats = countResult.rows[0];
    console.log(`📈 Statistics: ${stats.sessions_with_meet_link}/${stats.total_sessions} sessions have meet_link`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  }
}

// Run the migration
if (require.main === module) {
  runMigration().then(() => {
    console.log('\n🎉 Migration process completed successfully!');
    process.exit(0);
  }).catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { runMigration };