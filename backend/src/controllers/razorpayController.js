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
          subscription_end_date: calculateEndDate(dbOrder.billing_period)
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
          subscription_end_date: calculateEndDate(dbOrder.billing_period)
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
        subscription_end_date: calculateEndDate(dbOrder.billing_period),
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
 * Calculate subscription end date based on billing period
 */
function calculateEndDate(billingPeriod) {
  const startDate = new Date();
  const endDate = new Date(startDate);

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
  
  // Update payment status in database
  const existingPayment = await RazorpayPayment.findByPaymentId(payment.id);
  if (existingPayment) {
    await RazorpayPayment.updateStatus(payment.id, payment.status);
  } else {
    // Create new payment record if it doesn't exist
    await RazorpayPayment.create({
      razorpay_payment_id: payment.id,
      razorpay_order_id: payment.order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.method,
      metadata: payment
    });
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
    const { slot_id, partner_id } = req.body;
    const userId = req.user.id;

    if (!slot_id || !partner_id) {
      return res.status(400).json({
        error: 'slot_id and partner_id are required'
      });
    }

    // Get partner fee settings
    const Partner = require('../models/Partner');
    const feeSettings = await Partner.getFeeSettings(partner_id);
    
    if (!feeSettings) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    const bookingFee = feeSettings.booking_fee || 0;
    const currency = feeSettings.fee_currency || 'INR';

    if (bookingFee <= 0) {
      return res.status(400).json({
        error: 'No booking fee configured for this therapist'
      });
    }

    // Create Razorpay order
    const amountInPaise = Math.round(bookingFee * 100); // Convert to smallest currency unit
    const receipt = `booking_${slot_id}_${Date.now()}`;

    const razorpayOrder = await RazorpayService.createOrder({
      amount: amountInPaise,
      currency: currency,
      receipt: receipt,
      notes: {
        slot_id: slot_id,
        partner_id: partner_id,
        user_id: userId,
        payment_type: 'booking_fee'
      }
    });

    // Save order to database
    const dbOrder = await RazorpayOrder.create({
      razorpay_order_id: razorpayOrder.id,
      amount: bookingFee,
      currency: currency,
      receipt: receipt,
      status: razorpayOrder.status,
      customer_id: userId,
      customer_type: 'user',
      metadata: {
        slot_id,
        partner_id,
        payment_type: 'booking_fee'
      }
    });

    res.status(201).json({
      message: 'Booking order created successfully',
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

    // Get order from database
    const dbOrder = await RazorpayOrder.findByOrderId(razorpay_order_id);
    if (!dbOrder) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // Save payment to database
    const dbPayment = await RazorpayPayment.create({
      razorpay_payment_id: payment.id,
      razorpay_order_id: razorpay_order_id,
      amount: payment.amount / 100,
      currency: payment.currency,
      status: payment.status,
      payment_method: payment.method,
      description: 'Booking fee payment',
      customer_id: dbOrder.customer_id,
      customer_type: 'user',
      metadata: {
        ...payment,
        slot_id: slot_id,
        payment_type: 'booking_fee'
      }
    });

    // Update order status
    await RazorpayOrder.updateStatus(razorpay_order_id, payment.status);

    // Create earnings record if payment is successful
    if (payment.status === 'captured' || payment.status === 'authorized') {
      try {
        // Get partner_id from order metadata
        const orderMetadata = dbOrder.metadata || {};
        const partnerIdFromMetadata = orderMetadata.partner_id;
        
        // Try to find appointment_id from slot_id if available
        let appointmentId = null;
        if (slot_id) {
          const slotQuery = `SELECT appointment_id FROM availability_slots WHERE id = $1`;
          const slotResult = await db.query(slotQuery, [slot_id]);
          if (slotResult.rows[0] && slotResult.rows[0].appointment_id) {
            appointmentId = slotResult.rows[0].appointment_id;
          }
        }

        // Find partner by partner_id string (e.g., "AB12345") to get internal ID
        if (partnerIdFromMetadata) {
          const Partner = require('../models/Partner');
          const partner = await Partner.findByPartnerId(partnerIdFromMetadata);
          
          if (partner) {
            // Create earnings record - 100% goes to partner
            await Earnings.create({
              recipient_id: partner.id,
              recipient_type: 'partner',
              razorpay_payment_id: payment.id,
              amount: dbPayment.amount, // Full booking fee amount
              currency: dbPayment.currency,
              status: 'pending', // Waiting for Razorpay settlement
              appointment_id: appointmentId,
              payout_date: null // Will be set when settled
            });

            console.log(`[EARNINGS] Created earnings record for partner ${partner.id} from booking payment ${payment.id}`);
          } else {
            console.warn(`[EARNINGS] Partner not found for partner_id: ${partnerIdFromMetadata}`);
          }
        }
      } catch (earningsError) {
        // Log error but don't fail the payment verification
        console.error('[EARNINGS] Failed to create earnings record:', earningsError);
      }
    }

    res.json({
      message: 'Booking payment verified successfully',
      payment: {
        id: dbPayment.id,
        status: dbPayment.status,
        amount: dbPayment.amount
      },
      booking_confirmed: payment.status === 'captured' || payment.status === 'authorized'
    });
  } catch (error) {
    console.error('Verify booking payment error:', error);
    res.status(500).json({
      error: 'Failed to verify booking payment',
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
  verifyBookingPayment
};

