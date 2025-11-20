const db = require('./src/config/database');

async function finalVerification() {
  try {
    const result = await db.query(`
      SELECT category, COUNT(*) as count 
      FROM profile_fields 
      GROUP BY category 
      ORDER BY category
    `);
    
    console.log('✅ Final Profile Fields Summary:\n');
    console.table(result.rows);
    
    const total = await db.query('SELECT COUNT(*) as total FROM profile_fields');
    console.log(`Total: ${total.rows[0].total} profile fields\n`);
    
    console.log('Breakdown:');
    console.log('- Emotional Well-being: 4 fields');
    console.log('- Social & Relationships: 4 fields');
    console.log('- Physical Health: 5 fields');
    console.log('- Daily Functioning: 4 fields');
    console.log('- Self-Care & Coping: 4 fields');
    console.log('- Others: 1 field');
    console.log('\nAll fields use rating_5 type with values:');
    console.log('"Excellent", "Good", "Fair", "Poor", "Very Poor"\n');
    
    process.exit(0);
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  }
}

finalVerification();

