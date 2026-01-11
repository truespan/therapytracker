const RazorpayService = require('../services/razorpayService');
const RazorpayOrder = require('../models/RazorpayOrder');
const RazorpayPayment = require('../models/RazorpayPayment');
const RazorpaySubscription = require('../models/RazorpaySubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const PartnerSubscription = require('../models/PartnerSubscription');
const Organization = require('../models/Organization');
const Earnings = require('../models/Earnings');
const db = require('../config/database');

/**
 * Create a Razorpay order for subscription payment
 */
const createOrder = async (req, res) => {
  try {
    const { subscription_plan_id, billing_period, number_of_therapists } = req.body;
    const userType = req.user.userType; // 'partner' or 'organization'
    const userId = req.user.id;

    if (!subscription_plan_id || !billing_period) {
      return res.status(400).json({
        error: 'subscription_plan_id and billing_period are required'
      });
    }

    // Validate billing period
    const validPeriods = ['monthly', 'quarterly', 'yearly'];
    if (!validPeriods.includes(billing_period)) {
      return res.status(400).json({
        error: 'Invalid billing_period. Must be monthly, quarterly, or yearly'
      });
    }

    // Get plan details
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Validate plan for organization if needed
    if (userType === 'organization') {
      const organization = await Organization.findById(userId);
      if (!organization) {
        return res.status(404).json({ error: 'Organization not found' });
      }

      const therapistCount = number_of_therapists || organization.number_of_therapists || 1;
      
      if (plan.plan_type === 'organization') {
        const isValid = await SubscriptionPlan.validatePlanForOrganization(
          subscription_plan_id,
          therapistCount
        );
        if (!isValid) {
          return res.status(400).json({
            error: 'Selected plan is not compatible with your organization size'
          });
        }
      }
    }

    // Create order
    const orderData = {
      customer_id: userId,
      customer_type: userType === 'partner' ? 'partner' : 'organization',
      subscription_plan_id: subscription_plan_id,
      billing_period: billing_period,
      number_of_therapists: number_of_therapists
    };

    const result = await RazorpayService.createOrderAndSave(orderData);

    res.status(201).json({
      message: 'Order created successfully',
      order: {
        id: result.razorpay_order.id,
        amount: result.razorpay_order.amount,
        currency: result.razorpay_order.currency,
        receipt: result.razorpay_order.receipt,
        status: result.razorpay_order.status,
        key_id: process.env.RAZORPAY_KEY_ID
      }
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({
      error: 'Failed to create order',
      message: error.message
    });
  }
};

/**
 * Verify payment and update subscription
 */
const verifyPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        error: 'razorpay_order_id, razorpay_payment_id, and razorpay_signature are required'
      });
    }

    // Verify signature
    const isValid = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay
    const payment = await RazorpayService.fetchPayment(razorpay_payment_id);

    // Get order from database
    const dbOrder = await RazorpayOrder.findByOrderId(razorpay_order_id);
    if (!dbOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Save payment to database
    const dbPayment = await RazorpayPayment.create({
      razorpay_payment_id: payment.id,
      razorpay_order_id: razorpay_order_id,
      amount: payment.amount / 100, // Convert from paise to rupees
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.method,
      description: payment.description,
      customer_id: dbOrder.customer_id,
      customer_type: dbOrder.customer_type,
      subscription_plan_id: dbOrder.subscription_plan_id,
      billing_period: dbOrder.billing_period,
      metadata: payment
    });

    // Update order status
    await RazorpayOrder.updateStatus(razorpay_order_id, payment.status);

    // If payment is successful, update subscription
    let updatedSubscription = null;
    if (payment.status === 'captured' || payment.status === 'authorized') {
      updatedSubscription = await updateSubscriptionAfterPayment(dbOrder, dbPayment);
    }

    res.json({
      message: 'Payment verified successfully',
      payment: {
        id: dbPayment.id,
        status: dbPayment.status,
        amount: dbPayment.amount
      },
      subscription: updatedSubscription
    });
  } catch (error) {
    console.error('Verify payment error:', error);
    res.status(500).json({
      error: 'Failed to verify payment',
      message: error.message
    });
  }
};

/**
 * Update subscription after successful payment
 * @returns {Promise<Object>} Updated subscription data
 */
async function updateSubscriptionAfterPayment(dbOrder, dbPayment) {
  try {
    // Fetch the plan to get plan_duration_days
    const plan = await SubscriptionPlan.findById(dbOrder.subscription_plan_id);
    
    if (dbOrder.customer_type === 'partner') {
      // Check if partner already has a subscription
      const existingSubscriptions = await PartnerSubscription.findByPartnerId(dbOrder.customer_id);
      let subscription;
      
      if (existingSubscriptions.length > 0) {
        // Update existing subscription (use the most recent one)
        subscription = existingSubscriptions[0];
        await PartnerSubscription.update(subscription.id, {
          subscription_plan_id: dbOrder.subscription_plan_id,
          billing_period: dbOrder.billing_period,
          razorpay_payment_id: dbPayment.razorpay_payment_id,
          payment_status: 'paid',
          subscription_start_date: new Date(),
          subscription_end_date: calculateEndDate(plan, dbOrder.billing_period)
        });
        // Fetch updated subscription with plan details
        subscription = await PartnerSubscription.findById(subscription.id);
      } else {
        // Create new subscription
        subscription = await PartnerSubscription.create({
          partner_id: dbOrder.customer_id,
          subscription_plan_id: dbOrder.subscription_plan_id,
          billing_period: dbOrder.billing_period
        });

        // Update partner subscription with payment info
        await PartnerSubscription.update(subscription.id, {
          razorpay_payment_id: dbPayment.razorpay_payment_id,
          payment_status: 'paid',
          subscription_start_date: new Date(),
          subscription_end_date: calculateEndDate(plan, dbOrder.billing_period)
        });
        // Fetch updated subscription with plan details
        subscription = await PartnerSubscription.findById(subscription.id);
      }
      
      console.log(`[RAZORPAY] Partner subscription updated: Partner ID ${dbOrder.customer_id}, Plan ID ${dbOrder.subscription_plan_id}, Subscription ID ${subscription.id}`);
      return subscription;
    } else if (dbOrder.customer_type === 'organization') {
      // Update organization subscription
      await Organization.update(dbOrder.customer_id, {
        subscription_plan_id: dbOrder.subscription_plan_id,
        subscription_billing_period: dbOrder.billing_period,
        subscription_start_date: new Date(),
        subscription_end_date: calculateEndDate(plan, dbOrder.billing_period),
        razorpay_subscription_id: null, // For one-time payments
        payment_status: 'paid'
      });
      
      // Fetch updated organization with subscription details
      const updatedOrg = await Organization.findById(dbOrder.customer_id);
      
      console.log(`[RAZORPAY] Organization subscription updated: Organization ID ${dbOrder.customer_id}, Plan ID ${dbOrder.subscription_plan_id}`);
      return updatedOrg;
    }
    return null;
  } catch (error) {
    console.error('Error updating subscription after payment:', error);
    throw error;
  }
}

/**
 * Calculate subscription end date based on plan duration or billing period
 * @param {Object} plan - Subscription plan object with plan_duration_days field
 * @param {string} billingPeriod - Billing period (monthly, quarterly, yearly)
 * @returns {Date} End date
 */
function calculateEndDate(plan, billingPeriod) {
  const startDate = new Date();
  const endDate = new Date(startDate);

  // Check if plan has plan_duration_days set (for trial plans like 3-day trial)
  if (plan && plan.plan_duration_days && plan.plan_duration_days > 0) {
    // Use plan_duration_days if specified (e.g., 3 for 3-day trial)
    endDate.setDate(endDate.getDate() + plan.plan_duration_days);
  } else {
    // Fall back to billing period calculation for regular plans
    switch (billingPeriod) {
      case 'monthly':
        endDate.setMonth(endDate.getMonth() + 1);
        break;
      case 'quarterly':
        endDate.setMonth(endDate.getMonth() + 3);
        break;
      case 'yearly':
        endDate.setFullYear(endDate.getFullYear() + 1);
        break;
      default:
        endDate.setMonth(endDate.getMonth() + 1);
    }
  }

  return endDate;
}

/**
 * Get payment history for current user
 */
const getPaymentHistory = async (req, res) => {
  try {
    const userType = req.user.userType;
    const userId = req.user.id;

    const customerType = userType === 'partner' ? 'partner' : 'organization';

    const payments = await RazorpayPayment.findByCustomer(userId, customerType);

    res.json({
      payments: payments.map(payment => ({
        id: payment.id,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.payment_method,
        created_at: payment.created_at
      }))
    });
  } catch (error) {
    console.error('Get payment history error:', error);
    res.status(500).json({
      error: 'Failed to fetch payment history',
      message: error.message
    });
  }
};

/**
 * Handle Razorpay webhook
 */
const handleWebhook = async (req, res) => {
  try {
    // Parse JSON from raw body (express.raw() gives us Buffer)
    let event;
    try {
      const rawBody = req.body.toString('utf8');
      event = JSON.parse(rawBody);
      
      // Verify webhook signature for security
      const razorpaySignature = req.headers['x-razorpay-signature'];
      const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;

      if (!razorpaySignature) {
        console.warn('Webhook received without signature header');
        return res.status(401).json({ error: 'Missing webhook signature' });
      }

      if (!webhookSecret) {
        console.error('RAZORPAY_WEBHOOK_SECRET is not configured');
        // In development, log warning but allow processing
        // In production, this should fail
        if (process.env.NODE_ENV === 'production') {
          return res.status(500).json({ error: 'Webhook secret not configured' });
        }
        console.warn('⚠️  WARNING: Processing webhook without signature verification (development mode only)');
      } else {
        // Verify signature using raw body string
        const isValid = RazorpayService.verifyWebhookSignature(
          rawBody,
          razorpaySignature,
          webhookSecret
        );

        if (!isValid) {
          console.error('Invalid webhook signature - possible security breach');
          return res.status(401).json({ error: 'Invalid webhook signature' });
        }
      }
    } catch (parseError) {
      console.error('Failed to parse webhook body:', parseError);
      return res.status(400).json({ error: 'Invalid webhook payload' });
    }

    // Save webhook event to database
    const webhookQuery = `
      INSERT INTO razorpay_webhooks (event_id, event_type, entity_type, entity_id, payload)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (event_id) DO NOTHING
      RETURNING *
    `;
    await db.query(webhookQuery, [
      event.id,
      event.event,
      event.entity,
      event.payload?.payment?.entity?.id || event.payload?.subscription?.entity?.id,
      JSON.stringify(event)
    ]);

    // Handle different event types
    if (event.event === 'payment.captured' || event.event === 'payment.authorized') {
      await handlePaymentSuccess(event);
    } else if (event.event === 'payment.failed') {
      await handlePaymentFailure(event);
    } else if (event.event === 'payment.transferred' || event.event === 'payment.settled') {
      await handlePaymentSettled(event);
    } else if (event.event === 'payout.processed' || event.event === 'payout.completed') {
      await handlePayoutProcessed(event);
    } else if (event.event === 'subscription.activated' || event.event === 'subscription.charged') {
      await handleSubscriptionActivated(event);
    } else if (event.event === 'subscription.cancelled' || event.event === 'subscription.completed') {
      await handleSubscriptionCancelled(event);
    } else if (event.event === 'subscription.paused') {
      await handleSubscriptionPaused(event);
    } else if (event.event === 'subscription.resumed') {
      await handleSubscriptionResumed(event);
    }

    res.json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({
      error: 'Webhook processing failed',
      message: error.message
    });
  }
};

async function handlePaymentSuccess(event) {
  const payment = event.payload.payment.entity;
  
  // Get order from database first (if order_id exists) to get customer info
  let dbOrder = null;
  if (payment.order_id) {
    try {
      dbOrder = await RazorpayOrder.findByOrderId(payment.order_id);
    } catch (orderError) {
      console.error('[WEBHOOK] Error fetching order:', orderError);
    }
  }
  
  // Update payment status in database
  const existingPayment = await RazorpayPayment.findByPaymentId(payment.id);
  if (existingPayment) {
    await RazorpayPayment.updateStatus(payment.id, payment.status);
  } else {
    // Create new payment record if it doesn't exist
    // Include customer info from order if available
    await RazorpayPayment.create({
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.method,
      description: payment.description || null,
      customer_id: dbOrder ? dbOrder.customer_id : null,
      customer_type: dbOrder ? dbOrder.customer_type : null,
      subscription_plan_id: dbOrder ? dbOrder.subscription_plan_id : null,
      billing_period: dbOrder ? dbOrder.billing_period : null,
      metadata: payment
    });
  }

  // Check if this is a booking payment and create earnings record if needed
  if (payment.status === 'captured' || payment.status === 'authorized') {
    try {
      // Check if earnings record already exists (might have been created in verifyBookingPayment)
      const existingEarnings = await Earnings.findByPaymentId(payment.id);
      
      if (!existingEarnings && payment.order_id && dbOrder) {
        // Parse notes/metadata - PostgreSQL JSONB fields are returned as objects by node-postgres
        // But handle both cases: when stored as JSONB (object) or string
        let orderMetadata = {};
        if (dbOrder.notes) {
          orderMetadata = typeof dbOrder.notes === 'string' ? JSON.parse(dbOrder.notes) : dbOrder.notes;
        } else if (dbOrder.metadata) {
          // Fallback to metadata property (for compatibility, though notes is the actual column)
          orderMetadata = typeof dbOrder.metadata === 'string' ? JSON.parse(dbOrder.metadata) : dbOrder.metadata;
        }
        
        // Check if this is a booking payment
        if (orderMetadata && orderMetadata.payment_type === 'booking_fee') {
          const partnerIdFromMetadata = orderMetadata.partner_id;
          
          if (partnerIdFromMetadata) {
            // Find partner by partner_id string (e.g., "AB12345") to get internal ID
            const Partner = require('../models/Partner');
            const partner = await Partner.findByPartnerId(partnerIdFromMetadata);
            
            if (partner) {
              // Try to find appointment_id from slot_id if available
              let appointmentId = null;
              if (orderMetadata.slot_id) {
                const slotQuery = `SELECT appointment_id FROM availability_slots WHERE id = $1`;
                const slotResult = await db.query(slotQuery, [orderMetadata.slot_id]);
                if (slotResult.rows[0] && slotResult.rows[0].appointment_id) {
                  appointmentId = slotResult.rows[0].appointment_id;
                }
              }

              // Get payment amount - use existing payment record amount or calculate from payment entity
              let paymentAmount = payment.amount / 100; // Convert from paise to rupees
              if (existingPayment) {
                paymentAmount = existingPayment.amount;
              }

              // Create earnings record - 100% goes to partner
              await Earnings.create({
                recipient_id: partner.id,
                recipient_type: 'partner',
                razorpay_payment_id: payment.id,
                amount: paymentAmount,
                currency: payment.currency,
                status: 'pending', // Waiting for Razorpay settlement
                appointment_id: appointmentId,
                payout_date: null // Will be set when settled
              });

              console.log(`[EARNINGS] Created earnings record for partner ${partner.id} (${partner.name}) from booking payment ${payment.id} (amount: ${paymentAmount} ${payment.currency}) via webhook`);
            } else {
              console.warn(`[EARNINGS] Partner not found for partner_id: ${partnerIdFromMetadata} (webhook)`);
            }
          } else {
            console.warn(`[EARNINGS] No partner_id found in order metadata for payment ${payment.id} (webhook)`);
          }
        } else {
          console.log(`[EARNINGS] Payment ${payment.id} is not a booking fee payment (payment_type: ${orderMetadata.payment_type || 'not set'}) - skipping earnings creation`);
        }
      } else if (existingEarnings) {
        console.log(`[EARNINGS] Earnings record already exists for payment ${payment.id} (webhook)`);
      } else if (!payment.order_id) {
        console.warn(`[EARNINGS] Payment ${payment.id} has no order_id - cannot create earnings record (webhook)`);
      } else if (!dbOrder) {
        console.warn(`[EARNINGS] Order not found in database for payment ${payment.id}, order_id: ${payment.order_id} (webhook)`);
      }
    } catch (earningsError) {
      // Log error but don't fail the webhook processing
      console.error('[EARNINGS] Failed to create earnings record in webhook:', earningsError);
      console.error('[EARNINGS] Error stack:', earningsError.stack);
    }
  }
}

async function handlePaymentFailure(event) {
  const payment = event.payload.payment.entity;
  await RazorpayPayment.updateStatus(payment.id, 'failed');
}

async function handleSubscriptionActivated(event) {
  const subscription = event.payload.subscription.entity;
  
  // Update or create subscription record
  const existingSubscription = await RazorpaySubscription.findBySubscriptionId(subscription.id);
  if (existingSubscription) {
    await RazorpaySubscription.update(subscription.id, {
      status: subscription.status,
      current_start: new Date(subscription.current_start * 1000),
      current_end: new Date(subscription.current_end * 1000)
    });
  }
}

async function handleSubscriptionCancelled(event) {
  const subscription = event.payload.subscription.entity;
  await RazorpaySubscription.update(subscription.id, {
    status: subscription.status,
    ended_at: new Date()
  });
}

async function handleSubscriptionPaused(event) {
  const subscription = event.payload.subscription.entity;
  await RazorpaySubscription.update(subscription.id, {
    status: subscription.status // Should be 'halted'
  });
}

async function handleSubscriptionResumed(event) {
  const subscription = event.payload.subscription.entity;
  await RazorpaySubscription.update(subscription.id, {
    status: subscription.status, // Should be 'active'
    current_start: new Date(subscription.current_start * 1000),
    current_end: new Date(subscription.current_end * 1000)
  });
}

/**
 * Handle payment settlement - update earnings from 'pending' to 'available'
 */
async function handlePaymentSettled(event) {
  const payment = event.payload.payment?.entity;
  
  if (!payment || !payment.id) {
    console.warn('[EARNINGS] Payment settlement event missing payment entity');
    return;
  }

  try {
    // Find earnings record by Razorpay payment ID
    const earnings = await Earnings.findByPaymentId(payment.id);
    
    if (earnings && earnings.status === 'pending') {
      // Calculate next Saturday for payout scheduling
      const { getNextSaturday } = require('../utils/dateUtils');
      const { formatDate } = require('../utils/dateUtils');
      const nextSaturday = getNextSaturday();
      const payoutDate = formatDate(nextSaturday); // Format as YYYY-MM-DD for DATE column
      
      // Update earnings status to 'available' and set payout_date
      await Earnings.updateStatusByPaymentId(payment.id, 'available', payoutDate);
      
      console.log(`[EARNINGS] Updated earnings status to 'available' for payment ${payment.id}, scheduled for payout on ${payoutDate}`);
    } else if (earnings) {
      console.log(`[EARNINGS] Earnings for payment ${payment.id} already has status: ${earnings.status}`);
    } else {
      console.log(`[EARNINGS] No earnings record found for payment ${payment.id}`);
    }
  } catch (error) {
    console.error('[EARNINGS] Error handling payment settlement:', error);
    // Don't throw - webhook should still respond successfully
  }
}

/**
 * Handle payout processed - update earnings from 'available' to 'withdrawn'
 * Note: Razorpay payouts may not directly reference payment IDs in webhook payload
 * We update earnings based on payout_date matching or manual processing
 */
async function handlePayoutProcessed(event) {
  const payout = event.payload.payout?.entity;
  
  if (!payout || !payout.id) {
    console.warn('[EARNINGS] Payout event missing payout entity');
    return;
  }

  try {
    // Extract payout date from payout entity (typically in epoch seconds)
    const payoutDate = payout.settled_at ? new Date(payout.settled_at * 1000) : new Date();
    const { formatDate } = require('../utils/dateUtils');
    const payoutDateFormatted = formatDate(payoutDate);
    
    // Update all earnings with matching payout_date from 'available' to 'withdrawn'
    // This assumes weekly batch payouts on Saturdays
    // Note: payout_id linking is optional - we update status even if payout record doesn't exist
    const updateQuery = `
      UPDATE earnings
      SET status = 'withdrawn',
          updated_at = CURRENT_TIMESTAMP
      WHERE status = 'available'
        AND payout_date = $1
      RETURNING *
    `;
    
    const result = await db.query(updateQuery, [payoutDateFormatted]);
    
    if (result.rows.length > 0) {
      console.log(`[EARNINGS] Updated ${result.rows.length} earnings records to 'withdrawn' for payout ${payout.id} on ${payoutDateFormatted}`);
    } else {
      // Alternative: Update based on payout amount and date range if exact date match fails
      // For now, log that manual review may be needed
      console.log(`[EARNINGS] Payout ${payout.id} processed on ${payoutDateFormatted}. No earnings updated automatically. Manual linking may be required.`);
    }
  } catch (error) {
    console.error('[EARNINGS] Error handling payout processed:', error);
    // Don't throw - webhook should still respond successfully
  }
}

/**
 * Create a Razorpay order for booking fee payment
 */
const createBookingOrder = async (req, res) => {
  try {
    const { slot_id, partner_id, amount, currency, notes } = req.body;
    const userId = req.user.id;

    // Check if this is an event enrollment payment
    let paymentType = 'booking_fee';
    let eventId = null;
    if (notes && notes.payment_type === 'event_enrollment') {
      paymentType = 'event_enrollment';
      eventId = notes.event_id;
      if (!eventId || !amount) {
        return res.status(400).json({
          error: 'event_id and amount are required for event enrollment payment'
        });
      }
    } else if (!slot_id || !partner_id) {
      return res.status(400).json({
        error: 'slot_id and partner_id are required for booking payment'
      });
    }

    let bookingFee = 0;
    let orderCurrency = 'INR';
    let receipt = '';

    if (paymentType === 'event_enrollment') {
      // For event enrollment, use provided amount
      bookingFee = amount;
      orderCurrency = currency || 'INR';
      receipt = `event_${eventId}_${Date.now()}`;
    } else {
      // Get partner fee settings for booking
      const Partner = require('../models/Partner');
      const feeSettings = await Partner.getFeeSettings(partner_id);
      
      if (!feeSettings) {
        return res.status(404).json({ error: 'Partner not found' });
      }

      bookingFee = feeSettings.booking_fee || 0;
      orderCurrency = feeSettings.fee_currency || 'INR';
      receipt = `booking_${slot_id}_${Date.now()}`;
    }

    // Check if we're in test mode
    const isTestMode = RazorpayService.isTestMode();

    // If test mode and fee exists, skip payment and return test mode flag
    if (isTestMode && bookingFee > 0) {
      const logMessage = paymentType === 'event_enrollment' 
        ? `[CREATE_BOOKING_ORDER] Test mode detected - skipping payment for event ${eventId}`
        : `[CREATE_BOOKING_ORDER] Test mode detected - skipping payment for slot ${slot_id}`;
      console.log(logMessage);
      return res.status(201).json({
        message: 'Test mode: Payment skipped',
        test_mode: true,
        skip_payment: true,
        order: null
      });
    }

    if (bookingFee <= 0) {
      return res.status(400).json({
        error: paymentType === 'event_enrollment' 
          ? 'Event fee must be greater than 0'
          : 'No booking fee configured for this therapist'
      });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(bookingFee * 100); // Convert to smallest currency unit

    // Prepare notes based on payment type
    let orderNotes = {};
    if (paymentType === 'event_enrollment') {
      orderNotes = {
        event_id: eventId,
        user_id: userId,
        payment_type: 'event_enrollment'
      };
      // Get partner_id from event
      const Event = require('../models/Event');
      const event = await Event.findById(eventId);
      if (event) {
        orderNotes.partner_id = event.partner_id;
      }
    } else {
      orderNotes = {
        slot_id: slot_id,
        partner_id: partner_id,
        user_id: userId,
        payment_type: 'booking_fee'
      };
    }

    const razorpayOrder = await RazorpayService.createOrder({
      amount: amountInPaise,
      currency: orderCurrency,
      receipt: receipt,
      notes: orderNotes
    });

    // Validate that notes contain required fields
    if (paymentType === 'event_enrollment') {
      if (!orderNotes.event_id) {
        console.error('[CREATE_BOOKING_ORDER] Warning: event_id is missing in notes', { eventId, userId });
      }
      if (!orderNotes.partner_id) {
        console.error('[CREATE_BOOKING_ORDER] Warning: partner_id is missing in notes (event enrollment)', { eventId, userId });
      }
    } else {
      if (!orderNotes.partner_id) {
        console.error('[CREATE_BOOKING_ORDER] Warning: partner_id is missing in notes', { slot_id, partner_id, userId });
      }
      if (!orderNotes.slot_id) {
        console.error('[CREATE_BOOKING_ORDER] Warning: slot_id is missing in notes', { slot_id, partner_id, userId });
      }
    }

    // Save order to database
    const dbOrder = await RazorpayOrder.create({
      razorpay_order_id: razorpayOrder.id,
      amount: bookingFee,
      currency: orderCurrency,
      receipt: receipt,
      status: razorpayOrder.status,
      customer_id: userId,
      customer_type: 'user',
      notes: orderNotes
    });

    // Verify notes were saved correctly
    if (!dbOrder.notes) {
      console.error(`[CREATE_BOOKING_ORDER] ERROR: Notes were not saved to database for order ${razorpayOrder.id}`, {
        order_id: razorpayOrder.id,
        notes_sent: orderNotes,
        db_order: dbOrder
      });
    } else {
      console.log(`[CREATE_BOOKING_ORDER] Order ${razorpayOrder.id} created successfully with notes:`, JSON.stringify(dbOrder.notes));
    }

    res.status(201).json({
      message: 'Booking order created successfully',
      test_mode: false,
      skip_payment: false,
      order: {
        id: razorpayOrder.id,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency,
        receipt: razorpayOrder.receipt,
        status: razorpayOrder.status,
        key_id: process.env.RAZORPAY_KEY_ID
      },
      feeDetails: {
        session_fee: feeSettings.session_fee,
        booking_fee: feeSettings.booking_fee,
        currency: currency
      }
    });
  } catch (error) {
    console.error('Create booking order error:', error);
    res.status(500).json({
      error: 'Failed to create booking order',
      message: error.message
    });
  }
};

/**
 * Verify booking payment in test mode (skip actual payment verification)
 */
const verifyBookingPaymentTestMode = async (req, res) => {
  try {
    const { slot_id } = req.body;

    if (!slot_id) {
      return res.status(400).json({
        error: 'slot_id is required'
      });
    }

    console.log(`[VERIFY_BOOKING_PAYMENT] Test mode - skipping payment verification for slot ${slot_id}`);

    // In test mode, just return success without actual payment verification
    res.json({
      message: 'Test mode: Booking payment verified (skipped)',
      payment: {
        id: `test_payment_${Date.now()}`,
        status: 'captured',
        amount: 0
      },
      booking_confirmed: true,
      test_mode: true
    });
  } catch (error) {
    console.error('Verify booking payment test mode error:', error);
    res.status(500).json({
      error: 'Failed to verify booking payment',
      message: error.message
    });
  }
};

/**
 * Verify booking payment and complete booking
 */
const verifyBookingPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      slot_id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !slot_id) {
      return res.status(400).json({
        error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature, and slot_id are required'
      });
    }

    // Verify signature
    const isValid = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay
    const payment = await RazorpayService.fetchPayment(razorpay_payment_id);

    // Get payment type from order notes (dbOrder was already fetched above)
    let paymentType = 'booking_fee';
    let eventId = null;
    if (dbOrder.notes) {
      const orderNotes = typeof dbOrder.notes === 'string' ? JSON.parse(dbOrder.notes) : dbOrder.notes;
      paymentType = orderNotes.payment_type || 'booking_fee';
      eventId = orderNotes.event_id || null;
    }

    // Save payment to database
    const dbPayment = await RazorpayPayment.create({
      razorpay_payment_id: payment.id,
      razorpay_order_id: razorpay_order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.method,
      description: paymentType === 'event_enrollment' ? 'Event enrollment payment' : 'Booking fee payment',
      customer_id: dbOrder.customer_id,
      customer_type: 'user',
      metadata: {
        ...payment,
        slot_id: effectiveSlotId,
        event_id: eventId,
        payment_type: paymentType
      }
    });

    // Update order status
    await RazorpayOrder.updateStatus(razorpay_order_id, payment.status);

    // Create earnings record if payment is successful
    if (payment.status === 'captured' || payment.status === 'authorized') {
      try {
        // Get partner_id from order notes/metadata
        // PostgreSQL JSONB is returned as object by node-postgres
        let orderMetadata = {};
        if (dbOrder.notes) {
          orderMetadata = typeof dbOrder.notes === 'string' ? JSON.parse(dbOrder.notes) : dbOrder.notes;
        } else if (dbOrder.metadata) {
          // Fallback for compatibility
          orderMetadata = typeof dbOrder.metadata === 'string' ? JSON.parse(dbOrder.metadata) : dbOrder.metadata;
        }
        const partnerIdFromMetadata = orderMetadata.partner_id;
        
        // Try to find appointment_id from slot_id if available (only for booking payments)
        let appointmentId = null;
        if (paymentType === 'booking_fee' && effectiveSlotId) {
          const slotQuery = `SELECT appointment_id FROM availability_slots WHERE id = $1`;
          const slotResult = await db.query(slotQuery, [effectiveSlotId]);
          if (slotResult.rows[0] && slotResult.rows[0].appointment_id) {
            appointmentId = slotResult.rows[0].appointment_id;
          }
        }

        // Find partner by partner_id string (e.g., "AB12345") to get internal ID
        if (partnerIdFromMetadata) {
          const Partner = require('../models/Partner');
          const partner = await Partner.findByPartnerId(partnerIdFromMetadata);
          
          if (partner) {
            // Check if earnings already exist (might have been created via webhook)
            const existingEarnings = await Earnings.findByPaymentId(payment.id);
            if (existingEarnings) {
              console.log(`[EARNINGS] Earnings record already exists for payment ${payment.id}, skipping creation in verifyBookingPayment`);
            } else {
              // Create earnings record - 100% goes to partner
              // For event enrollment, we still create earnings but without appointment_id
              await Earnings.create({
                recipient_id: partner.id,
                recipient_type: 'partner',
                razorpay_payment_id: payment.id,
                amount: dbPayment.amount, // Full fee amount
                currency: dbPayment.currency,
                status: 'pending', // Waiting for Razorpay settlement
                appointment_id: appointmentId, // null for event enrollment
                payout_date: null // Will be set when settled
              });

              console.log(`[EARNINGS] Created earnings record for partner ${partner.id} (${partner.name}) from booking payment ${payment.id} (amount: ${dbPayment.amount} ${dbPayment.currency}) via verifyBookingPayment`);
            }
          } else {
            console.error(`[EARNINGS] Partner not found for partner_id: ${partnerIdFromMetadata} (verifyBookingPayment)`);
            console.error(`[EARNINGS] Order metadata:`, JSON.stringify(orderMetadata, null, 2));
          }
        } else {
          console.error(`[EARNINGS] No partner_id found in order metadata for payment ${payment.id} (verifyBookingPayment)`);
          console.error(`[EARNINGS] Order metadata:`, JSON.stringify(orderMetadata, null, 2));
        }
      } catch (earningsError) {
        // Log error but don't fail the payment verification
        console.error('[EARNINGS] Failed to create earnings record in verifyBookingPayment:', earningsError);
        console.error('[EARNINGS] Error stack:', earningsError.stack);
        console.error('[EARNINGS] Payment ID:', payment.id);
        console.error('[EARNINGS] Order ID:', razorpay_order_id);
      }
    }

    const successMessage = paymentType === 'event_enrollment' 
      ? 'Event enrollment payment verified successfully'
      : 'Booking payment verified successfully';

    res.json({
      message: successMessage,
      success: true,
      payment: {
        id: dbPayment.id,
        status: dbPayment.status,
        amount: dbPayment.amount
      },
      booking_confirmed: payment.status === 'captured' || payment.status === 'authorized',
      enrollment_confirmed: paymentType === 'event_enrollment' && (payment.status === 'captured' || payment.status === 'authorized')
    });
  } catch (error) {
    console.error('Verify booking payment error:', error);
    res.status(500).json({
      error: 'Failed to verify booking payment',
      message: error.message
    });
  }
};

/**
 * Create a Razorpay order for remaining payment (balance or full payment)
 */
const createRemainingPaymentOrder = async (req, res) => {
  try {
    const { slot_id } = req.body;
    const userId = req.user.id;

    if (!slot_id) {
      return res.status(400).json({
        error: 'slot_id is required'
      });
    }

    // Get slot details
    const AvailabilitySlot = require('../models/AvailabilitySlot');
    const slot = await AvailabilitySlot.findById(slot_id);
    
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Verify slot belongs to the user
    if (slot.booked_by_user_id !== userId) {
      return res.status(403).json({ error: 'You can only pay for your own bookings' });
    }

    // Verify slot status allows payment
    if (!['confirmed_balance_pending', 'confirmed_payment_pending'].includes(slot.status)) {
      return res.status(400).json({ 
        error: 'This slot does not require payment or is already fully paid' 
      });
    }

    // Get partner fee settings
    const Partner = require('../models/Partner');
    const feeSettings = await Partner.getFeeSettings(slot.partner_id);
    
    if (!feeSettings) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const sessionFee = parseFloat(feeSettings.session_fee) || 0;
    const bookingFee = parseFloat(feeSettings.booking_fee) || 0;
    const currency = feeSettings.fee_currency || 'INR';

    // Calculate remaining amount
    let remainingAmount = 0;
    if (slot.status === 'confirmed_balance_pending') {
      // Partial payment already made, calculate balance
      remainingAmount = sessionFee - bookingFee;
    } else if (slot.status === 'confirmed_payment_pending') {
      // No payment made, full session fee required
      remainingAmount = sessionFee;
    }

    if (remainingAmount <= 0) {
      return res.status(400).json({
        error: 'No remaining amount to pay'
      });
    }

    // Check if we're in test mode
    const isTestMode = RazorpayService.isTestMode();

    // If test mode, skip payment and return test mode flag
    if (isTestMode) {
      console.log(`[CREATE_REMAINING_PAYMENT_ORDER] Test mode detected - skipping payment for slot ${slot_id}`);
      return res.status(201).json({
        message: 'Test mode: Payment skipped',
        test_mode: true,
        skip_payment: true,
        order: null,
        remainingAmount: remainingAmount,
        currency: currency
      });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(remainingAmount * 100); // Convert to smallest currency unit
    const receipt = `remaining_${slot_id}_${Date.now()}`;

    const razorpayOrder = await RazorpayService.createOrder({
      amount: amountInPaise,
      currency: currency,
      receipt: receipt,
      notes: {
        slot_id: slot_id,
        partner_id: slot.partner_id,
        user_id: userId,
        payment_type: 'remaining_payment'
      }
    });

    // Prepare notes object
    const orderNotes = {
      slot_id,
      partner_id: slot.partner_id,
      payment_type: 'remaining_payment'
    };

    // Save order to database
    const dbOrder = await RazorpayOrder.create({
      razorpay_order_id: razorpayOrder.id,
      amount: remainingAmount,
      currency: currency,
      receipt: receipt,
      status: razorpayOrder.status,
      customer_id: userId,
      customer_type: 'user',
      notes: orderNotes
    });

    res.status(201).json({
      message: 'Remaining payment order created successfully',
      order: {
        id: razorpayOrder.id,
        amount: remainingAmount,
        currency: currency,
        receipt: receipt
      },
      remainingAmount: remainingAmount,
      currency: currency
    });
  } catch (error) {
    console.error('Create remaining payment order error:', error);
    res.status(500).json({
      error: 'Failed to create remaining payment order',
      message: error.message
    });
  }
};

/**
 * Verify remaining payment and update slot status to 'confirmed'
 */
const verifyRemainingPayment = async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      slot_id
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature || !slot_id) {
      return res.status(400).json({
        error: 'razorpay_order_id, razorpay_payment_id, razorpay_signature, and slot_id are required'
      });
    }

    // Verify signature
    const isValid = RazorpayService.verifyPaymentSignature(
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature
    );

    if (!isValid) {
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    // Fetch payment details from Razorpay
    const payment = await RazorpayService.fetchPayment(razorpay_payment_id);

    // Get order from database
    const dbOrder = await RazorpayOrder.findByOrderId(razorpay_order_id);
    if (!dbOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Get slot details
    const AvailabilitySlot = require('../models/AvailabilitySlot');
    const slot = await AvailabilitySlot.findById(slot_id);
    
    if (!slot) {
      return res.status(404).json({ error: 'Slot not found' });
    }

    // Verify slot belongs to the user
    if (slot.booked_by_user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only pay for your own bookings' });
    }

    // Save payment to database
    const dbPayment = await RazorpayPayment.create({
      razorpay_payment_id: payment.id,
      razorpay_order_id: razorpay_order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.method,
      description: 'Remaining payment for booking',
      customer_id: dbOrder.customer_id,
      customer_type: 'user',
      metadata: {
        ...payment,
        slot_id: slot_id,
        payment_type: 'remaining_payment'
      }
    });

    // Update order status
    await RazorpayOrder.updateStatus(razorpay_order_id, payment.status);

    // If payment successful, update slot status to 'confirmed'
    if (payment.status === 'captured' || payment.status === 'authorized') {
      const db = require('../config/database');
      await db.query(
        `UPDATE availability_slots 
         SET status = 'confirmed', updated_at = CURRENT_TIMESTAMP 
         WHERE id = $1`,
        [slot_id]
      );

      // Create earnings record
      try {
        const Partner = require('../models/Partner');
        const partner = await Partner.findById(slot.partner_id);
        
        if (partner) {
          // Check if earnings already exist
          const existingEarnings = await Earnings.findByPaymentId(payment.id);
          if (!existingEarnings) {
            await Earnings.create({
              recipient_id: partner.id,
              recipient_type: 'partner',
              razorpay_payment_id: payment.id,
              amount: dbPayment.amount,
              currency: dbPayment.currency,
              status: 'pending',
              appointment_id: slot.appointment_id,
              payout_date: null
            });

            console.log(`[EARNINGS] Created earnings record for partner ${partner.id} from remaining payment ${payment.id}`);
          }
        }
      } catch (earningsError) {
        console.error('[EARNINGS] Failed to create earnings record:', earningsError);
        // Don't fail the payment verification if earnings creation fails
      }
    }

    res.json({
      message: 'Remaining payment verified successfully',
      payment: {
        id: dbPayment.id,
        status: dbPayment.status,
        amount: dbPayment.amount
      },
      payment_confirmed: payment.status === 'captured' || payment.status === 'authorized',
      slot_status: payment.status === 'captured' || payment.status === 'authorized' ? 'confirmed' : slot.status
    });
  } catch (error) {
    console.error('Verify remaining payment error:', error);
    res.status(500).json({
      error: 'Failed to verify remaining payment',
      message: error.message
    });
  }
};

/**
 * Pause a subscription
 */
const pauseSubscription = async (req, res) => {
  try {
    const userType = req.user.userType; // 'partner' or 'organization'
    const userId = req.user.id;

    // Get the subscription ID based on user type
    let razorpaySubscriptionId = null;
    let subscriptionRecord = null;

    if (userType === 'partner') {
      const PartnerSubscription = require('../models/PartnerSubscription');
      const subscriptions = await PartnerSubscription.findByPartnerId(userId);
      const activeSubscription = subscriptions.find(sub => 
        sub.razorpay_subscription_id && 
        sub.payment_status === 'paid'
      );
      
      if (!activeSubscription || !activeSubscription.razorpay_subscription_id) {
        return res.status(404).json({ 
          error: 'No active paid subscription found to pause' 
        });
      }
      
      razorpaySubscriptionId = activeSubscription.razorpay_subscription_id;
      subscriptionRecord = activeSubscription;
    } else if (userType === 'organization') {
      const Organization = require('../models/Organization');
      const organization = await Organization.findById(userId);
      
      if (!organization || !organization.razorpay_subscription_id) {
        return res.status(404).json({ 
          error: 'No active subscription found to pause' 
        });
      }
      
      razorpaySubscriptionId = organization.razorpay_subscription_id;
    } else {
      return res.status(403).json({ 
        error: 'Only partners and organizations can pause subscriptions' 
      });
    }

    // Check current subscription status in Razorpay
    const currentSubscription = await RazorpayService.fetchSubscription(razorpaySubscriptionId);
    
    if (currentSubscription.status === 'halted') {
      return res.status(400).json({ 
        error: 'Subscription is already paused' 
      });
    }
    
    if (currentSubscription.status !== 'active') {
      return res.status(400).json({ 
        error: `Cannot pause subscription with status: ${currentSubscription.status}. Only active subscriptions can be paused.` 
      });
    }

    // Pause subscription in Razorpay
    const pausedSubscription = await RazorpayService.pauseSubscription(razorpaySubscriptionId, {
      pause_at: 'immediately' // Pause immediately
    });

    // Update subscription status in razorpay_subscriptions table
    await RazorpaySubscription.update(razorpaySubscriptionId, {
      status: pausedSubscription.status // Should be 'halted'
    });

    res.json({
      message: 'Subscription paused successfully. No charges will be made while paused.',
      subscription: {
        id: pausedSubscription.id,
        status: pausedSubscription.status
      }
    });
  } catch (error) {
    console.error('Pause subscription error:', error);
    res.status(500).json({
      error: 'Failed to pause subscription',
      message: error.message
    });
  }
};

/**
 * Resume a paused subscription
 */
const resumeSubscription = async (req, res) => {
  try {
    const userType = req.user.userType; // 'partner' or 'organization'
    const userId = req.user.id;

    // Get the subscription ID based on user type
    let razorpaySubscriptionId = null;

    if (userType === 'partner') {
      const PartnerSubscription = require('../models/PartnerSubscription');
      const subscriptions = await PartnerSubscription.findByPartnerId(userId);
      const subscription = subscriptions.find(sub => 
        sub.razorpay_subscription_id
      );
      
      if (!subscription || !subscription.razorpay_subscription_id) {
        return res.status(404).json({ 
          error: 'No subscription found to resume' 
        });
      }
      
      razorpaySubscriptionId = subscription.razorpay_subscription_id;
    } else if (userType === 'organization') {
      const Organization = require('../models/Organization');
      const organization = await Organization.findById(userId);
      
      if (!organization || !organization.razorpay_subscription_id) {
        return res.status(404).json({ 
          error: 'No subscription found to resume' 
        });
      }
      
      razorpaySubscriptionId = organization.razorpay_subscription_id;
    } else {
      return res.status(403).json({ 
        error: 'Only partners and organizations can resume subscriptions' 
      });
    }

    // Check current subscription status in Razorpay
    const currentSubscription = await RazorpayService.fetchSubscription(razorpaySubscriptionId);
    
    if (currentSubscription.status === 'active') {
      return res.status(400).json({ 
        error: 'Subscription is already active' 
      });
    }
    
    if (currentSubscription.status !== 'halted') {
      return res.status(400).json({ 
        error: `Cannot resume subscription with status: ${currentSubscription.status}. Only paused (halted) subscriptions can be resumed.` 
      });
    }

    // Resume subscription in Razorpay
    const resumedSubscription = await RazorpayService.resumeSubscription(razorpaySubscriptionId);

    // Update subscription status in database
    await RazorpaySubscription.update(razorpaySubscriptionId, {
      status: resumedSubscription.status, // Should be 'active'
      current_start: new Date(resumedSubscription.current_start * 1000),
      current_end: new Date(resumedSubscription.current_end * 1000)
    });

    res.json({
      message: 'Subscription resumed successfully. Billing will continue from now.',
      subscription: {
        id: resumedSubscription.id,
        status: resumedSubscription.status,
        current_start: new Date(resumedSubscription.current_start * 1000),
        current_end: new Date(resumedSubscription.current_end * 1000)
      }
    });
  } catch (error) {
    console.error('Resume subscription error:', error);
    res.status(500).json({
      error: 'Failed to resume subscription',
      message: error.message
    });
  }
};

module.exports = {
  createOrder,
  verifyPayment,
  getPaymentHistory,
  handleWebhook,
  createBookingOrder,
  verifyBookingPayment,
  verifyBookingPaymentTestMode,
  createRemainingPaymentOrder,
  verifyRemainingPayment,
  pauseSubscription,
  resumeSubscription
};

