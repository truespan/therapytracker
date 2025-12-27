const Razorpay = require('razorpay');
const RazorpayOrder = require('../models/RazorpayOrder');
const RazorpayPayment = require('../models/RazorpayPayment');
const RazorpaySubscription = require('../models/RazorpaySubscription');
const SubscriptionPlan = require('../models/SubscriptionPlan');

// Lazy-initialize Razorpay instance
let razorpayInstance = null;

function getRazorpayInstance() {
  if (!razorpayInstance) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;

    if (!keyId || !keySecret) {
      throw new Error('Razorpay credentials not configured. Please set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in your .env file');
    }

    razorpayInstance = new Razorpay({
      key_id: keyId,
      key_secret: keySecret
    });
  }
  return razorpayInstance;
}

class RazorpayService {
  /**
   * Create a Razorpay order for one-time payment
   * @param {Object} orderData - Order data
   * @param {number} orderData.amount - Amount in paise (smallest currency unit)
   * @param {string} orderData.currency - Currency code (default: INR)
   * @param {string} orderData.receipt - Receipt ID
   * @param {Object} orderData.notes - Additional notes
   * @returns {Promise<Object>} Razorpay order object
   */
  static async createOrder(orderData) {
    try {
      const { amount, currency = 'INR', receipt, notes = {} } = orderData;

      const options = {
        amount: amount, // Amount in paise
        currency: currency,
        receipt: receipt,
        notes: notes
      };

      const razorpay = getRazorpayInstance();
      const order = await razorpay.orders.create(options);
      return order;
    } catch (error) {
      console.error('Razorpay create order error:', error);
      throw new Error(`Failed to create Razorpay order: ${error.message}`);
    }
  }

  /**
   * Create a Razorpay subscription
   * @param {Object} subscriptionData - Subscription data
   * @param {number} subscriptionData.plan_id - Razorpay plan ID
   * @param {number} subscriptionData.customer_notify - Whether to notify customer (default: 1)
   * @param {number} subscriptionData.quantity - Quantity (default: 1)
   * @param {Object} subscriptionData.notes - Additional notes
   * @returns {Promise<Object>} Razorpay subscription object
   */
  static async createSubscription(subscriptionData) {
    try {
      const {
        plan_id,
        customer_notify = 1,
        quantity = 1,
        notes = {}
      } = subscriptionData;

      const options = {
        plan_id: plan_id,
        customer_notify: customer_notify,
        quantity: quantity,
        notes: notes
      };

      const razorpay = getRazorpayInstance();
      const subscription = await razorpay.subscriptions.create(options);
      return subscription;
    } catch (error) {
      console.error('Razorpay create subscription error:', error);
      throw new Error(`Failed to create Razorpay subscription: ${error.message}`);
    }
  }

  /**
   * Create a Razorpay plan for recurring subscription
   * @param {Object} planData - Plan data
   * @param {number} planData.amount - Amount in paise
   * @param {string} planData.currency - Currency code (default: INR)
   * @param {string} planData.period - Billing period ('monthly', 'quarterly', 'yearly')
   * @param {number} planData.interval - Interval count (1 for monthly, 3 for quarterly, 12 for yearly)
   * @param {string} planData.item - Item details
   * @returns {Promise<Object>} Razorpay plan object
   */
  static async createPlan(planData) {
    try {
      const {
        amount,
        currency = 'INR',
        period,
        interval,
        item
      } = planData;

      const options = {
        period: period,
        interval: interval,
        item: {
          name: item.name,
          amount: amount,
          currency: currency,
          description: item.description || ''
        }
      };

      const razorpay = getRazorpayInstance();
      const plan = await razorpay.plans.create(options);
      return plan;
    } catch (error) {
      console.error('Razorpay create plan error:', error);
      throw new Error(`Failed to create Razorpay plan: ${error.message}`);
    }
  }

  /**
   * Fetch payment details from Razorpay
   * @param {string} paymentId - Razorpay payment ID
   * @returns {Promise<Object>} Payment details
   */
  static async fetchPayment(paymentId) {
    try {
      const razorpay = getRazorpayInstance();
      const payment = await razorpay.payments.fetch(paymentId);
      return payment;
    } catch (error) {
      console.error('Razorpay fetch payment error:', error);
      throw new Error(`Failed to fetch payment: ${error.message}`);
    }
  }

  /**
   * Fetch subscription details from Razorpay
   * @param {string} subscriptionId - Razorpay subscription ID
   * @returns {Promise<Object>} Subscription details
   */
  static async fetchSubscription(subscriptionId) {
    try {
      const razorpay = getRazorpayInstance();
      const subscription = await razorpay.subscriptions.fetch(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Razorpay fetch subscription error:', error);
      throw new Error(`Failed to fetch subscription: ${error.message}`);
    }
  }

  /**
   * Cancel a subscription
   * @param {string} subscriptionId - Razorpay subscription ID
   * @param {Object} options - Cancel options
   * @param {boolean} options.cancel_at_cycle_end - If true, cancel at end of billing cycle
   * @returns {Promise<Object>} Cancelled subscription
   */
  static async cancelSubscription(subscriptionId, options = {}) {
    try {
      const razorpay = getRazorpayInstance();
      // By default, cancel at cycle end to allow continued access
      const cancelOptions = {
        cancel_at_cycle_end: options.cancel_at_cycle_end !== undefined ? options.cancel_at_cycle_end : 1
      };
      const subscription = await razorpay.subscriptions.cancel(subscriptionId, cancelOptions);
      return subscription;
    } catch (error) {
      console.error('Razorpay cancel subscription error:', error);
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  /**
   * Pause a subscription
   * @param {string} subscriptionId - Razorpay subscription ID
   * @param {Object} options - Pause options
   * @returns {Promise<Object>} Paused subscription
   */
  static async pauseSubscription(subscriptionId, options = {}) {
    try {
      const razorpay = getRazorpayInstance();
      const subscription = await razorpay.subscriptions.pause(subscriptionId, options);
      return subscription;
    } catch (error) {
      console.error('Razorpay pause subscription error:', error);
      throw new Error(`Failed to pause subscription: ${error.message}`);
    }
  }

  /**
   * Resume a paused subscription
   * @param {string} subscriptionId - Razorpay subscription ID
   * @returns {Promise<Object>} Resumed subscription
   */
  static async resumeSubscription(subscriptionId) {
    try {
      const razorpay = getRazorpayInstance();
      const subscription = await razorpay.subscriptions.resume(subscriptionId);
      return subscription;
    } catch (error) {
      console.error('Razorpay resume subscription error:', error);
      throw new Error(`Failed to resume subscription: ${error.message}`);
    }
  }

  /**
   * Verify payment signature
   * @param {string} razorpay_order_id - Razorpay order ID
   * @param {string} razorpay_payment_id - Razorpay payment ID
   * @param {string} razorpay_signature - Razorpay signature
   * @returns {boolean} Whether signature is valid
   */
  static verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature) {
    const crypto = require('crypto');
    const secret = process.env.RAZORPAY_KEY_SECRET;
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac('sha256', secret)
      .update(text)
      .digest('hex');

    return generated_signature === razorpay_signature;
  }

  /**
   * Verify webhook signature
   * @param {string} payload - Raw webhook request body as string
   * @param {string} signature - Webhook signature from X-Razorpay-Signature header
   * @param {string} secret - Webhook secret (from RAZORPAY_WEBHOOK_SECRET env var)
   * @returns {boolean} Whether signature is valid
   */
  static verifyWebhookSignature(payload, signature, secret) {
    if (!payload || !signature || !secret) {
      return false;
    }

    const crypto = require('crypto');
    const expectedSignature = crypto
      .createHmac('sha256', secret)
      .update(payload)
      .digest('hex');

    // Use constant-time comparison to prevent timing attacks
    // Both signatures should be hex strings (64 characters for SHA-256)
    if (expectedSignature.length !== signature.length) {
      return false;
    }

    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature, 'hex'),
        Buffer.from(signature, 'hex')
      );
    } catch (error) {
      // If buffer creation fails, signatures don't match
      return false;
    }
  }

  /**
   * Create order and save to database
   * @param {Object} orderData - Order data
   * @param {number} orderData.customer_id - Customer ID
   * @param {string} orderData.customer_type - Customer type
   * @param {number} orderData.subscription_plan_id - Subscription plan ID
   * @param {string} orderData.billing_period - Billing period
   * @returns {Promise<Object>} Created order with database record
   */
  static async createOrderAndSave(orderData) {
    const {
      customer_id,
      customer_type,
      subscription_plan_id,
      billing_period
    } = orderData;

    // Get plan price
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      throw new Error('Subscription plan not found');
    }

    const priceColumn = customer_type === 'organization'
      ? `organization_${billing_period}_price`
      : `individual_${billing_period}_price`;

    let amount = parseFloat(plan[priceColumn]);

    // For organizations, multiply by number of therapists if needed
    if (customer_type === 'organization' && orderData.number_of_therapists) {
      amount = amount * orderData.number_of_therapists;
    }

    // Convert to paise (multiply by 100)
    const amountInPaise = Math.round(amount * 100);

    // Create receipt ID
    const receipt = `receipt_${customer_type}_${customer_id}_${Date.now()}`;

    // Create Razorpay order
    const razorpayOrder = await this.createOrder({
      amount: amountInPaise,
      currency: 'INR',
      receipt: receipt,
      notes: {
        customer_id: customer_id.toString(),
        customer_type: customer_type,
        subscription_plan_id: subscription_plan_id.toString(),
        billing_period: billing_period
      }
    });

    // Save to database
    const dbOrder = await RazorpayOrder.create({
      razorpay_order_id: razorpayOrder.id,
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      status: razorpayOrder.status,
      customer_id: customer_id,
      customer_type: customer_type,
      subscription_plan_id: subscription_plan_id,
      billing_period: billing_period,
      notes: {
        plan_name: plan.plan_name,
        amount_in_paise: amountInPaise
      }
    });

    return {
      razorpay_order: razorpayOrder,
      db_order: dbOrder
    };
  }
}

module.exports = RazorpayService;

