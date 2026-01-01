import React, { useState, useEffect } from 'react';
import { X, Check, CreditCard } from 'lucide-react';

const PlanSelectionModal = ({
  currentPlanId,
  plans,
  userType, // 'individual' or 'organization'
  onClose,
  onSelectPlan,
  isBulkMode = false,
  organizationName = 'Your Organization'
}) => {
  const [selectedBillingPeriod, setSelectedBillingPeriod] = useState('monthly');
  const [selectedPlanForAction, setSelectedPlanForAction] = useState(null);

  // Get available billing periods based on plan type and first plan's enabled flags
  const getAvailableBillingPeriods = () => {
    if (!plans || plans.length === 0) return ['monthly'];

    const firstPlan = plans[0];
    const periods = [];

    // Check which periods are enabled based on user type
    const prefix = userType === 'individual' ? 'individual' : 'organization';

    if (firstPlan[`${prefix}_monthly_enabled`]) periods.push('monthly');
    if (firstPlan[`${prefix}_quarterly_enabled`]) periods.push('quarterly');
    if (firstPlan[`${prefix}_yearly_enabled`]) periods.push('yearly');

    return periods.length > 0 ? periods : ['monthly'];
  };

  const availablePeriods = getAvailableBillingPeriods();

  // Set initial billing period
  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(selectedBillingPeriod)) {
      setSelectedBillingPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, selectedBillingPeriod]);

  // Get price for a plan based on user type and billing period
  const getPrice = (plan) => {
    const prefix = userType === 'individual' ? 'individual' : 'organization';
    const priceKey = `${prefix}_${selectedBillingPeriod}_price`;
    return plan[priceKey] || 0;
  };

  // Format price in INR
  const formatPrice = (price) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(price);
  };

  // Helper function to check boolean values (handles both boolean and string types)
  const isFeatureEnabled = (value) => {
    if (value === true || value === 'true') return true;
    if (value === false || value === 'false') return false;
    return !!value; // Convert to boolean for truthy/falsy checks
  };

  // Get session limit text
  const getSessionLimit = (plan) => {
    if (plan.max_sessions === null || plan.max_sessions === undefined || plan.max_sessions >= 999999) {
      return 'Unlimited Sessions';
    }
    if (plan.min_sessions === 0 && plan.max_sessions > 0) {
      return `Up to ${plan.max_sessions} sessions`;
    }
    return `${plan.min_sessions} - ${plan.max_sessions} sessions`;
  };

  // Get billing period label
  const getBillingPeriodLabel = (period) => {
    const labels = {
      monthly: 'Monthly',
      quarterly: 'Quarterly',
      yearly: 'Yearly'
    };
    return labels[period] || period;
  };

  // Get original price for plans with discounts (only for monthly billing)
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

  // Handle plan selection
  const handleSelectPlan = (plan) => {
    if (plan.id === currentPlanId) return;
    setSelectedPlanForAction(plan.id);
    onSelectPlan(plan.id, selectedBillingPeriod);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-7xl w-full my-8">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-dark-border flex items-center justify-between sticky top-0 bg-white dark:bg-dark-bg-tertiary z-10">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center">
              <CreditCard className="h-6 w-6 mr-2 text-indigo-600 dark:text-dark-primary-500" />
              {isBulkMode ? `Select Plan for All Therapists` : `Select Your Subscription Plan`}
            </h2>
            <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
              {isBulkMode
                ? `Choose a plan to apply to all therapists in ${organizationName}`
                : `Choose the plan that best fits your needs`}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors"
            aria-label="Close modal"
          >
            <X className="h-6 w-6 text-gray-500 dark:text-dark-text-tertiary" />
          </button>
        </div>

        {/* Billing Period Tabs */}
        {availablePeriods.length > 1 && (
          <div className="p-6 border-b border-gray-200 dark:border-dark-border">
            <div className="flex space-x-2 bg-gray-100 dark:bg-dark-bg-secondary rounded-lg p-1">
              {availablePeriods.map((period) => (
                <button
                  key={period}
                  onClick={() => setSelectedBillingPeriod(period)}
                  className={`flex-1 py-2 px-4 rounded-md font-medium transition-colors ${
                    selectedBillingPeriod === period
                      ? 'bg-white dark:bg-dark-bg-primary text-indigo-600 dark:text-dark-primary-500 shadow-sm'
                      : 'text-gray-600 dark:text-dark-text-secondary hover:text-gray-900 dark:hover:text-dark-text-primary'
                  }`}
                >
                  {getBillingPeriodLabel(period)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Plans Grid */}
        <div className="p-6">
          {!plans || plans.length === 0 ? (
            <div className="text-center py-12 text-gray-500 dark:text-dark-text-secondary">
              <CreditCard className="h-16 w-16 mx-auto mb-4 text-gray-400 dark:text-dark-text-secondary" />
              <p className="text-gray-500 dark:text-dark-text-secondary">No plans available{userType === 'organization' ? ' for your organization size' : ''}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
              {plans.map((plan) => {
                const isCurrentPlan = plan.id === currentPlanId;
                const price = getPrice(plan);

                return (
                  <div
                    key={plan.id}
                    className={`relative border rounded-lg p-6 flex flex-col transition-all bg-white dark:bg-dark-bg-primary ${
                      isCurrentPlan
                        ? 'border-indigo-500 dark:border-dark-primary-500 ring-2 ring-indigo-500 dark:ring-dark-primary-500 shadow-lg'
                        : 'border-gray-200 dark:border-dark-border hover:border-indigo-300 dark:hover:border-dark-primary-500 hover:shadow-md'
                    }`}
                  >
                    {/* Current Plan Badge */}
                    {isCurrentPlan && (
                      <div className="absolute top-0 right-0 bg-indigo-500 dark:bg-dark-primary-500 text-white px-3 py-1 rounded-bl-lg rounded-tr-lg text-xs font-medium">
                        Current Plan
                      </div>
                    )}

                    {/* Plan Name */}
                    <div className="mb-4">
                      <h3 className="text-lg font-bold text-gray-900 dark:text-dark-text-primary pr-8">
                        {plan.plan_name}
                      </h3>
                    </div>

                    {/* Pricing */}
                    <div className="mb-6">
                      {(() => {
                        const originalPrice = getOriginalPrice(plan);
                        return (
                          <>
                            {originalPrice && (
                              <div className="flex items-center space-x-2 mb-1">
                                <span className="text-lg text-red-600 dark:text-red-400 line-through font-medium">
                                  ₹{originalPrice.toFixed(2)}/ month
                                </span>
                              </div>
                            )}
                            <div className="flex items-baseline">
                              <span className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                                {formatPrice(price)}
                              </span>
                              <span className="ml-2 text-gray-600 dark:text-dark-text-secondary">
                                /{selectedBillingPeriod === 'yearly' ? 'year' : selectedBillingPeriod === 'quarterly' ? 'quarter' : 'month'}
                              </span>
                            </div>
                            {userType === 'organization' && (
                              <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mt-1">per therapist</p>
                            )}
                          </>
                        );
                      })()}
                    </div>

                    {/* Features */}
                    <ul className="space-y-3 mb-6 flex-grow">
                      {/* Session Limit - Always shown */}
                      <li className="flex items-start">
                        <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-700 dark:text-dark-text-secondary">{getSessionLimit(plan)}</span>
                      </li>

                      {/* Video Features - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_video ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_video ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Video sessions {plan.has_video ? 'enabled' : 'not included'}
                        </span>
                      </li>

                      {/* WhatsApp Messaging - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_whatsapp ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_whatsapp ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          WhatsApp messaging {plan.has_whatsapp ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Advanced Assessments - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_advanced_assessments ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_advanced_assessments ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Advanced assessments {plan.has_advanced_assessments ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Report Generation - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_report_generation ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_report_generation ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Report generation {plan.has_report_generation ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Custom Branding - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_custom_branding ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_custom_branding ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Custom branding {plan.has_custom_branding ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Advanced Analytics - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_advanced_analytics ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_advanced_analytics ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Advanced analytics {plan.has_advanced_analytics ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Blogs, Events & Announcements - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_blogs_events_announcements ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_blogs_events_announcements ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Blogs, Events & Announcements {plan.has_blogs_events_announcements ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Customized Feature Support - Always show */}
                      <li className="flex items-start">
                        <Check className={`h-5 w-5 mr-2 flex-shrink-0 mt-0.5 ${plan.has_customized_feature_support ? 'text-green-500 dark:text-green-400' : 'text-gray-300 dark:text-gray-500'}`} />
                        <span className={`text-sm ${plan.has_customized_feature_support ? 'text-gray-700 dark:text-dark-text-secondary' : 'text-gray-400 dark:text-gray-400'}`}>
                          Customized Feature Support {plan.has_customized_feature_support ? '' : 'not included'}
                        </span>
                      </li>

                      {/* Support Features - Always show */}
                      {isFeatureEnabled(plan.has_priority_support) ? (
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                            Priority support
                          </span>
                        </li>
                      ) : isFeatureEnabled(plan.has_email_support) ? (
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-green-500 dark:text-green-400 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-700 dark:text-dark-text-secondary">
                            Chat and Email support
                          </span>
                        </li>
                      ) : (
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-gray-300 dark:text-gray-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-gray-400 dark:text-gray-400">
                            Support not included
                          </span>
                        </li>
                      )}

                      {/* Therapist Range for Organization Plans */}
                      {plan.min_therapists && plan.max_therapists && (
                        <li className="flex items-start">
                          <Check className="h-5 w-5 text-indigo-500 dark:text-dark-primary-500 mr-2 flex-shrink-0 mt-0.5" />
                          <span className="text-sm text-indigo-700 dark:text-dark-primary-400 font-medium">
                            For {plan.min_therapists}-{plan.max_therapists} therapists
                          </span>
                        </li>
                      )}
                    </ul>

                    {/* Action Button */}
                    <button
                      onClick={() => handleSelectPlan(plan)}
                      disabled={isCurrentPlan || selectedPlanForAction === plan.id}
                      className={`w-full py-3 px-4 rounded-lg font-medium transition-colors ${
                        isCurrentPlan
                          ? 'bg-gray-100 dark:bg-dark-bg-secondary text-gray-600 dark:text-dark-text-tertiary cursor-not-allowed'
                          : selectedPlanForAction === plan.id
                          ? 'bg-indigo-400 dark:bg-dark-primary-600 text-white cursor-wait'
                          : 'bg-indigo-600 dark:bg-dark-primary-500 text-white hover:bg-indigo-700 dark:hover:bg-dark-primary-600'
                      }`}
                    >
                      {isCurrentPlan
                        ? 'Current Plan'
                        : selectedPlanForAction === plan.id
                        ? isBulkMode ? 'Applying...' : 'Selecting...'
                        : isBulkMode ? 'Apply to All' : 'Select Plan'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-dark-border bg-gray-50 dark:bg-dark-bg-secondary">
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary text-center">
            All plans include basic appointment scheduling and simple case notes
          </p>
        </div>
      </div>
    </div>
  );
};

export default PlanSelectionModal;
