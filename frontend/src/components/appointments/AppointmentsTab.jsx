import React, { useState, useEffect, useCallback } from 'react';
import { appointmentAPI } from '../../services/api';
import StartSessionModal from './StartSessionModal';
import { Calendar, Clock, User, AlertCircle, CheckCircle, PlayCircle } from 'lucide-react';

const AppointmentsTab = ({ partnerId }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showStartSessionModal, setShowStartSessionModal] = useState(false);

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
      const response = await appointmentAPI.getUpcoming(partnerId, 7);
      setAppointments(response.data.appointments || []);
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

  const handleCloseModal = () => {
    setShowStartSessionModal(false);
    setSelectedAppointment(null);
  };

  const handleSessionCreated = () => {
    loadAppointments(); // Reload appointments to update status
  };

  // Group appointments by date
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
        appointments: []
      };
    });

    appointments.forEach(apt => {
      const aptDate = new Date(apt.appointment_date);
      // Use local date without timezone conversion
      const year = aptDate.getFullYear();
      const month = String(aptDate.getMonth() + 1).padStart(2, '0');
      const dayNum = String(aptDate.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayNum}`;
      if (grouped[dateKey]) {
        grouped[dateKey].appointments.push(apt);
      }
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
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <Calendar className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Upcoming Appointments</h2>
          </div>
          <div className="text-sm text-gray-600">
            Next 7 Days
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        {/* Weekly Grid */}
        <div className="grid grid-cols-7 gap-2">
          {Object.keys(groupedAppointments).map(dateKey => {
            const dayData = groupedAppointments[dateKey];
            // Use local date for "today" comparison
            const today = new Date();
            const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
            const isToday = dateKey === todayKey;

            return (
              <div
                key={dateKey}
                className={`border rounded-lg overflow-hidden ${
                  isToday ? 'border-primary-500 border-2' : 'border-gray-200'
                }`}
              >
                {/* Day Header */}
                <div className={`p-2 text-center text-sm font-semibold ${
                  isToday
                    ? 'bg-primary-600 text-white'
                    : 'bg-gray-100 text-gray-700'
                }`}>
                  {formatDayHeader(dayData.date)}
                </div>

                {/* Appointments for this day */}
                <div className="p-2 space-y-2 min-h-[200px] bg-white">
                  {dayData.appointments.length === 0 ? (
                    <div className="text-center text-gray-400 text-xs py-4">
                      No appointments
                    </div>
                  ) : (
                    dayData.appointments.map(apt => (
                      <div
                        key={apt.id}
                        className={`p-2 rounded border text-xs ${
                          apt.has_session
                            ? 'bg-green-50 border-green-200'
                            : 'bg-blue-50 border-blue-200 hover:bg-blue-100 cursor-pointer'
                        }`}
                        onClick={() => !apt.has_session && handleStartSession(apt)}
                      >
                        <div className="flex items-center space-x-1 mb-1 text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span className="font-medium">{formatTime(apt.appointment_date)}</span>
                        </div>

                        <div className="flex items-center space-x-1 mb-1">
                          <User className="h-3 w-3 text-gray-500" />
                          <span className="font-semibold text-gray-900 truncate">
                            {apt.user_name}
                          </span>
                        </div>

                        <div className="text-gray-700 truncate mb-1">
                          {apt.title}
                        </div>

                        {apt.has_session ? (
                          <div className="flex items-center space-x-1 text-green-700 mt-2">
                            <CheckCircle className="h-3 w-3" />
                            <span className="font-medium">Session Completed</span>
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleStartSession(apt);
                            }}
                            className="w-full mt-2 flex items-center justify-center space-x-1 py-1 px-2 bg-primary-600 text-white rounded hover:bg-primary-700 transition-colors"
                          >
                            <PlayCircle className="h-3 w-3" />
                            <span className="font-medium">Start Session</span>
                          </button>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Legend */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-center space-x-6 text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-50 border border-blue-200 rounded"></div>
              <span className="text-gray-600">Scheduled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-50 border border-green-200 rounded"></div>
              <span className="text-gray-600">Session Completed</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-primary-600 rounded"></div>
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
    </div>
  );
};

export default AppointmentsTab;
