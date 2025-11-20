// Script to generate bcrypt hash for admin password
const bcrypt = require('bcrypt');

const password = 'Admin@123';
const saltRounds = 10;

bcrypt.hash(password, saltRounds, (err, hash) => {
  if (err) {
    console.error('Error generating hash:', err);
    process.exit(1);
  }
  
  console.log('Password:', password);
  console.log('Bcrypt Hash:', hash);
  console.log('\nUse this hash in your admin_schema.sql file or run:');
  console.log(`UPDATE auth_credentials SET password_hash = '${hash}' WHERE email = 'admin@therapytracker.com';`);
  process.exit(0);
});

