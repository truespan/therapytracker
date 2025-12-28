/**
 * Subscription Helper Utilities
 * Functions for calculating plan values, detecting upgrades, and managing subscription status
 */

/**
 * Calculate the total value of a plan based on billing period
 * @param {Object} plan - Subscription plan object
 * @param {string} billingPeriod - 'monthly', 'quarterly', or 'yearly'
 * @param {string} userType - 'individual' or 'organization'
 * @returns {number} Total value (price × period multiplier)
 */
export const calculatePlanValue = (plan, billingPeriod, userType = 'individual') => {
  if (!plan) return 0;
  
  const prefix = userType === 'individual' ? 'individual' : 'organization';
  const priceKey = `${prefix}_${billingPeriod}_price`;
  const price = parseFloat(plan[priceKey] || 0);
  
  // Multiplier: monthly = 1, quarterly = 3, yearly = 12
  const multiplier = billingPeriod === 'monthly' ? 1 : billingPeriod === 'quarterly' ? 3 : 12;
  
  return price * multiplier;
};

/**
 * Check if a plan change is an upgrade (higher total value)
 * @param {Object} currentPlan - Current subscription plan
 * @param {string} currentBilling - Current billing period
 * @param {Object} newPlan - New subscription plan
 * @param {string} newBilling - New billing period
 * @param {string} userType - 'individual' or 'organization'
 * @returns {boolean} True if new plan is an upgrade
 */
export const isUpgrade = (currentPlan, currentBilling, newPlan, newBilling, userType = 'individual') => {
  const currentValue = calculatePlanValue(currentPlan, currentBilling, userType);
  const newValue = calculatePlanValue(newPlan, newBilling, userType);
  return newValue > currentValue;
};

/**
 * Check if a plan is the Free Plan
 * @param {Object} plan - Subscription plan object
 * @returns {boolean} True if plan is Free Plan
 */
export const isFreePlan = (plan) => {
  if (!plan) return false;
  return plan.plan_name && plan.plan_name.toLowerCase() === 'free plan';
};

/**
 * Check if a plan is a paid plan (not Free Plan)
 * @param {Object} plan - Subscription plan object
 * @returns {boolean} True if plan is paid
 */
export const isPaidPlan = (plan) => {
  return plan && !isFreePlan(plan);
};

/**
 * Check if subscription is active (not expired and not cancelled, or cancelled but still within period)
 * @param {Object} subscription - Subscription object
 * @returns {boolean} True if subscription is active
 */
export const isSubscriptionActive = (subscription) => {
  if (!subscription) return false;
  
  const now = new Date();
  const endDate = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;
  
  // If cancelled, check if still within active period
  if (subscription.is_cancelled) {
    return endDate && endDate > now;
  }
  
  // Not cancelled, check if not expired
  return !endDate || endDate > now;
};

/**
 * Check if subscription can be cancelled
 * @param {Object} subscription - Subscription object
 * @returns {boolean} True if subscription can be cancelled
 */
export const canCancelSubscription = (subscription) => {
  if (!subscription) return false;
  
  // Already cancelled
  if (subscription.is_cancelled) return false;
  
  // Must have an end date (paid subscription)
  if (!subscription.subscription_end_date) return false;
  
  // Must be active
  return isSubscriptionActive(subscription);
};

/**
 * Get subscription status label
 * @param {Object} subscription - Subscription object
 * @returns {string} Status label ('active', 'cancelled', 'expired')
 */
export const getSubscriptionStatus = (subscription) => {
  if (!subscription) return 'none';
  
  const now = new Date();
  const endDate = subscription.subscription_end_date ? new Date(subscription.subscription_end_date) : null;
  
  if (subscription.is_cancelled) {
    if (endDate && endDate > now) {
      return 'cancelled'; // Cancelled but still active
    }
    return 'expired'; // Cancelled and expired
  }
  
  if (endDate && endDate <= now) {
    return 'expired';
  }
  
  return 'active';
};

/**
 * Format subscription end date
 * @param {string|Date} endDate - Subscription end date
 * @returns {string} Formatted date string
 */
export const formatEndDate = (endDate) => {
  if (!endDate) return '';
  
  const date = new Date(endDate);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

/**
 * Check if there are upgradeable plans available
 * @param {Array} allPlans - Array of all available plans
 * @param {Object} currentPlan - Current subscription plan
 * @param {string} currentBilling - Current billing period
 * @param {string} userType - 'individual' or 'organization'
 * @returns {boolean} True if upgrades are available
 */
export const hasUpgradeablePlans = (allPlans, currentPlan, currentBilling, userType = 'individual') => {
  if (!currentPlan || !allPlans || allPlans.length === 0) return false;
  
  // If on Free Plan, all paid plans are upgrades
  if (isFreePlan(currentPlan)) {
    return allPlans.some(plan => isPaidPlan(plan));
  }
  
  const currentValue = calculatePlanValue(currentPlan, currentBilling, userType);
  
  // Check if any plan with any billing period has higher value
  return allPlans.some(plan => {
    const periods = ['monthly', 'quarterly', 'yearly'];
    return periods.some(period => {
      const planValue = calculatePlanValue(plan, period, userType);
      return planValue > currentValue;
    });
  });
};

/**
 * Get the button text for plan selection
 * @param {Object} currentPlan - Current subscription plan
 * @param {Array} availablePlans - Available plans
 * @param {string} currentBilling - Current billing period
 * @param {string} userType - 'individual' or 'organization'
 * @returns {string|null} Button text or null if no button should be shown
 */
export const getPlanSelectionButtonText = (currentPlan, availablePlans, currentBilling, userType = 'individual') => {
  // No current plan - show "Select Plan"
  if (!currentPlan) {
    return 'Select Plan';
  }
  
  // On Free Plan - show "Upgrade" if paid plans available
  if (isFreePlan(currentPlan)) {
    const hasPaidPlans = availablePlans && availablePlans.some(plan => isPaidPlan(plan));
    return hasPaidPlans ? 'Upgrade' : null;
  }
  
  // On paid plan - show "Upgrade" if upgradeable plans exist, otherwise hide button
  const hasUpgrades = hasUpgradeablePlans(availablePlans, currentPlan, currentBilling, userType);
  return hasUpgrades ? 'Upgrade' : null;
};

/**
 * Get billing period multiplier for calculations
 * @param {string} billingPeriod - 'monthly', 'quarterly', or 'yearly'
 * @returns {number} Multiplier value
 */
export const getBillingPeriodMultiplier = (billingPeriod) => {
  switch (billingPeriod) {
    case 'monthly':
      return 1;
    case 'quarterly':
      return 3;
    case 'yearly':
      return 12;
    default:
      return 1;
  }
};

/**
 * Get billing period label
 * @param {string} period - 'monthly', 'quarterly', or 'yearly'
 * @returns {string} Formatted label
 */
export const getBillingPeriodLabel = (period) => {
  const labels = {
    monthly: 'Monthly',
    quarterly: 'Quarterly',
    yearly: 'Yearly'
  };
  return labels[period] || period;
};



