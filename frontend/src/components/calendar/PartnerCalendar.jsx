import React, { useState, useEffect, useCallback } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { appointmentAPI } from '../../services/api';
import AppointmentModal from './AppointmentModal';
import { AlertCircle, Calendar as CalendarIcon } from 'lucide-react';

const localizer = momentLocalizer(moment);

const PartnerCalendar = ({ partnerId, users }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [view, setView] = useState('week');
  const [date, setDate] = useState(new Date());

  const loadAppointments = useCallback(async () => {
    try {
      setLoading(true);
      const response = await appointmentAPI.getByPartner(partnerId);
      
      // Transform appointments for react-big-calendar
      const events = response.data.appointments.map(apt => ({
        id: apt.id,
        title: `${apt.user_name} - ${apt.title}`,
        start: new Date(apt.appointment_date),
        end: new Date(apt.end_date),
        resource: apt
      }));
      
      setAppointments(events);
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

  const handleSelectSlot = (slotInfo) => {
    setSelectedSlot({
      start: slotInfo.start,
      end: slotInfo.end
    });
    setSelectedAppointment(null);
    setShowModal(true);
  };

  const handleSelectEvent = (event) => {
    setSelectedAppointment(event.resource);
    setSelectedSlot(null);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedSlot(null);
    setSelectedAppointment(null);
  };

  const handleSaveAppointment = async () => {
    await loadAppointments();
    handleCloseModal();
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
    
    if (event.resource.status === 'completed') {
      style.backgroundColor = '#10b981';
    } else if (event.resource.status === 'cancelled') {
      style.backgroundColor = '#ef4444';
      style.opacity = 0.5;
    }
    
    return { style };
  };

  if (loading && appointments.length === 0) {
    return (
      <div className="card">
        <div className="text-center py-8">
          <div className="animate-pulse text-gray-600">Loading calendar...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <CalendarIcon className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900">Appointment Calendar</h2>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span className="text-sm">{error}</span>
          </div>
        )}

        <div style={{ height: '600px' }}>
          <Calendar
            localizer={localizer}
            events={appointments}
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

      {showModal && (
        <AppointmentModal
          partnerId={partnerId}
          users={users}
          selectedSlot={selectedSlot}
          appointment={selectedAppointment}
          onClose={handleCloseModal}
          onSave={handleSaveAppointment}
        />
      )}
    </div>
  );
};

export default PartnerCalendar;

