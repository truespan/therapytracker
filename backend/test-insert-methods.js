const db = require('./src/config/database');

async function testInserts() {
  try {
    console.log('\n=== Testing Different INSERT Methods ===\n');

    // Get a test partner and user
    const partner = await db.query('SELECT id FROM partners LIMIT 1');
    const user = await db.query('SELECT id FROM users LIMIT 1');

    if (!partner.rows[0] || !user.rows[0]) {
      console.error('Need at least one partner and one user in database');
      return;
    }

    const partnerId = partner.rows[0].id;
    const userId = user.rows[0].id;
    const testISO = '2024-12-19T09:00:00.000Z';

    console.log('Test ISO string:', testISO);
    console.log('Partner ID:', partnerId);
    console.log('User ID:', userId);

    // Method 1: Direct SQL with inline value
    console.log('\n1. INSERT with inline ISO string:');
    const result1 = await db.query(`
      INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, timezone)
      VALUES (${partnerId}, ${userId}, 'Test 1 - Inline', '${testISO}'::timestamptz, '${testISO}'::timestamptz + interval '1 hour', 60, 'Asia/Kolkata')
      RETURNING id, appointment_date
    `);
    console.log('   Stored as:', result1.rows[0].appointment_date);

    // Method 2: Parameterized query with $1 placeholder
    console.log('\n2. INSERT with parameterized query ($1):');
    const result2 = await db.query(`
      INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, timezone)
      VALUES ($1, $2, 'Test 2 - Parameterized', $3, $3::timestamptz + interval '1 hour', 60, 'Asia/Kolkata')
      RETURNING id, appointment_date
    `, [partnerId, userId, testISO]);
    console.log('   Stored as:', result2.rows[0].appointment_date);

    // Method 3: Parameterized with explicit cast
    console.log('\n3. INSERT with parameterized + explicit timestamptz cast:');
    const result3 = await db.query(`
      INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, timezone)
      VALUES ($1, $2, 'Test 3 - Param+Cast', $3::timestamptz, $3::timestamptz + interval '1 hour', 60, 'Asia/Kolkata')
      RETURNING id, appointment_date
    `, [partnerId, userId, testISO]);
    console.log('   Stored as:', result3.rows[0].appointment_date);

    // Method 4: Using JavaScript Date object
    console.log('\n4. INSERT with JavaScript Date object:');
    const jsDate = new Date(testISO);
    const result4 = await db.query(`
      INSERT INTO appointments (partner_id, user_id, title, appointment_date, end_date, duration_minutes, timezone)
      VALUES ($1, $2, 'Test 4 - JS Date', $3, $3::timestamptz + interval '1 hour', 60, 'Asia/Kolkata')
      RETURNING id, appointment_date
    `, [partnerId, userId, jsDate]);
    console.log('   JS Date input:', jsDate.toISOString());
    console.log('   Stored as:', result4.rows[0].appointment_date);

    // Cleanup
    console.log('\n5. Cleaning up test appointments...');
    await db.query('DELETE FROM appointments WHERE title LIKE \'Test % - %\'');
    console.log('   Cleaned up.');

    console.log('\n=== Test Complete ===\n');
    console.log('Expected: All methods should store as 2024-12-19T09:00:00.000Z');
    console.log('If any method shows 2024-12-19T03:30:00.000Z, that method has a bug.');

  } catch (error) {
    console.error('\nError:', error.message);
    console.error(error.stack);
  } finally {
    await db.end();
  }
}

testInserts();
