// Quick script to check verification token in database
const { Pool } = require('pg');

const pool = new Pool({
  user: process.env.DB_USER || 'postgres',
  host: process.env.DB_HOST || 'localhost',
  database: process.env.DB_NAME || 'therapy_tracker',
  password: process.env.DB_PASSWORD || 'your_password',
  port: process.env.DB_PORT || 5432,
});

async function checkToken() {
  try {
    const result = await pool.query(
      "SELECT id, name, email, verification_token, verification_token_expires, email_verified FROM partners WHERE email = 'ubhayshankar22@gmail.com'"
    );

    if (result.rows.length === 0) {
      console.log('❌ Partner not found with that email');
    } else {
      const partner = result.rows[0];
      console.log('✓ Partner found:');
      console.log('  ID:', partner.id);
      console.log('  Name:', partner.name);
      console.log('  Email:', partner.email);
      console.log('  Email Verified:', partner.email_verified);
      console.log('  Verification Token:', partner.verification_token ? 'EXISTS' : '❌ NULL');
      console.log('  Token (first 20 chars):', partner.verification_token ? partner.verification_token.substring(0, 20) + '...' : 'N/A');
      console.log('  Token Expires:', partner.verification_token_expires);
      console.log('  Token Expired?:', partner.verification_token_expires ? (new Date(partner.verification_token_expires) < new Date() ? '❌ YES' : '✓ NO') : 'N/A');

      if (!partner.verification_token) {
        console.log('\n❌ ISSUE: verification_token is NULL - the token was not saved during partner creation');
      } else if (new Date(partner.verification_token_expires) < new Date()) {
        console.log('\n❌ ISSUE: Token has expired');
      } else {
        console.log('\n✓ Token looks good - should work for verification');
      }
    }

    await pool.end();
  } catch (error) {
    console.error('Error checking token:', error.message);
    await pool.end();
  }
}

checkToken();
