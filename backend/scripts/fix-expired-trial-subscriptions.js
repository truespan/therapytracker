/**
 * Script to check and fix expired trial subscriptions
 * 
 * This script:
 * 1. Finds all trial subscriptions (plan_duration_days > 0)
 * 2. Checks if subscription_end_date is NULL or incorrectly set
 * 3. Calculates correct end_date based on subscription_start_date + plan_duration_days
 * 4. Updates subscriptions with missing or incorrect end_dates
 * 5. Identifies expired trials that should be reverted to Free Plan
 */

const db = require('../src/config/database');

async function fixExpiredTrialSubscriptions() {
  // `backend/src/config/database.js` exports `getClient()` / `pool`, not `connect()`.
  // Use `getClient()` so the session timezone is enforced.
  const client = db.getClient ? await db.getClient() : await db.pool.connect();
  
  try {
    console.log('🔍 Starting trial subscription verification...\n');
    
    // Step 1: Find all trial subscriptions
    const trialSubsQuery = `
      SELECT 
        ps.id as subscription_id,
        ps.partner_id,
        p.email,
        p.name,
        ps.assigned_at,
        ps.subscription_start_date,
        ps.subscription_end_date,
        sp.plan_name,
        sp.plan_duration_days,
        CASE 
          WHEN ps.subscription_end_date IS NULL THEN 'NO_END_DATE'
          WHEN ps.subscription_end_date > CURRENT_TIMESTAMP THEN 'ACTIVE'
          ELSE 'EXPIRED'
        END as current_status,
        COALESCE(ps.subscription_start_date, ps.assigned_at) as calculated_start_date,
        CASE
          WHEN COALESCE(ps.subscription_start_date, ps.assigned_at) IS NOT NULL AND sp.plan_duration_days IS NOT NULL THEN
            COALESCE(ps.subscription_start_date, ps.assigned_at) + (sp.plan_duration_days || ' days')::INTERVAL
          ELSE NULL
        END as calculated_end_date
      FROM partner_subscriptions ps
      JOIN partners p ON p.id = ps.partner_id
      JOIN subscription_plans sp ON sp.id = ps.subscription_plan_id
      WHERE sp.plan_duration_days IS NOT NULL 
        AND sp.plan_duration_days > 0
      ORDER BY ps.subscription_start_date DESC
    `;
    
    const result = await client.query(trialSubsQuery);
    const trialSubs = result.rows;
    
    console.log(`📊 Found ${trialSubs.length} trial subscriptions\n`);
    
    if (trialSubs.length === 0) {
      console.log('✅ No trial subscriptions found. Nothing to fix.');
      return;
    }
    
    // Step 2: Categorize subscriptions
    const needsEndDate = [];
    const needsUpdate = [];
    const cannotCalculate = [];
    const expired = [];
    const active = [];
    
    for (const sub of trialSubs) {
      console.log(`\n📋 Partner: ${sub.email} (${sub.name})`);
      console.log(`   Plan: ${sub.plan_name} (${sub.plan_duration_days} days)`);
      console.log(`   Assigned At: ${sub.assigned_at}`);
      console.log(`   Start Date: ${sub.subscription_start_date}`);
      console.log(`   Current End Date: ${sub.subscription_end_date || 'NULL'}`);
      console.log(`   Calculated Start Date: ${sub.calculated_start_date}`);
      console.log(`   Calculated End Date: ${sub.calculated_end_date}`);
      console.log(`   Status: ${sub.current_status}`);
      
      // If we can't calculate an end date, don't "fix" it to NULL.
      if (!sub.calculated_end_date) {
        cannotCalculate.push(sub);
        console.log(`   ⚠️  ACTION NEEDED: Cannot calculate end_date (missing start date)`);
      } else if (!sub.subscription_end_date) {
        needsEndDate.push(sub);
        console.log(`   ⚠️  ACTION NEEDED: Missing end_date`);
      } else if (sub.subscription_end_date !== sub.calculated_end_date) {
        needsUpdate.push(sub);
        console.log(`   ⚠️  ACTION NEEDED: End date mismatch`);
      } else if (sub.current_status === 'EXPIRED') {
        expired.push(sub);
        console.log(`   ⏰ EXPIRED: Should be reverted to Free Plan`);
      } else {
        active.push(sub);
        console.log(`   ✅ ACTIVE: No action needed`);
      }
    }
    
    console.log('\n\n📊 SUMMARY:');
    console.log(`   Total trial subscriptions: ${trialSubs.length}`);
    console.log(`   Missing end_date: ${needsEndDate.length}`);
    console.log(`   Incorrect end_date: ${needsUpdate.length}`);
    console.log(`   Cannot calculate (missing start date): ${cannotCalculate.length}`);
    console.log(`   Expired trials: ${expired.length}`);
    console.log(`   Active trials: ${active.length}`);
    
    // Step 3: Fix subscriptions with missing or incorrect end_dates
    const toFix = [...needsEndDate, ...needsUpdate];
    
    if (toFix.length > 0) {
      console.log(`\n\n🔧 Fixing ${toFix.length} subscriptions...\n`);
      
      await client.query('BEGIN');
      
      for (const sub of toFix) {
        try {
          const updateQuery = `
            UPDATE partner_subscriptions
            SET subscription_start_date = COALESCE(subscription_start_date, $1),
                subscription_end_date = $2,
                updated_at = CURRENT_TIMESTAMP
            WHERE id = $3
            RETURNING *
          `;
          
          await client.query(updateQuery, [sub.calculated_start_date, sub.calculated_end_date, sub.subscription_id]);
          
          console.log(`✅ Fixed subscription for ${sub.email}`);
          console.log(`   Set start_date to: ${sub.calculated_start_date}`);
          console.log(`   Set end_date to: ${sub.calculated_end_date}`);
        } catch (err) {
          console.error(`❌ Failed to fix subscription for ${sub.email}:`, err.message);
        }
      }
      
      await client.query('COMMIT');
      console.log(`\n✅ Successfully fixed ${toFix.length} subscriptions`);
    }
    
    // Step 4: Report on expired trials
    if (expired.length > 0) {
      console.log(`\n\n⚠️  EXPIRED TRIALS (${expired.length}):`);
      console.log('These partners should be reverted to Free Plan:\n');
      
      for (const sub of expired) {
        console.log(`   - ${sub.email} (${sub.name})`);
        console.log(`     Plan: ${sub.plan_name}`);
        console.log(`     Expired on: ${sub.subscription_end_date || sub.calculated_end_date}`);
      }
      
      console.log('\n⚠️  NOTE: These users will be automatically blocked by the backend middleware');
      console.log('   and will be prompted to upgrade when they next log in.');
    }

    // Step 4b: Report rows we could not fix
    if (cannotCalculate.length > 0) {
      console.log(`\n\n⚠️  COULD NOT FIX (missing start date) (${cannotCalculate.length}):`);
      console.log('These trial subscriptions have no usable start date, so end_date cannot be computed:\n');
      for (const sub of cannotCalculate) {
        console.log(`   - ${sub.email} (${sub.name}) | subscription_id=${sub.subscription_id}`);
      }
    }
    
    // Step 5: Check specific partner if email provided
    const targetEmail = 'Binnavimg@gmail.com';
    const targetPartner = trialSubs.find(sub => sub.email.toLowerCase() === targetEmail.toLowerCase());
    
    if (targetPartner) {
      console.log(`\n\n🎯 SPECIFIC PARTNER CHECK: ${targetEmail}`);
      console.log(`   Plan: ${targetPartner.plan_name} (${targetPartner.plan_duration_days} days)`);
      console.log(`   Start Date: ${targetPartner.subscription_start_date}`);
      console.log(`   End Date: ${targetPartner.subscription_end_date || 'NULL'}`);
      console.log(`   Calculated End Date: ${targetPartner.calculated_end_date}`);
      console.log(`   Status: ${targetPartner.current_status}`);
      
      if (targetPartner.current_status === 'EXPIRED') {
        console.log(`\n   ⚠️  This partner's trial has EXPIRED.`);
        console.log(`   They should NOT be able to access the system.`);
        console.log(`   If they can still login, the backend middleware will now block them.`);
      } else if (targetPartner.current_status === 'NO_END_DATE') {
        console.log(`\n   ⚠️  This partner had NO end_date set - this has been FIXED.`);
        console.log(`   They will now be blocked after the trial expires.`);
      }
    } else {
      console.log(`\n\n🎯 SPECIFIC PARTNER CHECK: ${targetEmail}`);
      console.log(`   ❌ Partner not found in trial subscriptions.`);
      console.log(`   They may be on a different plan type.`);
    }
    
    console.log('\n\n✅ Trial subscription verification complete!');
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error fixing trial subscriptions:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the script
if (require.main === module) {
  fixExpiredTrialSubscriptions()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixExpiredTrialSubscriptions };
