const RazorpayService = require('./razorpayService');
const Earnings = require('../models/Earnings');
const { getNextSaturday, formatDate } = require('../utils/dateUtils');

/**
 * Settlement Sync Service
 * Handles synchronization of Razorpay settlements with earnings records
 * 
 * This service provides a centralized way to sync settlement status,
 * used by both webhooks (real-time) and cron jobs (safety net)
 */
class SettlementSyncService {
  /**
   * Sync settlements for all recipients with pending earnings
   * This is the main entry point for global settlement sync
   *
   * Uses the date-based Settlement Recon API to efficiently fetch all payments
   * settled in the current and previous month, then matches them against pending earnings
   *
   * @param {Object} options - Sync options
   * @param {boolean} options.verbose - Enable verbose logging (default: false)
   * @param {number} options.monthsToCheck - Number of months to check (default: 2 for current + previous)
   * @returns {Promise<Object>} Sync results with counts and details
   */
  static async syncAllSettlements(options = {}) {
    const { verbose = false, monthsToCheck = 2 } = options;

    const log = (message, data = null) => {
      if (verbose) {
        console.log(`[SETTLEMENT_SYNC] ${message}`, data || '');
      }
    };

    try {
      log('Starting global settlement sync...');

      // 1. Get all recipients with pending earnings
      const candidates = await Earnings.getEarningsCandidates();
      const pendingCandidates = candidates.filter(c => parseFloat(c.pending_earnings) > 0);

      log(`Found ${pendingCandidates.length} recipients with pending earnings`);

      if (pendingCandidates.length === 0) {
        return {
          success: true,
          message: 'No pending earnings to sync',
          total_synced: 0,
          total_skipped: 0,
          total_errors: 0,
          recipients_processed: 0,
          recipients: []
        };
      }

      // 2. Build list of months to check (current month + previous N-1 months)
      const now = new Date();
      const monthsToFetch = [];

      for (let i = 0; i < monthsToCheck; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        monthsToFetch.push({
          year: date.getFullYear(),
          month: date.getMonth() + 1 // JS months are 0-indexed
        });
      }

      log(`Will check ${monthsToCheck} months: ${monthsToFetch.map(m => `${m.year}-${String(m.month).padStart(2, '0')}`).join(', ')}`);

      // 3. Fetch recon data for all months and build payment→settlement map
      const paymentToSettlementMap = {};
      let totalReconItemsFetched = 0;

      for (const dateParams of monthsToFetch) {
        log(`Fetching recon data for ${dateParams.year}-${String(dateParams.month).padStart(2, '0')}...`);

        try {
          let skip = 0;
          let hasMore = true;
          let monthTotal = 0;

          // Paginate through all recon items (max 1000 per request)
          while (hasMore) {
            const reconItems = await RazorpayService.fetchSettlementRecon({
              ...dateParams,
              count: 1000,
              skip
            });

            log(`  Retrieved ${reconItems.length} recon items (skip: ${skip})`);

            // Extract payment IDs and their settlement IDs
            reconItems
              .filter(item => item.type === 'payment' && item.entity_id && item.settlement_id)
              .forEach(item => {
                paymentToSettlementMap[item.entity_id] = item.settlement_id;
              });

            monthTotal += reconItems.length;
            totalReconItemsFetched += reconItems.length;
            hasMore = reconItems.length === 1000;
            skip += 1000;

            // Rate limiting: 1 second delay between pagination requests
            if (hasMore) {
              log(`  Rate limiting: waiting 1 second...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
            }
          }

          log(`  Total items for ${dateParams.year}-${String(dateParams.month).padStart(2, '0')}: ${monthTotal}`);

        } catch (error) {
          console.error(`[SETTLEMENT_SYNC] Error fetching recon for ${dateParams.year}-${dateParams.month}:`, error.message);
        }
      }

      log(`Built map with ${Object.keys(paymentToSettlementMap).length} payment→settlement mappings from ${totalReconItemsFetched} total recon items`);

      // 4. Process each recipient and update pending earnings
      let totalSynced = 0;
      let totalSkipped = 0;
      let totalErrors = 0;
      const recipientResults = [];

      for (const candidate of pendingCandidates) {
        const { recipient_id, recipient_type } = candidate;

        log(`Processing ${recipient_type} #${recipient_id}...`);

        let recipientSynced = 0;
        let recipientSkipped = 0;
        let recipientErrors = 0;

        try {
          // Get pending earnings for this recipient
          const pendingEarnings = await Earnings.getEarnings(recipient_id, recipient_type, {
            status: 'pending'
          });

          log(`  ${recipient_type} #${recipient_id} has ${pendingEarnings.length} pending earnings`);

          // Check each pending earning against the settlement map
          for (const earning of pendingEarnings) {
            if (!earning.razorpay_payment_id) {
              recipientSkipped++;
              continue;
            }

            const paymentId = earning.razorpay_payment_id;
            const settlementId = paymentToSettlementMap[paymentId];

            if (settlementId) {
              // Payment is in a settlement - update to available
              const nextSaturday = getNextSaturday();
              const payoutDate = formatDate(nextSaturday);

              await Earnings.updateStatusByPaymentId(paymentId, 'available', payoutDate, settlementId);

              log(`  ✅ Updated earnings ${earning.id} (payment ${paymentId}) with settlement ${settlementId}`);
              recipientSynced++;
            } else {
              log(`  ⏳ Earnings ${earning.id} (payment ${paymentId}) not found in recent settlements`);
              recipientSkipped++;
            }
          }

          recipientResults.push({
            recipient_id,
            recipient_type,
            synced: recipientSynced,
            skipped: recipientSkipped,
            errors: recipientErrors,
            pending_count: pendingEarnings.length
          });

          totalSynced += recipientSynced;
          totalSkipped += recipientSkipped;

        } catch (error) {
          console.error(`[SETTLEMENT_SYNC] ❌ Error processing ${recipient_type} #${recipient_id}:`, error.message);
          recipientErrors++;
          totalErrors++;

          recipientResults.push({
            recipient_id,
            recipient_type,
            synced: recipientSynced,
            skipped: recipientSkipped,
            errors: recipientErrors,
            error: error.message
          });
        }
      }

      log(`Complete. Total synced: ${totalSynced}, skipped: ${totalSkipped}, errors: ${totalErrors}`);

      return {
        success: true,
        message: `Settlement sync completed. ${totalSynced} earnings updated across ${pendingCandidates.length} recipients`,
        total_synced: totalSynced,
        total_skipped: totalSkipped,
        total_errors: totalErrors,
        recipients_processed: pendingCandidates.length,
        recipients: recipientResults
      };

    } catch (error) {
      console.error('[SETTLEMENT_SYNC] ❌ Global sync failed:', error);
      throw error;
    }
  }
  
  /**
   * Sync settlements for a specific recipient
   * 
   * @param {number} recipientId - Recipient ID
   * @param {string} recipientType - Recipient type ('partner' or 'organization')
   * @param {Object} options - Sync options
   * @param {number} options.settlementCount - Number of recent settlements to fetch (default: 100)
   * @returns {Promise<Object>} Sync results
   */
  static async syncRecipientSettlements(recipientId, recipientType, options = {}) {
    const { settlementCount = 100 } = options;
    
    try {
      console.log(`[SETTLEMENT_SYNC] Starting settlement sync for ${recipientType} #${recipientId}`);
      
      // Get pending earnings for this recipient
      const pendingEarnings = await Earnings.getEarnings(recipientId, recipientType, {
        status: 'pending'
      });
      
      if (pendingEarnings.length === 0) {
        return {
          success: true,
          message: 'No pending earnings to sync',
          synced: 0,
          skipped: 0,
          errors: 0
        };
      }
      
      console.log(`[SETTLEMENT_SYNC] Found ${pendingEarnings.length} pending earnings`);
      
      // Fetch recent settlements from Razorpay
      const settlementsResponse = await RazorpayService.fetchSettlements({ count: settlementCount });
      const settlements = settlementsResponse.items || [];

      console.log(`[SETTLEMENT_SYNC] Found ${settlements.length} recent settlements`);

      // Build payment ID -> settlement ID map using REST API
      const paymentToSettlementMap = {};
      for (let i = 0; i < settlements.length; i++) {
        const settlement = settlements[i];

        // Only process settled/processed settlements
        if (settlement.status !== 'processed' && settlement.status !== 'settled') {
          continue;
        }

        try {
          console.log(`[SETTLEMENT_SYNC] Fetching payments for settlement ${settlement.id} (${i + 1}/${settlements.length})...`);

          // Use REST API to get payment IDs in this settlement
          const paymentIds = await RazorpayService.fetchSettlementPayments(settlement.id);

          console.log(`[SETTLEMENT_SYNC]   Found ${paymentIds.length} payments`);

          for (const paymentId of paymentIds) {
            paymentToSettlementMap[paymentId] = settlement.id;
          }

          // Small delay to avoid rate limiting (every 10 settlements)
          if ((i + 1) % 10 === 0 && i < settlements.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 1000));
          }

        } catch (error) {
          console.error(`[SETTLEMENT_SYNC] Error fetching payments for settlement ${settlement.id}:`, error.message);
          // Continue with next settlement
        }
      }

      console.log(`[SETTLEMENT_SYNC] Settlement map contains ${Object.keys(paymentToSettlementMap).length} payments`);
      
      let syncedCount = 0;
      let skippedCount = 0;
      let errorCount = 0;
      const errors = [];
      
      // Check each pending earning
      for (const earnings of pendingEarnings) {
        if (!earnings.razorpay_payment_id) {
          console.log(`[SETTLEMENT_SYNC] Skipping earnings ${earnings.id} - no payment ID`);
          skippedCount++;
          continue;
        }
        
        const paymentId = earnings.razorpay_payment_id;
        const settlementId = paymentToSettlementMap[paymentId];
        
        if (settlementId) {
          try {
            // Payment is in a settlement - update to available
            const nextSaturday = getNextSaturday();
            const payoutDate = formatDate(nextSaturday);
            
            await Earnings.updateStatusByPaymentId(paymentId, 'available', payoutDate, settlementId);
            
            console.log(`[SETTLEMENT_SYNC] ✅ Updated earnings ${earnings.id} (payment ${paymentId}) to 'available' with settlement ${settlementId}`);
            syncedCount++;
          } catch (error) {
            console.error(`[SETTLEMENT_SYNC] ❌ Error updating earnings ${earnings.id}:`, error.message);
            errorCount++;
            errors.push({
              earnings_id: earnings.id,
              payment_id: paymentId,
              error: error.message
            });
          }
        } else {
          // Payment not found in recent settlements - still pending
          console.log(`[SETTLEMENT_SYNC] ⏳ Earnings ${earnings.id} (payment ${paymentId}) not found in recent settlements, still pending`);
          skippedCount++;
        }
      }
      
      console.log(`[SETTLEMENT_SYNC] Sync complete. Synced: ${syncedCount}, Skipped: ${skippedCount}, Errors: ${errorCount}`);
      
      return {
        success: true,
        message: `Settlement sync completed. ${syncedCount} earnings updated to 'available'`,
        synced: syncedCount,
        skipped: skippedCount,
        errors: errorCount,
        error_details: errors.length > 0 ? errors : undefined
      };
      
    } catch (error) {
      console.error(`[SETTLEMENT_SYNC] ❌ Error syncing settlements for ${recipientType} #${recipientId}:`, error);
      throw error;
    }
  }
  
  /**
   * Process a specific settlement by ID
   * Used by webhooks when a settlement.processed event is received
   *
   * Uses the date-based Settlement Recon API to efficiently fetch all payment IDs
   * in the settlement, then updates earnings in a single batch operation
   *
   * @param {string} settlementId - Razorpay settlement ID
   * @returns {Promise<Object>} Processing results
   */
  static async processSettlement(settlementId) {
    try {
      console.log(`[SETTLEMENT_SYNC] Processing settlement ${settlementId}...`);

      // 1. Fetch settlement details to get the date
      const settlement = await RazorpayService.fetchSettlement(settlementId);
      const settlementDate = new Date(settlement.created_at * 1000);

      console.log(`[SETTLEMENT_SYNC] Settlement details:`, {
        settlement_id: settlement.id,
        amount: settlement.amount / 100, // Convert paise to rupees
        status: settlement.status,
        created_at: settlementDate.toISOString()
      });

      // 2. Fetch recon data for that month using date-based API
      const dateParams = {
        year: settlementDate.getFullYear(),
        month: settlementDate.getMonth() + 1 // JS months are 0-indexed
      };

      console.log(`[SETTLEMENT_SYNC] Fetching recon data for ${dateParams.year}-${String(dateParams.month).padStart(2, '0')}...`);

      const paymentIds = await RazorpayService.fetchPaymentsInSettlement(
        settlementId,
        dateParams
      );

      console.log(`[SETTLEMENT_SYNC] Found ${paymentIds.length} payments in settlement ${settlementId}`);

      if (paymentIds.length === 0) {
        console.warn(`[SETTLEMENT_SYNC] Settlement ${settlementId} has no payment IDs`);
        return {
          success: true,
          message: 'Settlement has no payment IDs',
          updated_count: 0,
          payment_count: 0
        };
      }

      // 3. Update all matching earnings in one batch
      const nextSaturday = getNextSaturday();
      const payoutDate = formatDate(nextSaturday);

      console.log(`[SETTLEMENT_SYNC] Updating earnings for ${paymentIds.length} payments to 'available' with payout date ${payoutDate}...`);

      const updatedEarnings = await Earnings.updateMultipleByPaymentIds(
        paymentIds,
        'available',
        payoutDate,
        settlementId
      );

      // 4. Log results per recipient
      const recipientSummary = {};
      updatedEarnings.forEach(e => {
        const key = `${e.recipient_type}#${e.recipient_id}`;
        if (!recipientSummary[key]) {
          recipientSummary[key] = { count: 0, total: 0 };
        }
        recipientSummary[key].count++;
        recipientSummary[key].total += parseFloat(e.amount);
      });

      console.log(`[SETTLEMENT_SYNC] ✅ Successfully updated ${updatedEarnings.length} earnings from settlement ${settlementId}`, {
        settlement_id: settlementId,
        payment_count: paymentIds.length,
        updated_count: updatedEarnings.length,
        payout_date: payoutDate,
        recipient_summary: recipientSummary
      });

      // Log available balance update for each affected recipient
      for (const [recipientKey, summary] of Object.entries(recipientSummary)) {
        const [recipientType, recipientId] = recipientKey.split('#');
        const earningsSummary = await Earnings.getEarningsSummary(parseInt(recipientId), recipientType);
        console.log(`[SETTLEMENT_SYNC] Updated available balance for ${recipientKey}:`, {
          available_balance: earningsSummary.available_balance,
          pending_earnings: earningsSummary.pending_earnings,
          newly_available: summary.total.toFixed(2)
        });
      }

      return {
        success: true,
        message: `Settlement processed successfully. ${updatedEarnings.length} earnings updated`,
        settlement_id: settlementId,
        payment_count: paymentIds.length,
        updated_count: updatedEarnings.length,
        payout_date: payoutDate,
        recipient_summary: recipientSummary
      };

    } catch (error) {
      console.error(`[SETTLEMENT_SYNC] ❌ Error processing settlement ${settlementId}:`, error);
      throw error;
    }
  }
}

module.exports = SettlementSyncService;
