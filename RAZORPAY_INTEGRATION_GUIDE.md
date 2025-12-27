# Razorpay Integration Guide

This document outlines the Razorpay payment integration implementation for the Therapy Tracker application.

## Overview

The integration includes:
- Database schema for tracking Razorpay payments, subscriptions, and orders
- New subscription plans based on the pricing table
- Razorpay SDK integration
- Payment processing controllers and routes
- Webhook handling for payment events

## Database Changes

### New Tables

1. **razorpay_payments** - Tracks all payment transactions
2. **razorpay_subscriptions** - Tracks recurring subscriptions
3. **razorpay_orders** - Tracks orders
4. **razorpay_webhooks** - Tracks webhook events for audit

### Updated Tables

1. **partner_subscriptions** - Added Razorpay fields:
   - `razorpay_subscription_id`
   - `razorpay_payment_id`
   - `payment_status`
   - `subscription_start_date`
   - `subscription_end_date`

2. **organizations** - Added Razorpay fields:
   - `razorpay_subscription_id`
   - `razorpay_customer_id`
   - `payment_status`

## New Subscription Plans

### For Individual Therapists

1. **Starter Plan**
   - Monthly: ₹299/month
   - Quarterly: ₹799/quarter
   - Yearly: ₹3,199/year
   - Features: Up to 20 sessions, Basic appointment scheduling, Advanced assessments & questionnaires, Simple case notes, Email support

2. **Pro Plan**
   - Monthly: ₹549/month
   - Quarterly: ₹1,499/quarter
   - Yearly: ₹5,599/year
   - Features: Unlimited Sessions, Advanced assessments & questionnaires, Report generation, WhatsApp messages to clients on booking, Email support

3. **Pro Plan Video**
   - Monthly: ₹999/month
   - Quarterly: ₹2,699/quarter
   - Yearly: ₹9,999/year
   - Features: Unlimited Sessions, Advanced assessments & questionnaires, Report generation, WhatsApp messages to clients on booking, Custom branding, Advanced analytics, Priority support

### For Organizations (Small Org - 2-5 therapists)

1. **Pro Plan**
   - Monthly: ₹549/month per therapist
   - Quarterly: ₹1,499/quarter per therapist
   - Yearly: ₹5,599/year per therapist
   - Features: Unlimited Sessions, Advanced assessments & questionnaires, Report generation, WhatsApp messages to clients on booking, Priority support

2. **Pro Plan Video**
   - Monthly: ₹999/month per therapist
   - Quarterly: ₹2,699/quarter per therapist
   - Yearly: ₹9,999/year per therapist
   - Features: Unlimited Sessions, Advanced assessments & questionnaires, Report generation, WhatsApp messages to clients on booking, Custom branding, Advanced analytics, Priority support

## Environment Variables

Add the following to your `.env` file:

```env
RAZORPAY_KEY_ID=your_razorpay_key_id
RAZORPAY_KEY_SECRET=your_razorpay_key_secret
RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
```

**Note**: The `RAZORPAY_WEBHOOK_SECRET` is obtained from your Razorpay Dashboard:
1. Go to Settings → Webhooks
2. Create or select your webhook endpoint
3. Copy the webhook secret provided by Razorpay
4. Add it to your `.env` file

**Security**: The webhook secret is required for production. Without it, webhook signature verification will fail in production mode, ensuring only legitimate Razorpay webhooks are processed.

## Migration Steps

1. **Run Razorpay integration migration:**
   ```bash
   psql -U postgres -d therapy_tracker -f backend/database/migrations/add_razorpay_integration.sql
   ```

2. **Replace existing subscription plans:**
   ```bash
   psql -U postgres -d therapy_tracker -f backend/database/migrations/replace_subscription_plans_with_new_plans.sql
   ```

## API Endpoints

### Create Order
```
POST /api/razorpay/create-order
Headers: Authorization: Bearer <token>
Body: {
  "subscription_plan_id": 1,
  "billing_period": "monthly",
  "number_of_therapists": 2  // Optional, for organizations
}
```

### Verify Payment
```
POST /api/razorpay/verify-payment
Headers: Authorization: Bearer <token>
Body: {
  "razorpay_order_id": "order_xxx",
  "razorpay_payment_id": "pay_xxx",
  "razorpay_signature": "signature_xxx"
}
```

### Get Payment History
```
GET /api/razorpay/payment-history
Headers: Authorization: Bearer <token>
```

### Webhook Endpoint
```
POST /api/razorpay/webhook
Body: Razorpay webhook payload
```

## Models

### RazorpayPayment
- `create()` - Create payment record
- `findByPaymentId()` - Find payment by Razorpay payment ID
- `findByCustomer()` - Find payments by customer
- `updateStatus()` - Update payment status

### RazorpaySubscription
- `create()` - Create subscription record
- `findBySubscriptionId()` - Find subscription by Razorpay subscription ID
- `findActiveByCustomer()` - Find active subscription
- `update()` - Update subscription

### RazorpayOrder
- `create()` - Create order record
- `findByOrderId()` - Find order by Razorpay order ID
- `updateStatus()` - Update order status

## Services

### RazorpayService
- `createOrder()` - Create Razorpay order
- `createSubscription()` - Create Razorpay subscription
- `createPlan()` - Create Razorpay plan
- `fetchPayment()` - Fetch payment details
- `fetchSubscription()` - Fetch subscription details
- `cancelSubscription()` - Cancel subscription
- `verifyPaymentSignature()` - Verify payment signature
- `createOrderAndSave()` - Create order and save to database

## Payment Flow

1. User selects a subscription plan and billing period
2. Frontend calls `/api/razorpay/create-order`
3. Backend creates Razorpay order and returns order details
4. Frontend initializes Razorpay checkout with order details
5. User completes payment on Razorpay
6. Frontend calls `/api/razorpay/verify-payment` with payment details
7. Backend verifies signature and updates subscription
8. Razorpay sends webhook events for payment status updates

## Webhook Events Handled

- `payment.captured` - Payment successful
- `payment.authorized` - Payment authorized
- `payment.failed` - Payment failed
- `subscription.activated` - Subscription activated
- `subscription.charged` - Subscription charged
- `subscription.cancelled` - Subscription cancelled
- `subscription.completed` - Subscription completed

## Security Notes

1. Always verify Razorpay signatures before processing payments
2. **Webhook signature verification is implemented** - All webhooks are verified using HMAC SHA-256 signatures
3. Use HTTPS for webhook endpoints (required in production)
4. Store Razorpay keys securely in environment variables
5. Never commit secrets to version control
6. Log all payment events for audit purposes (stored in `razorpay_webhooks` table)
7. The webhook endpoint rejects requests without valid signatures to prevent unauthorized access

## Testing

1. Use Razorpay test keys for development
2. Test with Razorpay test cards
3. Verify webhook handling with Razorpay dashboard
4. Test payment failure scenarios
5. Test subscription cancellation

## Next Steps

1. **Configure Razorpay webhook URL in Razorpay dashboard**:
   - Go to Settings → Webhooks in your Razorpay dashboard
   - Add webhook URL: `https://yourdomain.com/api/razorpay/webhook`
   - Copy the webhook secret and add it to your `.env` as `RAZORPAY_WEBHOOK_SECRET`
   - Enable the following events:
     - `payment.captured`
     - `payment.authorized`
     - `payment.failed`
     - `subscription.activated`
     - `subscription.charged`
     - `subscription.cancelled`
     - `subscription.completed`

2. Set up production Razorpay keys
3. Implement frontend payment UI
4. Add email notifications for payment events
5. Set up monitoring and alerts for failed payments

## Webhook Security Implementation

The webhook endpoint (`/api/razorpay/webhook`) now includes signature verification:

- **Signature Verification**: All incoming webhooks are verified using HMAC SHA-256 signatures
- **Raw Body Capture**: The webhook endpoint captures the raw request body for accurate signature verification
- **Production Safety**: In production mode, webhooks without valid signatures are rejected
- **Development Mode**: In development, warnings are logged if the webhook secret is not configured, but processing continues

The signature verification uses the `X-Razorpay-Signature` header and compares it against a signature generated using your webhook secret and the raw request body.

