/**
 * Test Node.js timezone handling
 */

// Load .env file to pick up TZ environment variable
require('dotenv').config();

console.log('\n=== Node.js Timezone Info ===\n');

console.log('1. Process environment:');
console.log('   TZ env var:', process.env.TZ || 'not set');
console.log('   NODE_ENV:', process.env.NODE_ENV);

console.log('\n2. JavaScript Date behavior:');
const testDate = new Date('2024-12-19T09:00:00.000Z');
console.log('   Input: 2024-12-19T09:00:00.000Z');
console.log('   toISOString():', testDate.toISOString());
console.log('   toString():', testDate.toString());
console.log('   toLocaleString():', testDate.toLocaleString());
console.log('   getTimezoneOffset() minutes:', testDate.getTimezoneOffset());
console.log('   getTimezoneOffset() hours:', testDate.getTimezoneOffset() / 60);

console.log('\n3. Intl API timezone:');
console.log('   Resolved timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);

console.log('\n4. Date object internal values:');
console.log('   getTime() (milliseconds since epoch):', testDate.getTime());
console.log('   valueOf():', testDate.valueOf());

console.log('\n=== Test Complete ===\n');
console.log('If getTimezoneOffset() is -330 (negative 5.5 hours),');
console.log('then the system timezone is IST/Asia/Kolkata.');
