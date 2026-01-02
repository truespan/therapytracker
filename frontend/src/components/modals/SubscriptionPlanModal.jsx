import React, { useState, useEffect } from 'react';
import { Check, CreditCard, AlertCircle, Video, Calendar, X } from 'lucide-react';
import api from '../../services/api';
import { razorpayAPI, subscriptionPlanAPI } from '../../services/api';
import { initializeRazorpayCheckout } from '../../utils/razorpayHelper';

const SubscriptionPlanModal = ({ isOpen, user, onSubscriptionComplete, onClose }) => {
  const [subscriptionPlans, setSubscriptionPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState('monthly');
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  
  // Check if user is on a trial plan
  const isOnTrialPlan = user?.subscription?.plan_duration_days && user?.subscription?.plan_duration_days > 0;
  const trialPlanName = user?.subscription?.plan_name || 'Trial Plan';
  
  // Check if user is on Free Plan
  const isFreePlan = user?.subscription?.plan_name?.toLowerCase().includes('free');

  useEffect(() => {
    if (isOpen) {
      // Track when modal is shown
      const trackModalShown = async () => {
        try {
          // Check if this is first login
          const firstLoginResponse = await subscriptionPlanAPI.checkFirstLogin();
          const isFirstLogin = firstLoginResponse.data.is_first_login || false;

          // Log modal shown event
          await subscriptionPlanAPI.logEvent({
            event_type: 'modal_shown',
            is_first_login: isFirstLogin
          });
        } catch (err) {
          console.error('Failed to track modal shown:', err);
          // Don't block user flow if tracking fails
        }
      };

      trackModalShown();
      fetchSubscriptionPlans();
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const fetchSubscriptionPlans = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await api.get('/subscription-plans/individual');
      if (response.data.success) {
        // Filter out Free Plan and plans with ₹0 pricing - only show paid plans
        const paidPlans = response.data.plans.filter(plan => {
          // Exclude plans with "free" in the name
          if (plan.plan_name.toLowerCase().includes('free')) {
            return false;
          }
          
          // Exclude plans where all pricing is ₹0
          const hasNonZeroPrice = 
            (plan.individual_monthly_price && plan.individual_monthly_price > 0) ||
            (plan.individual_quarterly_price && plan.individual_quarterly_price > 0) ||
            (plan.individual_yearly_price && plan.individual_yearly_price > 0);
          
          return hasNonZeroPrice;
        });
        setSubscriptionPlans(paidPlans);
      } else {
        setError('Failed to load subscription plans. Please try again.');
      }
    } catch (err) {
      console.error('Error fetching subscription plans:', err);
      setError(err.response?.data?.error || 'Failed to load subscription plans. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const getPriceForPeriod = (plan, period) => {
    switch (period) {
      case 'yearly':
        return plan.individual_yearly_price;
      case 'quarterly':
        return plan.individual_quarterly_price;
      case 'monthly':
      default:
        return plan.individual_monthly_price;
    }
  };

  const getPeriodLabel = (period) => {
    switch (period) {
      case 'yearly':
        return 'year';
      case 'quarterly':
        return 'quarter';
      case 'monthly':
      default:
        return 'month';
    }
  };

  // Get original/cancelled price for plans (only for monthly billing)
  const getOriginalPrice = (plan) => {
    // Only show original price for monthly billing period
    if (selectedBillingPeriod !== 'monthly') return null;
    
    const planName = plan.plan_name?.toLowerCase() || '';
    
    if (planName.includes('starter plan')) {
      return 499;
    } else if (planName.includes('pro plan premium')) {
      return 1299;
    } else if (planName.includes('pro plan') && !planName.includes('premium')) {
      return 899;
    }
    
    return null;
  };

  const handleSelectPlan = async () => {
    if (!selectedPlan) {
      setError('Please select a subscription plan');
      return;
    }

    try {
      setProcessing(true);
      setError('');

      // Track payment attempt
      try {
        const price = getPriceForPeriod(selectedPlan, selectedBillingPeriod);
        await subscriptionPlanAPI.logEvent({
          event_type: 'payment_attempted',
          subscription_plan_id: selectedPlan.id,
          billing_period: selectedBillingPeriod,
          metadata: {
            plan_name: selectedPlan.plan_name,
            price: price
          }
        });
      } catch (trackErr) {
        console.error('Failed to track payment attempt:', trackErr);
        // Continue with payment flow even if tracking fails
      }

      // DEVELOPMENT BYPASS: Only bypass payment if explicitly set via environment variable
      if (process.env.REACT_APP_BYPASS_SUBSCRIPTION === 'true') {
        console.warn('⚠️ [SubscriptionPlanModal] BYPASS MODE: Bypassing payment flow (REACT_APP_BYPASS_SUBSCRIPTION=true)');
        // Directly assign subscription without payment in development
        const response = await api.post('/partner-subscriptions/select-plan', {
          plan_id: selectedPlan.id,
          billing_period: selectedBillingPeriod
        });

        if (response.data.success) {
          // Track payment completion (development mode)
          try {
            await subscriptionPlanAPI.logEvent({
              event_type: 'payment_completed',
              subscription_plan_id: selectedPlan.id,
              billing_period: selectedBillingPeriod,
              metadata: {
                plan_name: selectedPlan.plan_name,
                price: getPriceForPeriod(selectedPlan, selectedBillingPeriod),
                mode: 'development_bypass'
              }
            });
          } catch (trackErr) {
            console.error('Failed to track payment completion:', trackErr);
          }

          // Call the callback with updated user data
          onSubscriptionComplete(response.data.user);
        } else {
          setError('Failed to activate subscription. Please try again.');
        }
        setProcessing(false);
        return;
      }

      // Get the price for the selected billing period
      const price = getPriceForPeriod(selectedPlan, selectedBillingPeriod);
      
      // Check if this is a free plan (price is 0)
      const isFreePlan = price === 0 || selectedPlan.plan_name.toLowerCase().includes('free');

      if (isFreePlan) {
        // For free plans, directly assign without payment
        const response = await api.post('/partner-subscriptions/select-plan', {
          plan_id: selectedPlan.id,
          billing_period: selectedBillingPeriod
        });

        if (response.data.success) {
          // Track payment completion (free plan)
          try {
            await subscriptionPlanAPI.logEvent({
              event_type: 'payment_completed',
              subscription_plan_id: selectedPlan.id,
              billing_period: selectedBillingPeriod,
              metadata: {
                plan_name: selectedPlan.plan_name,
                price: 0,
                mode: 'free_plan'
              }
            });
          } catch (trackErr) {
            console.error('Failed to track payment completion:', trackErr);
          }

          // Call the callback with updated user data
          onSubscriptionComplete(response.data.user);
        } else {
          setError('Failed to activate subscription. Please try again.');
        }
        return;
      }

      // For paid plans, proceed with Razorpay payment flow
      // Step 1: Create Razorpay order
      const orderResponse = await razorpayAPI.createOrder({
        subscription_plan_id: selectedPlan.id,
        billing_period: selectedBillingPeriod
      });

      const order = orderResponse.data.order;

      // Step 2: Initialize Razorpay checkout
      let paymentDetails;
      try {
        paymentDetails = await initializeRazorpayCheckout(order, {
          name: 'TheraP Track',
          description: `Subscription Plan - ${selectedPlan.plan_name} (${selectedBillingPeriod})`,
          prefill: {
            name: user?.name || '',
            email: user?.email || '',
            contact: user?.contact || '',
          },
        });
      } catch (paymentError) {
        // User cancelled or payment failed
        if (paymentError.message.includes('cancelled')) {
          setError('Payment was cancelled. Please select a plan and try again when ready.');
        } else {
          setError(paymentError.message || 'Payment initialization failed. Please try again.');
        }
        setProcessing(false);
        return;
      }

      // Step 3: Verify payment with backend
      try {
        await razorpayAPI.verifyPayment({
          razorpay_order_id: paymentDetails.razorpay_order_id,
          razorpay_payment_id: paymentDetails.razorpay_payment_id,
          razorpay_signature: paymentDetails.razorpay_signature,
        });

        // Payment verified successfully - now assign the subscription
        const response = await api.post('/partner-subscriptions/select-plan', {
          plan_id: selectedPlan.id,
          billing_period: selectedBillingPeriod
        });

        if (response.data.success) {
          // Track payment completion
          try {
            await subscriptionPlanAPI.logEvent({
              event_type: 'payment_completed',
              subscription_plan_id: selectedPlan.id,
              billing_period: selectedBillingPeriod,
              metadata: {
                plan_name: selectedPlan.plan_name,
                price: getPriceForPeriod(selectedPlan, selectedBillingPeriod),
                razorpay_order_id: paymentDetails.razorpay_order_id,
                razorpay_payment_id: paymentDetails.razorpay_payment_id
              }
            });
          } catch (trackErr) {
            console.error('Failed to track payment completion:', trackErr);
            // Continue even if tracking fails
          }

          // Call the callback with updated user data
          onSubscriptionComplete(response.data.user);
        } else {
          setError('Payment successful but subscription activation failed. Please contact support.');
        }
      } catch (verifyError) {
        // Payment verification failed
        console.error('Payment verification failed:', verifyError);
        setError(
          verifyError.response?.data?.error || 
          'Payment verification failed. Please contact support if payment was deducted.'
        );
        setProcessing(false);
      }
    } catch (err) {
      console.error('Error selecting subscription:', err);
      setError(err.response?.data?.error || 'Failed to process subscription. Please try again.');
      setProcessing(false);
    }
  };

  if (!isOpen) return null;

  const handleClose = () => {
    // Allow closing if:
    // 1. User is on a trial plan (can cancel and proceed), OR
    // 2. User is on Free Plan (will trigger logout), OR
    // 3. There are no paid plans available (prevents users from bypassing payment)
    if (onClose && (isOnTrialPlan || isFreePlan || (subscriptionPlans.length === 0 && !loading))) {
      onClose();
    }
  };

  const handleBackdropClick = (e) => {
    // Only close if clicking the backdrop itself, not the modal content
    // AND only if:
    // 1. User is on a trial plan (can cancel and proceed), OR
    // 2. User is on Free Plan (will trigger logout), OR
    // 3. There are no paid plans available (prevents bypassing payment)
    if (e.target === e.currentTarget && !processing && (isOnTrialPlan || isFreePlan || (subscriptionPlans.length === 0 && !loading))) {
      handleClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={handleBackdropClick}>
      {/* Backdrop - dashboard visible */}
      <div className="absolute inset-0 bg-black/40"></div>

      {/* Modal Content */}
      <div className="relative bg-white dark:bg-dark-bg-secondary rounded-2xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-primary-600 to-primary-700 dark:from-dark-primary-600 dark:to-dark-primary-700 px-6 py-6 text-white relative">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-2">
              {isOnTrialPlan 
                ? `You are in "${trialPlanName}" plan now. You can cancel and proceed.`
                : 'Select Your Subscription Plan'}
            </h2>
            <p className="text-primary-100 dark:text-primary-200">
              {isOnTrialPlan
                ? 'You can upgrade to a paid plan anytime or continue with your trial'
                : 'Choose the plan that best fits your practice needs'}
            </p>
          </div>
          {/* Close button - show for trial users, Free Plan users, or when no paid plans are available */}
          {!loading && !error && (isOnTrialPlan || isFreePlan || subscriptionPlans.length === 0) && onClose && !processing && (
            <button
              onClick={handleClose}
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/20 transition-colors"
              aria-label="Close modal"
            >
              <X className="h-6 w-6" />
            </button>
          )}
        </div>

        {/* Billing Period Selector */}
        <div className="px-6 pt-6 pb-4 bg-gray-50 dark:bg-dark-bg-tertiary border-b border-gray-200 dark:border-dark-border">
          <div className="flex justify-center space-x-2">
            {['monthly', 'quarterly', 'yearly'].map((period) => (
              <button
                key={period}
                onClick={() => setSelectedBillingPeriod(period)}
                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                  selectedBillingPeriod === period
                    ? 'bg-primary-600 text-white shadow-lg'
                    : 'bg-white dark:bg-dark-bg-secondary text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-primary'
                }`}
              >
                {period.charAt(0).toUpperCase() + period.slice(1)}
                {period === 'yearly' && (
                  <span className="ml-2 text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">
                    Save 20%
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-dark-primary-500 mb-4"></div>
              <p className="text-gray-600 dark:text-dark-text-secondary">Loading subscription plans...</p>
            </div>
          )}

          {error && !loading && (
            <div className="bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg p-4 mb-4">
              <div className="flex items-start space-x-2">
                <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-error-700 dark:text-error-300 text-sm">{error}</p>
                  <button
                    onClick={fetchSubscriptionPlans}
                    className="mt-2 text-sm text-error-700 dark:text-error-300 underline hover:no-underline"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {!loading && !error && subscriptionPlans.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {subscriptionPlans
                .filter(plan => {
                  // Filter out plans with ₹0 for the selected billing period
                  const price = getPriceForPeriod(plan, selectedBillingPeriod);
                  return price > 0;
                })
                .map((plan) => {
                const price = getPriceForPeriod(plan, selectedBillingPeriod);
                const isSelected = selectedPlan?.id === plan.id;
                const isFreePlan = plan.plan_name.toLowerCase().includes('free');

                return (
                  <div
                    key={plan.id}
                    onClick={() => setSelectedPlan(plan)}
                    className={`relative rounded-xl border-2 p-6 cursor-pointer transition-all hover:shadow-lg ${
                      isSelected
                        ? 'border-primary-600 dark:border-dark-primary-500 bg-primary-50 dark:bg-primary-900/20 shadow-xl'
                        : 'border-gray-200 dark:border-dark-border bg-white dark:bg-dark-bg-tertiary hover:border-primary-300 dark:hover:border-dark-primary-700'
                    }`}
                  >
                    {isSelected && (
                      <div className="absolute -top-3 -right-3 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-full p-2 shadow-lg">
                        <Check className="h-5 w-5" />
                      </div>
                    )}

                    <div className="text-center mb-4">
                      <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">
                        {plan.plan_name}
                      </h3>
                      {(() => {
                        const originalPrice = getOriginalPrice(plan);
                        return (
                          <>
                            {originalPrice && (
                              <div className="mb-1">
                                <span className="text-lg text-red-600 dark:text-red-400 line-through font-medium">
                                  ₹{originalPrice.toFixed(2)}/ month
                                </span>
                              </div>
                            )}
                            <div className="flex items-baseline justify-center">
                              <span className="text-4xl font-bold text-primary-600 dark:text-dark-primary-500">
                                ₹{price}
                              </span>
                              <span className="text-gray-600 dark:text-dark-text-secondary ml-2">
                                / {getPeriodLabel(selectedBillingPeriod)}
                              </span>
                            </div>
                          </>
                        );
                      })()}
                    </div>

                    <ul className="space-y-3 mb-6">
                      <li className="flex items-start space-x-2">
                        <Calendar className="h-5 w-5 text-primary-600 dark:text-dark-primary-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                          {plan.max_sessions === null || plan.max_sessions >= 999999
                            ? 'Unlimited sessions'
                            : `${plan.min_sessions}-${plan.max_sessions} sessions/month`}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_video ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_video ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Video sessions {plan.has_video ? 'enabled' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_whatsapp ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_whatsapp ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          WhatsApp messaging {plan.has_whatsapp ? '' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_advanced_assessments ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_advanced_assessments ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Advanced assessments {plan.has_advanced_assessments ? '' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_report_generation ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_report_generation ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Report generation {plan.has_report_generation ? '' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_custom_branding ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_custom_branding ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Custom branding {plan.has_custom_branding ? '' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_advanced_analytics ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_advanced_analytics ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Advanced analytics {plan.has_advanced_analytics ? '' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_blogs_events_announcements ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_blogs_events_announcements ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Blogs, Events & Announcements {plan.has_blogs_events_announcements ? '' : 'not included'}
                        </span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <Check className={`h-5 w-5 flex-shrink-0 mt-0.5 ${plan.has_customized_feature_support ? 'text-primary-600 dark:text-dark-primary-500' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_customized_feature_support ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Customized Feature Support {plan.has_customized_feature_support ? '' : 'not included'}
                        </span>
                      </li>
                      {plan.has_priority_support && (
                        <li className="flex items-start space-x-2">
                          <Check className="h-5 w-5 text-primary-600 dark:text-dark-primary-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                            Priority support
                          </span>
                        </li>
                      )}
                      {plan.has_email_support && !plan.has_priority_support && (
                        <li className="flex items-start space-x-2">
                          <Check className="h-5 w-5 text-primary-600 dark:text-dark-primary-500 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                            Chat and Email support
                          </span>
                        </li>
                      )}
                    </ul>

                    {isFreePlan && (
                      <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                        <p className="text-xs text-amber-800 dark:text-amber-200">
                          Perfect for getting started with TheraP Track
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {!loading && !error && subscriptionPlans.length === 0 && (
            <div className="text-center py-12">
              <AlertCircle className="h-12 w-12 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
              <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                No subscription plans available at the moment.
              </p>
              {onClose && (
                <button
                  onClick={handleClose}
                  className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg font-semibold hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  Close
                </button>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 dark:border-dark-border px-6 py-4 bg-gray-50 dark:bg-dark-bg-tertiary">
          {error && (
            <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-error-600 dark:text-error-400 flex-shrink-0" />
              <span className="text-sm text-error-700 dark:text-error-300">{error}</span>
            </div>
          )}

          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-600 dark:text-dark-text-tertiary">
              {isOnTrialPlan
                ? `Currently on: ${trialPlanName}`
                : selectedPlan
                ? `Selected: ${selectedPlan.plan_name}`
                : subscriptionPlans.length === 0
                ? 'No plans available'
                : 'Please select a plan to continue'}
            </p>
            <div className="flex items-center space-x-3">
              {/* Show close button for trial users, Free Plan users, or when no plans available */}
              {(isOnTrialPlan || isFreePlan || subscriptionPlans.length === 0) && onClose && !processing && (
                <button
                  onClick={handleClose}
                  className="px-6 py-3 rounded-lg font-semibold bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {isOnTrialPlan ? 'Continue with Trial' : 'Close'}
                </button>
              )}
              {subscriptionPlans.length > 0 && (
                <button
                  onClick={handleSelectPlan}
                  disabled={!selectedPlan || processing}
                  className={`px-8 py-3 rounded-lg font-semibold text-white transition-all flex items-center space-x-2 ${
                    selectedPlan && !processing
                      ? 'bg-primary-600 hover:bg-primary-700 dark:bg-dark-primary-600 dark:hover:bg-dark-primary-700 shadow-lg hover:shadow-xl'
                      : 'bg-gray-300 dark:bg-gray-600 cursor-not-allowed'
                  }`}
                >
                  {processing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      <span>Processing...</span>
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5" />
                      <span>{isOnTrialPlan ? 'Upgrade Now' : 'Select & Pay'}</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SubscriptionPlanModal;

