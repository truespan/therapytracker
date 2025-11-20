/**
 * Test Admin Endpoint
 * Tests if the admin API endpoint is working
 */

const axios = require('axios');

async function testAdminEndpoint() {
  try {
    console.log('🧪 Testing Admin Login and API...\n');

    // Step 1: Login as admin
    console.log('1️⃣  Attempting admin login...');
    const loginResponse = await axios.post('http://localhost:5000/api/auth/login', {
      email: 'admin@therapytracker.com',
      password: 'Admin@123'
    });

    console.log('✅ Login successful!');
    console.log('   User Type:', loginResponse.data.user.userType);
    console.log('   User Name:', loginResponse.data.user.name);
    
    const token = loginResponse.data.token;
    console.log('   Token:', token.substring(0, 50) + '...\n');

    // Step 2: Test getAllOrganizations endpoint
    console.log('2️⃣  Testing GET /api/admin/organizations...');
    const orgsResponse = await axios.get('http://localhost:5000/api/admin/organizations', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Organizations fetched successfully!');
    console.log('   Count:', orgsResponse.data.organizations.length);
    console.log('   Organizations:');
    orgsResponse.data.organizations.forEach(org => {
      console.log(`   - ${org.name} (${org.email}) - Partners: ${org.total_partners}, Clients: ${org.total_clients}`);
    });
    console.log('');

    // Step 3: Test getDashboardStats endpoint
    console.log('3️⃣  Testing GET /api/admin/dashboard/stats...');
    const statsResponse = await axios.get('http://localhost:5000/api/admin/dashboard/stats', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    console.log('✅ Dashboard stats fetched successfully!');
    console.log('   Stats:', JSON.stringify(statsResponse.data.stats, null, 2));

    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ ALL TESTS PASSED!');
    console.log('   The admin endpoints are working correctly.');
    console.log('   The issue might be in the frontend.');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Error:', error.response.data);
    } else if (error.code === 'ECONNREFUSED') {
      console.error('   Backend server is not running!');
      console.error('   Please start it with: cd backend && npm start');
    } else {
      console.error('   Error:', error.message);
    }
    console.error('');
  }
}

testAdminEndpoint();


