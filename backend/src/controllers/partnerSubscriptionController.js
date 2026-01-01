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

module.exports = {
  getOrganizationPartnerSubscriptions,
  assignSubscriptions,
  updateSubscription,
  removeSubscriptions,
  assignToAllPartners,
  selectOwnSubscription
};














