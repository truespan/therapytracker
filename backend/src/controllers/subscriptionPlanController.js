const SubscriptionPlan = require('../models/SubscriptionPlan');

/**
 * Get all subscription plans
 */
const getAllPlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.getAll();
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Error fetching subscription plans:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription plans',
      details: error.message
    });
  }
};

/**
 * Get active subscription plans only
 */
const getActivePlans = async (req, res) => {
  try {
    const plans = await SubscriptionPlan.getActive();
    res.json({
      success: true,
      plans
    });
  } catch (error) {
    console.error('Error fetching active subscription plans:', error);
    res.status(500).json({
      error: 'Failed to fetch active subscription plans',
      details: error.message
    });
  }
};

/**
 * Get subscription plan by ID
 */
const getPlanById = async (req, res) => {
  try {
    const { id } = req.params;
    const plan = await SubscriptionPlan.findById(id);

    if (!plan) {
      return res.status(404).json({
        error: 'Subscription plan not found'
      });
    }

    res.json({
      success: true,
      plan
    });
  } catch (error) {
    console.error('Error fetching subscription plan:', error);
    res.status(500).json({
      error: 'Failed to fetch subscription plan',
      details: error.message
    });
  }
};

/**
 * Create a new subscription plan (admin only)
 */
const createPlan = async (req, res) => {
  try {
    const {
      plan_name,
      min_sessions,
      max_sessions,
      has_video,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active
    } = req.body;

    // Validate required fields
    if (!plan_name || min_sessions === undefined || max_sessions === undefined) {
      return res.status(400).json({
        error: 'Plan name, min_sessions, and max_sessions are required'
      });
    }

    // Validate session limits
    if (min_sessions < 0 || max_sessions < min_sessions) {
      return res.status(400).json({
        error: 'Invalid session limits. min_sessions must be >= 0 and max_sessions must be >= min_sessions'
      });
    }

    // Validate prices
    const requiredPrices = [
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price
    ];

    if (requiredPrices.some(price => price === undefined || price === null || price < 0)) {
      return res.status(400).json({
        error: 'All price fields are required and must be >= 0'
      });
    }

    // Create plan
    const newPlan = await SubscriptionPlan.create({
      plan_name,
      min_sessions: parseInt(min_sessions),
      max_sessions: parseInt(max_sessions),
      has_video: has_video !== undefined ? has_video : false,
      individual_yearly_price: parseFloat(individual_yearly_price),
      individual_quarterly_price: parseFloat(individual_quarterly_price),
      individual_monthly_price: parseFloat(individual_monthly_price),
      organization_yearly_price: parseFloat(organization_yearly_price),
      organization_quarterly_price: parseFloat(organization_quarterly_price),
      organization_monthly_price: parseFloat(organization_monthly_price),
      is_active: is_active !== undefined ? is_active : true
    });

    console.log(`[ADMIN] Subscription plan created: ${newPlan.plan_name} (ID: ${newPlan.id})`);

    res.status(201).json({
      success: true,
      message: 'Subscription plan created successfully',
      plan: newPlan
    });
  } catch (error) {
    console.error('Error creating subscription plan:', error);
    res.status(500).json({
      error: 'Failed to create subscription plan',
      details: error.message
    });
  }
};

/**
 * Update subscription plan (admin only)
 */
const updatePlan = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if plan exists
    const existingPlan = await SubscriptionPlan.findById(id);
    if (!existingPlan) {
      return res.status(404).json({
        error: 'Subscription plan not found'
      });
    }

    // Validate session limits if provided
    if (updateData.min_sessions !== undefined || updateData.max_sessions !== undefined) {
      const minSessions = updateData.min_sessions !== undefined 
        ? parseInt(updateData.min_sessions) 
        : existingPlan.min_sessions;
      const maxSessions = updateData.max_sessions !== undefined 
        ? parseInt(updateData.max_sessions) 
        : existingPlan.max_sessions;

      if (minSessions < 0 || maxSessions < minSessions) {
        return res.status(400).json({
          error: 'Invalid session limits. min_sessions must be >= 0 and max_sessions must be >= min_sessions'
        });
      }
    }

    // Validate prices if provided
    const priceFields = [
      'individual_yearly_price',
      'individual_quarterly_price',
      'individual_monthly_price',
      'organization_yearly_price',
      'organization_quarterly_price',
      'organization_monthly_price'
    ];

    for (const field of priceFields) {
      if (updateData[field] !== undefined && (updateData[field] === null || updateData[field] < 0)) {
        return res.status(400).json({
          error: `${field} must be >= 0`
        });
      }
      if (updateData[field] !== undefined) {
        updateData[field] = parseFloat(updateData[field]);
      }
    }

    // Convert boolean fields
    if (updateData.has_video !== undefined) {
      updateData.has_video = Boolean(updateData.has_video);
    }
    if (updateData.is_active !== undefined) {
      updateData.is_active = Boolean(updateData.is_active);
    }

    // Update plan
    const updatedPlan = await SubscriptionPlan.update(id, updateData);

    console.log(`[ADMIN] Subscription plan updated: ${updatedPlan.plan_name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Subscription plan updated successfully',
      plan: updatedPlan
    });
  } catch (error) {
    console.error('Error updating subscription plan:', error);
    res.status(500).json({
      error: 'Failed to update subscription plan',
      details: error.message
    });
  }
};

/**
 * Delete subscription plan (admin only)
 */
const deletePlan = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if plan exists
    const plan = await SubscriptionPlan.findById(id);
    if (!plan) {
      return res.status(404).json({
        error: 'Subscription plan not found'
      });
    }

    // Delete plan
    await SubscriptionPlan.delete(id);

    console.log(`[ADMIN] Subscription plan deleted: ${plan.plan_name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Subscription plan deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting subscription plan:', error);
    res.status(500).json({
      error: 'Failed to delete subscription plan',
      details: error.message
    });
  }
};

/**
 * Calculate organization price based on plan, number of therapists, and billing period
 */
const calculateOrganizationPrice = async (req, res) => {
  try {
    const { plan_id, number_of_therapists, billing_period } = req.body;

    // Validate required fields
    if (!plan_id || number_of_therapists === undefined || !billing_period) {
      return res.status(400).json({
        error: 'plan_id, number_of_therapists, and billing_period are required'
      });
    }

    // Validate billing period
    const validPeriods = ['yearly', 'quarterly', 'monthly'];
    if (!validPeriods.includes(billing_period)) {
      return res.status(400).json({
        error: 'billing_period must be one of: yearly, quarterly, monthly'
      });
    }

    // Validate number of therapists
    if (number_of_therapists < 1) {
      return res.status(400).json({
        error: 'number_of_therapists must be >= 1'
      });
    }

    // Calculate price
    const totalPrice = await SubscriptionPlan.calculateOrganizationPrice(
      parseInt(plan_id),
      parseInt(number_of_therapists),
      billing_period
    );

    // Get plan details for response
    const plan = await SubscriptionPlan.findById(plan_id);
    const pricePerTherapist = await SubscriptionPlan.getPrice(plan_id, 'organization', billing_period);

    res.json({
      success: true,
      plan_id: parseInt(plan_id),
      plan_name: plan?.plan_name,
      number_of_therapists: parseInt(number_of_therapists),
      billing_period,
      price_per_therapist: pricePerTherapist,
      total_price: totalPrice
    });
  } catch (error) {
    console.error('Error calculating organization price:', error);
    res.status(500).json({
      error: 'Failed to calculate organization price',
      details: error.message
    });
  }
};

module.exports = {
  getAllPlans,
  getActivePlans,
  getPlanById,
  createPlan,
  updatePlan,
  deletePlan,
  calculateOrganizationPrice
};


