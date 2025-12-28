import React from 'react';
import { CheckCircle, XCircle, AlertCircle, Clock } from 'lucide-react';
import { getSubscriptionStatus, formatEndDate } from '../../utils/subscriptionHelper';

const SubscriptionStatusBadge = ({ subscription, showEndDate = true }) => {
  if (!subscription) return null;

  const status = getSubscriptionStatus(subscription);

  const statusConfig = {
    active: {
      icon: CheckCircle,
      bgColor: 'bg-green-100 dark:bg-green-900',
      textColor: 'text-green-800 dark:text-green-300',
      borderColor: 'border-green-200 dark:border-green-800',
      label: 'Active'
    },
    cancelled: {
      icon: AlertCircle,
      bgColor: 'bg-yellow-100 dark:bg-yellow-900',
      textColor: 'text-yellow-800 dark:text-yellow-300',
      borderColor: 'border-yellow-200 dark:border-yellow-800',
      label: 'Cancelled'
    },
    expired: {
      icon: XCircle,
      bgColor: 'bg-red-100 dark:bg-red-900',
      textColor: 'text-red-800 dark:text-red-300',
      borderColor: 'border-red-200 dark:border-red-800',
      label: 'Expired'
    },
    none: {
      icon: Clock,
      bgColor: 'bg-gray-100 dark:bg-gray-800',
      textColor: 'text-gray-800 dark:text-gray-300',
      borderColor: 'border-gray-200 dark:border-gray-700',
      label: 'No Subscription'
    }
  };

  const config = statusConfig[status] || statusConfig.none;
  const Icon = config.icon;

  return (
    <div className="flex flex-col space-y-2">
      <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.bgColor} ${config.textColor} ${config.borderColor}`}>
        <Icon className="h-4 w-4 mr-1.5" />
        <span>{config.label}</span>
      </div>

      {showEndDate && subscription.subscription_end_date && (
        <div className="text-sm text-gray-600 dark:text-dark-text-secondary">
          {status === 'cancelled' ? (
            <>
              <span className="font-medium">Active until:</span> {formatEndDate(subscription.subscription_end_date)}
            </>
          ) : status === 'active' ? (
            <>
              <span className="font-medium">Renews on:</span> {formatEndDate(subscription.subscription_end_date)}
            </>
          ) : status === 'expired' ? (
            <>
              <span className="font-medium">Expired on:</span> {formatEndDate(subscription.subscription_end_date)}
            </>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default SubscriptionStatusBadge;



