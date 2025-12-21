const pool = require('./src/config/database');

async function diagnoseMeetLinkIssue() {
  try {
    console.log('=== Diagnosing Meet Link Issue ===\n');
    
    // 1. Check database schema
    console.log('1. Checking video_sessions table schema...');
    const schemaResult = await pool.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns 
      WHERE table_name = 'video_sessions'
      ORDER BY ordinal_position
    `);
    
    const hasMeetLink = schemaResult.rows.some(col => col.column_name === 'meet_link');
    const hasGoogleEventId = schemaResult.rows.some(col => col.column_name === 'google_event_id');
    const hasSyncStatus = schemaResult.rows.some(col => col.column_name === 'google_sync_status');
    
    console.log('   - meet_link column exists:', hasMeetLink);
    console.log('   - google_event_id column exists:', hasGoogleEventId);
    console.log('   - google_sync_status column exists:', hasSyncStatus);
    
    if (!hasMeetLink) {
      console.log('   ❌ ERROR: meet_link column is missing!');
    }
    
    // 2. Check recent video sessions
    console.log('\n2. Checking recent video sessions...');
    const sessionsResult = await pool.query(`
      SELECT 
        vs.id,
        vs.title,
        vs.partner_id,
        vs.meet_link,
        vs.google_event_id,
        vs.google_sync_status,
        vs.session_date,
        p.name as partner_name
      FROM video_sessions vs
      JOIN partners p ON vs.partner_id = p.id
      ORDER BY vs.created_at DESC 
      LIMIT 10
    `);
    
    if (sessionsResult.rows.length === 0) {
      console.log('   No video sessions found');
    } else {
      sessionsResult.rows.forEach(session => {
        console.log(`   Session ID ${session.id}: ${session.title}`);
        console.log(`   - Partner: ${session.partner_name} (ID: ${session.partner_id})`);
        console.log(`   - Meet Link: ${session.meet_link || 'NULL'}`);
        console.log(`   - Google Event ID: ${session.google_event_id || 'NULL'}`);
        console.log(`   - Sync Status: ${session.google_sync_status || 'NULL'}`);
        console.log('');
      });
    }
    
    // 3. Check Google Calendar tokens for partners with recent sessions
    console.log('3. Checking Google Calendar connections...');
    if (sessionsResult.rows.length > 0) {
      const partnerIds = [...new Set(sessionsResult.rows.map(s => s.partner_id))];
      
      const tokensResult = await pool.query(`
        SELECT 
          user_id,
          sync_enabled,
          connected_at,
          token_expires_at
        FROM google_calendar_tokens 
        WHERE user_type = 'partner' 
        AND user_id = ANY($1::int[])
      `, [partnerIds]);
      
      const tokenMap = new Map(tokensResult.rows.map(t => [t.user_id, t]));
      
      partnerIds.forEach(partnerId => {
        const token = tokenMap.get(partnerId);
        if (token) {
          console.log(`   Partner ${partnerId}: Connected=${token.sync_enabled}, Expires: ${token.token_expires_at}`);
        } else {
          console.log(`   Partner ${partnerId}: ❌ NO GOOGLE CALENDAR CONNECTION`);
        }
      });
    }
    
    // 4. Check for sync errors
    console.log('\n4. Checking for sync errors...');
    const errorsResult = await pool.query(`
      SELECT 
        id,
        title,
        google_sync_status,
        google_sync_error,
        partner_id
      FROM video_sessions 
      WHERE google_sync_status = 'failed'
      ORDER BY created_at DESC 
      LIMIT 5
    `);
    
    if (errorsResult.rows.length > 0) {
      errorsResult.rows.forEach(error => {
        console.log(`   Session ${error.id}: ${error.google_sync_error}`);
      });
    } else {
      console.log('   No sync errors found');
    }
    
    console.log('\n=== Diagnosis Complete ===');
    
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

diagnoseMeetLinkIssue()
  .then(() => {
    console.log('Diagnostic completed successfully');
    process.exit(0);
  })
  .catch(err => {
    console.error('Diagnostic failed:', err);
    process.exit(1);
  });