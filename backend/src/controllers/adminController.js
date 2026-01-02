const bcrypt = require('bcrypt');
const Organization = require('../models/Organization');
const Admin = require('../models/Admin');
const Auth = require('../models/Auth');
const Earnings = require('../models/Earnings');
const RazorpayPayment = require('../models/RazorpayPayment');
const RazorpayOrder = require('../models/RazorpayOrder');
const Partner = require('../models/Partner');
const db = require('../config/database');

const SALT_ROUNDS = 10;

/**
 * Get all organizations with their metrics
 */
const getAllOrganizations = async (req, res) => {
  try {
    const organizations = await Organization.getAllWithMetrics();
    res.json({ 
      success: true,
      organizations 
    });
  } catch (error) {
    console.error('Error fetching organizations:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organizations', 
      details: error.message 
    });
  }
};

/**
 * Create a new organization (admin only)
 */
const createOrganization = async (req, res) => {
  try {
    let {
      name,
      email,
      contact,
      address,
      gst_no,
      video_sessions_enabled,
      theraptrack_controlled,
      number_of_therapists,
      password
    } = req.body;

    // Validate required fields
    if (!name || !email || !contact || !password) {
      return res.status(400).json({
        error: 'Name, email, contact, and password are required'
      });
    }

    // Convert empty strings to null for optional fields
    if (gst_no === '') gst_no = null;
    if (number_of_therapists === '' || number_of_therapists === undefined) {
      number_of_therapists = null;
    } else if (number_of_therapists !== null) {
      // Convert to integer if it's a string
      number_of_therapists = parseInt(number_of_therapists, 10);
    }

    // Check if email already exists
    const existingAuth = await Auth.findByEmail(email);
    if (existingAuth) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

    // Use transaction to create organization and auth credentials
    const result = await db.transaction(async (client) => {
      // Create organization
      const newOrg = await Organization.create({
        name,
        date_of_creation: new Date(),
        email,
        contact,
        address: address || null,
        photo_url: null,
        gst_no: gst_no || null,
        video_sessions_enabled: video_sessions_enabled !== undefined ? video_sessions_enabled : true,
        theraptrack_controlled: theraptrack_controlled !== undefined ? theraptrack_controlled : false,
        number_of_therapists: number_of_therapists ? parseInt(number_of_therapists) : null
      }, client);

      // Create auth credentials
      await Auth.createCredentials({
        user_type: 'organization',
        reference_id: newOrg.id,
        email,
        password_hash: passwordHash
      }, client);

      // Assign subscription plan based on organization type
      if (theraptrack_controlled) {
        // TheraPTrack controlled orgs: Get full-feature plan (highest tier)
        // For now, we'll skip automatic subscription assignment for TheraPTrack controlled orgs
        // They should be manually assigned a plan by admin
        console.log('[ADMIN] TheraPTrack controlled organization created - manual plan assignment required');
        return newOrg;
      } else {
        // Non-controlled organizations: Use admin-configured default
        const SystemSettings = require('../models/SystemSettings');
        const SubscriptionPlan = require('../models/SubscriptionPlan');
        const defaultPlanId = await SystemSettings.getDefaultSubscriptionPlanId();
        
        if (defaultPlanId) {
          const plan = await SubscriptionPlan.findById(defaultPlanId);
          const startDate = new Date();
          let endDate = null;
          
          if (plan && plan.plan_duration_days && plan.plan_duration_days > 0) {
            // Trial plan with fixed duration
            endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + plan.plan_duration_days);
          }
          
          const updatedOrg = await Organization.update(newOrg.id, {
            subscription_plan_id: defaultPlanId,
            subscription_billing_period: 'monthly',
            subscription_start_date: startDate,
            subscription_end_date: endDate
          }, client);
          return updatedOrg;
        } else {
          // Fallback to Free Plan if no default configured
          const freePlanResult = await client.query(
            `SELECT id FROM subscription_plans WHERE plan_name = 'Free Plan' AND is_active = TRUE LIMIT 1`
          );
          
          if (freePlanResult.rows.length > 0) {
            const freePlanId = freePlanResult.rows[0].id;
            const updatedOrg = await Organization.update(newOrg.id, {
              subscription_plan_id: freePlanId,
              subscription_billing_period: 'monthly'
            }, client);
            return updatedOrg;
          } else {
            console.warn('Free Plan not found - organization created without subscription plan');
            return newOrg;
          }
        }
      }
    });

    console.log(`[ADMIN] Organization created: ${result.name} (ID: ${result.id})`);

    res.status(201).json({
      success: true,
      message: 'Organization created successfully',
      organization: result
    });
  } catch (error) {
    console.error('Error creating organization:', error);
    res.status(500).json({
      error: 'Failed to create organization',
      details: error.message
    });
  }
};

/**
 * Update organization details
 */
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Convert empty strings to null for optional fields
    if (updateData.gst_no === '') updateData.gst_no = null;
    if (updateData.number_of_therapists === '' || updateData.number_of_therapists === undefined) {
      updateData.number_of_therapists = null;
    } else if (updateData.number_of_therapists !== null) {
      // Convert to integer if it's a string
      updateData.number_of_therapists = parseInt(updateData.number_of_therapists, 10);
    }

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // If setting query_resolver = true, ensure organization is TheraPTrack controlled
    if (updateData.query_resolver === true && !org.theraptrack_controlled) {
      return res.status(400).json({ 
        error: 'query_resolver can only be set for organizations with theraptrack_controlled = true' 
      });
    }

    // If email is being updated, check if it's already in use
    if (updateData.email && updateData.email !== org.email) {
      const existingAuth = await Auth.findByEmail(updateData.email);
      if (existingAuth) {
        return res.status(409).json({ error: 'Email already in use' });
      }

      // Update email in auth_credentials too
      await db.query(
        'UPDATE auth_credentials SET email = $1 WHERE user_type = $2 AND reference_id = $3',
        [updateData.email, 'organization', id]
      );
    }

    // Update organization
    const updated = await Organization.update(id, updateData);

    console.log(`[ADMIN] Organization updated: ${updated.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Organization updated successfully',
      organization: updated
    });
  } catch (error) {
    console.error('Error updating organization:', error);
    res.status(500).json({
      error: 'Failed to update organization',
      details: error.message
    });
  }
};

/**
 * Deactivate an organization
 */
const deactivateOrganization = async (req, res) => {
  try {
    const { id } = req.params;
    const adminId = req.user.id; // From JWT token

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (!org.is_active) {
      return res.status(400).json({ error: 'Organization is already deactivated' });
    }

    // Deactivate organization
    const deactivated = await Organization.deactivate(id, adminId);

    console.log(`[ADMIN] Organization deactivated: ${deactivated.name} (ID: ${id}) by Admin ID: ${adminId}`);

    res.json({
      success: true,
      message: 'Organization deactivated successfully',
      organization: deactivated
    });
  } catch (error) {
    console.error('Error deactivating organization:', error);
    res.status(500).json({ 
      error: 'Failed to deactivate organization', 
      details: error.message 
    });
  }
};

/**
 * Activate an organization
 */
const activateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    if (org.is_active) {
      return res.status(400).json({ error: 'Organization is already active' });
    }

    // Activate organization
    const activated = await Organization.activate(id);

    console.log(`[ADMIN] Organization activated: ${activated.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Organization activated successfully',
      organization: activated
    });
  } catch (error) {
    console.error('Error activating organization:', error);
    res.status(500).json({ 
      error: 'Failed to activate organization', 
      details: error.message 
    });
  }
};

/**
 * Permanently delete an organization
 */
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Use transaction to delete organization and all related data
    await db.transaction(async (client) => {
      // Step 1: Get all partner IDs for this organization
      const partnersResult = await client.query(
        'SELECT id FROM partners WHERE organization_id = $1',
        [id]
      );
      const partnerIds = partnersResult.rows.map(row => row.id);

      if (partnerIds.length > 0) {
        // Step 2: Get all user IDs linked to these partners
        const usersResult = await client.query(
          'SELECT DISTINCT user_id FROM user_partner_assignments WHERE partner_id = ANY($1)',
          [partnerIds]
        );
        const userIds = usersResult.rows.map(row => row.user_id);

        if (userIds.length > 0) {
          // Step 3: Delete auth credentials for all users/clients first
          await client.query(
            'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
            ['user', userIds]
          );
          console.log(`[ADMIN] Deleted auth credentials for ${userIds.length} users`);

          // Step 4: Delete the users themselves (cascade will handle user_partner_assignments, etc.)
          await client.query(
            'DELETE FROM users WHERE id = ANY($1)',
            [userIds]
          );
          console.log(`[ADMIN] Deleted ${userIds.length} user records`);
        }

        // Step 5: Delete auth credentials for all partners in this organization
        await client.query(
          'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = ANY($2)',
          ['partner', partnerIds]
        );
        console.log(`[ADMIN] Deleted auth credentials for ${partnerIds.length} partners`);
      }

      // Step 6: Delete auth credentials for the organization itself
      await client.query(
        'DELETE FROM auth_credentials WHERE user_type = $1 AND reference_id = $2',
        ['organization', id]
      );

      // Step 7: Delete organization (cascade will handle partners and their related data)
      await client.query('DELETE FROM organizations WHERE id = $1', [id]);
    });

    console.log(`[ADMIN] Organization permanently deleted: ${org.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Organization deleted permanently'
    });
  } catch (error) {
    console.error('Error deleting organization:', error);
    res.status(500).json({
      error: 'Failed to delete organization',
      details: error.message
    });
  }
};

/**
 * Get metrics for a specific organization
 */
const getOrganizationMetrics = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if organization exists
    const org = await Organization.findById(id);
    if (!org) {
      return res.status(404).json({ error: 'Organization not found' });
    }

    // Get metrics
    const metrics = await Organization.getMetrics(id);
    
    // Get partner breakdown
    const partnerBreakdown = await Organization.getPartnerBreakdown(id);

    res.json({
      success: true,
      organization: org,
      metrics,
      partnerBreakdown
    });
  } catch (error) {
    console.error('Error fetching organization metrics:', error);
    res.status(500).json({ 
      error: 'Failed to fetch organization metrics', 
      details: error.message 
    });
  }
};

/**
 * Get dashboard statistics for admin
 */
const getDashboardStats = async (req, res) => {
  try {
    const query = `
      WITH org_stats AS (
        SELECT
          COUNT(*)::int as total_organizations,
          COUNT(*) FILTER (WHERE is_active = TRUE)::int as active_organizations,
          COUNT(*) FILTER (WHERE is_active = FALSE)::int as inactive_organizations
        FROM organizations
      ),
      partner_stats AS (
        SELECT COUNT(*)::int as total_partners
        FROM partners
      ),
      user_stats AS (
        SELECT COUNT(*)::int as total_users
        FROM users
      ),
      session_stats AS (
        SELECT
          COUNT(*)::int as total_sessions,
          COUNT(*) FILTER (WHERE status = 'completed')::int as completed_sessions,
          COUNT(*) FILTER (WHERE status IN ('scheduled', 'in_progress'))::int as active_sessions,
          COUNT(*) FILTER (WHERE DATE_TRUNC('month', session_date) = DATE_TRUNC('month', CURRENT_TIMESTAMP))::int as sessions_this_month
        FROM video_sessions
      )
      SELECT
        os.total_organizations,
        os.active_organizations,
        os.inactive_organizations,
        ps.total_partners,
        us.total_users,
        ss.total_sessions,
        ss.completed_sessions,
        ss.active_sessions,
        ss.sessions_this_month
      FROM org_stats os, partner_stats ps, user_stats us, session_stats ss
    `;

    const result = await db.query(query);
    const stats = result.rows[0];

    res.json({
      success: true,
      stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      error: 'Failed to fetch dashboard statistics',
      details: error.message
    });
  }
};

/**
 * Check and create earnings for a payment if missing (Admin only)
 * POST /api/admin/earnings/check-and-create
 */
const checkAndCreateEarnings = async (req, res) => {
  try {
    const { razorpay_payment_id, partner_id_override } = req.body;

    if (!razorpay_payment_id) {
      return res.status(400).json({
        error: 'razorpay_payment_id is required'
      });
    }

    // Check if earnings already exist
    const existingEarnings = await Earnings.findByPaymentId(razorpay_payment_id);
    if (existingEarnings) {
      // Get partner info for display
      let partnerInfo = null;
      if (existingEarnings.recipient_type === 'partner') {
        const partner = await Partner.findById(existingEarnings.recipient_id);
        if (partner) {
          partnerInfo = {
            name: partner.name,
            partner_id: partner.partner_id
          };
        }
      }

      return res.json({
        success: true,
        message: 'Earnings record already exists',
        earnings: {
          id: existingEarnings.id,
          recipient_id: existingEarnings.recipient_id,
          recipient_type: existingEarnings.recipient_type,
          amount: parseFloat(existingEarnings.amount),
          currency: existingEarnings.currency,
          status: existingEarnings.status,
          created_at: existingEarnings.created_at,
          partner_name: partnerInfo?.name,
          partner_id_string: partnerInfo?.partner_id
        }
      });
    }

    // Get payment from database
    const payment = await RazorpayPayment.findByPaymentId(razorpay_payment_id);
    if (!payment) {
      return res.status(404).json({
        error: 'Payment not found in database'
      });
    }

    // Get order from database
    if (!payment.razorpay_order_id) {
      return res.status(400).json({
        error: 'Payment does not have an associated order'
      });
    }

    const dbOrder = await RazorpayOrder.findByOrderId(payment.razorpay_order_id);
    if (!dbOrder) {
      return res.status(404).json({
        error: 'Order not found in database'
      });
    }

    // Parse order metadata - first try database notes
    let orderMetadata = {};
    if (dbOrder.notes) {
      orderMetadata = typeof dbOrder.notes === 'string' ? JSON.parse(dbOrder.notes) : dbOrder.notes;
    } else if (dbOrder.metadata) {
      orderMetadata = typeof dbOrder.metadata === 'string' ? JSON.parse(dbOrder.metadata) : dbOrder.metadata;
    }

    // If notes are empty/null in database, fetch from Razorpay API
    if (!orderMetadata || Object.keys(orderMetadata).length === 0 || !orderMetadata.partner_id) {
      console.log(`[ADMIN] Notes missing or incomplete in database for order ${payment.razorpay_order_id}, fetching from Razorpay...`);
      
      try {
        const Razorpay = require('razorpay');
        const razorpayInstance = new Razorpay({
          key_id: process.env.RAZORPAY_KEY_ID,
          key_secret: process.env.RAZORPAY_KEY_SECRET
        });
        
        // Fetch order from Razorpay
        const razorpayOrder = await razorpayInstance.orders.fetch(payment.razorpay_order_id);
        
        if (razorpayOrder && razorpayOrder.notes) {
          orderMetadata = razorpayOrder.notes;
          console.log(`[ADMIN] Retrieved notes from Razorpay:`, JSON.stringify(orderMetadata));
          
          // Update database with notes from Razorpay for future use
          if (orderMetadata && Object.keys(orderMetadata).length > 0) {
            const updateQuery = `UPDATE razorpay_orders SET notes = $1, updated_at = CURRENT_TIMESTAMP WHERE razorpay_order_id = $2`;
            await db.query(updateQuery, [JSON.stringify(orderMetadata), payment.razorpay_order_id]);
            console.log(`[ADMIN] Updated database notes from Razorpay for order ${payment.razorpay_order_id}`);
          }
        } else {
          console.warn(`[ADMIN] Razorpay order ${payment.razorpay_order_id} also has no notes`);
        }
      } catch (razorpayError) {
        console.error(`[ADMIN] Failed to fetch order from Razorpay:`, razorpayError);
        // Continue with existing metadata (might be empty) - will fall back to override or error
      }
    }

    // Check payment type and determine recipient
    // For booking_fee payments, we get partner_id from metadata
    // For subscription payments, we get customer_id and customer_type from order
    let recipientId = null;
    let recipientType = null;
    let partnerInfo = null;

    // Strategy 1: Check if it's a booking fee payment (has partner_id in notes)
    if (orderMetadata.partner_id) {
      let partner = null;
      
      // Check if partner_id is a number (internal ID) or string (partner_id like "TH78079")
      if (typeof orderMetadata.partner_id === 'number' || 
          (typeof orderMetadata.partner_id === 'string' && /^\d+$/.test(orderMetadata.partner_id))) {
        // It's a numeric ID, use findById
        partner = await Partner.findById(parseInt(orderMetadata.partner_id));
      } else {
        // It's a string partner_id, use findByPartnerId
        partner = await Partner.findByPartnerId(orderMetadata.partner_id);
      }
      
      if (partner) {
        recipientId = partner.id;
        recipientType = 'partner';
        partnerInfo = {
          name: partner.name,
          partner_id: partner.partner_id
        };
      } else {
        return res.status(404).json({
          error: `Partner not found for partner_id: ${orderMetadata.partner_id}`,
          order_metadata: orderMetadata,
          customer_type: dbOrder.customer_type
        });
      }
    }
    // Strategy 1b: If partner_id is missing but slot_id exists, try to get partner from slot
    else if (orderMetadata.slot_id) {
      const slotQuery = `SELECT partner_id FROM availability_slots WHERE id = $1`;
      const slotResult = await db.query(slotQuery, [orderMetadata.slot_id]);
      if (slotResult.rows[0] && slotResult.rows[0].partner_id) {
        const partner = await Partner.findById(slotResult.rows[0].partner_id);
        if (partner) {
          recipientId = partner.id;
          recipientType = 'partner';
          partnerInfo = {
            name: partner.name,
            partner_id: partner.partner_id
          };
          console.log(`[ADMIN] Found partner ${partner.id} (${partner.name}) from slot_id ${orderMetadata.slot_id} for payment ${razorpay_payment_id}`);
        } else {
          return res.status(404).json({
            error: `Partner not found for partner_id from slot: ${slotResult.rows[0].partner_id}`,
            slot_id: orderMetadata.slot_id,
            order_metadata: orderMetadata
          });
        }
      } else {
        return res.status(404).json({
          error: `Slot not found or has no partner_id: ${orderMetadata.slot_id}`,
          order_metadata: orderMetadata
        });
      }
    }
    // Strategy 1c: Allow manual override if partner_id is provided (for cases where notes are missing)
    else if (partner_id_override) {
      const partner = await Partner.findByPartnerId(partner_id_override);
      if (partner) {
        recipientId = partner.id;
        recipientType = 'partner';
        partnerInfo = {
          name: partner.name,
          partner_id: partner.partner_id
        };
        console.log(`[ADMIN] Using override partner_id ${partner_id_override} to find partner ${partner.id} (${partner.name}) for payment ${razorpay_payment_id}`);
      } else {
        return res.status(404).json({
          error: `Partner not found for override partner_id: ${partner_id_override}`,
          order_metadata: orderMetadata
        });
      }
    }
    // Strategy 2: Check if order has partner/organization as customer (subscription payment)
    else if (dbOrder.customer_type === 'partner' || dbOrder.customer_type === 'organization') {
      recipientId = dbOrder.customer_id;
      recipientType = dbOrder.customer_type;

      if (dbOrder.customer_type === 'partner') {
        const partner = await Partner.findById(dbOrder.customer_id);
        if (partner) {
          partnerInfo = {
            name: partner.name,
            partner_id: partner.partner_id
          };
        }
      } else if (dbOrder.customer_type === 'organization') {
        const org = await Organization.findById(dbOrder.customer_id);
        if (org) {
          partnerInfo = {
            name: org.name
          };
        }
      }
    } 
    // Strategy 3: If customer_type is 'user' but no partner_id in notes and no slot_id, 
    // this might be a booking payment but the notes weren't saved properly - we can't determine the recipient
    else {
      // Unknown payment type or missing info - provide detailed error with actual order data
      return res.status(400).json({
        error: 'Cannot determine recipient for earnings. Missing partner_id in order notes and slot_id.',
        payment_type: orderMetadata.payment_type || 'not set',
        customer_type: dbOrder.customer_type || 'not set',
        order_metadata: orderMetadata,
        debug_info: {
          has_partner_id_in_notes: !!orderMetadata.partner_id,
          has_slot_id_in_notes: !!orderMetadata.slot_id,
          has_payment_type_in_notes: !!orderMetadata.payment_type,
          order_customer_id: dbOrder.customer_id,
          order_customer_type: dbOrder.customer_type,
          order_id: dbOrder.razorpay_order_id,
          notes_raw: dbOrder.notes,
          notes_type: typeof dbOrder.notes
        }
      });
    }

    // recipientId and recipientType are now set above based on payment type
    if (!recipientId || !recipientType) {
      return res.status(400).json({
        error: 'Could not determine recipient for earnings creation',
        order_metadata: orderMetadata,
        customer_type: dbOrder.customer_type
      });
    }

    // Try to find appointment_id from slot_id if available
    let appointmentId = null;
    if (orderMetadata.slot_id) {
      const slotQuery = `SELECT appointment_id FROM availability_slots WHERE id = $1`;
      const slotResult = await db.query(slotQuery, [orderMetadata.slot_id]);
      if (slotResult.rows[0] && slotResult.rows[0].appointment_id) {
        appointmentId = slotResult.rows[0].appointment_id;
      }
    }

    // Create earnings record
    const earnings = await Earnings.create({
      recipient_id: recipientId,
      recipient_type: recipientType,
      razorpay_payment_id: razorpay_payment_id,
      amount: payment.amount,
      currency: payment.currency,
      status: payment.status === 'captured' || payment.status === 'authorized' ? 'pending' : 'pending',
      appointment_id: appointmentId,
      payout_date: null
    });

    console.log(`[ADMIN] Created earnings record for ${recipientType} ${recipientId}${partnerInfo ? ` (${partnerInfo.name})` : ''} from payment ${razorpay_payment_id} (amount: ${payment.amount} ${payment.currency})`);

    res.json({
      success: true,
      message: 'Earnings record created successfully',
      earnings: {
        id: earnings.id,
        recipient_id: earnings.recipient_id,
        recipient_type: earnings.recipient_type,
        recipient_name: partnerInfo?.name,
        partner_id_string: partnerInfo?.partner_id,
        amount: parseFloat(earnings.amount),
        currency: earnings.currency,
        status: earnings.status,
        created_at: earnings.created_at
      }
    });
  } catch (error) {
    console.error('[ADMIN] Error checking/creating earnings:', error);
    res.status(500).json({
      error: 'Failed to check/create earnings',
      details: error.message
    });
  }
};

/**
 * Backfill missing order notes from Razorpay (Admin only)
 * POST /api/admin/earnings/backfill-order-notes
 */
const backfillOrderNotes = async (req, res) => {
  try {
    const Razorpay = require('razorpay');
    const razorpayInstance = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET
    });

    // Find all orders with missing or null notes
    const query = `
      SELECT razorpay_order_id, id, created_at
      FROM razorpay_orders
      WHERE notes IS NULL OR notes = 'null'::jsonb OR notes = '{}'::jsonb
      ORDER BY created_at DESC
      LIMIT 1000
    `;
    
    const result = await db.query(query);
    const ordersToBackfill = result.rows;

    if (ordersToBackfill.length === 0) {
      return res.json({
        success: true,
        message: 'No orders with missing notes found',
        processed: 0,
        updated: 0,
        failed: 0
      });
    }

    let updated = 0;
    let failed = 0;
    const errors = [];

    console.log(`[BACKFILL] Starting backfill for ${ordersToBackfill.length} orders with missing notes`);

    for (const order of ordersToBackfill) {
      try {
        // Fetch order from Razorpay
        const razorpayOrder = await razorpayInstance.orders.fetch(order.razorpay_order_id);
        
        if (razorpayOrder && razorpayOrder.notes && Object.keys(razorpayOrder.notes).length > 0) {
          // Update database with notes from Razorpay
          const updateQuery = `
            UPDATE razorpay_orders 
            SET notes = $1, updated_at = CURRENT_TIMESTAMP 
            WHERE razorpay_order_id = $2
            RETURNING razorpay_order_id
          `;
          await db.query(updateQuery, [JSON.stringify(razorpayOrder.notes), order.razorpay_order_id]);
          updated++;
          console.log(`[BACKFILL] Updated order ${order.razorpay_order_id} with notes from Razorpay`);
        } else {
          errors.push({
            order_id: order.razorpay_order_id,
            error: 'No notes found in Razorpay order'
          });
          failed++;
        }
      } catch (error) {
        console.error(`[BACKFILL] Error processing order ${order.razorpay_order_id}:`, error.message);
        errors.push({
          order_id: order.razorpay_order_id,
          error: error.message
        });
        failed++;
      }
    }

    console.log(`[BACKFILL] Backfill completed: ${updated} updated, ${failed} failed`);

    res.json({
      success: true,
      message: `Backfill completed: ${updated} orders updated, ${failed} failed`,
      processed: ordersToBackfill.length,
      updated,
      failed,
      errors: errors.length > 0 ? errors.slice(0, 10) : [] // Return first 10 errors if any
    });
  } catch (error) {
    console.error('[BACKFILL] Error in backfill process:', error);
    res.status(500).json({
      error: 'Failed to backfill order notes',
      details: error.message
    });
  }
};

/**
 * Get all partners (admin only)
 */
const getAllPartners = async (req, res) => {
  try {
    const query = `
      SELECT 
        p.*,
        o.name as organization_name,
        o.email as organization_email,
        o.theraptrack_controlled,
        COUNT(DISTINCT upa.user_id) as total_clients
      FROM partners p
      LEFT JOIN organizations o ON p.organization_id = o.id
      LEFT JOIN user_partner_assignments upa ON p.id = upa.partner_id
      GROUP BY p.id, o.name, o.email, o.theraptrack_controlled
      ORDER BY p.created_at DESC
    `;
    const result = await db.query(query);
    res.json({
      success: true,
      partners: result.rows
    });
  } catch (error) {
    console.error('Error fetching partners:', error);
    res.status(500).json({
      error: 'Failed to fetch partners',
      details: error.message
    });
  }
};

/**
 * Update partner details (admin only)
 */
const updatePartner = async (req, res) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Check if partner exists
    const partner = await Partner.findById(id);
    if (!partner) {
      return res.status(404).json({ error: 'Partner not found' });
    }

    // If setting query_resolver = true, check if organization is TheraPTrack controlled
    if (updateData.query_resolver === true) {
      const Organization = require('../models/Organization');
      const organization = await Organization.findById(partner.organization_id);
      if (organization && !organization.theraptrack_controlled) {
        return res.status(400).json({
          error: 'query_resolver can only be set for partners in TheraPTrack controlled organizations'
        });
      }
    }

    // Validate email format if provided
    if (updateData.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.email)) {
        return res.status(400).json({
          error: 'Please provide a valid email address'
        });
      }
    }

    // Validate contact number format if provided
    if (updateData.contact) {
      const phoneRegex = /^\+\d{1,4}\d{7,15}$/;
      if (!phoneRegex.test(updateData.contact)) {
        return res.status(400).json({
          error: `Please provide a valid contact number with country code (e.g., +919876543210). Received: ${updateData.contact}`
        });
      }
    }

    // Update partner
    const updated = await Partner.update(id, updateData);

    console.log(`[ADMIN] Partner updated: ${updated.name} (ID: ${id})`);

    res.json({
      success: true,
      message: 'Partner updated successfully',
      partner: updated
    });
  } catch (error) {
    console.error('Error updating partner:', error);
    res.status(500).json({
      error: 'Failed to update partner',
      details: error.message
    });
  }
};

/**
 * Set the for_new_therapists flag for an organization
 */
const setForNewTherapists = async (req, res) => {
  try {
    const { id } = req.params;
    const { value } = req.body;

    // Validate input
    if (typeof value !== 'boolean') {
      return res.status(400).json({
        error: 'Value must be a boolean (true or false)'
      });
    }

    console.log(`[ADMIN] Setting for_new_therapists=${value} for organization ${id}`);

    // Use the Organization model method
    const updatedOrganization = await Organization.setForNewTherapists(parseInt(id), value);

    res.json({
      success: true,
      message: value 
        ? 'Organization set as default for new therapist signups' 
        : 'Organization removed as default for new therapist signups',
      organization: updatedOrganization
    });

  } catch (error) {
    console.error('Error setting for_new_therapists flag:', error);
    res.status(500).json({
      error: error.message || 'Failed to update organization',
      details: error.message
    });
  }
};

/**
 * Get default subscription plan setting
 */
const getDefaultSubscriptionPlan = async (req, res) => {
  try {
    const SystemSettings = require('../models/SystemSettings');
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    
    const planId = await SystemSettings.getDefaultSubscriptionPlanId();
    
    if (!planId) {
      return res.json({
        success: true,
        default_plan: null
      });
    }
    
    const plan = await SubscriptionPlan.findById(planId);
    
    res.json({
      success: true,
      default_plan: plan
    });
  } catch (error) {
    console.error('Get default subscription plan error:', error);
    res.status(500).json({
      error: 'Failed to get default subscription plan',
      details: error.message
    });
  }
};

/**
 * Set default subscription plan
 */
const setDefaultSubscriptionPlan = async (req, res) => {
  try {
    const { plan_id } = req.body;
    const adminId = req.user.id;
    
    const SystemSettings = require('../models/SystemSettings');
    const SubscriptionPlan = require('../models/SubscriptionPlan');
    
    // Validate plan if provided
    if (plan_id) {
      const plan = await SubscriptionPlan.findById(plan_id);
      if (!plan) {
        return res.status(404).json({ error: 'Subscription plan not found' });
      }
      
      // Validate it's either Free Plan or a trial plan
      const isFreePlan = plan.plan_name.toLowerCase().includes('free');
      const isTrialPlan = plan.plan_duration_days && plan.plan_duration_days > 0;
      
      if (!isFreePlan && !isTrialPlan) {
        return res.status(400).json({
          error: 'Default plan must be either Free Plan or a trial plan (with plan_duration_days > 0)'
        });
      }
    }
    
    await SystemSettings.setDefaultSubscriptionPlanId(plan_id, adminId);
    
    res.json({
      success: true,
      message: plan_id 
        ? 'Default subscription plan updated successfully'
        : 'Default subscription plan cleared'
    });
  } catch (error) {
    console.error('Set default subscription plan error:', error);
    res.status(500).json({
      error: 'Failed to set default subscription plan',
      details: error.message
    });
  }
};

module.exports = {
  getAllOrganizations,
  createOrganization,
  updateOrganization,
  deactivateOrganization,
  activateOrganization,
  deleteOrganization,
  getOrganizationMetrics,
  getDashboardStats,
  checkAndCreateEarnings,
  backfillOrderNotes,
  getAllPartners,
  updatePartner,
  setForNewTherapists,
  getDefaultSubscriptionPlan,
  setDefaultSubscriptionPlan
};

