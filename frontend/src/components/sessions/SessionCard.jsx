import React, { useState } from 'react';
import { therapySessionAPI } from '../../services/api';
import { Calendar, Clock, FileText, DollarSign, Edit, Trash2, Send, Tag, ClipboardList, Video } from 'lucide-react';

const SessionCard = ({ session, onEdit, onDelete, onAssignQuestionnaire }) => {
  const [showFullNotes, setShowFullNotes] = useState(false);
  const [showPaymentNotes, setShowPaymentNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Parse assigned questionnaires (they come as JSON from backend)
  const assignedQuestionnaires = session.assigned_questionnaires || [];

  // Debug logging
  console.log('Session:', session.session_title, 'Assigned questionnaires:', assignedQuestionnaires);

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    setDeleting(true);
    try {
      await therapySessionAPI.delete(session.id);
      if (onDelete) {
        onDelete(session.id);
      }
    } catch (err) {
      console.error('Delete session error:', err);
      alert('Failed to delete session: ' + (err.response?.data?.error || 'Unknown error'));
      setDeleting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const truncateText = (text, maxLength = 100) => {
    if (!text) return '';
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const truncateQuestionnaireName = (name, maxLength = 30) => {
    if (!name) return '';
    if (name.length <= maxLength) return name;
    return name.substring(0, maxLength) + '...';
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow bg-white">
      <div className="flex gap-4">
        {/* Left Side - Main Session Details */}
        <div className="flex-1">
          {/* Header with Title and Actions */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-1">{session.session_title}</h4>
              <div className="flex items-center space-x-2">
                {session.from_appointment && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                    <Tag className="h-3 w-3 mr-1" />
                    From Appointment
                  </span>
                )}
                {session.from_video_session && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                    <Video className="h-3 w-3 mr-1" />
                    Session type - Video
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              <button
                onClick={() => onEdit(session)}
                className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                title="Edit Session"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAssignQuestionnaire(session)}
                className="p-2 text-gray-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                title="Assign Questionnaire"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Delete Session"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm text-gray-700">
              <Calendar className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium mr-2">Date:</span>
              <span>{formatDate(session.session_date)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700">
              <Clock className="h-4 w-4 mr-2 text-gray-500" />
              <span className="font-medium mr-2">Time:</span>
              <span>{formatTime(session.session_date)}</span>
              {session.session_duration && (
                <span className="ml-2 text-gray-500">
                  ({session.session_duration} min)
                </span>
              )}
            </div>
          </div>

          {/* Session Notes */}
          {session.session_notes && (
            <div className="mb-3">
              <div className="flex items-start text-sm">
                <FileText className="h-4 w-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700">Notes:</span>
                  <p className="text-gray-600 mt-1">
                    {showFullNotes ? session.session_notes : truncateText(session.session_notes)}
                  </p>
                  {session.session_notes.length > 100 && (
                    <button
                      onClick={() => setShowFullNotes(!showFullNotes)}
                      className="text-primary-600 hover:text-primary-700 text-xs mt-1 font-medium"
                    >
                      {showFullNotes ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Payment Notes */}
          {session.payment_notes && (
            <div className="mb-3">
              <div className="flex items-start text-sm">
                <DollarSign className="h-4 w-4 mr-2 text-gray-500 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700">Payment:</span>
                  <p className="text-gray-600 mt-1">
                    {showPaymentNotes ? session.payment_notes : truncateText(session.payment_notes)}
                  </p>
                  {session.payment_notes.length > 100 && (
                    <button
                      onClick={() => setShowPaymentNotes(!showPaymentNotes)}
                      className="text-primary-600 hover:text-primary-700 text-xs mt-1 font-medium"
                    >
                      {showPaymentNotes ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Created At Footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
            Created {new Date(session.created_at).toLocaleString()}
          </div>
        </div>

        {/* Right Side - Assigned Questionnaires */}
        {assignedQuestionnaires.length > 0 && (
          <div className="w-64 border-l border-gray-200 pl-4">
            <div className="flex items-center space-x-2 mb-3">
              <ClipboardList className="h-4 w-4 text-primary-600" />
              <h5 className="text-sm font-semibold text-gray-900">
                Assigned Questionnaires
              </h5>
            </div>
            <div className="space-y-2">
              {assignedQuestionnaires.map((questionnaire, index) => (
                <div
                  key={questionnaire.assignment_id}
                  className="flex items-start space-x-2 text-sm"
                  title={questionnaire.name}
                >
                  <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                    {index + 1}
                  </span>
                  <span className="text-gray-700 flex-1">
                    {truncateQuestionnaireName(questionnaire.name)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SessionCard;
