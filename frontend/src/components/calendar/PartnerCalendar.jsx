import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { appointmentAPI, videoSessionAPI } from '../../services/api';
import AppointmentModal from './AppointmentModal';
import VideoSessionModal from '../video/VideoSessionModal';
import { AlertCircle, Calendar as CalendarIcon, Video, Plus } from 'lucide-react';

const localizer = momentLocalizer(moment);

const PartnerCalendar = ({ partnerId, users }) => {
  const [appointments, setAppointments] = useState([]);
  const [videoSessions, setVideoSessions] = useState([]);
  const [allEvents, setAllEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showVideoModal, setShowVideoModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [selectedVideoSession, setSelectedVideoSession] = useState(null);
  const [view, setView] = useState(() => {
    return window.innerWidth < 768 ? 'month' : 'week';
  });
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768 && view === 'week') {
        setView('month');
      }
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [view]);

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const [appointmentsResponse, videoSessionsResponse] = await Promise.all([
        appointmentAPI.getByPartner(partnerId),
        videoSessionAPI.getByPartner(partnerId)
      ]);
      
      // Transform appointments for react-big-calendar
      const appointmentEvents = appointmentsResponse.data.appointments.map(apt => ({
        id: `apt-${apt.id}`,
        title: `${apt.user_name} - ${apt.title}`,
        start: new Date(apt.appointment_date),
        end: new Date(apt.end_date),
        resource: { ...apt, type: 'appointment' }
      }));
      
      // Transform video sessions for react-big-calendar
      const videoEvents = videoSessionsResponse.data.sessions.map(session => ({
        id: `video-${session.id}`,
        title: `🎥 ${session.user_name} - ${session.title}`,
        start: new Date(session.session_date),
        end: new Date(session.end_date),
        resource: { ...session, type: 'video' }
      }));
      
      setAppointments(appointmentEvents);
      setVideoSessions(videoEvents);
      setAllEvents([...appointmentEvents, ...videoEvents]);
      setError('');
    } catch (err) {
      console.error('Failed to load calendar data:', err);
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  }, [partnerId]);

  useEffect(() => {
    loadAppointments();
  }, [loadAppointments]);

  const handleSelectSlot = (slotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end
    });
    setSelectedAppointment(null);
    setSelectedVideoSession(null);
    // Show appointment modal by default (could add a menu to choose)
    setShowAppointmentModal(true);
  };

  const handleAddAppointment = () => {
    // Create slot for current date/time
    const now = new Date();
    const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
    setSelectedSlot({
      start: now,
      end: oneHourLater
    });
    setSelectedAppointment(null);
    setSelectedVideoSession(null);
    setShowAppointmentModal(true);
  };

  const handleSelectEvent = (event) => {
    if (event.resource.type === 'video') {
      setSelectedVideoSession(event.resource);
      setSelectedAppointment(null);
      setSelectedSlot(null);
      setShowVideoModal(true);
    } else {
      setSelectedAppointment(event.resource);
      setSelectedVideoSession(null);
      setSelectedSlot(null);
      setShowAppointmentModal(true);
    }
  };

  const handleCloseAppointmentModal = () => {
    setShowAppointmentModal(false);
    setSelectedSlot(null);
    setSelectedAppointment(null);
  };

  const handleCloseVideoModal = () => {
    setShowVideoModal(false);
    setSelectedSlot(null);
    setSelectedVideoSession(null);
  };

  const handleSaveAppointment = async () => {
    await loadAppointments();
    handleCloseAppointmentModal();
  };

  const handleSaveVideoSession = async () => {
    await loadAppointments();
    handleCloseVideoModal();
  };

  const eventStyleGetter = (event) => {
    const style = {
      backgroundColor: '#0ea5e9',
      borderRadius: '5px',
      opacity: 0.8,
      color: 'white',
      border: '0px',
      display: 'block'
    };
    
    // Video sessions have different color
    if (event.resource.type === 'video') {
      style.backgroundColor = '#9333ea'; // Purple for video sessions
    }
    
    if (event.resource.status === 'completed') {
      style.backgroundColor = '#10b981';
    } else if (event.resource.status === 'cancelled') {
      style.backgroundColor = '#ef4444';
      style.opacity = 0.5;
    }
    
    return { style };
  };

  if (loading && allEvents.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-600">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 relative">
      <div className="card">
        <div className="mb-4 space-y-3">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
            <h2 className="text-xl sm:text-2xl font-bold text-gray-900">Calendar</h2>
          </div>
          <div className="flex flex-wrap gap-3 sm:gap-4 text-xs sm:text-sm">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-sky-500 rounded"></div>
              <span className="text-gray-600">Appointments</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 sm:w-4 sm:h-4 bg-purple-600 rounded"></div>
              <span className="text-gray-600">Video Sessions</span>
            </div>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div className="h-[400px] sm:h-[500px] lg:h-[600px]">
          <Calendar
            localizer={localizer}
            events={allEvents}
            startAccessor="start"
            endAccessor="end"
            view={view}
            onView={setView}
            date={date}
            onNavigate={setDate}
            onSelectSlot={handleSelectSlot}
            onSelectEvent={handleSelectEvent}
            selectable
            eventPropGetter={eventStyleGetter}
            views={['month', 'week', 'day']}
            step={30}
            showMultiDayTimes
            defaultDate={new Date()}
          />
        </div>
      </div>

      {/* Floating Action Button - Mobile Only */}
      <button
        onClick={handleAddAppointment}
        className="md:hidden fixed bottom-6 right-6 z-50 w-14 h-14 bg-primary-600 hover:bg-primary-700 text-white rounded-full shadow-lg flex items-center justify-center transition-colors"
        title="Add Appointment"
      >
        <Plus className="h-6 w-6" />
      </button>

      {showAppointmentModal && (
        <AppointmentModal
          partnerId={partnerId}
          users={users}
          selectedSlot={selectedSlot}
          appointment={selectedAppointment}
          onClose={handleCloseAppointmentModal}
          onSave={handleSaveAppointment}
        />
      )}

      {showVideoModal && (
        <VideoSessionModal
          partnerId={partnerId}
          users={users}
          selectedSlot={selectedSlot}
          session={selectedVideoSession}
          onClose={handleCloseVideoModal}
          onSave={handleSaveVideoSession}
        />
      )}
    </div>
  );
};

export default PartnerCalendar;

