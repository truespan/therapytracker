/**
 * Quick test to check if admin routes are accessible
 */

const http = require('http');

function testRoute(path, token = null) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: 5000,
      path: `/api${path}`,
      method: 'GET',
      headers: token ? { 'Authorization': `Bearer ${token}` } : {}
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({ status: res.statusCode, data: data.substring(0, 200) });
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.setTimeout(5000, () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Testing Admin Routes...\n');

  try {
    // Test 1: Health check
    console.log('1️⃣  Testing /api/health...');
    const health = await testRoute('/health');
    console.log(`   Status: ${health.status}`);
    if (health.status === 200) {
      console.log('   ✅ Backend is running\n');
    } else {
      console.log('   ❌ Backend health check failed\n');
    }

    // Test 2: Admin routes without token (should get 401)
    console.log('2️⃣  Testing /api/admin/organizations (no token)...');
    const noToken = await testRoute('/admin/organizations');
    console.log(`   Status: ${noToken.status}`);
    if (noToken.status === 401) {
      console.log('   ✅ Route exists, requires authentication\n');
    } else if (noToken.status === 404) {
      console.log('   ❌ Route NOT FOUND - Backend needs restart!\n');
    } else {
      console.log(`   ⚠️  Unexpected status: ${noToken.status}\n`);
    }

    // Test 3: Dashboard stats route
    console.log('3️⃣  Testing /api/admin/dashboard/stats (no token)...');
    const statsNoToken = await testRoute('/admin/dashboard/stats');
    console.log(`   Status: ${statsNoToken.status}`);
    if (statsNoToken.status === 401) {
      console.log('   ✅ Route exists, requires authentication\n');
    } else if (statsNoToken.status === 404) {
      console.log('   ❌ Route NOT FOUND - Backend needs restart!\n');
    } else {
      console.log(`   ⚠️  Unexpected status: ${statsNoToken.status}\n`);
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    if (noToken.status === 404 || statsNoToken.status === 404) {
      console.log('❌ ADMIN ROUTES NOT LOADED');
      console.log('\n📋 Action Required:');
      console.log('   1. Stop your backend server (Ctrl+C)');
      console.log('   2. Restart it: cd backend && npm start');
      console.log('   3. Wait for "Server running on port 5000"');
      console.log('   4. Try logging in again');
    } else if (noToken.status === 401 && statsNoToken.status === 401) {
      console.log('✅ ADMIN ROUTES ARE LOADED');
      console.log('\n📋 Next Step:');
      console.log('   The routes are working. Try logging in as admin.');
      console.log('   If still getting 404, check browser console for the exact URL.');
    }
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('\n❌ TEST FAILED!');
    if (error.code === 'ECONNREFUSED') {
      console.error('   Backend server is NOT running!');
      console.error('   Please start it with: cd backend && npm start');
    } else {
      console.error('   Error:', error.message);
    }
    console.error('');
  }
}

runTests();


