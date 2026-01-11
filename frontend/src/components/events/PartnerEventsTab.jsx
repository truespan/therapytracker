import React, { useState, useEffect } from 'react';
import { eventAPI } from '../../services/api';
import { Calendar, MapPin, DollarSign, Users, User as UserIcon, Edit, Trash2, Plus, X, ChevronDown, ChevronUp, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';

const PartnerEventsTab = () => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showEnrollments, setShowEnrollments] = useState({});
  const [enrollments, setEnrollments] = useState({});
  const [loadingEnrollments, setLoadingEnrollments] = useState({});

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    try {
      setLoading(true);
      const response = await eventAPI.getPartnerEvents();
      setEvents(response.data.events || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load events:', err);
      setError('Failed to load events. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadEnrollments = async (eventId) => {
    try {
      setLoadingEnrollments({ ...loadingEnrollments, [eventId]: true });
      const response = await eventAPI.getEventEnrollments(eventId);
      setEnrollments({ ...enrollments, [eventId]: response.data.enrollments || [] });
    } catch (err) {
      console.error('Failed to load enrollments:', err);
      setError('Failed to load enrollments. Please try again.');
    } finally {
      setLoadingEnrollments({ ...loadingEnrollments, [eventId]: false });
    }
  };

  const toggleEnrollments = (eventId) => {
    const isShowing = showEnrollments[eventId];
    setShowEnrollments({ ...showEnrollments, [eventId]: !isShowing });
    
    if (!isShowing && !enrollments[eventId]) {
      loadEnrollments(eventId);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return format(new Date(dateString), 'MMM d, yyyy h:mm a');
  };

  const getEnrollmentStatusBadge = (enrollment) => {
    const status = enrollment.enrollment_status;
    const paymentStatus = enrollment.payment_status;
    
    if (status === 'confirmed' && (paymentStatus === 'paid' || paymentStatus === 'free')) {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Confirmed</span>;
    } else if (status === 'pending') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">Pending</span>;
    } else if (status === 'cancelled') {
      return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Cancelled</span>;
    }
    return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-dark-text-secondary">Loading events...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-600 dark:text-red-400 mb-4">
          <AlertCircle className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg">{error}</p>
        </div>
        <button
          onClick={loadEvents}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Events</h2>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            Manage your events and view enrolled clients
          </p>
        </div>
      </div>

      {events.length === 0 ? (
        <div className="card text-center py-12">
          <Calendar className="h-16 w-16 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-dark-text-primary mb-2">No Events Created</h3>
          <p className="text-gray-600 dark:text-dark-text-secondary">
            You haven't created any events yet. Create your first event to get started.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {events.map((event) => (
            <div key={event.id} className="card">
              <div className="flex flex-col">
                {/* Event Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">
                      {event.title}
                    </h3>
                    {event.description && (
                      <p className="text-sm text-gray-600 dark:text-dark-text-secondary mb-3">
                        {event.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-dark-text-secondary">
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4" />
                        <span>{formatDate(event.event_date)}</span>
                      </div>
                      {event.location && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="h-4 w-4" />
                          <span>{event.location}</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <DollarSign className="h-4 w-4" />
                        <span className="font-medium">
                          {event.fee_amount > 0 
                            ? `₹${parseFloat(event.fee_amount).toFixed(2)}`
                            : 'Free'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                  {event.image_url && (
                    <div className="ml-4 w-32 h-32 bg-gray-200 dark:bg-dark-bg-secondary rounded-lg overflow-hidden flex-shrink-0">
                      <img 
                        src={event.image_url} 
                        alt={event.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                </div>

                {/* Enrollments Section */}
                <div className="border-t border-gray-200 dark:border-dark-border pt-4 mt-4">
                  <button
                    onClick={() => toggleEnrollments(event.id)}
                    className="flex items-center justify-between w-full text-left"
                  >
                    <div className="flex items-center space-x-2">
                      <Users className="h-5 w-5 text-primary-600" />
                      <span className="font-medium text-gray-900 dark:text-dark-text-primary">
                        Enrolled Clients
                      </span>
                      {enrollments[event.id] && (
                        <span className="text-sm text-gray-500 dark:text-dark-text-secondary">
                          ({enrollments[event.id].length})
                        </span>
                      )}
                    </div>
                    {showEnrollments[event.id] ? (
                      <ChevronUp className="h-5 w-5 text-gray-500" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-gray-500" />
                    )}
                  </button>

                  {showEnrollments[event.id] && (
                    <div className="mt-4">
                      {loadingEnrollments[event.id] ? (
                        <div className="text-center py-4">
                          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-600 dark:text-dark-text-secondary">Loading enrollments...</p>
                        </div>
                      ) : enrollments[event.id] && enrollments[event.id].length > 0 ? (
                        <div className="space-y-3">
                          {enrollments[event.id].map((enrollment) => (
                            <div 
                              key={enrollment.id} 
                              className="flex items-center justify-between p-3 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg"
                            >
                              <div className="flex-1">
                                <div className="flex items-center space-x-3">
                                  <UserIcon className="h-5 w-5 text-gray-500" />
                                  <div>
                                    <p className="font-medium text-gray-900 dark:text-dark-text-primary">
                                      {enrollment.user_name}
                                    </p>
                                    <div className="flex items-center space-x-4 mt-1 text-xs text-gray-500 dark:text-dark-text-secondary">
                                      {enrollment.user_email && (
                                        <span>{enrollment.user_email}</span>
                                      )}
                                      {enrollment.user_contact && (
                                        <span>{enrollment.user_contact}</span>
                                      )}
                                      <span>Enrolled: {formatDate(enrollment.enrolled_at)}</span>
                                    </div>
                                  </div>
                                </div>
                              </div>
                              <div className="ml-4">
                                {getEnrollmentStatusBadge(enrollment)}
                                {event.fee_amount > 0 && (
                                  <div className="mt-2 text-xs text-gray-500 dark:text-dark-text-secondary">
                                    Payment: {enrollment.payment_status === 'paid' ? 'Paid' : enrollment.payment_status === 'free' ? 'Free' : 'Pending'}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-dark-text-secondary">
                          <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <p>No clients enrolled yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default PartnerEventsTab;
