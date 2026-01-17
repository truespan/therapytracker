/**
 * Diagnostic script to check earnings records and their settlement status
 * Usage: node backend/scripts/diagnose-earnings-settlement.js [partner_id] [organization_id]
 */

const db = require('../src/config/database');
require('dotenv').config();

async function diagnoseEarningsSettlement(partnerId = null, organizationId = null) {
  try {
    console.log('='.repeat(80));
    console.log('EARNINGS SETTLEMENT DIAGNOSTIC TOOL');
    console.log('='.repeat(80));
    console.log('');

    // Get all earnings records with pending status
    let pendingQuery = `
      SELECT 
        id, recipient_id, recipient_type, razorpay_payment_id, 
        amount, status, created_at, updated_at, payout_date
      FROM earnings
      WHERE status = 'pending'
    `;
    const pendingParams = [];
    
    if (partnerId) {
      pendingQuery += ` AND recipient_id = $1 AND recipient_type = 'partner'`;
      pendingParams.push(partnerId);
    } else if (organizationId) {
      pendingQuery += ` AND recipient_id = $1 AND recipient_type = 'organization'`;
      pendingParams.push(organizationId);
    }
    
    pendingQuery += ` ORDER BY created_at DESC`;

    const pendingResult = await db.query(pendingQuery, pendingParams);
    const pendingEarnings = pendingResult.rows;

    console.log(`📊 FOUND ${pendingEarnings.length} PENDING EARNINGS RECORDS\n`);

    if (pendingEarnings.length > 0) {
      console.log('Pending Earnings Details:');
      console.log('-'.repeat(80));
      pendingEarnings.forEach((earnings, index) => {
        const ageInDays = Math.floor((new Date() - new Date(earnings.created_at)) / (1000 * 60 * 60 * 24));
        console.log(`\n${index + 1}. Earnings ID: ${earnings.id}`);
        console.log(`   Payment ID: ${earnings.razorpay_payment_id || 'N/A'}`);
        console.log(`   Recipient: ${earnings.recipient_type} #${earnings.recipient_id}`);
        console.log(`   Amount: ₹${parseFloat(earnings.amount).toFixed(2)}`);
        console.log(`   Status: ${earnings.status}`);
        console.log(`   Created: ${earnings.created_at} (${ageInDays} days ago)`);
        console.log(`   Updated: ${earnings.updated_at}`);
        
        if (ageInDays >= 2) {
          console.log(`   ⚠️  WARNING: This payment is ${ageInDays} days old and should have been settled by now.`);
        }
      });
    }

    // Get all earnings records with available status
    let availableQuery = `
      SELECT 
        id, recipient_id, recipient_type, razorpay_payment_id, 
        amount, status, created_at, updated_at, payout_date
      FROM earnings
      WHERE status = 'available'
    `;
    const availableParams = [];
    
    if (partnerId) {
      availableQuery += ` AND recipient_id = $1 AND recipient_type = 'partner'`;
      availableParams.push(partnerId);
    } else if (organizationId) {
      availableQuery += ` AND recipient_id = $1 AND recipient_type = 'organization'`;
      availableParams.push(organizationId);
    }
    
    availableQuery += ` ORDER BY created_at DESC LIMIT 20`;

    const availableResult = await db.query(availableQuery, availableParams);
    const availableEarnings = availableResult.rows;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`💰 FOUND ${availableResult.rowCount} AVAILABLE EARNINGS RECORDS (showing latest 20)\n`);

    if (availableEarnings.length > 0) {
      console.log('Available Earnings Summary:');
      const totalAvailable = availableEarnings.reduce((sum, e) => sum + parseFloat(e.amount), 0);
      console.log(`   Total Available Balance: ₹${totalAvailable.toFixed(2)}\n`);
      
      availableEarnings.slice(0, 5).forEach((earnings, index) => {
        console.log(`   ${index + 1}. Payment ID: ${earnings.razorpay_payment_id || 'N/A'} - ₹${parseFloat(earnings.amount).toFixed(2)} (Settled: ${earnings.updated_at})`);
      });
      if (availableEarnings.length > 5) {
        console.log(`   ... and ${availableEarnings.length - 5} more`);
      }
    }

    // Get summary statistics
    let summaryQuery = `
      SELECT 
        recipient_id,
        recipient_type,
        status,
        COUNT(*) as count,
        SUM(amount) as total_amount
      FROM earnings
      WHERE 1=1
    `;
    const summaryParams = [];
    
    if (partnerId) {
      summaryQuery += ` AND recipient_id = $1 AND recipient_type = 'partner'`;
      summaryParams.push(partnerId);
    } else if (organizationId) {
      summaryQuery += ` AND recipient_id = $1 AND recipient_type = 'organization'`;
      summaryParams.push(organizationId);
    }
    
    summaryQuery += `
      GROUP BY recipient_id, recipient_type, status
      ORDER BY recipient_type, recipient_id, status
    `;

    const summaryResult = await db.query(summaryQuery, summaryParams);
    const summary = summaryResult.rows;

    console.log(`\n${'='.repeat(80)}`);
    console.log('📈 SUMMARY STATISTICS\n');
    
    if (summary.length > 0) {
      const summaryTable = {};
      summary.forEach(row => {
        const key = `${row.recipient_type}#${row.recipient_id}`;
        if (!summaryTable[key]) {
          summaryTable[key] = {};
        }
        summaryTable[key][row.status] = {
          count: parseInt(row.count),
          total: parseFloat(row.total_amount)
        };
      });

      Object.entries(summaryTable).forEach(([key, stats]) => {
        console.log(`Recipient: ${key}`);
        Object.entries(stats).forEach(([status, data]) => {
          console.log(`   ${status.toUpperCase()}: ${data.count} records - ₹${data.total.toFixed(2)}`);
        });
        console.log('');
      });
    }

    // Check for recent webhook events related to settlement
    console.log(`${'='.repeat(80)}`);
    console.log('🔔 RECENT SETTLEMENT WEBHOOK EVENTS (Last 7 days)\n');
    
    const webhookQuery = `
      SELECT 
        event_id, event_type, entity_id, created_at
      FROM razorpay_webhooks
      WHERE event_type IN ('payment.settled', 'payment.transferred')
        AND created_at >= NOW() - INTERVAL '7 days'
      ORDER BY created_at DESC
      LIMIT 20
    `;
    
    const webhookResult = await db.query(webhookQuery);
    const webhookEvents = webhookResult.rows;

    if (webhookEvents.length > 0) {
      webhookEvents.forEach((event, index) => {
        console.log(`   ${index + 1}. ${event.event_type} - Payment ID: ${event.entity_id} - ${event.created_at}`);
      });
    } else {
      console.log('   ⚠️  No settlement webhook events found in the last 7 days.');
      console.log('   This could indicate webhooks are not being received or processed.');
    }

    console.log(`\n${'='.repeat(80)}`);
    console.log('✅ DIAGNOSTIC COMPLETE\n');

  } catch (error) {
    console.error('❌ Error running diagnostic:', error);
    throw error;
  }
}

// Run the diagnostic
const args = process.argv.slice(2);
let partnerId = null;
let organizationId = null;

if (args[0] && args[0].startsWith('partner:')) {
  partnerId = parseInt(args[0].replace('partner:', ''));
} else if (args[0] && args[0].startsWith('org:')) {
  organizationId = parseInt(args[0].replace('org:', ''));
} else if (args[0]) {
  // Assume it's a partner ID if just a number
  partnerId = parseInt(args[0]);
}

diagnoseEarningsSettlement(partnerId, organizationId)
  .then(() => {
    console.log('Diagnostic completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Diagnostic failed:', error);
    process.exit(1);
  });
