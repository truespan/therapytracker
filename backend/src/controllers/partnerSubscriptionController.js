const PartnerSubscription = require('../models/PartnerSubscription');
const Partner = require('../models/Partner');
const Organization = require('../models/Organization');
const SubscriptionPlan = require('../models/SubscriptionPlan');
const db = require('../config/database');

/**
 * Get all subscription assignments for an organization
 */
const getOrganizationPartnerSubscriptions = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Allow both TheraPTrack controlled and non-controlled organizations
    // The functionality is now available for all organizations

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to view this organization\'s subscriptions' });
    }

    const subscriptions = await PartnerSubscription.findByOrganizationId(id);

    res.json({
      success: true,
      subscriptions
    });
  } catch (error) {
    console.error('Get organization partner subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to fetch partner subscriptions',
      details: error.message
    });
  }
};

/**
 * Assign subscription plans to one or more partners
 */
const assignSubscriptions = async (req, res) => {
  try {
    const { id } = req.params;
    const { partner_ids, subscription_plan_id, billing_period } = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Allow both TheraPTrack controlled and non-controlled organizations
    // The functionality is now available for all organizations

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to assign subscriptions for this organization' });
    }

    // Validate required fields
    if (!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) {
      return res.status(400).json({ error: 'partner_ids must be a non-empty array' });
    }

    if (!subscription_plan_id) {
      return res.status(400).json({ error: 'subscription_plan_id is required' });
    }

    if (!billing_period || !['monthly', 'quarterly', 'yearly'].includes(billing_period)) {
      return res.status(400).json({ 
        error: 'billing_period is required and must be one of: monthly, quarterly, yearly' 
      });
    }

    // Validate subscription plan exists
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Validate all partners belong to the organization
    const partners = await Organization.getPartners(id);
    const partnerIds = partners.map(p => p.id);
    const invalidPartnerIds = partner_ids.filter(pid => !partnerIds.includes(parseInt(pid)));

    if (invalidPartnerIds.length > 0) {
      return res.status(400).json({ 
        error: `The following partner IDs do not belong to this organization: ${invalidPartnerIds.join(', ')}` 
      });
    }

    // Assign subscriptions in transaction
    const assignments = partner_ids.map(partner_id => ({
      partner_id: parseInt(partner_id),
      subscription_plan_id: parseInt(subscription_plan_id),
      billing_period
    }));

    const results = await db.transaction(async (client) => {
      return await PartnerSubscription.bulkAssign(assignments, client);
    });

    res.json({
      success: true,
      message: `Subscription assigned to ${results.length} therapist(s) successfully`,
      assignments: results
    });
  } catch (error) {
    console.error('Assign subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to assign subscriptions',
      details: error.message
    });
  }
};

/**
 * Update a partner's subscription assignment
 */
const updateSubscription = async (req, res) => {
  try {
    const { id, subscriptionId } = req.params;
    const { subscription_plan_id, billing_period } = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Allow both TheraPTrack controlled and non-controlled organizations
    // The functionality is now available for all organizations

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to update subscriptions for this organization' });
    }

    // Get subscription assignment
    const subscription = await PartnerSubscription.findById(subscriptionId);
    if (!subscription) {
      return res.status(404).json({ error: 'Subscription assignment not found' });
    }

    // Verify partner belongs to organization
    const partner = await Partner.findById(subscription.partner_id);
    if (!partner || partner.organization_id !== parseInt(id)) {
      return res.status(403).json({ error: 'Subscription does not belong to this organization' });
    }

    // Validate subscription plan if provided
    if (subscription_plan_id) {
      const plan = await SubscriptionPlan.findById(subscription_plan_id);
      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }
    }

    // Validate billing period if provided
    if (billing_period && !['monthly', 'quarterly', 'yearly'].includes(billing_period)) {
      return res.status(400).json({ 
        error: 'billing_period must be one of: monthly, quarterly, yearly' 
      });
    }

    // Update subscription
    const updated = await PartnerSubscription.update(subscriptionId, {
      subscription_plan_id,
      billing_period
    });

    res.json({
      success: true,
      message: 'Subscription updated successfully',
      subscription: updated
    });
  } catch (error) {
    console.error('Update subscription error:', error);
    res.status(500).json({
      error: 'Failed to update subscription',
      details: error.message
    });
  }
};

/**
 * Remove subscription assignment(s) from partner(s)
 */
const removeSubscriptions = async (req, res) => {
  try {
    const { id } = req.params;
    const { partner_ids, subscription_ids } = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Allow both TheraPTrack controlled and non-controlled organizations
    // The functionality is now available for all organizations

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to remove subscriptions for this organization' });
    }

    // Validate input - either partner_ids or subscription_ids must be provided
    if ((!partner_ids || !Array.isArray(partner_ids) || partner_ids.length === 0) &&
        (!subscription_ids || !Array.isArray(subscription_ids) || subscription_ids.length === 0)) {
      return res.status(400).json({ 
        error: 'Either partner_ids or subscription_ids must be provided as a non-empty array' 
      });
    }

    let deletedCount = 0;

    if (subscription_ids && subscription_ids.length > 0) {
      // Remove by subscription IDs
      for (const subscriptionId of subscription_ids) {
        const subscription = await PartnerSubscription.findById(subscriptionId);
        if (subscription) {
          const partner = await Partner.findById(subscription.partner_id);
          if (partner && partner.organization_id === parseInt(id)) {
            await PartnerSubscription.delete(subscriptionId);
            deletedCount++;
          }
        }
      }
    } else if (partner_ids && partner_ids.length > 0) {
      // Remove all subscriptions for specified partners
      const partners = await Organization.getPartners(id);
      const partnerIds = partners.map(p => p.id);
      const validPartnerIds = partner_ids.filter(pid => partnerIds.includes(parseInt(pid)));

      if (validPartnerIds.length === 0) {
        return res.status(400).json({ 
          error: 'None of the provided partner IDs belong to this organization' 
        });
      }

      deletedCount = await PartnerSubscription.bulkRemove(validPartnerIds);
    }

    res.json({
      success: true,
      message: `Removed ${deletedCount} subscription assignment(s)`,
      deleted_count: deletedCount
    });
  } catch (error) {
    console.error('Remove subscriptions error:', error);
    res.status(500).json({
      error: 'Failed to remove subscriptions',
      details: error.message
    });
  }
};

/**
 * Assign subscription plan to all partners in an organization
 */
const assignToAllPartners = async (req, res) => {
  try {
    const { id } = req.params;
    const { subscription_plan_id, billing_period } = req.body;

    // Check if organization exists
    const organization = await Organization.findById(id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(id)) {
      return res.status(403).json({ error: 'Unauthorized to assign subscriptions for this organization' });
    }

    // Validate required fields
    if (!subscription_plan_id) {
      return res.status(400).json({ error: 'subscription_plan_id is required' });
    }

    if (!billing_period || !['monthly', 'quarterly', 'yearly'].includes(billing_period)) {
      return res.status(400).json({
        error: 'billing_period is required and must be one of: monthly, quarterly, yearly'
      });
    }

    // Validate subscription plan exists
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Get all partners for the organization
    const partners = await Organization.getPartners(id);
    if (partners.length === 0) {
      return res.status(400).json({
        error: 'No therapists found in this organization'
      });
    }

    // Validate all partners can use this plan (for organization plans, check therapist count)
    if (plan.plan_type === 'organization') {
      const therapistCount = partners.length;
      const isValidPlan = await SubscriptionPlan.validatePlanForOrganization(subscription_plan_id, therapistCount);
      if (!isValidPlan) {
        return res.status(400).json({
          error: `This plan is not valid for organizations with ${therapistCount} therapists`
        });
      }
    }

    // Create assignments for all partners
    const assignments = partners.map(partner => ({
      partner_id: partner.id,
      subscription_plan_id: parseInt(subscription_plan_id),
      billing_period
    }));

    // Assign subscriptions in transaction
    const results = await db.transaction(async (client) => {
      // First, remove existing subscriptions for all partners
      const partnerIds = partners.map(p => p.id);
      await PartnerSubscription.bulkRemove(partnerIds, client);
      
      // Then assign new subscriptions
      return await PartnerSubscription.bulkAssign(assignments, client);
    });

    res.json({
      success: true,
      message: `Subscription plan assigned to ${results.length} therapist(s) successfully`,
      assignments: results
    });
  } catch (error) {
    console.error('Assign to all partners error:', error);
    res.status(500).json({
      error: 'Failed to assign subscriptions to all partners',
      details: error.message
    });
  }
};

/**
 * Allow a partner to select their own subscription plan
 * Only allowed for partners in TheraPTrack controlled organizations
 * 
 * SECURITY: This endpoint enforces that only therapists in organizations with
 * theraptrack_controlled = true can select their own subscription plans.
 * Therapists in non-controlled organizations must have plans assigned by their organization.
 */
const selectOwnSubscription = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { subscription_plan_id, billing_period } = req.body;

    // Get partner details
    const partner = await Partner.findById(partnerId);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // Check if partner belongs to an organization
    if (!partner.organization_id) {
      return res.status(400).json({ 
        error: 'You must belong to an organization to select a subscription plan' 
      });
    }

    // Get organization details - fetch fresh data to ensure status is current
    const organization = await Organization.findById(partner.organization_id);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // CRITICAL SECURITY CHECK: Only allow for TheraPTrack controlled organizations
    // This check must happen before any subscription operations
    // Therapists in non-controlled orgs cannot select their own plans - org must assign them
    if (!organization.theraptrack_controlled) {
      console.log(`[SECURITY] Blocked subscription selection attempt by partner ${partnerId} in non-controlled org ${organization.id}`);
      return res.status(403).json({ 
        error: 'Subscription plan selection is not available for your organization. Your organization administrator will assign subscription plans to therapists.' 
      });
    }

    // Validate required fields
    if (!subscription_plan_id) {
      return res.status(400).json({ error: 'subscription_plan_id is required' });
    }

    if (!billing_period || !['monthly', 'quarterly', 'yearly'].includes(billing_period)) {
      return res.status(400).json({ 
        error: 'billing_period is required and must be one of: monthly, quarterly, yearly' 
      });
    }

    // Validate subscription plan exists and is for individuals
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    // Check if the plan is for individuals (or common)
    if (plan.plan_type === 'organization') {
      return res.status(400).json({ 
        error: 'This plan is for organizations only. Please select an individual plan.' 
      });
    }

    // Check if billing period is enabled for this plan
    const enabledKey = `individual_${billing_period}_enabled`;
    if (!plan[enabledKey]) {
      return res.status(400).json({ 
        error: `${billing_period} billing is not enabled for this plan` 
      });
    }

    // Remove existing subscriptions for this partner
    await PartnerSubscription.bulkRemove([partnerId]);

    // Create new subscription assignment
    const subscription = await PartnerSubscription.create({
      partner_id: partnerId,
      subscription_plan_id: parseInt(subscription_plan_id),
      billing_period
    });

    res.json({
      success: true,
      message: 'Subscription plan selected successfully',
      subscription
    });
  } catch (error) {
    console.error('Select own subscription error:', error);
    res.status(500).json({
      error: 'Failed to select subscription plan',
      details: error.message
    });
  }
};

const selectPlan = async (req, res) => {
  try {
    const partnerId = req.user.id;
    const { plan_id, billing_period } = req.body;

    console.log(`[SELECT PLAN] Partner ${partnerId} selecting plan ${plan_id} with billing ${billing_period}`);

    // Validate inputs
    if (!plan_id || !billing_period) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID and billing period are required'
      });
    }

    if (!['yearly', 'quarterly', 'monthly'].includes(billing_period)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid billing period. Must be yearly, quarterly, or monthly'
      });
    }

    // Verify partner exists and get organization info
    const partnerResult = await db.query(
      `SELECT p.*, o.theraptrack_controlled 
       FROM partners p
       JOIN organizations o ON p.organization_id = o.id
       WHERE p.id = $1`,
      [partnerId]
    );

    if (partnerResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Partner not found'
      });
    }

    const partner = partnerResult.rows[0];

    // Only allow partners in TheraPTrack-controlled organizations to select their own plans
    if (!partner.theraptrack_controlled) {
      return res.status(403).json({
        success: false,
        error: 'Individual subscription selection is only available for TheraPTrack-controlled partners'
      });
    }

    // Verify plan exists
    const planResult = await db.query(
      'SELECT * FROM subscription_plans WHERE id = $1 AND is_active = true',
      [plan_id]
    );

    if (planResult.rows.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Subscription plan not found or inactive'
      });
    }

    const plan = planResult.rows[0];

    // Calculate subscription dates
    const startDate = new Date();
    let endDate = new Date();

    // Check if plan has plan_duration_days set (for trial plans like 3-day trial)
    if (plan.plan_duration_days && plan.plan_duration_days > 0) {
      // Use plan_duration_days if specified (e.g., 3 for 3-day trial)
      endDate.setDate(endDate.getDate() + plan.plan_duration_days);
    } else {
      // Fall back to billing period calculation for regular plans
      switch (billing_period) {
        case 'yearly':
          endDate.setFullYear(endDate.getFullYear() + 1);
          break;
        case 'quarterly':
          endDate.setMonth(endDate.getMonth() + 3);
          break;
        case 'monthly':
        default:
          endDate.setMonth(endDate.getMonth() + 1);
          break;
      }
    }

    // Mock payment success - In production, integrate with payment gateway here
    // Update partner with subscription details
    const updateResult = await db.query(
      `UPDATE partners 
       SET subscription_plan_id = $1,
           subscription_billing_period = $2,
           subscription_start_date = $3,
           subscription_end_date = $4
       WHERE id = $5
       RETURNING *`,
      [plan_id, billing_period, startDate, endDate, partnerId]
    );

    const updatedPartner = updateResult.rows[0];

    // Fetch full partner data with organization
    const fullPartner = await Partner.findById(partnerId);

    console.log(`[SELECT PLAN] Successfully assigned plan ${plan_id} to partner ${partnerId}`);

    res.json({
      success: true,
      message: 'Subscription activated successfully',
      user: {
        id: fullPartner.id,
        userType: 'partner',
        ...fullPartner
      },
      subscription: {
        plan_name: plan.plan_name,
        billing_period,
        start_date: startDate,
        end_date: endDate,
        max_sessions: plan.max_sessions,
        has_video: plan.has_video
      }
    });

  } catch (error) {
    console.error('Select plan error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to activate subscription',
      details: error.message
    });
  }
};

/**
 * Assign trial plan to therapist (Organization-controlled only)
 */
const assignTrialPlan = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { partner_id, subscription_plan_id, billing_period } = req.body;

    // Verify organization exists and is TheraPTrack controlled
    const organization = await Organization.findById(organizationId);
    if (!organization) {
      return res.status(404).json({ error: 'Organization not found' });
    }
    
    if (!organization.theraptrack_controlled) {
      return res.status(403).json({ 
        error: 'Trial assignment is only available for TheraPTrack-controlled organizations' 
      });
    }

    // Check authorization
    if (req.user.userType === 'organization' && req.user.id !== parseInt(organizationId)) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    // Verify partner belongs to organization
    const partner = await Partner.findById(partner_id);
    if (!partner || partner.organization_id !== parseInt(organizationId)) {
      return res.status(400).json({ error: 'Partner does not belong to this organization' });
    }

    // Verify plan is a trial plan (has plan_duration_days)
    const plan = await SubscriptionPlan.findById(subscription_plan_id);
    if (!plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }
    
    if (!plan.plan_duration_days || plan.plan_duration_days <= 0) {
      return res.status(400).json({ 
        error: 'Selected plan is not a trial plan. Only trial plans can be assigned by organizations.' 
      });
    }

    // Check partner's current subscription eligibility
    const currentSubscriptions = await PartnerSubscription.findByPartnerId(partner_id);
    let isEligible = true;
    let isRepeatTrial = false;
    
    if (currentSubscriptions.length > 0) {
      const currentSub = currentSubscriptions[0];
      
      // Check if current plan is Free Plan
      const isFreePlan = currentSub.plan_name && currentSub.plan_name.toLowerCase().includes('free');
      
      // Check if current plan is a paid plan (not Free Plan and has price > 0)
      const isPaidPlan = !isFreePlan && (
        (currentSub.individual_monthly_price && currentSub.individual_monthly_price > 0) ||
        (currentSub.individual_quarterly_price && currentSub.individual_quarterly_price > 0) ||
        (currentSub.individual_yearly_price && currentSub.individual_yearly_price > 0)
      );
      
      if (isPaidPlan) {
        return res.status(400).json({ 
          error: 'Cannot assign trial plan. Therapist already has a paid subscription plan.',
          current_plan: currentSub.plan_name
        });
      }
    }

    // Check trial history to warn about repeat trials
    const trialHistoryQuery = `
      SELECT COUNT(*) as trial_count
      FROM partner_subscriptions ps
      JOIN subscription_plans sp ON ps.subscription_plan_id = sp.id
      WHERE ps.partner_id = $1 
        AND sp.plan_duration_days IS NOT NULL 
        AND sp.plan_duration_days > 0
    `;
    const historyResult = await db.query(trialHistoryQuery, [partner_id]);
    const trialCount = parseInt(historyResult.rows[0].trial_count);
    isRepeatTrial = trialCount > 0;

    // Calculate subscription dates
    const startDate = new Date();
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + plan.plan_duration_days);

    // Remove existing subscriptions and create new trial
    await PartnerSubscription.bulkRemove([partner_id]);
    
    const subscription = await PartnerSubscription.create({
      partner_id: parseInt(partner_id),
      subscription_plan_id: parseInt(subscription_plan_id),
      billing_period
    });

    // Update with dates
    await PartnerSubscription.update(subscription.id, {
      subscription_start_date: startDate,
      subscription_end_date: endDate,
      payment_status: 'paid'
    });

    res.json({
      success: true,
      message: 'Trial plan assigned successfully',
      subscription,
      warning: isRepeatTrial ? 'This is a repeat trial for this therapist' : null,
      trial_count: trialCount + 1
    });

  } catch (error) {
    console.error('Assign trial plan error:', error);
    res.status(500).json({
      error: 'Failed to assign trial plan',
      details: error.message
    });
  }
};

module.exports = {
  getOrganizationPartnerSubscriptions,
  assignSubscriptions,
  updateSubscription,
  removeSubscriptions,
  assignToAllPartners,
  selectOwnSubscription,
  selectPlan,
  assignTrialPlan
};














