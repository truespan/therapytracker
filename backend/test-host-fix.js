const VideoSession = require('./src/models/VideoSession');
const Partner = require('./src/models/Partner');
const googleCalendarService = require('./src/services/googleCalendarService');

async function testHostFix() {
  console.log('🧪 Testing Google Meet Host Fix...\n');

  try {
    // Test 1: Check if we can fetch a video session
    console.log('📋 Test 1: Fetching video session...');
    const sessionId = 1; // Replace with an actual session ID from your DB
    const session = await VideoSession.findById(sessionId);
    
    if (!session) {
      console.log('❌ No video session found with ID:', sessionId);
      console.log('💡 Please provide a valid video session ID in the test script');
      return;
    }
    
    console.log('✅ Video session found:', session.title);
    console.log('   - Partner ID:', session.partner_id);
    console.log('   - User ID:', session.user_id);
    console.log('   - Meet Link:', session.meet_link || 'Not generated yet');
    console.log('   - Google Event ID:', session.google_event_id || 'Not synced yet');
    
    // Test 2: Check if we can fetch partner data
    console.log('\n👤 Test 2: Fetching partner data...');
    const partner = await Partner.findById(session.partner_id);
    
    if (!partner) {
      console.log('❌ Partner not found with ID:', session.partner_id);
      return;
    }
    
    console.log('✅ Partner found:', partner.name);
    console.log('   - Email:', partner.email);
    console.log('   - Partner ID:', partner.partner_id);
    
    // Test 3: Test event formatting with organizer
    console.log('\n📅 Test 3: Testing event formatting with organizer...');
    const eventData = {
      user_name: 'Test Client',
      title: session.title,
      session_date: session.session_date,
      end_date: session.end_date,
      notes: session.notes,
      meeting_room_id: session.meeting_room_id,
      meet_link: session.meet_link,
      password_enabled: session.password_enabled
    };
    
    const formattedEvent = googleCalendarService.formatEventData('video', eventData, partner.email);
    
    console.log('✅ Event formatted successfully');
    console.log('   - Has organizer:', !!formattedEvent.organizer);
    console.log('   - Organizer email:', formattedEvent.organizer?.email);
    console.log('   - Has creator:', !!formattedEvent.creator);
    console.log('   - Creator email:', formattedEvent.creator?.email);
    console.log('   - Has attendees:', !!formattedEvent.attendees);
    console.log('   - Attendees count:', formattedEvent.attendees?.length || 0);
    
    if (formattedEvent.attendees && formattedEvent.attendees.length > 0) {
      console.log('   - First attendee:', formattedEvent.attendees[0]);
    }
    
    // Test 4: Check Google Calendar connection
    console.log('\n🔌 Test 4: Checking Google Calendar connection...');
    const GoogleCalendarToken = require('./src/models/GoogleCalendarToken');
    const tokenRecord = await GoogleCalendarToken.findByUser('partner', session.partner_id);
    
    if (!tokenRecord) {
      console.log('⚠️  No Google Calendar token found for partner');
      console.log('💡 Partner needs to connect Google Calendar in settings');
    } else {
      console.log('✅ Google Calendar token found');
      console.log('   - Sync enabled:', tokenRecord.sync_enabled);
      console.log('   - Connected at:', tokenRecord.connected_at);
      
      if (!tokenRecord.sync_enabled) {
        console.log('⚠️  Sync is disabled - partner needs to enable it');
      }
    }
    
    // Test 5: Try to sync the session (if connected)
    if (tokenRecord && tokenRecord.sync_enabled) {
      console.log('\n🔄 Test 5: Testing video session sync...');
      try {
        const result = await googleCalendarService.syncVideoSessionToGoogle(sessionId);
        console.log('✅ Sync successful:', result);
        
        // Fetch updated session
        const updatedSession = await VideoSession.findById(sessionId);
        console.log('   - Updated Meet Link:', updatedSession.meet_link);
        console.log('   - Google Event ID:', updatedSession.google_event_id);
      } catch (syncError) {
        console.log('❌ Sync failed:', syncError.message);
        console.log('💡 Check if partner has proper Google Calendar permissions');
      }
    } else {
      console.log('\n⏭️  Test 5: Skipping sync test (no connection)');
    }
    
    console.log('\n🎉 Test completed!');
    console.log('\n📋 Summary:');
    console.log('   - The fix adds partner as organizer/creator in Google Calendar events');
    console.log('   - This should resolve the "waiting for host" issue');
    console.log('   - Partner needs to be connected to Google Calendar');
    console.log('   - Partner email is used to identify them as the meeting host');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testHostFix().catch(console.error);