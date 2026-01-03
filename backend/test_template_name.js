// Quick test to verify template configuration
require('dotenv').config();

console.log('=== WhatsApp Template Configuration ===\n');

console.log('Environment Variables:');
console.log('  WHATSAPP_TEMPLATE_LOCALE:', process.env.WHATSAPP_TEMPLATE_LOCALE || 'NOT SET');
console.log('  WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED:', process.env.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED || 'NOT SET');
console.log('  WHATSAPP_TEMPLATE_NAMESPACE:', process.env.WHATSAPP_TEMPLATE_NAMESPACE || 'NOT SET');

console.log('\n=== What to Check in WhatsApp Manager ===\n');
console.log('1. Go to: https://business.facebook.com/');
console.log('2. Navigate to: WhatsApp Manager > Message Templates');
console.log('3. Find your template and verify:');
console.log('   - Name EXACTLY matches:', process.env.WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED || 'theraptrack_appointment_is_booked');
console.log('   - Language is: English (US) - not just "English"');
console.log('   - Status is: Approved (green checkmark)');
console.log('   - Category is: UTILITY or MARKETING');
console.log('   - Has 6 parameters: {{1}}, {{2}}, {{3}}, {{4}}, {{5}}, {{6}}');

console.log('\n=== Common Issues ===\n');
console.log('❌ Template name has dashes instead of underscores');
console.log('❌ Template name has different capitalization');
console.log('❌ Template language is "English" not "English (US)"');
console.log('❌ Template is approved but disabled');
console.log('❌ Template has wrong number of parameters');
console.log('❌ WhatsApp Business number not fully verified');

console.log('\n=== Next Steps ===\n');
console.log('1. Copy the EXACT template name from WhatsApp Manager');
console.log('2. Update WHATSAPP_TEMPLATE_APPOINTMENT_BOOKED to match exactly');
console.log('3. Verify language is "English (US)"');
console.log('4. Restart application');

