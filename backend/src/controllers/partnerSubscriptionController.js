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

    // Check if organization is TheraPTrack controlled
    if (!organization.theraptrack_controlled) {
      return res.status(403).json({ 
        error: 'This feature is only available for TheraPTrack controlled organizations' 
      });
    }

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

    // Check if organization is TheraPTrack controlled
    if (!organization.theraptrack_controlled) {
      return res.status(403).json({ 
        error: 'This feature is only available for TheraPTrack controlled organizations' 
      });
    }

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

    // Check if organization is TheraPTrack controlled
    if (!organization.theraptrack_controlled) {
      return res.status(403).json({ 
        error: 'This feature is only available for TheraPTrack controlled organizations' 
      });
    }

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

    // Check if organization is TheraPTrack controlled
    if (!organization.theraptrack_controlled) {
      return res.status(403).json({ 
        error: 'This feature is only available for TheraPTrack controlled organizations' 
      });
    }

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

module.exports = {
  getOrganizationPartnerSubscriptions,
  assignSubscriptions,
  updateSubscription,
  removeSubscriptions
};


