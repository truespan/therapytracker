const db = require('./backend/src/config/database');

async function checkToken(token) {
  try {
    console.log('Checking token:', token);
    
    // Check if token exists and is active
    const tokenQuery = `
      SELECT ost.*, o.name, o.theraptrack_controlled
      FROM organization_signup_tokens ost
      JOIN organizations o ON ost.organization_id = o.id
      WHERE ost.token = $1
    `;
    const tokenResult = await db.query(tokenQuery, [token]);
    
    if (tokenResult.rows.length === 0) {
      console.log('Token not found in database');
      return;
    }
    
    const tokenData = tokenResult.rows[0];
    console.log('Token found:');
    console.log('- Token:', tokenData.token);
    console.log('- Is active:', tokenData.is_active);
    console.log('- Created at:', tokenData.created_at);
    console.log('- Organization:', tokenData.name);
    console.log('- TheraPTrack controlled:', tokenData.theraptrack_controlled);
    
    // Check if organization is TheraPTrack controlled
    if (!tokenData.theraptrack_controlled) {
      console.log('ERROR: Organization is not TheraPTrack controlled. Tokens only work for TheraPTrack controlled organizations.');
    }
    
  } catch (error) {
    console.error('Error checking token:', error);
  } finally {
    process.exit(0);
  }
}

// Get token from command line argument
const token = process.argv[2];
if (!token) {
  console.log('Usage: node check_signup_token.js <token>');
  console.log('Example: node check_signup_token.js abc123...');
  process.exit(1);
}

checkToken(token);