# Locale/Country-Based Subscription Plans Implementation

This document describes the implementation of locale and country-based subscription plan pricing for the Therapy Tracker application.

## Overview

The system now supports different subscription plan prices for different countries/locales. Users will automatically see pricing in their local currency based on:
1. Their browser locale settings
2. Their IP address (geolocation)
3. Manual locale selection (via query parameters)

## What Was Implemented

### 1. Database Schema

**Migration File**: `backend/database/migrations/add_locale_support_to_subscription_plans.sql`

- Created `subscription_plan_locales` table to store locale-specific pricing
- Supports country codes (ISO 3166-1 alpha-2), locales (e.g., 'en-US'), and currencies (ISO 4217)
- Stores individual and organization prices for yearly, quarterly, and monthly billing periods
- Falls back to global pricing from `subscription_plans` table if locale-specific pricing is not available

### 2. Backend Implementation

#### Locale Detection Middleware
**File**: `backend/src/middleware/localeDetection.js`

- Detects user locale from:
  1. Query parameters (`?locale=en-US` or `?country_code=US`)
  2. Accept-Language header
  3. IP-based geolocation (using `geoip-lite`)

#### Updated Subscription Plan Model
**File**: `backend/src/models/SubscriptionPlan.js`

Added methods:
- `getPriceWithLocale()` - Get price for specific locale with fallback to global pricing
- `getActiveWithLocale()` - Get all active plans with locale-specific pricing
- `getIndividualPlansWithLocale()` - Get individual plans with locale pricing
- `getOrganizationPlansWithLocale()` - Get organization plans with locale pricing

#### Updated Subscription Plan Controller
**File**: `backend/src/controllers/subscriptionPlanController.js`

- All endpoints now use locale detection
- Returns locale and countryCode in response for frontend use

#### Updated Routes
**File**: `backend/src/routes/subscriptionPlanRoutes.js`

- Applied `detectLocale` middleware to all subscription plan routes

### 3. Frontend Implementation

#### Locale Detection Utility
**File**: `frontend/src/utils/localeDetection.js`

Functions:
- `detectUserLocale()` - Detects locale from browser/localStorage
- `saveUserLocale()` - Saves user locale preference
- `formatCurrency()` - Formats currency based on locale

#### Updated Components

**SubscriptionPlanModal.jsx**:
- Automatically detects user locale
- Passes locale to API calls
- Displays prices in user's currency with proper formatting

**SubscriptionManagement.jsx**:
- Uses locale detection when loading trial plans

**api.js**:
- Updated `subscriptionPlanAPI` methods to accept locale parameters

### 4. Example Seed Data

**File**: `backend/database/migrations/seed_locale_pricing_example.sql`

- Example pricing for US (USD), UK (GBP), and Canada (CAD)
- Uses automatic conversion from INR (adjust conversion rates as needed)
- Can be customized for specific market pricing strategies

## How to Use

### Running the Migration

1. **Create the locale pricing table**:
   ```bash
   psql -U postgres -d therapy_tracker -f backend/database/migrations/add_locale_support_to_subscription_plans.sql
   ```

2. **Add example locale pricing** (optional):
   ```bash
   psql -U postgres -d therapy_tracker -f backend/database/migrations/seed_locale_pricing_example.sql
   ```

### Adding Locale-Specific Pricing

You can add locale-specific pricing via SQL:

```sql
INSERT INTO subscription_plan_locales (
  subscription_plan_id, 
  country_code, 
  locale, 
  currency_code,
  individual_yearly_price, 
  individual_quarterly_price, 
  individual_monthly_price,
  organization_yearly_price, 
  organization_quarterly_price, 
  organization_monthly_price,
  is_active
) VALUES (
  1,              -- subscription_plan_id
  'US',           -- country_code (ISO 3166-1 alpha-2)
  'en-US',        -- locale
  'USD',          -- currency_code (ISO 4217)
  120.00,         -- individual_yearly_price
  35.00,          -- individual_quarterly_price
  12.00,          -- individual_monthly_price
  100.00,         -- organization_yearly_price
  30.00,          -- organization_quarterly_price
  10.00,          -- organization_monthly_price
  TRUE            -- is_active
);
```

### Testing Locale Detection

1. **Via Query Parameter**:
   ```
   GET /api/subscription-plans/active?locale=en-US&country_code=US
   ```

2. **Via Browser Locale**:
   - Change browser language settings
   - System will automatically detect

3. **Via IP Geolocation**:
   - System automatically detects country from IP address
   - Works as fallback if no query parameter or Accept-Language header

### Frontend Usage

```javascript
import { detectUserLocale, formatCurrency } from '../utils/localeDetection';

// Detect user locale
const { locale, countryCode } = detectUserLocale();

// Use in API calls
const response = await api.get('/subscription-plans/active', {
  params: { locale, country_code: countryCode }
});

// Format currency
const formattedPrice = formatCurrency(120, 'USD', 'en-US');
// Output: "$120.00"
```

## How It Works

1. **User visits the site** → Frontend detects locale from browser/localStorage
2. **API request made** → Locale passed as query parameter or detected via middleware
3. **Backend processes** → Checks for locale-specific pricing in `subscription_plan_locales` table
4. **Fallback** → If no locale-specific pricing found, uses global pricing from `subscription_plans` table
5. **Response** → Returns plans with locale-specific prices (if available) and currency code
6. **Frontend displays** → Shows prices formatted according to user's locale

## Default Behavior

- **Default Locale**: `en-IN` (English - India)
- **Default Currency**: `INR` (Indian Rupees)
- **Default Country**: `IN` (India)

If no locale-specific pricing exists, the system automatically falls back to the global pricing defined in the `subscription_plans` table.

## Admin Features

Admins can manage locale-specific pricing by:
1. Directly inserting/updating records in `subscription_plan_locales` table
2. Creating admin UI (future enhancement) to manage locale pricing
3. Using SQL scripts to bulk update pricing for multiple locales

## Currency Formatting

The frontend automatically formats currencies based on locale:
- `en-US` with `USD` → $120.00
- `en-IN` with `INR` → ₹120.00
- `en-GB` with `GBP` → £120.00

## Notes

1. **Exchange Rates**: The example seed data uses approximate conversion rates. Update these based on current exchange rates and your pricing strategy.

2. **Market Pricing**: Consider market research when setting locale-specific prices. Simple currency conversion may not be appropriate due to purchasing power differences.

3. **Missing Locales**: If a user's locale has no specific pricing, they will see prices in the default currency (INR).

4. **Testing**: Test with different browser locales and IP addresses to ensure proper detection.

5. **Performance**: Locale detection adds minimal overhead. IP-based geolocation is used only as a fallback.

## Troubleshooting

### Plans not showing locale-specific pricing

1. Check if locale pricing exists in database:
   ```sql
   SELECT * FROM subscription_plan_locales WHERE country_code = 'US';
   ```

2. Verify locale detection is working:
   - Check browser console for locale values
   - Check API response for `locale` and `countryCode` fields

3. Ensure migration was run successfully

### Wrong currency displayed

1. Check `currency_code` in `subscription_plan_locales` table
2. Verify `formatCurrency` function is using correct locale parameter
3. Check browser's locale settings

## Future Enhancements

1. Admin UI for managing locale-specific pricing
2. Automatic exchange rate updates
3. Support for multiple currencies per locale
4. A/B testing different prices per locale
5. Pricing analytics per locale
