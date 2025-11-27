/**
 * Migration script to fix subscription_plan constraint
 * This fixes the issue where empty subscription_plan values cause constraint violations
 */

const db = require('../../src/config/database');

async function fixSubscriptionPlanConstraint() {
  try {
    console.log('Starting subscription_plan constraint fix...\n');

    // Drop the existing constraint
    console.log('1. Dropping existing constraint...');
    await db.query(`
      ALTER TABLE organizations
      DROP CONSTRAINT IF EXISTS organizations_subscription_plan_check
    `);
    console.log('   ✓ Constraint dropped\n');

    // Add new constraint that allows NULL
    console.log('2. Adding new constraint (allows NULL)...');
    await db.query(`
      ALTER TABLE organizations
      ADD CONSTRAINT organizations_subscription_plan_check
      CHECK (subscription_plan IS NULL OR subscription_plan IN ('basic', 'silver', 'gold'))
    `);
    console.log('   ✓ New constraint added\n');

    // Update any existing empty string values to NULL
    console.log('3. Updating empty strings to NULL...');
    const updateResult = await db.query(`
      UPDATE organizations
      SET subscription_plan = NULL
      WHERE subscription_plan = ''
    `);
    console.log(`   ✓ Updated ${updateResult.rowCount} rows\n`);

    // Verify the fix
    console.log('4. Verifying organizations...');
    const verifyResult = await db.query(`
      SELECT
          id,
          name,
          subscription_plan
      FROM organizations
      ORDER BY id
    `);
    console.log('\nCurrent organizations:');
    verifyResult.rows.forEach(row => {
      console.log(`   - ID: ${row.id}, Name: ${row.name}, Plan: ${row.subscription_plan || '(none)'}`);
    });

    console.log('\n' + '='.repeat(60));
    console.log('Migration completed successfully!');
    console.log('='.repeat(60));

    process.exit(0);
  } catch (error) {
    console.error('Error during migration:', error);
    process.exit(1);
  }
}

// Run the migration
fixSubscriptionPlanConstraint();
