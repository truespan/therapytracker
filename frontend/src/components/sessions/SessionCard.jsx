import React, { useState } from 'react';
import { therapySessionAPI, questionnaireAPI } from '../../services/api';
import { Calendar, Clock, FileText, DollarSign, Edit, Trash2, Send, Tag, ClipboardList, Video, X, Plus } from 'lucide-react';
import QuestionnaireViewModal from '../questionnaires/QuestionnaireViewModal';

const SessionCard = ({ session, onEdit, onDelete, onAssignQuestionnaire, onQuestionnaireDeleted, onCreateNote, onViewNote, onGenerateReport }) => {
  const [showPaymentNotes, setShowPaymentNotes] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [deleteConfirmQuestionnaire, setDeleteConfirmQuestionnaire] = useState(null);
  const [deletingQuestionnaire, setDeletingQuestionnaire] = useState(false);

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

  const handleDeleteQuestionnaire = async (assignmentId) => {
    try {
      setDeletingQuestionnaire(true);
      await questionnaireAPI.deleteAssignment(assignmentId);
      setDeleteConfirmQuestionnaire(null);
      // Notify parent to reload sessions/data
      if (onQuestionnaireDeleted) {
        onQuestionnaireDeleted();
      }
    } catch (err) {
      console.error('Failed to delete questionnaire assignment:', err);
      alert('Failed to delete questionnaire assignment. Please try again.');
    } finally {
      setDeletingQuestionnaire(false);
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
      {/* Desktop: Two-column layout */}
      <div className="hidden lg:flex gap-4">
        {/* Left Side - Main Session Details */}
        <div className="flex-1">
          {/* Header with Title and Actions */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 mb-1">
                {session.session_number ? `Session #${session.session_number}: ` : ''}{session.session_title}
              </h4>
              <div className="flex items-center space-x-2">
                {session.from_appointment && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-900">
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

          {/* Session Note and Report Actions */}
          <div className="mb-3 pt-3 border-t border-gray-100 flex items-center space-x-3">
            {session.session_notes && session.session_notes.trim().length > 0 ? (
              <button
                onClick={() => onViewNote?.(session.id)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
              >
                <FileText className="h-4 w-4" />
                <span>View Note</span>
              </button>
            ) : (
              <button
                onClick={() => onCreateNote?.(session.id)}
                className="text-sm px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 font-medium flex items-center space-x-1 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Create Note</span>
              </button>
            )}
            {onGenerateReport && (
              <button
                onClick={() => onGenerateReport()}
                className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-1 transition-colors"
                title="Generate Report"
              >
                <FileText className="h-4 w-4" />
                <span>Generate Report</span>
              </button>
            )}
          </div>

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

        {/* Right Side - Assigned Questionnaires (Desktop only) */}
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
                  className="flex items-center space-x-2 text-sm group"
                  title={questionnaire.name}
                >
                  {/* Status indicator or number */}
                  {questionnaire.status === 'pending' ? (
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                      P
                    </span>
                  ) : (
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                  )}

                  {/* Clickable questionnaire name */}
                  <button
                    onClick={() => setSelectedQuestionnaire(questionnaire)}
                    className={`flex-1 text-left transition-colors ${
                      questionnaire.status === 'pending'
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-700 hover:text-primary-600 hover:underline cursor-pointer'
                    }`}
                    disabled={questionnaire.status === 'pending'}
                    title={questionnaire.status === 'pending' ? 'Waiting for client to complete' : 'Click to view'}
                  >
                    {truncateQuestionnaireName(questionnaire.name)}
                  </button>

                  {/* Delete Icon */}
                  <button
                    onClick={() => setDeleteConfirmQuestionnaire(questionnaire.assignment_id)}
                    className="flex-shrink-0 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete assignment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: Single-column layout */}
      <div className="lg:hidden">
        {/* Header with Title and Actions */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex-1">
            <h4 className="text-lg font-semibold text-gray-900 mb-1">
              {session.session_number ? `Session #${session.session_number}: ` : ''}{session.session_title}
            </h4>
            <div className="flex items-center space-x-2 flex-wrap">
              {session.from_appointment && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-900">
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
          <div className="flex items-center space-x-2 ml-2">
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

        {/* Session Note and Report Actions - Mobile */}
        <div className="mb-3 pt-3 border-t border-gray-100 flex items-center space-x-3 flex-wrap">
          {session.session_notes && session.session_notes.trim().length > 0 ? (
            <button
              onClick={() => onViewNote?.(session.id)}
              className="text-sm text-primary-600 hover:text-primary-700 font-medium flex items-center space-x-1"
            >
              <FileText className="h-4 w-4" />
              <span>View Note</span>
            </button>
          ) : (
            <button
              onClick={() => onCreateNote?.(session.id)}
              className="text-sm px-3 py-1.5 bg-primary-50 text-primary-700 rounded-lg hover:bg-primary-100 font-medium flex items-center space-x-1 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Create Note</span>
            </button>
          )}
          {onGenerateReport && (
            <button
              onClick={() => onGenerateReport()}
              className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-1 transition-colors"
              title="Generate Report"
            >
              <FileText className="h-4 w-4" />
              <span>Generate Report</span>
            </button>
          )}
        </div>

        {/* Assigned Questionnaires - Mobile (Below Payment) */}
        {assignedQuestionnaires.length > 0 && (
          <div className="mb-3 pt-3 border-t border-gray-200">
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
                  className="flex items-center space-x-2 text-sm group"
                  title={questionnaire.name}
                >
                  {/* Status indicator or number */}
                  {questionnaire.status === 'pending' ? (
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-yellow-100 text-yellow-700 rounded-full text-xs font-bold">
                      P
                    </span>
                  ) : (
                    <span className="flex-shrink-0 w-5 h-5 flex items-center justify-center bg-primary-100 text-primary-700 rounded-full text-xs font-semibold">
                      {index + 1}
                    </span>
                  )}

                  {/* Clickable questionnaire name */}
                  <button
                    onClick={() => setSelectedQuestionnaire(questionnaire)}
                    className={`flex-1 text-left transition-colors ${
                      questionnaire.status === 'pending'
                        ? 'text-gray-500 cursor-not-allowed'
                        : 'text-gray-700 hover:text-primary-600 hover:underline cursor-pointer'
                    }`}
                    disabled={questionnaire.status === 'pending'}
                    title={questionnaire.status === 'pending' ? 'Waiting for client to complete' : 'Click to view'}
                  >
                    {truncateQuestionnaireName(questionnaire.name)}
                  </button>

                  {/* Delete Icon */}
                  <button
                    onClick={() => setDeleteConfirmQuestionnaire(questionnaire.assignment_id)}
                    className="flex-shrink-0 p-1 text-red-600 hover:bg-red-50 rounded transition-colors"
                    title="Delete assignment"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Created At Footer */}
        <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
          Created {new Date(session.created_at).toLocaleString()}
        </div>
      </div>

      {/* Questionnaire View Modal */}
      <QuestionnaireViewModal
        isOpen={!!selectedQuestionnaire}
        onClose={() => setSelectedQuestionnaire(null)}
        assignmentId={selectedQuestionnaire?.assignment_id}
        questionnaireName={selectedQuestionnaire?.name}
      />

      {/* Delete Confirmation Dialog */}
      {deleteConfirmQuestionnaire && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Assignment</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this questionnaire assignment? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-500 mb-6">
              Note: This will not affect any charts already created using this questionnaire's data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmQuestionnaire(null)}
                disabled={deletingQuestionnaire}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteQuestionnaire(deleteConfirmQuestionnaire)}
                disabled={deletingQuestionnaire}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deletingQuestionnaire ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionCard;
