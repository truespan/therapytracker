import React, { useState, useEffect, useCallback } from 'react';
import { appointmentAPI, videoSessionAPI } from '../../services/api';
import StartSessionModal from './StartSessionModal';
import StartSessionFromVideoModal from '../video/StartSessionFromVideoModal';
import TimeConfirmationModal from '../common/TimeConfirmationModal';
import { isFutureDate, isWithinTimeWindow, getCurrentDateTime } from '../../utils/sessionTimeValidation';
import { Calendar, Clock, User, AlertCircle, CheckCircle, PlayCircle, Video, Trash2, X, ArrowRight } from 'lucide-react';
import { format, addDays, startOfDay, isWithinInterval } from 'date-fns';
import { formatTime as formatTimeUtil, formatDateTime as formatDateTimeUtil } from '../../utils/dateUtils';

const AppointmentsTab = ({ partnerId, videoSessionsEnabled = true, onNavigateToSession }) => {
  const [appointments, setAppointments] = useState([]);
  const [videoSessions, setVideoSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);
  const [showStartVideoSessionModal, setShowStartVideoSessionModal] = useState(false);
  const [itemToDelete, setItemToDelete] = useState(null); // Can be appointment or video session
  const [deleting, setDeleting] = useState(false);
  const [showTimeConfirmModal, setShowTimeConfirmModal] = useState(false);
  const [timeValidationData, setTimeValidationData] = useState(null);

  // Generate array of next 7 days starting from today
  const getNext7Days = () => {
    const days = [];
    const today = startOfDay(new Date());

    for (let i = 0; i < 7; i++) {
      days.push(addDays(today, i));
    }
    return days;
  };

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch appointments and video sessions only when enabled
      const appointmentsPromise = appointmentAPI.getUpcoming(partnerId, 7);
      const videoSessionsPromise = videoSessionsEnabled
        ? videoSessionAPI.getByPartner(partnerId)
        : Promise.resolve({ data: { sessions: [] } });

      const [appointmentsResponse, videoSessionsResponse] = await Promise.all([
        appointmentsPromise,
        videoSessionsPromise
      ]);

      setAppointments(appointmentsResponse.data.appointments || []);

      // Filter video sessions to only show upcoming ones (next 7 days, including all of today)
      const today = startOfDay(new Date());
      const sevenDaysLater = addDays(today, 7);

      const upcomingVideoSessions = (videoSessionsResponse.data.sessions || []).filter(session => {
        const sessionDate = startOfDay(new Date(session.session_date));
        return isWithinInterval(sessionDate, { start: today, end: sevenDaysLater }) && session.status !== 'cancelled';
      });

      setVideoSessions(upcomingVideoSessions);
      setError('');
    } catch (err) {
      console.error('Failed to load appointments:', err);

      // If video sessions are disabled for the org, hide the error instead of showing a failure banner
      if (err.response?.data?.featureDisabled) {
        setVideoSessions([]);
        setError('');
      } else if (err.response && err.response.status !== 404 && err.response.status !== 400) {
        setError('Failed to load appointments');
      } else {
        // No error message for empty state - just show empty appointments
        setAppointments([]);
        setVideoSessions([]);
        setError('');
      }
    } finally {
      setLoading(false);
    }
  }, [partnerId, videoSessionsEnabled]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStartSession = (appointment) => {
    // Check if future date (shouldn't happen as button is disabled)
    if (isFutureDate(appointment.appointment_date)) return;

    // Check time window
    const { withinWindow, minutesDifference } = isWithinTimeWindow(appointment.appointment_date);

    if (withinWindow) {
      // Within ±15 min - proceed normally
      setSelectedAppointment(appointment);
      setShowStartSessionModal(true);
    } else {
      // Outside window - show time confirmation
      setTimeValidationData({
        item: appointment,
        itemType: 'appointment',
        minutesDifference,
        scheduledTime: appointment.appointment_date
      });
      setShowTimeConfirmModal(true);
    }
  };

  const handleStartVideoSession = (videoSession) => {
    // Check if future date (shouldn't happen as button is disabled)
    if (isFutureDate(videoSession.session_date)) return;

    // Check time window
    const { withinWindow, minutesDifference } = isWithinTimeWindow(videoSession.session_date);

    if (withinWindow) {
      // Within ±15 min - proceed normally
      setSelectedVideoSession(videoSession);
      setShowStartVideoSessionModal(true);
    } else {
      // Outside window - show time confirmation
      setTimeValidationData({
        item: videoSession,
        itemType: 'video',
        minutesDifference,
        scheduledTime: videoSession.session_date
      });
      setShowTimeConfirmModal(true);
    }
  };

  const handleCloseModal = () => {
    setShowStartSessionModal(false);
    setSelectedAppointment(null);
  };

  const handleCloseVideoModal = () => {
    setShowStartVideoSessionModal(false);
    setSelectedVideoSession(null);
  };

  const handleSessionCreated = () => {
    loadAppointments(); // Reload appointments to update status
  };

  const handleTimeConfirmYes = () => {
    // User wants to update time to current time
    const { item, itemType } = timeValidationData;

    if (itemType === 'appointment') {
      setSelectedAppointment({ ...item, overrideSessionTime: getCurrentDateTime() });
      setShowStartSessionModal(true);
    } else {
      setSelectedVideoSession({ ...item, overrideSessionTime: getCurrentDateTime() });
      setShowStartVideoSessionModal(true);
    }

    setShowTimeConfirmModal(false);
    setTimeValidationData(null);
  };

  const handleTimeConfirmNo = () => {
    // User wants to keep original time
    const { item, itemType } = timeValidationData;

    if (itemType === 'appointment') {
      setSelectedAppointment(item);
      setShowStartSessionModal(true);
    } else {
      setSelectedVideoSession(item);
      setShowStartVideoSessionModal(true);
    }

    setShowTimeConfirmModal(false);
    setTimeValidationData(null);
  };

  const handleTimeConfirmCancel = () => {
    // User cancelled - don't open session modal
    setShowTimeConfirmModal(false);
    setTimeValidationData(null);
  };

  const handleDeleteItem = async () => {
    if (!itemToDelete) return;

    setDeleting(true);
    try {
      if (itemToDelete.itemType === 'appointment') {
        await appointmentAPI.delete(itemToDelete.id);
      } else if (itemToDelete.itemType === 'video') {
        await videoSessionAPI.delete(itemToDelete.id);
      }
      // Reload appointments and video sessions to refresh the view
      await loadAppointments();
      setItemToDelete(null);
    } catch (err) {
      console.error('Failed to delete:', err);
      setError(err.response?.data?.error || 'Failed to delete');
    } finally {
      setDeleting(false);
    }
  };

  // Group appointments and video sessions by date
  const groupAppointmentsByDate = () => {
    const days = getNext7Days();
    const grouped = {};

    days.forEach(day => {
      const dateKey = format(day, 'yyyy-MM-dd');
      grouped[dateKey] = {
        date: day,
        items: []
      };
    });

    // Add appointments
    appointments.forEach(apt => {
      const aptDate = new Date(apt.appointment_date);
      const dateKey = format(aptDate, 'yyyy-MM-dd');
      if (grouped[dateKey]) {
        grouped[dateKey].items.push({ ...apt, itemType: 'appointment' });
      }
    });

    // Add video sessions
    videoSessions.forEach(session => {
      const sessionDate = new Date(session.session_date);
      const dateKey = format(sessionDate, 'yyyy-MM-dd');
      if (grouped[dateKey]) {
        grouped[dateKey].items.push({ ...session, itemType: 'video' });
      }
    });

    // Sort items by time within each day
    Object.keys(grouped).forEach(key => {
      grouped[key].items.sort((a, b) => {
        const timeA = new Date(a.appointment_date || a.session_date);
        const timeB = new Date(b.appointment_date || b.session_date);
        return timeA - timeB;
      });
    });

    return grouped;
  };

  const formatDayHeader = (date) => {
    const options = { month: 'short', day: 'numeric', weekday: 'short' };
    const parts = date.toLocaleDateString('en-US', options).split(' ');
    // Format: "Jan 26 Mon"
    return `${parts[0]} ${parts[1]} ${parts[2]}`;
  };

  const formatTime = (dateString) => {
    // Use the utility function that properly handles user timezone
    return formatTimeUtil(dateString);
  };

  const formatDateTime = (dateString) => {
    // Use the utility function that properly handles user timezone
    return formatDateTimeUtil(dateString);
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-600">Loading appointments...</div>
        </div>
      </div>
    );
  }

  const groupedAppointments = groupAppointmentsByDate();

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
          <div className="flex items-center space-x-2 sm:space-x-3">
            <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900 dark:text-dark-text-primary">Upcoming Appointments</h2>
          </div>
          <div className="text-xs sm:text-sm text-gray-600 dark:text-dark-text-secondary">
            Next 7 Days
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Weekly Grid - Horizontal scroll on mobile, grid on desktop */}
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scroll-smooth">
          <div className="flex gap-4 sm:grid sm:grid-cols-7 sm:gap-2">
            {Object.keys(groupedAppointments).map(dateKey => {
              const dayData = groupedAppointments[dateKey];
              // Use local date for "today" comparison
              const today = new Date();
              const todayKey = format(today, 'yyyy-MM-dd');
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className={`border rounded-lg overflow-hidden flex-shrink-0 w-[70%] sm:w-auto ${
                    isToday ? 'border-primary-500 border-2' : 'border-gray-200 dark:border-dark-border'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`p-3 sm:p-2 text-center text-base sm:text-sm font-semibold ${
                    isToday
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-dark-bg-secondary dark:text-dark-text-primary'
                  }`}>
                    {formatDayHeader(dayData.date)}
                  </div>

                  {/* Appointments and Video Sessions for this day */}
                  <div className="p-3 sm:p-2 space-y-2 min-h-[200px] sm:min-h-[200px] bg-white dark:bg-dark-bg-primary">
                  {dayData.items.length === 0 ? (
                    <div className="text-center text-gray-400 dark:text-dark-text-tertiary text-sm sm:text-xs py-8 sm:py-4">
                      Nothing scheduled
                    </div>
                  ) : (
                    dayData.items.map(item => (item.itemType === 'appointment' ? (
                      // Appointment Card
                      <div
                        key={`apt-${item.id}`}
                        className={`p-3 sm:p-2 rounded border text-sm sm:text-xs ${
                          item.has_session
                            ? 'bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-700/50'
                            : 'bg-primary-50 border-primary-200 hover:bg-primary-100 dark:bg-dark-bg-secondary dark:border-dark-primary-700 dark:hover:bg-dark-bg-tertiary cursor-pointer'
                        }`}
                        onClick={() => !item.has_session && handleStartSession(item)}
                      >
                        {/* Desktop: Original vertical layout */}
                        <div className="hidden sm:block">
                          {/* Time and Delete Icon on same row */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-1 text-gray-600 dark:text-dark-text-secondary">
                              <Clock className="h-3 w-3 flex-shrink-0 dark:text-dark-text-secondary" />
                              <span className="font-medium text-xs">{formatTime(item.appointment_date)}</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(item);
                              }}
                              className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Cancel Appointment"
                            >
                              <Trash2 className="h-3 w-3 dark:text-red-400" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3 text-gray-500 dark:text-dark-text-secondary flex-shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                              {item.user_name}
                            </span>
                          </div>

                          <div className="text-gray-700 dark:text-dark-text-primary mb-1 line-clamp-2">
                            {item.title}
                          </div>

                          {item.has_session ? (
                            <div className="flex items-center space-x-1 text-green-700 dark:text-green-400 mt-2">
                              <CheckCircle className="h-3 w-3 dark:text-green-400" />
                              <span className="font-medium">Session Created</span>
                              {item.session_id && onNavigateToSession && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToSession(item.user_id, item.session_id);
                                  }}
                                  className="ml-1 p-0.5 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title="View Session Details"
                                >
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartSession(item);
                              }}
                              disabled={isFutureDate(item.appointment_date)}
                              className={`w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 rounded-full transition-colors ${
                                isFutureDate(item.appointment_date)
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-dark-bg-secondary dark:text-dark-text-tertiary'
                                  : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-dark-primary-600 dark:hover:bg-dark-primary-500'
                              }`}
                              title={isFutureDate(item.appointment_date) ? "Cannot start future sessions" : ""}
                            >
                              <PlayCircle className="h-3 w-3" />
                              <span className="font-medium">Start Session</span>
                            </button>
                          )}
                        </div>

                        {/* Mobile: Compact horizontal layout */}
                        <div className="sm:hidden">
                          {/* Time, Title, and Delete Icon on same line */}
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 flex-shrink-0 text-gray-600 dark:text-dark-text-secondary" />
                            <span className="font-medium text-gray-600 dark:text-dark-text-secondary text-sm">{formatTime(item.appointment_date)}</span>
                            <span className="text-gray-700 dark:text-dark-text-primary truncate flex-1 text-sm">{item.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(item);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-dark-red-900 rounded transition-colors flex-shrink-0"
                              title="Cancel Appointment"
                            >
                              <Trash2 className="h-3.5 w-3.5 dark:text-red-400" />
                            </button>
                          </div>

                          {/* User name */}
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-gray-500 dark:text-dark-text-secondary flex-shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                              {item.user_name}
                            </span>
                          </div>

                          {/* Button or status - moved up with reduced margin */}
                          {item.has_session ? (
                            <div className="flex items-center space-x-2 text-green-700 dark:text-green-400">
                              <CheckCircle className="h-4 w-4 dark:text-green-400" />
                              <span className="font-medium text-sm">Session Created</span>
                              {item.session_id && onNavigateToSession && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onNavigateToSession(item.user_id, item.session_id);
                                  }}
                                  className="ml-1 p-1 text-green-700 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/30 rounded transition-colors"
                                  title="View Session Details"
                                >
                                  <ArrowRight className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleStartSession(item);
                                }}
                                disabled={isFutureDate(item.appointment_date)}
                                className={`inline-flex items-center justify-center space-x-1.5 py-1.5 px-4 rounded-full transition-colors whitespace-nowrap text-sm font-medium ${
                                  isFutureDate(item.appointment_date)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-dark-bg-secondary dark:text-dark-text-tertiary'
                                    : 'bg-primary-600 text-white hover:bg-primary-700 dark:bg-dark-primary-600 dark:hover:bg-dark-primary-500'
                                }`}
                                title={isFutureDate(item.appointment_date) ? "Cannot start future sessions" : ""}
                              >
                                <PlayCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Start Session</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Video Session Card
                      <div
                        key={`video-${item.id}`}
                        className="p-3 sm:p-2 rounded border text-sm sm:text-xs bg-purple-50 border-purple-200 dark:bg-purple-900/30 dark:border-purple-700/50"
                      >
                        {/* Desktop: Original vertical layout */}
                        <div className="hidden sm:block">
                          {/* Video Session label and Delete Icon */}
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center space-x-1 text-purple-700 dark:text-purple-400">
                              <Video className="h-3 w-3 flex-shrink-0 dark:text-purple-400" />
                              <span className="font-medium text-xs">Video Session</span>
                            </div>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(item);
                              }}
                              className="p-0.5 text-red-500 hover:text-red-700 hover:bg-red-50 dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/30 rounded transition-colors"
                              title="Cancel Video Session"
                            >
                              <Trash2 className="h-3 w-3 dark:text-red-400" />
                            </button>
                          </div>

                          <div className="flex items-center space-x-1 mb-1 text-gray-600 dark:text-dark-text-secondary">
                            <Clock className="h-3 w-3 flex-shrink-0 dark:text-dark-text-secondary" />
                            <span className="font-medium text-xs">{formatTime(item.session_date)}</span>
                          </div>

                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3 text-gray-500 dark:text-dark-text-secondary flex-shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                              {item.user_name}
                            </span>
                            <Video className="h-3 w-3 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          </div>

                          <div className="text-gray-700 dark:text-dark-text-primary mb-1 line-clamp-2">
                            {item.title}
                          </div>

                          {item.has_therapy_session ? (
                            <div className="w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 bg-gray-400 text-white rounded-full cursor-not-allowed dark:bg-dark-bg-secondary dark:text-dark-text-tertiary">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">Session Created</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartVideoSession(item)}
                              disabled={isFutureDate(item.session_date)}
                              className={`w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 rounded-full transition-colors ${
                                isFutureDate(item.session_date)
                                  ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-dark-bg-secondary dark:text-dark-text-tertiary'
                                  : 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500'
                              }`}
                              title={isFutureDate(item.session_date) ? "Cannot start future sessions" : ""}
                            >
                              <PlayCircle className="h-3 w-3" />
                              <span className="font-medium">Start Session</span>
                            </button>
                          )}
                        </div>

                        {/* Mobile: Compact horizontal layout */}
                        <div className="sm:hidden">
                          {/* Time, Title, and Delete Icon on same line */}
                          <div className="flex items-center space-x-2 mb-2">
                            <Clock className="h-4 w-4 flex-shrink-0 text-gray-600 dark:text-dark-text-secondary" />
                            <span className="font-medium text-gray-600 dark:text-dark-text-secondary text-sm">{formatTime(item.session_date)}</span>
                            <span className="text-gray-700 dark:text-dark-text-primary truncate flex-1 text-sm">{item.title}</span>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setItemToDelete(item);
                              }}
                              className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-dark-red-900 rounded transition-colors flex-shrink-0"
                              title="Cancel Video Session"
                            >
                              <Trash2 className="h-3.5 w-3.5 dark:text-red-400" />
                            </button>
                          </div>

                          {/* User name */}
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-gray-500 dark:text-dark-text-secondary flex-shrink-0" />
                            <span className="font-semibold text-gray-900 dark:text-dark-text-primary truncate">
                              {item.user_name}
                            </span>
                            <Video className="h-4 w-4 text-purple-600 dark:text-purple-400 flex-shrink-0" />
                          </div>

                          {/* Button or status - moved up with reduced margin */}
                          {item.has_therapy_session ? (
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-dark-text-secondary">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium text-sm">Session Created</span>
                            </div>
                          ) : (
                            <div className="flex justify-center">
                              <button
                                onClick={() => handleStartVideoSession(item)}
                                disabled={isFutureDate(item.session_date)}
                                className={`inline-flex items-center justify-center space-x-1.5 py-1.5 px-4 rounded-full transition-colors whitespace-nowrap text-sm font-medium ${
                                  isFutureDate(item.session_date)
                                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-dark-bg-secondary dark:text-dark-text-tertiary'
                                    : 'bg-purple-600 text-white hover:bg-purple-700 dark:bg-purple-600 dark:hover:bg-purple-500'
                                }`}
                                title={isFutureDate(item.session_date) ? "Cannot start future sessions" : ""}
                              >
                                <PlayCircle className="h-3.5 w-3.5 flex-shrink-0" />
                                <span>Start Session</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    )))
                  )}
                </div>
              </div>
            );
            })}
          </div>
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200 dark:border-dark-border">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary-50 border border-primary-200 rounded dark:bg-dark-bg-secondary dark:border-dark-primary-700"></div>
              <span className="text-gray-600 dark:text-dark-text-secondary">Scheduled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-50 border border-purple-200 rounded dark:bg-purple-900/30 dark:border-purple-700/50"></div>
              <span className="text-gray-600 dark:text-dark-text-secondary">Video Session</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-50 border border-green-200 rounded dark:bg-green-900/30 dark:border-green-700/50"></div>
              <span className="text-gray-600 dark:text-dark-text-secondary">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary-600 rounded dark:bg-dark-primary-600"></div>
              <span className="text-gray-600 dark:text-dark-text-secondary">Today</span>
            </div>
          </div>
        </div>
      </div>

      {/* Start Session Modal */}
      {showStartSessionModal && selectedAppointment && (
        <StartSessionModal
          appointment={selectedAppointment}
          partnerId={partnerId}
          onClose={handleCloseModal}
          onSuccess={handleSessionCreated}
        />
      )}

      {/* Start Session from Video Modal */}
      {showStartVideoSessionModal && selectedVideoSession && (
        <StartSessionFromVideoModal
          videoSession={selectedVideoSession}
          partnerId={partnerId}
          onClose={handleCloseVideoModal}
          onSuccess={handleSessionCreated}
        />
      )}

      {/* Time Confirmation Modal */}
      {showTimeConfirmModal && timeValidationData && (
        <TimeConfirmationModal
          isOpen={showTimeConfirmModal}
          scheduledTime={timeValidationData.scheduledTime}
          minutesDifference={timeValidationData.minutesDifference}
          onConfirm={handleTimeConfirmYes}
          onDecline={handleTimeConfirmNo}
          onCancel={handleTimeConfirmCancel}
          loading={false}
        />
      )}

      {/* Delete Confirmation Modal */}
      {itemToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start space-x-3 mb-4">
              <div className="flex-shrink-0">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  itemToDelete.itemType === 'video' ? 'bg-purple-100' : 'bg-red-100'
                }`}>
                  {itemToDelete.itemType === 'video' ? (
                    <Video className="h-5 w-5 text-purple-600" />
                  ) : (
                    <Trash2 className="h-5 w-5 text-red-600" />
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  Cancel {itemToDelete.itemType === 'video' ? 'Video Session' : 'Appointment'}
                </h3>
                <p className="text-sm text-gray-600">
                  Are you sure you want to cancel this {itemToDelete.itemType === 'video' ? 'video session' : 'appointment'}?
                </p>
              </div>
              <button
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Item Details */}
            <div className={`rounded-lg p-4 mb-4 ${
              itemToDelete.itemType === 'video' ? 'bg-purple-50' : 'bg-gray-50'
            }`}>
              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span className="font-medium text-gray-900">{itemToDelete.user_name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">{itemToDelete.title}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-gray-700">
                    {formatDateTime(itemToDelete.appointment_date || itemToDelete.session_date)}
                  </span>
                </div>
              </div>
            </div>

            {itemToDelete.itemType === 'appointment' && itemToDelete.has_session && (
              <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <p className="text-sm text-yellow-800 font-medium mb-1">
                  ⚠️ Important: This appointment has a session created
                </p>
                <p className="text-xs text-yellow-700">
                  The session created from this appointment will <strong>not be deleted</strong>. It will remain in the client's session history and can be accessed from the Clients tab.
                </p>
              </div>
            )}
            <p className="text-xs text-gray-500 mb-4">
              This will remove the {itemToDelete.itemType === 'video' ? 'video session' : 'appointment'} from your calendar, upcoming appointments, and the client's dashboard.
            </p>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setItemToDelete(null)}
                disabled={deleting}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Keep {itemToDelete.itemType === 'video' ? 'Session' : 'Appointment'}
              </button>
              <button
                onClick={handleDeleteItem}
                disabled={deleting}
                className={`px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 ${
                  itemToDelete.itemType === 'video' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {deleting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    <span>Canceling...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Cancel {itemToDelete.itemType === 'video' ? 'Session' : 'Appointment'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsTab;
