// Test script to verify phone login functionality
const db = require('./src/config/database');

async function testPhoneLogin() {
  try {
    console.log('=== Testing Phone Login Functionality ===\n');
    
    const email = 'chayasks@gmail.com';
    const phone1 = '7996336719';
    const phone2 = '+917996336719';
    
    // 1. Check if partner exists
    console.log('1. Checking partner record...');
    const partnerQuery = 'SELECT id, name, email, contact FROM partners WHERE email = $1';
    const partnerResult = await db.query(partnerQuery, [email]);
    
    if (partnerResult.rows.length === 0) {
      console.log('❌ Partner not found with email:', email);
      return;
    }
    
    const partner = partnerResult.rows[0];
    console.log('✅ Partner found:');
    console.log('   ID:', partner.id);
    console.log('   Name:', partner.name);
    console.log('   Email:', partner.email);
    console.log('   Contact:', partner.contact);
    console.log('');
    
    // 2. Check auth credentials
    console.log('2. Checking auth credentials...');
    const authQuery = 'SELECT id, user_type, reference_id, email FROM auth_credentials WHERE email = $1';
    const authResult = await db.query(authQuery, [email]);
    
    if (authResult.rows.length === 0) {
      console.log('❌ Auth credentials not found');
      return;
    }
    
    console.log('✅ Auth credentials found:');
    console.log('   Auth ID:', authResult.rows[0].id);
    console.log('   User Type:', authResult.rows[0].user_type);
    console.log('   Reference ID:', authResult.rows[0].reference_id);
    console.log('');
    
    // 3. Test phone number searches
    console.log('3. Testing phone number searches...');
    
    // Test with phone without country code
    console.log(`\n   Testing with: ${phone1}`);
    const query1 = `
      SELECT DISTINCT ac.* FROM auth_credentials ac
      WHERE (
        (ac.user_type = 'partner' AND ac.reference_id IN (
          SELECT id FROM partners WHERE contact = $1 OR contact = $2
        ))
      )
      LIMIT 1
    `;
    const result1 = await db.query(query1, [phone1, `+91${phone1}`]);
    console.log(`   Result: ${result1.rows.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (result1.rows.length > 0) {
      console.log('   Auth ID:', result1.rows[0].id);
    }
    
    // Test with phone with country code
    console.log(`\n   Testing with: ${phone2}`);
    const result2 = await db.query(query1, [phone2, phone2]);
    console.log(`   Result: ${result2.rows.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    if (result2.rows.length > 0) {
      console.log('   Auth ID:', result2.rows[0].id);
    }
    
    // 4. Direct contact match test
    console.log('\n4. Testing direct contact matches...');
    const directQuery = 'SELECT id, name, contact FROM partners WHERE contact = $1';
    
    console.log(`\n   Searching for contact = "${phone1}"`);
    const direct1 = await db.query(directQuery, [phone1]);
    console.log(`   Result: ${direct1.rows.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    console.log(`\n   Searching for contact = "${phone2}"`);
    const direct2 = await db.query(directQuery, [phone2]);
    console.log(`   Result: ${direct2.rows.length > 0 ? '✅ FOUND' : '❌ NOT FOUND'}`);
    
    console.log('\n=== Test Complete ===');
    
  } catch (error) {
    console.error('Error during test:', error);
  } finally {
    await db.end();
  }
}

testPhoneLogin();














