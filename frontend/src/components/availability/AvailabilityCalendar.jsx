import React from 'react';
import { Edit, Trash2, Calendar, User, AlertCircle } from 'lucide-react';

// Helper function to convert 24-hour time to 12-hour format with AM/PM
const formatTime12Hour = (time24) => {
  if (!time24) return '';

  // Handle both HH:MM and HH:MM:SS formats
  const [hours, minutes] = time24.split(':').map(Number);

  if (isNaN(hours) || isNaN(minutes)) return time24;

  const period = hours >= 12 ? 'PM' : 'AM';
  const hours12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

  return `${hours12}:${String(minutes).padStart(2, '0')} ${period}`;
};

const AvailabilityCalendar = ({ slots, onEdit, onDelete, onBook, viewMode = 'partner' }) => {
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

  // Group slots by date
  const groupSlotsByDate = () => {
    const days = getNext7Days();
    const grouped = {};

    // Create entries for the next 7 days
    days.forEach(day => {
      // Use local date without timezone conversion
      const year = day.getFullYear();
      const month = String(day.getMonth() + 1).padStart(2, '0');
      const dayNum = String(day.getDate()).padStart(2, '0');
      const dateKey = `${year}-${month}-${dayNum}`;
      grouped[dateKey] = {
        date: day,
        slots: []
      };
    });

    // Add slots to their respective dates
    slots.forEach(slot => {
      // Normalize the slot_date to handle different formats
      let dateKey;
      if (typeof slot.slot_date === 'string') {
        // If it's already a string, extract just the date part (YYYY-MM-DD)
        dateKey = slot.slot_date.split('T')[0];
      } else if (slot.slot_date instanceof Date) {
        // If it's a Date object, format it
        const year = slot.slot_date.getFullYear();
        const month = String(slot.slot_date.getMonth() + 1).padStart(2, '0');
        const dayNum = String(slot.slot_date.getDate()).padStart(2, '0');
        dateKey = `${year}-${month}-${dayNum}`;
      }

      // If the slot's date isn't in our 7-day window, create an entry for it
      if (dateKey && !grouped[dateKey]) {
        const slotDate = new Date(dateKey + 'T00:00:00');
        grouped[dateKey] = {
          date: slotDate,
          slots: []
        };
      }

      if (dateKey) {
        grouped[dateKey].slots.push(slot);
      }
    });

    // Sort slots by start time within each day
    Object.keys(grouped).forEach(key => {
      grouped[key].slots.sort((a, b) => {
        return a.start_time.localeCompare(b.start_time);
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

  const groupedSlots = groupSlotsByDate();

  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-md p-8 text-center">
        <Calendar className="h-12 w-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">
          {viewMode === 'partner'
            ? 'No availability slots created yet. Use the form above to create your first slot.'
            : 'No availability slots published yet. Please check back later.'}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6 gap-2">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-primary-600" />
          <h3 className="text-lg sm:text-2xl font-bold text-gray-900">
            {viewMode === 'partner' ? 'Your Availability Slots' : 'Available Time Slots'}
          </h3>
        </div>
        <div className="text-xs sm:text-sm text-gray-600">
          Next 7 Days
        </div>
      </div>

      {/* Weekly Grid - Horizontal scroll on mobile, grid on desktop */}
      <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scroll-smooth">
        <div className="flex gap-4 sm:grid sm:grid-cols-7 sm:gap-2">
          {Object.keys(groupedSlots).sort().map(dateKey => {
            const dayData = groupedSlots[dateKey];
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

                {/* Slots for this day */}
                <div className="p-3 sm:p-2 space-y-2 min-h-[200px] sm:min-h-[200px] bg-white">
                  {dayData.slots.length === 0 ? (
                    <div className="text-center text-gray-400 text-sm sm:text-xs py-8 sm:py-4">
                      No slots
                    </div>
                  ) : (
                    dayData.slots.map(slot => (
                      <SlotCard
                        key={slot.id}
                        slot={slot}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onBook={onBook}
                        viewMode={viewMode}
                      />
                    ))
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
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-green-50 border border-green-300 rounded"></div>
            <span className="text-gray-600">Available Online</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-blue-50 border border-blue-300 rounded"></div>
            <span className="text-gray-600">Available Offline</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-yellow-50 border border-yellow-300 rounded"></div>
            <span className="text-gray-600">Booked</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 sm:w-4 sm:h-4 bg-primary-600 rounded"></div>
            <span className="text-gray-600">Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const SlotCard = ({ slot, onEdit, onDelete, onBook, viewMode }) => {
  /**
   * Get color scheme based on status
   */
  const getStatusStyle = (status) => {
    switch (status) {
      case 'available_online':
        return {
          bg: 'bg-green-50',
          border: 'border-green-300',
          text: 'text-green-800',
          badge: 'bg-green-100 text-green-800'
        };
      case 'available_offline':
        return {
          bg: 'bg-blue-50',
          border: 'border-blue-300',
          text: 'text-blue-800',
          badge: 'bg-blue-100 text-blue-800'
        };
      case 'not_available_online':
      case 'not_available_offline':
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-700'
        };
      case 'booked':
        return {
          bg: 'bg-yellow-50',
          border: 'border-yellow-300',
          text: 'text-yellow-800',
          badge: 'bg-yellow-100 text-yellow-800'
        };
      default:
        return {
          bg: 'bg-gray-50',
          border: 'border-gray-300',
          text: 'text-gray-700',
          badge: 'bg-gray-100 text-gray-700'
        };
    }
  };

  const formatStatus = (status) => {
    return status.replace(/_/g, ' ').split(' ').map(word =>
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const style = getStatusStyle(slot.status);
  const canEdit = viewMode === 'partner' && slot.status !== 'booked';
  const canBook = viewMode === 'client' && slot.is_available && slot.status !== 'booked';

  return (
    <div className={`${style.bg} border ${style.border} rounded-lg p-2 sm:p-2 text-xs transition-all hover:shadow-md`}>
      {/* Time and Actions Header */}
      <div className="flex justify-between items-start mb-1">
        <div className="flex-1">
          <p className={`font-semibold ${style.text} text-xs`}>
            {formatTime12Hour(slot.start_time)} - {formatTime12Hour(slot.end_time)}
          </p>
        </div>

        {/* Action Buttons for Partner View */}
        {canEdit && (
          <div className="flex gap-1 ml-1">
            <button
              onClick={() => onEdit(slot)}
              className="p-0.5 text-blue-600 hover:bg-blue-100 rounded transition-colors"
              title="Edit slot"
            >
              <Edit className="h-3 w-3" />
            </button>
            <button
              onClick={() => onDelete(slot)}
              className="p-0.5 text-red-600 hover:bg-red-100 rounded transition-colors"
              title="Delete slot"
            >
              <Trash2 className="h-3 w-3" />
            </button>
          </div>
        )}
      </div>

      {/* Status Badge */}
      <div className="mb-1">
        <span className={`inline-block text-xs font-medium px-1.5 py-0.5 rounded ${style.badge}`}>
          {formatStatus(slot.status)}
        </span>
      </div>

      {/* Booked Info */}
      {slot.status === 'booked' && viewMode === 'partner' && (
        <div className="mt-1 pt-1 border-t border-yellow-200">
          <div className="flex items-center text-xs text-yellow-900">
            <User className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="font-medium truncate">
              {slot.booked_by_user_name || 'Client'}
            </span>
          </div>
        </div>
      )}

      {/* Conflict Warning for Partner */}
      {viewMode === 'partner' && slot.has_google_conflict && (
        <div className="mt-1 pt-1 border-t border-orange-200">
          <div className="flex items-center text-xs text-orange-700">
            <AlertCircle className="h-3 w-3 mr-1 flex-shrink-0" />
            <span className="truncate">Calendar Conflict</span>
          </div>
        </div>
      )}

      {/* Unpublished Badge for Partner */}
      {viewMode === 'partner' && !slot.is_published && slot.status !== 'booked' && (
        <div className="mt-1">
          <span className="inline-block text-xs font-semibold px-1.5 py-0.5 bg-orange-100 text-orange-800 rounded">
            Unpublished
          </span>
        </div>
      )}

      {/* Book Button for Client */}
      {canBook && (
        <button
          onClick={() => onBook(slot)}
          className="mt-2 w-full py-1 px-2 bg-primary-600 text-white text-xs font-medium rounded hover:bg-primary-700 transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          Book This Slot
        </button>
      )}
    </div>
  );
};

export default AvailabilityCalendar;
