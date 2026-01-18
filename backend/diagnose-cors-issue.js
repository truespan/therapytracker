/**
 * CORS Diagnostic Script
 * 
 * This script tests CORS configuration by making requests to your backend
 * and checking the response headers.
 * 
 * Usage: node diagnose-cors-issue.js
 */

const https = require('https');

const BACKEND_URL = 'therapytracker-backend.onrender.com';
const FRONTEND_ORIGIN = 'https://www.theraptrack.com';
const TEST_ENDPOINTS = [
  '/api/partners/54/fee-settings',
  '/api/earnings/summary',
  '/'
];

console.log('='.repeat(80));
console.log('CORS DIAGNOSTIC TOOL');
console.log('='.repeat(80));
console.log(`Backend: https://${BACKEND_URL}`);
console.log(`Frontend Origin: ${FRONTEND_ORIGIN}`);
console.log('='.repeat(80));
console.log();

/**
 * Make an OPTIONS request (preflight) to test CORS
 */
function testCORS(endpoint) {
  return new Promise((resolve) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Testing: ${endpoint}`);
    console.log('─'.repeat(80));

    const options = {
      hostname: BACKEND_URL,
      port: 443,
      path: endpoint,
      method: 'OPTIONS',
      headers: {
        'Origin': FRONTEND_ORIGIN,
        'Access-Control-Request-Method': 'GET',
        'Access-Control-Request-Headers': 'content-type,authorization'
      }
    };

    const req = https.request(options, (res) => {
      console.log(`\n✓ Response Status: ${res.statusCode} ${res.statusMessage}`);
      console.log('\nResponse Headers:');
      console.log('─'.repeat(40));
      
      const corsHeaders = {};
      Object.keys(res.headers).forEach(header => {
        if (header.toLowerCase().includes('access-control') || 
            header.toLowerCase().includes('origin') ||
            header.toLowerCase() === 'vary') {
          corsHeaders[header] = res.headers[header];
          console.log(`  ${header}: ${res.headers[header]}`);
        }
      });

      // Check for required CORS headers
      console.log('\nCORS Header Analysis:');
      console.log('─'.repeat(40));
      
      const hasAllowOrigin = res.headers['access-control-allow-origin'];
      const hasAllowMethods = res.headers['access-control-allow-methods'];
      const hasAllowHeaders = res.headers['access-control-allow-headers'];
      const hasAllowCredentials = res.headers['access-control-allow-credentials'];

      if (hasAllowOrigin) {
        console.log(`  ✓ Access-Control-Allow-Origin: ${hasAllowOrigin}`);
        if (hasAllowOrigin === FRONTEND_ORIGIN || hasAllowOrigin === '*') {
          console.log('    → Origin is allowed ✓');
        } else {
          console.log(`    → WARNING: Origin mismatch! Expected ${FRONTEND_ORIGIN}`);
        }
      } else {
        console.log('  ✗ Access-Control-Allow-Origin: MISSING');
        console.log('    → This is the main issue! Backend is not sending this header.');
      }

      if (hasAllowMethods) {
        console.log(`  ✓ Access-Control-Allow-Methods: ${hasAllowMethods}`);
      } else {
        console.log('  ✗ Access-Control-Allow-Methods: MISSING');
      }

      if (hasAllowHeaders) {
        console.log(`  ✓ Access-Control-Allow-Headers: ${hasAllowHeaders}`);
      } else {
        console.log('  ✗ Access-Control-Allow-Headers: MISSING');
      }

      if (hasAllowCredentials) {
        console.log(`  ✓ Access-Control-Allow-Credentials: ${hasAllowCredentials}`);
      } else {
        console.log('  ⚠ Access-Control-Allow-Credentials: Not set (may be optional)');
      }

      // Overall assessment
      console.log('\nOverall Assessment:');
      console.log('─'.repeat(40));
      if (hasAllowOrigin && hasAllowMethods && hasAllowHeaders) {
        console.log('  ✓ CORS is properly configured for this endpoint');
      } else {
        console.log('  ✗ CORS configuration is incomplete or missing');
        console.log('\nPossible Issues:');
        if (!hasAllowOrigin) {
          console.log('  1. Backend CORS middleware is not running');
          console.log('  2. Origin is not in the allowed list');
          console.log('  3. CORS middleware is not handling OPTIONS requests');
        }
      }

      resolve({
        endpoint,
        status: res.statusCode,
        hasAllowOrigin,
        corsHeaders
      });
    });

    req.on('error', (error) => {
      console.log(`\n✗ Request failed: ${error.message}`);
      resolve({
        endpoint,
        error: error.message
      });
    });

    req.end();
  });
}

/**
 * Test a regular GET request
 */
function testGETRequest(endpoint) {
  return new Promise((resolve) => {
    console.log(`\n${'─'.repeat(80)}`);
    console.log(`Testing GET Request: ${endpoint}`);
    console.log('─'.repeat(80));

    const options = {
      hostname: BACKEND_URL,
      port: 443,
      path: endpoint,
      method: 'GET',
      headers: {
        'Origin': FRONTEND_ORIGIN
      }
    };

    const req = https.request(options, (res) => {
      console.log(`\n✓ Response Status: ${res.statusCode} ${res.statusMessage}`);
      
      const allowOrigin = res.headers['access-control-allow-origin'];
      if (allowOrigin) {
        console.log(`  ✓ Access-Control-Allow-Origin: ${allowOrigin}`);
      } else {
        console.log('  ✗ Access-Control-Allow-Origin: MISSING');
      }

      resolve({
        endpoint,
        status: res.statusCode,
        hasAllowOrigin: !!allowOrigin
      });
    });

    req.on('error', (error) => {
      console.log(`\n✗ Request failed: ${error.message}`);
      resolve({
        endpoint,
        error: error.message
      });
    });

    req.end();
  });
}

/**
 * Check environment configuration
 */
async function checkEnvironment() {
  console.log('\n' + '='.repeat(80));
  console.log('ENVIRONMENT CHECK');
  console.log('='.repeat(80));
  
  // Try to get the root endpoint to see server info
  return new Promise((resolve) => {
    const options = {
      hostname: BACKEND_URL,
      port: 443,
      path: '/',
      method: 'GET'
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          console.log('\nServer Info:');
          console.log('─'.repeat(40));
          console.log(`  Message: ${json.message || 'N/A'}`);
          console.log(`  Version: ${json.version || 'N/A'}`);
        } catch (e) {
          console.log('  Could not parse server info');
        }
        resolve();
      });
    });

    req.on('error', () => {
      console.log('  Could not connect to server');
      resolve();
    });

    req.end();
  });
}

/**
 * Main diagnostic function
 */
async function runDiagnostics() {
  await checkEnvironment();

  console.log('\n' + '='.repeat(80));
  console.log('TESTING CORS PREFLIGHT (OPTIONS) REQUESTS');
  console.log('='.repeat(80));

  const results = [];
  
  for (const endpoint of TEST_ENDPOINTS) {
    const result = await testCORS(endpoint);
    results.push(result);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between requests
  }

  console.log('\n' + '='.repeat(80));
  console.log('TESTING REGULAR GET REQUESTS');
  console.log('='.repeat(80));

  for (const endpoint of TEST_ENDPOINTS) {
    await testGETRequest(endpoint);
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1s between requests
  }

  // Summary
  console.log('\n' + '='.repeat(80));
  console.log('DIAGNOSTIC SUMMARY');
  console.log('='.repeat(80));
  
  const failedEndpoints = results.filter(r => !r.hasAllowOrigin && !r.error);
  const errorEndpoints = results.filter(r => r.error);
  
  if (failedEndpoints.length === 0 && errorEndpoints.length === 0) {
    console.log('\n✓ All endpoints have proper CORS headers!');
    console.log('\nIf you\'re still seeing CORS errors in the browser:');
    console.log('  1. Clear browser cache and hard reload (Ctrl+Shift+R)');
    console.log('  2. Check browser console for the exact failing request');
    console.log('  3. Verify the frontend is using the correct API URL');
  } else {
    console.log('\n✗ CORS Issues Detected:');
    console.log('─'.repeat(40));
    
    if (failedEndpoints.length > 0) {
      console.log('\nEndpoints missing CORS headers:');
      failedEndpoints.forEach(r => console.log(`  - ${r.endpoint}`));
    }
    
    if (errorEndpoints.length > 0) {
      console.log('\nEndpoints with connection errors:');
      errorEndpoints.forEach(r => console.log(`  - ${r.endpoint}: ${r.error}`));
    }

    console.log('\nRecommended Actions:');
    console.log('─'.repeat(40));
    console.log('1. Check Render logs for CORS warnings');
    console.log('2. Verify CORS_ORIGINS environment variable in Render:');
    console.log(`   Should include: ${FRONTEND_ORIGIN}`);
    console.log('3. Ensure the latest code is deployed to Render');
    console.log('4. Check if there are any middleware conflicts in server.js');
    console.log('5. Verify the server is actually running the updated code');
  }

  console.log('\n' + '='.repeat(80));
  console.log('NEXT STEPS');
  console.log('='.repeat(80));
  console.log('\n1. Check Render Dashboard Logs:');
  console.log('   - Go to https://dashboard.render.com');
  console.log('   - Select your backend service');
  console.log('   - Click "Logs" tab');
  console.log('   - Look for CORS-related messages');
  console.log('\n2. Verify Environment Variables:');
  console.log('   - Go to "Environment" tab in Render');
  console.log('   - Check CORS_ORIGINS value');
  console.log(`   - Should be: ${FRONTEND_ORIGIN}`);
  console.log('\n3. If CORS headers are present but browser still blocks:');
  console.log('   - The issue might be in the frontend API configuration');
  console.log('   - Check if credentials/withCredentials is properly set');
  console.log('\n' + '='.repeat(80));
}

// Run diagnostics
runDiagnostics().catch(console.error);
