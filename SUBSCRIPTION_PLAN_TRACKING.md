# Subscription Plan Tracking Implementation

This document describes the subscription plan tracking system that tracks when users see the subscription plan modal and attempt payments.

## Overview

The system tracks three types of events:
1. **modal_shown** - When the "Select Your Subscription Plan" modal is displayed
2. **payment_attempted** - When user clicks "Select & Pay" button
3. **payment_completed** - When payment is successfully completed

## Database Schema

The `subscription_plan_events` table stores all tracking events with the following fields:
- `user_type` - 'partner' or 'organization'
- `user_id` - ID of the user
- `event_type` - Type of event (modal_shown, payment_attempted, payment_completed)
- `subscription_plan_id` - ID of the selected plan (if applicable)
- `billing_period` - Selected billing period (monthly, quarterly, yearly)
- `is_first_login` - Boolean indicating if this was the user's first login
- `event_timestamp` - When the event occurred
- `metadata` - JSON field with additional data (plan name, price, etc.)

## API Endpoints

### Log Event
```
POST /api/subscription-plans/log-event
Headers: Authorization: Bearer <token>
Body: {
  event_type: 'modal_shown' | 'payment_attempted' | 'payment_completed',
  subscription_plan_id: number (optional),
  billing_period: string (optional),
  is_first_login: boolean (optional),
  metadata: object (optional)
}
```

### Check First Login
```
GET /api/subscription-plans/check-first-login
Headers: Authorization: Bearer <token>
Response: {
  is_first_login: boolean
}
```

## Query Examples

### Get all events for a specific user
```sql
SELECT 
    event_type,
    subscription_plan_id,
    billing_period,
    is_first_login,
    event_timestamp,
    metadata
FROM subscription_plan_events
WHERE user_type = 'partner' AND user_id = :user_id
ORDER BY event_timestamp ASC;
```

### Check if user saw modal on first login
```sql
SELECT 
    event_timestamp as modal_shown_at,
    is_first_login
FROM subscription_plan_events
WHERE user_type = 'partner' 
  AND user_id = :user_id
  AND event_type = 'modal_shown'
  AND is_first_login = true
ORDER BY event_timestamp ASC
LIMIT 1;
```

### Get payment attempt details
```sql
SELECT 
    event_timestamp as payment_attempted_at,
    subscription_plan_id,
    billing_period,
    metadata->>'plan_name' as plan_name,
    metadata->>'price' as price
FROM subscription_plan_events
WHERE user_type = 'partner' 
  AND user_id = :user_id
  AND event_type = 'payment_attempted'
ORDER BY event_timestamp DESC;
```

### Summary for all users
```sql
SELECT 
    user_type,
    user_id,
    COUNT(*) FILTER (WHERE event_type = 'modal_shown') as times_modal_shown,
    COUNT(*) FILTER (WHERE event_type = 'payment_attempted') as payment_attempts,
    COUNT(*) FILTER (WHERE event_type = 'payment_completed') as payments_completed,
    MIN(event_timestamp) FILTER (WHERE event_type = 'modal_shown') as first_modal_shown_at,
    MAX(event_timestamp) FILTER (WHERE event_type = 'payment_attempted') as last_payment_attempt_at,
    MAX(event_timestamp) FILTER (WHERE event_type = 'payment_completed') as last_payment_completed_at
FROM subscription_plan_events
GROUP BY user_type, user_id
ORDER BY first_modal_shown_at DESC;
```

### Find users who saw modal but didn't attempt payment
```sql
SELECT 
    user_type,
    user_id,
    MIN(event_timestamp) FILTER (WHERE event_type = 'modal_shown') as modal_shown_at
FROM subscription_plan_events
WHERE event_type = 'modal_shown'
GROUP BY user_type, user_id
HAVING COUNT(*) FILTER (WHERE event_type = 'payment_attempted') = 0
ORDER BY modal_shown_at DESC;
```

### Get first login events for all partners
```sql
SELECT 
    spe.user_id,
    p.name as partner_name,
    p.email,
    spe.event_timestamp as first_modal_shown_at,
    spe.is_first_login,
    COUNT(*) FILTER (WHERE spe2.event_type = 'payment_attempted') as payment_attempts
FROM subscription_plan_events spe
JOIN partners p ON p.id = spe.user_id
LEFT JOIN subscription_plan_events spe2 ON spe2.user_id = spe.user_id
WHERE spe.user_type = 'partner'
  AND spe.event_type = 'modal_shown'
  AND spe.is_first_login = true
GROUP BY spe.user_id, p.name, p.email, spe.event_timestamp, spe.is_first_login
ORDER BY spe.event_timestamp DESC;
```

## Frontend Implementation

The tracking is automatically implemented in `SubscriptionPlanModal.jsx`:
- Modal shown event is tracked when the modal opens
- Payment attempted event is tracked when "Select & Pay" is clicked
- Payment completed event is tracked when payment is successful

All tracking calls are non-blocking - if tracking fails, the user flow continues normally.

## Migration

To apply the database migration:
```bash
psql -U postgres -d your_database_name -f backend/database/migrations/add_subscription_plan_tracking.sql
```

Or if using a connection string:
```bash
psql $DATABASE_URL -f backend/database/migrations/add_subscription_plan_tracking.sql
```

