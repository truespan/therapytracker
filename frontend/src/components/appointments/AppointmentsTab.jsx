import React, { useState, useEffect, useCallback } from 'react';
import { appointmentAPI, videoSessionAPI } from '../../services/api';
import StartSessionModal from './StartSessionModal';
import StartSessionFromVideoModal from '../video/StartSessionFromVideoModal';
import { Calendar, Clock, User, AlertCircle, CheckCircle, PlayCircle, Video } from 'lucide-react';

const AppointmentsTab = ({ partnerId }) => {
  const [appointments, setAppointments] = useState([]);
  const [videoSessions, setVideoSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);
  const [showStartVideoSessionModal, setShowStartVideoSessionModal] = useState(false);

  // Generate array of next 7 days starting from today
  const getNext7Days = () => {
    const days = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      days.push(date);
    }
    return days;
  };

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const [appointmentsResponse, videoSessionsResponse] = await Promise.all([
        appointmentAPI.getUpcoming(partnerId, 7),
        videoSessionAPI.getByPartner(partnerId)
      ]);

      setAppointments(appointmentsResponse.data.appointments || []);

      // Filter video sessions to only show upcoming ones (next 7 days, including all of today)
      const today = new Date();
      today.setHours(0, 0, 0, 0); // Start of today
      const sevenDaysLater = new Date(today);
      sevenDaysLater.setDate(today.getDate() + 7);

      const upcomingVideoSessions = (videoSessionsResponse.data.sessions || []).filter(session => {
        const sessionDate = new Date(session.session_date);
        sessionDate.setHours(0, 0, 0, 0); // Compare date only, not time
        return sessionDate >= today && sessionDate < sevenDaysLater && session.status !== 'cancelled';
      });

      setVideoSessions(upcomingVideoSessions);
      setError('');
    } catch (err) {
      console.error('Failed to load appointments:', err);
      setError('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleStartSession = (appointment) => {
    setSelectedAppointment(appointment);
    setShowStartSessionModal(true);
  };

  const handleStartVideoSession = (videoSession) => {
    setSelectedVideoSession(videoSession);
    setShowStartVideoSessionModal(true);
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

  // Group appointments and video sessions by date
  const groupAppointmentsByDate = () => {
    const days = getNext7Days();
    const grouped = {};

    days.forEach(day => {
      // Use local date without timezone conversion
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const dayNum = String(day.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayNum}`;
      grouped[dateKey] = {
        date: day,
        items: []
      };
    });

    // Add appointments
    appointments.forEach(apt => {
      const aptDate = new Date(apt.appointment_date);
      // Use local date without timezone conversion
      const year = aptDate.getFullYear();
      const month = String(aptDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(aptDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayNum}`;
      if (grouped[dateKey]) {
        grouped[dateKey].items.push({ ...apt, itemType: 'appointment' });
      }
    });

    // Add video sessions
    videoSessions.forEach(session => {
      const sessionDate = new Date(session.session_date);
      // Use local date without timezone conversion
      const year = sessionDate.getFullYear();
      const month = String(sessionDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(sessionDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayNum}`;
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
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
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
            <h2 className="text-lg sm:text-2xl font-bold text-gray-900">Upcoming Appointments</h2>
          </div>
          <div className="text-xs sm:text-sm text-gray-600">
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
              const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
              const isToday = dateKey === todayKey;

              return (
                <div
                  key={dateKey}
                  className={`border rounded-lg overflow-hidden flex-shrink-0 w-[70%] sm:w-auto ${
                    isToday ? 'border-primary-500 border-2' : 'border-gray-200'
                  }`}
                >
                  {/* Day Header */}
                  <div className={`p-3 sm:p-2 text-center text-base sm:text-sm font-semibold ${
                    isToday
                      ? 'bg-primary-600 text-white'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {formatDayHeader(dayData.date)}
                  </div>

                  {/* Appointments and Video Sessions for this day */}
                  <div className="p-3 sm:p-2 space-y-2 min-h-[200px] sm:min-h-[200px] bg-white">
                  {dayData.items.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm sm:text-xs py-8 sm:py-4">
                      Nothing scheduled
                    </div>
                  ) : (
                    dayData.items.map(item => (item.itemType === 'appointment' ? (
                      // Appointment Card
                      <div
                        key={`apt-${item.id}`}
                        className={`p-3 sm:p-2 rounded border text-sm sm:text-xs ${
                          item.has_session
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer'
                        }`}
                        onClick={() => !item.has_session && handleStartSession(item)}
                      >
                        {/* Desktop: Original vertical layout */}
                        <div className="hidden sm:block">
                          <div className="flex items-center space-x-1 mb-1 text-gray-600">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">{formatTime(item.appointment_date)}</span>
                          </div>

                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 truncate">
                              {item.user_name}
                            </span>
                          </div>

                          <div className="text-gray-700 mb-1 line-clamp-2">
                            {item.title}
                          </div>

                          {item.has_session ? (
                            <div className="flex items-center space-x-1 text-green-700 mt-2">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">Session Completed</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartSession(item);
                              }}
                              className="w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors"
                            >
                              <PlayCircle className="h-3 w-3" />
                              <span className="font-medium">Start Session</span>
                            </button>
                          )}
                        </div>

                        {/* Mobile: Compact horizontal layout */}
                        <div className="sm:hidden">
                          {/* Time and Title on same line */}
                          <div className="flex items-center space-x-2 mb-2 text-gray-600">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">{formatTime(item.appointment_date)}</span>
                            <span className="text-gray-700 truncate flex-1">{item.title}</span>
                          </div>

                          {/* User name */}
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 truncate">
                              {item.user_name}
                            </span>
                          </div>

                          {/* Button or status - moved up with reduced margin */}
                          {item.has_session ? (
                            <div className="flex items-center space-x-2 text-green-700">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium text-sm">Session Completed</span>
                            </div>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleStartSession(item);
                              }}
                              className="inline-flex items-center justify-center space-x-1.5 py-1.5 px-4 bg-primary-600 text-white rounded-full hover:bg-primary-700 transition-colors whitespace-nowrap text-sm font-medium"
                            >
                              <PlayCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>Start Session</span>
                            </button>
                          )}
                        </div>
                      </div>
                    ) : (
                      // Video Session Card
                      <div
                        key={`video-${item.id}`}
                        className="p-3 sm:p-2 rounded border text-sm sm:text-xs bg-purple-50 border-purple-200"
                      >
                        {/* Desktop: Original vertical layout */}
                        <div className="hidden sm:block">
                          {/* Video Session label - Desktop only */}
                          <div className="flex items-center space-x-1 mb-1 text-purple-700">
                            <Video className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">Video Session</span>
                          </div>

                          <div className="flex items-center space-x-1 mb-1 text-gray-600">
                            <Clock className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium">{formatTime(item.session_date)}</span>
                          </div>

                          <div className="flex items-center space-x-1 mb-1">
                            <User className="h-3 w-3 text-gray-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 truncate">
                              {item.user_name}
                            </span>
                            <Video className="h-3 w-3 text-purple-600 flex-shrink-0" />
                          </div>

                          <div className="text-gray-700 mb-1 line-clamp-2">
                            {item.title}
                          </div>

                          {item.has_therapy_session ? (
                            <div className="w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 bg-gray-400 text-white rounded-full cursor-not-allowed">
                              <CheckCircle className="h-3 w-3" />
                              <span className="font-medium">Session Created</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartVideoSession(item)}
                              className="w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors"
                            >
                              <PlayCircle className="h-3 w-3" />
                              <span className="font-medium">Start Session</span>
                            </button>
                          )}
                        </div>

                        {/* Mobile: Compact horizontal layout */}
                        <div className="sm:hidden">
                          {/* Time and Title on same line */}
                          <div className="flex items-center space-x-2 mb-2 text-gray-600">
                            <Clock className="h-4 w-4 flex-shrink-0" />
                            <span className="font-medium">{formatTime(item.session_date)}</span>
                            <span className="text-gray-700 truncate flex-1">{item.title}</span>
                          </div>

                          {/* User name */}
                          <div className="flex items-center space-x-2 mb-2">
                            <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            <span className="font-semibold text-gray-900 truncate">
                              {item.user_name}
                            </span>
                            <Video className="h-4 w-4 text-purple-600 flex-shrink-0" />
                          </div>

                          {/* Button or status - moved up with reduced margin */}
                          {item.has_therapy_session ? (
                            <div className="flex items-center space-x-2 text-gray-600">
                              <CheckCircle className="h-4 w-4" />
                              <span className="font-medium text-sm">Session Created</span>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleStartVideoSession(item)}
                              className="inline-flex items-center justify-center space-x-1.5 py-1.5 px-4 bg-purple-600 text-white rounded-full hover:bg-purple-700 transition-colors whitespace-nowrap text-sm font-medium"
                            >
                              <PlayCircle className="h-3.5 w-3.5 flex-shrink-0" />
                              <span>Start Session</span>
                            </button>
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
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span className="text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-50 border border-purple-200 rounded"></div>
              <span className="text-gray-600">Video Session</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-gray-600">Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary-600 rounded"></div>
              <span className="text-gray-600">Today</span>
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
    </div>
  );
};

export default AppointmentsTab;
