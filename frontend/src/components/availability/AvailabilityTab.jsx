import React, { useState, useEffect } from 'react';
import { Upload, RefreshCw } from 'lucide-react';
import AvailabilitySlotForm from './AvailabilitySlotForm';
import AvailabilityCalendar from './AvailabilityCalendar';
import ConflictWarningModal from './ConflictWarningModal';
import BookingFeeCard from './BookingFeeCard';
import { availabilityAPI } from '../../services/api';
import { formatTime, getUserTimezone } from '../../utils/dateUtils';

const AvailabilityTab = ({ partnerId }) => {
  const [slots, setSlots] = useState([]);
  const [formData, setFormData] = useState({
    date: '',
    start_time: '',
    end_time: '',
    status: 'available_online'
  });
  const [conflictWarning, setConflictWarning] = useState(null);
  const [showConflictModal, setShowConflictModal] = useState(false);
  const [pendingSlotData, setPendingSlotData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [publishLoading, setPublishLoading] = useState(false);

  useEffect(() => {
    loadSlots();
  }, [partnerId]);

  /**
   * Load availability slots for next 7 days
   * Use local timezone for date formatting
   */
  const loadSlots = async () => {
    try {
      setLoading(true);
      const today = new Date();

      // Format start date in local timezone (YYYY-MM-DD)
      const startYear = today.getFullYear();
      const startMonth = String(today.getMonth() + 1).padStart(2, '0');
      const startDay = String(today.getDate()).padStart(2, '0');
      const startDate = `${startYear}-${startMonth}-${startDay}`;

      // Calculate end date (6 days from today)
      const endDateObj = new Date(today);
      endDateObj.setDate(endDateObj.getDate() + 6);
      const endYear = endDateObj.getFullYear();
      const endMonth = String(endDateObj.getMonth() + 1).padStart(2, '0');
      const endDay = String(endDateObj.getDate()).padStart(2, '0');
      const endDateStr = `${endYear}-${endMonth}-${endDay}`;

      const response = await availabilityAPI.getPartnerSlots(partnerId, startDate, endDateStr);
      setSlots(response.data.slots || []);
    } catch (error) {
      console.error('Failed to load slots:', error);
      alert('Failed to load availability slots. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Handle slot creation
   */
  const handleCreateSlot = async () => {
    try {
      setLoading(true);

      const slotData = {
        partner_id: partnerId,
        slot_date: formData.date,
        start_time: formData.start_time,
        end_time: formData.end_time,
        status: formData.status,
        timezone: getUserTimezone() // Send user's timezone for proper UTC conversion
      };

      const response = await availabilityAPI.createSlot(slotData);

      // Check if there's a conflict warning
      if (response.data.conflict_warning && response.data.conflict_warning.has_conflict) {
        setPendingSlotData(slotData);
        setConflictWarning(response.data.conflict_warning);
        setShowConflictModal(true);
        setLoading(false);
        return;
      }

      // Success - no conflict or slot created anyway
      alert('Availability slot created successfully!');
      resetForm();
      loadSlots();
    } catch (error) {
      console.error('Failed to create slot:', error);
      const errorMessage = error.response?.data?.error || 'Failed to create availability slot';
      alert(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Proceed with creation despite conflict
   */
  const proceedWithCreation = () => {
    setShowConflictModal(false);
    setConflictWarning(null);
    setPendingSlotData(null);
    // Slot was already created, just reload
    alert('Availability slot created successfully (despite conflict)!');
    resetForm();
    loadSlots();
  };

  /**
   * Cancel conflict modal
   */
  const cancelConflict = () => {
    setShowConflictModal(false);
    setConflictWarning(null);
    setPendingSlotData(null);
    setLoading(false);
  };

  /**
   * Reset form to default values
   */
  const resetForm = () => {
    setFormData({
      date: '',
      start_time: '',
      end_time: '',
      status: 'available_online'
    });
  };

  /**
   * Handle edit slot
   */
  const handleEdit = async (slot) => {
    // Populate form with slot data
    setFormData({
      date: slot.slot_date,
      start_time: slot.start_time,
      end_time: slot.end_time,
      status: slot.status
    });

    // Delete the old slot
    try {
      await availabilityAPI.deleteSlot(slot.id);
      loadSlots();
    } catch (error) {
      console.error('Failed to delete slot for editing:', error);
      alert('Failed to edit slot. Please try again.');
    }
  };

  /**
   * Handle delete slot
   */
  const handleDelete = async (slot) => {
    // Different confirmation messages for booked vs unbooked slots
    const isBooked = slot.status === 'booked';
    const timeRange = `${formatTime(slot.start_datetime)} - ${formatTime(slot.end_datetime)}`;
    const confirmMessage = isBooked
      ? `⚠️ WARNING: This slot is BOOKED by ${slot.user_name || 'a client'}.\n\n` +
        `Deleting this slot will also DELETE the associated appointment from both your calendar and the client's dashboard.\n\n` +
        `Date: ${slot.slot_date}\nTime: ${timeRange}\n\n` +
        `Are you absolutely sure you want to delete this booked slot and appointment?`
      : `Are you sure you want to delete this availability slot?\n\n` +
        `Date: ${slot.slot_date}\nTime: ${timeRange}`;

    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      const response = await availabilityAPI.deleteSlot(slot.id);
      const successMessage = response.data.appointment_deleted
        ? 'Booked slot and associated appointment deleted successfully'
        : 'Slot deleted successfully';
      alert(successMessage);
      loadSlots();
    } catch (error) {
      console.error('Failed to delete slot:', error);
      const errorMessage = error.response?.data?.error || 'Failed to delete slot';
      alert(errorMessage);
    }
  };

  /**
   * Publish all unpublished slots
   */
  const handlePublish = async () => {
    const unpublishedCount = slots.filter(s => !s.is_published).length;

    if (unpublishedCount === 0) {
      alert('No unpublished slots to publish');
      return;
    }

    if (!window.confirm(`Publish ${unpublishedCount} slot(s) to client view?`)) {
      return;
    }

    try {
      setPublishLoading(true);
      const response = await availabilityAPI.publishSlots(partnerId);
      alert(`Successfully published ${response.data.count} slot(s)`);
      loadSlots();
    } catch (error) {
      console.error('Failed to publish slots:', error);
      alert('Failed to publish slots. Please try again.');
    } finally {
      setPublishLoading(false);
    }
  };

  const unpublishedCount = slots.filter(s => !s.is_published && s.status !== 'booked').length;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-2">Manage Availability</h2>
        <p className="text-gray-600 dark:text-dark-text-secondary">
          Create availability slots for the next 7 days. Clients can view and book published slots.
        </p>
      </div>

      {/* Two Column Layout for Forms */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Slot Creation Form */}
        <AvailabilitySlotForm
          formData={formData}
          onChange={setFormData}
          onSubmit={handleCreateSlot}
          loading={loading}
        />

        {/* Booking Fee Card */}
        <BookingFeeCard partnerId={partnerId} />
      </div>

      {/* Publish Button */}
      <div className="flex items-center justify-between bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md p-4">
        <div>
          <h3 className="font-semibold text-gray-900 dark:text-dark-text-primary">Publish to Client View</h3>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary">
            {unpublishedCount > 0
              ? `You have ${unpublishedCount} unpublished slot(s)`
              : 'All slots are published'}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={loadSlots}
            disabled={loading}
            className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-md text-gray-700 dark:text-dark-text-secondary bg-white dark:bg-dark-bg-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={handlePublish}
            disabled={unpublishedCount === 0 || publishLoading}
            className={`flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 transition-colors ${
              unpublishedCount === 0 || publishLoading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Upload className="h-4 w-4" />
            {publishLoading ? 'Publishing...' : 'Update Client View'}
          </button>
        </div>
      </div>

      {/* Calendar View */}
      {loading && slots.length === 0 ? (
        <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-md p-8 text-center">
          <RefreshCw className="h-8 w-8 text-gray-400 dark:text-dark-text-tertiary mx-auto mb-3 animate-spin" />
          <p className="text-gray-500 dark:text-dark-text-tertiary">Loading availability slots...</p>
        </div>
      ) : (
        <AvailabilityCalendar
          slots={slots}
          onEdit={handleEdit}
          onDelete={handleDelete}
          viewMode="partner"
        />
      )}

      {/* Conflict Warning Modal */}
      {showConflictModal && (
        <ConflictWarningModal
          conflict={conflictWarning}
          onProceed={proceedWithCreation}
          onCancel={cancelConflict}
        />
      )}
    </div>
  );
};

export default AvailabilityTab;
