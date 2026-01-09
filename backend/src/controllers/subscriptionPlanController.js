const SubscriptionPlan = require('../models/SubscriptionPlan');
const db = require('../config/database');

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
 * Get active subscription plans only (with locale support)
 */
const getActivePlans = async (req, res) => {
  try {
    const countryCode = req.countryCode || 'IN';
    const locale = req.locale || 'en-IN';
    
    const plans = await SubscriptionPlan.getActiveWithLocale(countryCode, locale);
    
    res.json({
      success: true,
      plans,
      locale,
      countryCode
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
      plan_type,
      min_sessions,
      max_sessions,
      max_appointments,
      has_video,
      has_whatsapp,
      has_advanced_assessments,
      has_report_generation,
      has_custom_branding,
      has_advanced_analytics,
      has_priority_support,
      has_email_support,
      min_therapists,
      max_therapists,
      plan_order,
      plan_duration_days,
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price,
      is_active,
      individual_yearly_enabled,
      individual_quarterly_enabled,
      individual_monthly_enabled,
      organization_yearly_enabled,
      organization_quarterly_enabled,
      organization_monthly_enabled
    } = req.body;

    // Validate required fields
    if (!plan_name || min_sessions === undefined) {
      return res.status(400).json({
        error: 'Plan name and min_sessions are required'
      });
    }

    // Validate plan_type
    if (plan_type && !['individual', 'organization', 'common'].includes(plan_type)) {
      return res.status(400).json({
        error: 'plan_type must be "individual", "organization", or "common"'
      });
    }

    // Validate therapist ranges for organization plans
    if (plan_type === 'organization') {
      if (!min_therapists || !max_therapists) {
        return res.status(400).json({
          error: 'Organization plans require min_therapists and max_therapists'
        });
      }
      if (min_therapists < 1 || max_therapists < min_therapists) {
        return res.status(400).json({
          error: 'Invalid therapist range. min_therapists must be >= 1 and max_therapists must be >= min_therapists'
        });
      }
    }

    // Validate therapist ranges for common plans (must be NULL)
    if (plan_type === 'common') {
      if (min_therapists !== null && min_therapists !== undefined) {
        return res.status(400).json({
          error: 'Common plans must have NULL min_therapists and max_therapists'
        });
      }
      if (max_therapists !== null && max_therapists !== undefined) {
        return res.status(400).json({
          error: 'Common plans must have NULL min_therapists and max_therapists'
        });
      }
    }


    // Validate session limits (max_sessions can be NULL for unlimited)
    if (min_sessions < 0) {
      return res.status(400).json({
        error: 'min_sessions must be >= 0'
      });
    }
    if (max_sessions !== null && max_sessions !== undefined && max_sessions < min_sessions) {
      return res.status(400).json({
        error: 'Invalid session limits. max_sessions must be >= min_sessions or NULL for unlimited'
      });
    }

    // Validate max_appointments (can be NULL for unlimited)
    if (max_appointments !== null && max_appointments !== undefined && max_appointments < 0) {
      return res.status(400).json({
        error: 'max_appointments must be >= 0 or NULL for unlimited'
      });
    }

    // Validate plan_duration_days (must be positive integer if provided)
    if (plan_duration_days !== null && plan_duration_days !== undefined) {
      if (typeof plan_duration_days !== 'number' || plan_duration_days < 1 || !Number.isInteger(plan_duration_days)) {
        return res.status(400).json({
          error: 'plan_duration_days must be a positive integer or NULL'
        });
      }
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

    // Validate enable/disable fields - monthly must be true
    if (individual_monthly_enabled === false || organization_monthly_enabled === false) {
      return res.status(400).json({
        error: 'Monthly billing periods cannot be disabled'
      });
    }

    // Special validation for Free Plan - only monthly billing allowed
    if (plan_name && plan_name.toLowerCase() === 'free plan') {
      if (individual_yearly_enabled !== false || individual_quarterly_enabled !== false ||
          organization_yearly_enabled !== false || organization_quarterly_enabled !== false) {
        return res.status(400).json({
          error: 'Free Plan can only have monthly billing. Quarterly and yearly billing must be disabled.'
        });
      }
    }

    // Create plan
    const newPlan = await SubscriptionPlan.create({
      plan_name,
      plan_type: plan_type || 'individual',
      min_sessions: parseInt(min_sessions),
      max_sessions: max_sessions === null || max_sessions === undefined ? null : parseInt(max_sessions),
      max_appointments: max_appointments === null || max_appointments === undefined ? null : parseInt(max_appointments),
      has_video: has_video !== undefined ? has_video : false,
      has_whatsapp: has_whatsapp !== undefined ? has_whatsapp : false,
      has_advanced_assessments: has_advanced_assessments !== undefined ? has_advanced_assessments : false,
      has_report_generation: has_report_generation !== undefined ? has_report_generation : false,
      has_custom_branding: has_custom_branding !== undefined ? has_custom_branding : false,
      has_advanced_analytics: has_advanced_analytics !== undefined ? has_advanced_analytics : false,
      has_priority_support: has_priority_support !== undefined ? has_priority_support : false,
      has_email_support: has_email_support !== undefined ? has_email_support : false,
      min_therapists: min_therapists ? parseInt(min_therapists) : null,
      max_therapists: max_therapists ? parseInt(max_therapists) : null,
      plan_order: plan_order !== undefined ? parseInt(plan_order) : 0,
      plan_duration_days: plan_duration_days !== undefined ? (plan_duration_days === null ? null : parseInt(plan_duration_days)) : null,
      individual_yearly_price: parseFloat(individual_yearly_price),
      individual_quarterly_price: parseFloat(individual_quarterly_price),
      individual_monthly_price: parseFloat(individual_monthly_price),
      organization_yearly_price: parseFloat(organization_yearly_price),
      organization_quarterly_price: parseFloat(organization_quarterly_price),
      organization_monthly_price: parseFloat(organization_monthly_price),
      is_active: is_active !== undefined ? is_active : true,
      individual_yearly_enabled: individual_yearly_enabled !== undefined ? Boolean(individual_yearly_enabled) : true,
      individual_quarterly_enabled: individual_quarterly_enabled !== undefined ? Boolean(individual_quarterly_enabled) : true,
      individual_monthly_enabled: true, // Force to true
      organization_yearly_enabled: organization_yearly_enabled !== undefined ? Boolean(organization_yearly_enabled) : true,
      organization_quarterly_enabled: organization_quarterly_enabled !== undefined ? Boolean(organization_quarterly_enabled) : true,
      organization_monthly_enabled: true // Force to true
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

    // Validate plan_type if provided
    if (updateData.plan_type !== undefined && !['individual', 'organization', 'common'].includes(updateData.plan_type)) {
      return res.status(400).json({
        error: 'plan_type must be "individual", "organization", or "common"'
      });
    }

    // Validate session limits if provided (max_sessions can be NULL for unlimited)
    if (updateData.min_sessions !== undefined || updateData.max_sessions !== undefined) {
      const minSessions = updateData.min_sessions !== undefined 
        ? parseInt(updateData.min_sessions) 
        : existingPlan.min_sessions;
      const maxSessions = updateData.max_sessions !== undefined 
        ? (updateData.max_sessions === null ? null : parseInt(updateData.max_sessions))
        : existingPlan.max_sessions;

      if (minSessions < 0) {
        return res.status(400).json({
          error: 'min_sessions must be >= 0'
        });
      }
      if (maxSessions !== null && maxSessions !== undefined && maxSessions < minSessions) {
        return res.status(400).json({
          error: 'Invalid session limits. max_sessions must be >= min_sessions or NULL for unlimited'
        });
      }
    }

    // Validate max_appointments if provided (can be NULL for unlimited)
    if (updateData.max_appointments !== undefined) {
      if (updateData.max_appointments !== null && updateData.max_appointments < 0) {
        return res.status(400).json({
          error: 'max_appointments must be >= 0 or NULL for unlimited'
        });
      }
    }

    // Validate plan_duration_days if provided
    if (updateData.plan_duration_days !== undefined) {
      if (updateData.plan_duration_days !== null && 
          (typeof updateData.plan_duration_days !== 'number' || updateData.plan_duration_days < 1 || !Number.isInteger(updateData.plan_duration_days))) {
        return res.status(400).json({
          error: 'plan_duration_days must be a positive integer or NULL'
        });
      }
    }

    // Validate therapist ranges for organization plans
    if (updateData.plan_type === 'organization' || (updateData.plan_type === undefined && existingPlan.plan_type === 'organization')) {
      const minTherapists = updateData.min_therapists !== undefined ? updateData.min_therapists : existingPlan.min_therapists;
      const maxTherapists = updateData.max_therapists !== undefined ? updateData.max_therapists : existingPlan.max_therapists;
      
      if (updateData.min_therapists !== undefined || updateData.max_therapists !== undefined) {
        if (!minTherapists || !maxTherapists) {
          return res.status(400).json({
            error: 'Organization plans require min_therapists and max_therapists'
          });
        }
        if (minTherapists < 1 || maxTherapists < minTherapists) {
          return res.status(400).json({
            error: 'Invalid therapist range. min_therapists must be >= 1 and max_therapists must be >= min_therapists'
          });
        }
      }
    }

    // Validate therapist ranges for common plans (must be NULL)
    if (updateData.plan_type === 'common' || (updateData.plan_type === undefined && existingPlan.plan_type === 'common')) {
      if (updateData.min_therapists !== undefined && updateData.min_therapists !== null) {
        return res.status(400).json({
          error: 'Common plans must have NULL min_therapists and max_therapists'
        });
      }
      if (updateData.max_therapists !== undefined && updateData.max_therapists !== null) {
        return res.status(400).json({
          error: 'Common plans must have NULL min_therapists and max_therapists'
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

    // Validate enable/disable fields - monthly must be true
    if (updateData.individual_monthly_enabled === false || updateData.organization_monthly_enabled === false) {
      return res.status(400).json({
        error: 'Monthly billing periods cannot be disabled'
      });
    }

    // Special validation for Free Plan - only monthly billing allowed
    // Check if this is the Free Plan being updated (existingPlan already fetched above)
    if (existingPlan && existingPlan.plan_name.toLowerCase() === 'free plan') {
      // If any non-monthly periods are being enabled, reject the update
      if ((updateData.individual_yearly_enabled === true) ||
          (updateData.individual_quarterly_enabled === true) ||
          (updateData.organization_yearly_enabled === true) ||
          (updateData.organization_quarterly_enabled === true)) {
        return res.status(400).json({
          error: 'Free Plan can only have monthly billing. Quarterly and yearly billing cannot be enabled.'
        });
      }
    }

    // Convert boolean fields
    if (updateData.has_video !== undefined) {
      updateData.has_video = Boolean(updateData.has_video);
    }
    if (updateData.has_whatsapp !== undefined) {
      updateData.has_whatsapp = Boolean(updateData.has_whatsapp);
    }
    if (updateData.has_advanced_assessments !== undefined) {
      updateData.has_advanced_assessments = Boolean(updateData.has_advanced_assessments);
    }
    if (updateData.has_report_generation !== undefined) {
      updateData.has_report_generation = Boolean(updateData.has_report_generation);
    }
    if (updateData.has_custom_branding !== undefined) {
      updateData.has_custom_branding = Boolean(updateData.has_custom_branding);
    }
    if (updateData.has_advanced_analytics !== undefined) {
      updateData.has_advanced_analytics = Boolean(updateData.has_advanced_analytics);
    }
    if (updateData.has_priority_support !== undefined) {
      updateData.has_priority_support = Boolean(updateData.has_priority_support);
    }
    if (updateData.has_email_support !== undefined) {
      updateData.has_email_support = Boolean(updateData.has_email_support);
    }
    if (updateData.is_active !== undefined) {
      updateData.is_active = Boolean(updateData.is_active);
    }

    // Convert plan_duration_days if provided
    if (updateData.plan_duration_days !== undefined) {
      updateData.plan_duration_days = updateData.plan_duration_days === null ? null : parseInt(updateData.plan_duration_days);
    }

    // Convert max_sessions if provided (allow NULL)
    if (updateData.max_sessions !== undefined) {
      updateData.max_sessions = updateData.max_sessions === null ? null : parseInt(updateData.max_sessions);
    }
    // Convert max_appointments if provided (allow NULL)
    if (updateData.max_appointments !== undefined) {
      updateData.max_appointments = updateData.max_appointments === null ? null : parseInt(updateData.max_appointments);
    }
    if (updateData.individual_yearly_enabled !== undefined) {
      updateData.individual_yearly_enabled = Boolean(updateData.individual_yearly_enabled);
    }
    if (updateData.individual_quarterly_enabled !== undefined) {
      updateData.individual_quarterly_enabled = Boolean(updateData.individual_quarterly_enabled);
    }
    // Force monthly to true
    if (updateData.individual_monthly_enabled !== undefined) {
      updateData.individual_monthly_enabled = true;
    }
    if (updateData.organization_yearly_enabled !== undefined) {
      updateData.organization_yearly_enabled = Boolean(updateData.organization_yearly_enabled);
    }
    if (updateData.organization_quarterly_enabled !== undefined) {
      updateData.organization_quarterly_enabled = Boolean(updateData.organization_quarterly_enabled);
    }
    // Force monthly to true
    if (updateData.organization_monthly_enabled !== undefined) {
      updateData.organization_monthly_enabled = true;
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
 * Calculate organization price based on plan, number of therapists, and billing period (with locale support)
 */
const calculateOrganizationPrice = async (req, res) => {
  try {
    const { plan_id, number_of_therapists, billing_period } = req.body;
    const countryCode = req.countryCode || 'IN';
    const locale = req.locale || 'en-IN';

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

    // Get price with locale support
    const priceInfo = await SubscriptionPlan.getPriceWithLocale(
      parseInt(plan_id),
      'organization',
      billing_period,
      countryCode,
      locale
    );

    // Calculate total price
    const totalPrice = priceInfo.price * parseInt(number_of_therapists);

    // Get plan details for response
    const plan = await SubscriptionPlan.findById(plan_id);

    res.json({
      success: true,
      plan_id: parseInt(plan_id),
      plan_name: plan?.plan_name,
      number_of_therapists: parseInt(number_of_therapists),
      billing_period,
      price_per_therapist: priceInfo.price,
      total_price: totalPrice,
      currency: priceInfo.currency,
      locale,
      countryCode
    });
  } catch (error) {
    console.error('Error calculating organization price:', error);
    res.status(500).json({
      error: 'Failed to calculate organization price',
      details: error.message
    });
  }
};

/**
 * Get subscription plans available for individual therapists (with locale support)
 * Filters plans that have individual_monthly_enabled = TRUE
 */
const getIndividualTherapistPlans = async (req, res) => {
  try {
    const countryCode = req.countryCode || 'IN';
    const locale = req.locale || 'en-IN';
    
    const plans = await SubscriptionPlan.getIndividualPlansWithLocale(countryCode, locale, false);
    
    // Filter to only include plans with monthly billing enabled and sort by price
    const filteredPlans = plans
      .filter(plan => plan.individual_monthly_enabled !== false)
      .sort((a, b) => {
        const priceA = a.locale_individual_monthly_price || a.individual_monthly_price || 0;
        const priceB = b.locale_individual_monthly_price || b.individual_monthly_price || 0;
        if (priceA !== priceB) return priceA - priceB;
        return a.plan_name.localeCompare(b.plan_name);
      });

    res.json({
      success: true,
      plans: filteredPlans,
      locale,
      countryCode
    });
  } catch (error) {
    console.error('Error fetching individual therapist plans:', error);
    res.status(500).json({
      error: 'Failed to fetch individual therapist plans',
      details: error.message
    });
  }
};

/**
 * Get individual practitioner plans for selection modal (with locale support)
 * Excludes Free Plan - users cannot downgrade to Free Plan
 */
const getIndividualPlansForSelection = async (req, res) => {
  try {
    const countryCode = req.countryCode || 'IN';
    const locale = req.locale || 'en-IN';
    
    const plans = await SubscriptionPlan.getIndividualPlansWithLocale(countryCode, locale, true); // exclude Free Plan
    
    res.json({
      success: true,
      plans,
      locale,
      countryCode
    });
  } catch (error) {
    console.error('Error fetching individual plans for selection:', error);
    res.status(500).json({
      error: 'Failed to fetch individual plans',
      details: error.message
    });
  }
};

/**
 * Get organization plans filtered by therapist count (with locale support)
 * Excludes Free Plan - organizations cannot downgrade to Free Plan
 */
const getOrganizationPlansForSelection = async (req, res) => {
  try {
    const { therapist_count } = req.query;
    const countryCode = req.countryCode || 'IN';
    const locale = req.locale || 'en-IN';

    if (!therapist_count || therapist_count < 1) {
      return res.status(400).json({
        error: 'therapist_count query parameter is required and must be >= 1'
      });
    }

    const plans = await SubscriptionPlan.getOrganizationPlansWithLocale(
      parseInt(therapist_count),
      countryCode,
      locale
    );
    
    // Filter out Free Plan
    const filteredPlans = plans.filter(plan => plan.plan_name.toLowerCase() !== 'free plan');

    res.json({
      success: true,
      plans: filteredPlans,
      therapist_count: parseInt(therapist_count),
      locale,
      countryCode
    });
  } catch (error) {
    console.error('Error fetching organization plans for selection:', error);
    res.status(500).json({
      error: 'Failed to fetch organization plans',
      details: error.message
    });
  }
};

/**
 * Log subscription plan event (modal shown, payment attempted, etc.)
 */
const logSubscriptionEvent = async (req, res) => {
  try {
    const { event_type, subscription_plan_id, billing_period, is_first_login, metadata } = req.body;
    const { userType, id } = req.user;

    // Only allow for partners and organizations
    if (userType !== 'partner' && userType !== 'organization') {
      return res.status(403).json({ error: 'Invalid user type' });
    }

    // Validate event type
    const validEventTypes = ['modal_shown', 'payment_attempted', 'payment_completed'];
    if (!validEventTypes.includes(event_type)) {
      return res.status(400).json({ error: 'Invalid event type' });
    }

    const query = `
      INSERT INTO subscription_plan_events 
      (user_type, user_id, event_type, subscription_plan_id, billing_period, is_first_login, metadata, event_timestamp)
      VALUES ($1, $2, $3, $4, $5, $6, $7, CURRENT_TIMESTAMP)
      RETURNING *
    `;

    const result = await db.query(query, [
      userType,
      id,
      event_type,
      subscription_plan_id || null,
      billing_period || null,
      is_first_login || false,
      metadata ? JSON.stringify(metadata) : null
    ]);

    console.log(`[Subscription Tracking] Logged ${event_type} for ${userType} ID ${id}`);
    res.json({ success: true, event: result.rows[0] });
  } catch (error) {
    console.error('Log subscription event error:', error);
    res.status(500).json({ error: 'Failed to log event', details: error.message });
  }
};

/**
 * Check if this is the user's first login (no previous subscription plan events)
 */
const checkFirstLogin = async (req, res) => {
  try {
    const { userType, id } = req.user;

    // Only allow for partners and organizations
    if (userType !== 'partner' && userType !== 'organization') {
      return res.status(403).json({ error: 'Invalid user type' });
    }

    const query = `
      SELECT COUNT(*) as event_count 
      FROM subscription_plan_events 
      WHERE user_type = $1 AND user_id = $2
    `;

    const result = await db.query(query, [userType, id]);
    const eventCount = parseInt(result.rows[0].event_count);

    res.json({ 
      is_first_login: eventCount === 0 
    });
  } catch (error) {
    console.error('Check first login error:', error);
    // Default to false on error to not block user flow
    res.json({ is_first_login: false });
  }
};

/**
 * Get all locale-specific pricing for a subscription plan
 */
const getPlanLocales = async (req, res) => {
  try {
    const { planId } = req.params;
    const query = `
      SELECT * FROM subscription_plan_locales
      WHERE subscription_plan_id = $1
      ORDER BY country_code, locale
    `;
    const result = await db.query(query, [planId]);
    
    res.json({
      success: true,
      locales: result.rows
    });
  } catch (error) {
    console.error('Error fetching plan locales:', error);
    res.status(500).json({
      error: 'Failed to fetch plan locales',
      details: error.message
    });
  }
};

/**
 * Create or update locale-specific pricing for a subscription plan
 */
const upsertPlanLocale = async (req, res) => {
  try {
    const { planId } = req.params;
    const {
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
    } = req.body;

    // Validate required fields
    if (!country_code || !locale || !currency_code) {
      return res.status(400).json({
        error: 'country_code, locale, and currency_code are required'
      });
    }

    // Validate prices
    const prices = [
      individual_yearly_price,
      individual_quarterly_price,
      individual_monthly_price,
      organization_yearly_price,
      organization_quarterly_price,
      organization_monthly_price
    ];

    if (prices.some(price => price === undefined || price === null || price < 0)) {
      return res.status(400).json({
        error: 'All price fields are required and must be >= 0'
      });
    }

    // Enforce currency rules: India uses INR, all others use USD
    if (country_code.toUpperCase() === 'IN') {
      if (currency_code.toUpperCase() !== 'INR') {
        return res.status(400).json({
          error: 'India (IN) must use INR currency'
        });
      }
    } else {
      // All non-India countries must use USD
      if (currency_code.toUpperCase() !== 'USD') {
        return res.status(400).json({
          error: 'All countries except India must use USD currency'
        });
      }
    }

    // Check if plan exists
    const plan = await SubscriptionPlan.findById(planId);
    if (!plan) {
      return res.status(404).json({
        error: 'Subscription plan not found'
      });
    }

    // Upsert locale pricing (insert or update)
    const query = `
      INSERT INTO subscription_plan_locales (
        subscription_plan_id, country_code, locale, currency_code,
        individual_yearly_price, individual_quarterly_price, individual_monthly_price,
        organization_yearly_price, organization_quarterly_price, organization_monthly_price,
        is_active
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      ON CONFLICT (subscription_plan_id, country_code, locale)
      DO UPDATE SET
        currency_code = EXCLUDED.currency_code,
        individual_yearly_price = EXCLUDED.individual_yearly_price,
        individual_quarterly_price = EXCLUDED.individual_quarterly_price,
        individual_monthly_price = EXCLUDED.individual_monthly_price,
        organization_yearly_price = EXCLUDED.organization_yearly_price,
        organization_quarterly_price = EXCLUDED.organization_quarterly_price,
        organization_monthly_price = EXCLUDED.organization_monthly_price,
        is_active = EXCLUDED.is_active,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;

    const result = await db.query(query, [
      planId,
      country_code.toUpperCase(),
      locale,
      currency_code.toUpperCase(),
      parseFloat(individual_yearly_price),
      parseFloat(individual_quarterly_price),
      parseFloat(individual_monthly_price),
      parseFloat(organization_yearly_price),
      parseFloat(organization_quarterly_price),
      parseFloat(organization_monthly_price),
      is_active !== undefined ? Boolean(is_active) : true
    ]);

    console.log(`[ADMIN] Locale pricing ${result.rows[0].id ? 'updated' : 'created'} for plan ${planId} (${country_code}-${locale})`);

    res.json({
      success: true,
      message: 'Locale pricing saved successfully',
      locale: result.rows[0]
    });
  } catch (error) {
    console.error('Error upserting plan locale:', error);
    
    // Handle case where table doesn't exist yet
    if (error.message.includes('subscription_plan_locales')) {
      return res.status(500).json({
        error: 'Locale pricing table not found. Please run the migration first.',
        details: error.message
      });
    }
    
    res.status(500).json({
      error: 'Failed to save locale pricing',
      details: error.message
    });
  }
};

/**
 * Delete locale-specific pricing for a subscription plan
 */
const deletePlanLocale = async (req, res) => {
  try {
    const { planId, localeId } = req.params;

    const query = `
      DELETE FROM subscription_plan_locales
      WHERE id = $1 AND subscription_plan_id = $2
      RETURNING *
    `;
    
    const result = await db.query(query, [localeId, planId]);
    
    if (result.rows.length === 0) {
      return res.status(404).json({
        error: 'Locale pricing not found'
      });
    }

    console.log(`[ADMIN] Locale pricing deleted for plan ${planId} (ID: ${localeId})`);

    res.json({
      success: true,
      message: 'Locale pricing deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting plan locale:', error);
    res.status(500).json({
      error: 'Failed to delete locale pricing',
      details: error.message
    });
  }
};

/**
 * Get all available country codes and locales (helper for dropdowns)
 * All non-India locales use USD as currency
 */
const getAvailableLocales = async (req, res) => {
  try {
    // Comprehensive list of countries and locales
    // India uses INR, all others use USD
    const commonLocales = [
      // India - uses INR
      { country_code: 'IN', locale: 'en-IN', currency_code: 'INR', name: 'India' },
      
      // North America - all use USD
      { country_code: 'US', locale: 'en-US', currency_code: 'USD', name: 'United States' },
      { country_code: 'CA', locale: 'en-CA', currency_code: 'USD', name: 'Canada' },
      { country_code: 'MX', locale: 'es-MX', currency_code: 'USD', name: 'Mexico' },
      
      // Europe - all use USD
      { country_code: 'GB', locale: 'en-GB', currency_code: 'USD', name: 'United Kingdom' },
      { country_code: 'IE', locale: 'en-IE', currency_code: 'USD', name: 'Ireland' },
      { country_code: 'DE', locale: 'de-DE', currency_code: 'USD', name: 'Germany' },
      { country_code: 'FR', locale: 'fr-FR', currency_code: 'USD', name: 'France' },
      { country_code: 'ES', locale: 'es-ES', currency_code: 'USD', name: 'Spain' },
      { country_code: 'IT', locale: 'it-IT', currency_code: 'USD', name: 'Italy' },
      { country_code: 'NL', locale: 'nl-NL', currency_code: 'USD', name: 'Netherlands' },
      { country_code: 'BE', locale: 'nl-BE', currency_code: 'USD', name: 'Belgium' },
      { country_code: 'CH', locale: 'de-CH', currency_code: 'USD', name: 'Switzerland' },
      { country_code: 'AT', locale: 'de-AT', currency_code: 'USD', name: 'Austria' },
      { country_code: 'SE', locale: 'sv-SE', currency_code: 'USD', name: 'Sweden' },
      { country_code: 'NO', locale: 'nb-NO', currency_code: 'USD', name: 'Norway' },
      { country_code: 'DK', locale: 'da-DK', currency_code: 'USD', name: 'Denmark' },
      { country_code: 'FI', locale: 'fi-FI', currency_code: 'USD', name: 'Finland' },
      { country_code: 'PL', locale: 'pl-PL', currency_code: 'USD', name: 'Poland' },
      { country_code: 'PT', locale: 'pt-PT', currency_code: 'USD', name: 'Portugal' },
      { country_code: 'GR', locale: 'el-GR', currency_code: 'USD', name: 'Greece' },
      { country_code: 'CZ', locale: 'cs-CZ', currency_code: 'USD', name: 'Czech Republic' },
      { country_code: 'RO', locale: 'ro-RO', currency_code: 'USD', name: 'Romania' },
      { country_code: 'HU', locale: 'hu-HU', currency_code: 'USD', name: 'Hungary' },
      
      // Asia Pacific - all use USD except India
      { country_code: 'AU', locale: 'en-AU', currency_code: 'USD', name: 'Australia' },
      { country_code: 'NZ', locale: 'en-NZ', currency_code: 'USD', name: 'New Zealand' },
      { country_code: 'JP', locale: 'ja-JP', currency_code: 'USD', name: 'Japan' },
      { country_code: 'CN', locale: 'zh-CN', currency_code: 'USD', name: 'China' },
      { country_code: 'HK', locale: 'zh-HK', currency_code: 'USD', name: 'Hong Kong' },
      { country_code: 'TW', locale: 'zh-TW', currency_code: 'USD', name: 'Taiwan' },
      { country_code: 'SG', locale: 'en-SG', currency_code: 'USD', name: 'Singapore' },
      { country_code: 'MY', locale: 'ms-MY', currency_code: 'USD', name: 'Malaysia' },
      { country_code: 'TH', locale: 'th-TH', currency_code: 'USD', name: 'Thailand' },
      { country_code: 'PH', locale: 'en-PH', currency_code: 'USD', name: 'Philippines' },
      { country_code: 'ID', locale: 'id-ID', currency_code: 'USD', name: 'Indonesia' },
      { country_code: 'VN', locale: 'vi-VN', currency_code: 'USD', name: 'Vietnam' },
      { country_code: 'KR', locale: 'ko-KR', currency_code: 'USD', name: 'South Korea' },
      { country_code: 'PK', locale: 'ur-PK', currency_code: 'USD', name: 'Pakistan' },
      { country_code: 'BD', locale: 'bn-BD', currency_code: 'USD', name: 'Bangladesh' },
      { country_code: 'LK', locale: 'si-LK', currency_code: 'USD', name: 'Sri Lanka' },
      { country_code: 'NP', locale: 'ne-NP', currency_code: 'USD', name: 'Nepal' },
      
      // Middle East & Africa - all use USD
      { country_code: 'AE', locale: 'ar-AE', currency_code: 'USD', name: 'United Arab Emirates' },
      { country_code: 'SA', locale: 'ar-SA', currency_code: 'USD', name: 'Saudi Arabia' },
      { country_code: 'IL', locale: 'he-IL', currency_code: 'USD', name: 'Israel' },
      { country_code: 'TR', locale: 'tr-TR', currency_code: 'USD', name: 'Turkey' },
      { country_code: 'ZA', locale: 'en-ZA', currency_code: 'USD', name: 'South Africa' },
      { country_code: 'EG', locale: 'ar-EG', currency_code: 'USD', name: 'Egypt' },
      { country_code: 'KE', locale: 'en-KE', currency_code: 'USD', name: 'Kenya' },
      { country_code: 'NG', locale: 'en-NG', currency_code: 'USD', name: 'Nigeria' },
      
      // Latin America - all use USD
      { country_code: 'BR', locale: 'pt-BR', currency_code: 'USD', name: 'Brazil' },
      { country_code: 'AR', locale: 'es-AR', currency_code: 'USD', name: 'Argentina' },
      { country_code: 'CL', locale: 'es-CL', currency_code: 'USD', name: 'Chile' },
      { country_code: 'CO', locale: 'es-CO', currency_code: 'USD', name: 'Colombia' },
      { country_code: 'PE', locale: 'es-PE', currency_code: 'USD', name: 'Peru' },
      { country_code: 'VE', locale: 'es-VE', currency_code: 'USD', name: 'Venezuela' },
      { country_code: 'EC', locale: 'es-EC', currency_code: 'USD', name: 'Ecuador' },
      { country_code: 'UY', locale: 'es-UY', currency_code: 'USD', name: 'Uruguay' },
      { country_code: 'PY', locale: 'es-PY', currency_code: 'USD', name: 'Paraguay' },
      { country_code: 'BO', locale: 'es-BO', currency_code: 'USD', name: 'Bolivia' },
      { country_code: 'CR', locale: 'es-CR', currency_code: 'USD', name: 'Costa Rica' },
      { country_code: 'PA', locale: 'es-PA', currency_code: 'USD', name: 'Panama' },
      { country_code: 'GT', locale: 'es-GT', currency_code: 'USD', name: 'Guatemala' },
      { country_code: 'DO', locale: 'es-DO', currency_code: 'USD', name: 'Dominican Republic' },
      { country_code: 'CU', locale: 'es-CU', currency_code: 'USD', name: 'Cuba' },
      
      // Other regions
      { country_code: 'RU', locale: 'ru-RU', currency_code: 'USD', name: 'Russia' },
      { country_code: 'UA', locale: 'uk-UA', currency_code: 'USD', name: 'Ukraine' }
    ];

    // Sort by name for easier selection
    commonLocales.sort((a, b) => a.name.localeCompare(b.name));

    res.json({
      success: true,
      locales: commonLocales
    });
  } catch (error) {
    console.error('Error fetching available locales:', error);
    res.status(500).json({
      error: 'Failed to fetch available locales',
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
  calculateOrganizationPrice,
  getIndividualTherapistPlans,
  getIndividualPlansForSelection,
  getOrganizationPlansForSelection,
  logSubscriptionEvent,
  checkFirstLogin,
  getPlanLocales,
  upsertPlanLocale,
  deletePlanLocale,
  getAvailableLocales
};












