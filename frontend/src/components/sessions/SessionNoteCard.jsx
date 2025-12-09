import React, { useRef, useEffect, useState, forwardRef } from 'react';
import { Edit, Trash2, Check, X, Calendar, Clock } from 'lucide-react';

const SessionNoteCard = forwardRef(({
  session,
  sessionNumber,
  isEditing,
  editContent,
  onEditContentChange,
  onStartEdit,
  onSave,
  onCancel,
  onDelete,
  saving
}, ref) => {
  const textareaRef = useRef(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showFullNote, setShowFullNote] = useState(false);

  const MAX_PREVIEW_LENGTH = 300;
  const shouldTruncate = !isEditing &&
                         session.session_notes &&
                         session.session_notes.length > MAX_PREVIEW_LENGTH;

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.focus();
      const length = textareaRef.current.value.length;
      textareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditing]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditing && textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [isEditing, editContent]);

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSaveClick = () => {
    const trimmed = editContent.trim();

    if (trimmed.length === 0) {
      const confirmed = window.confirm(
        'The note is empty. Do you want to delete this note?'
      );
      if (confirmed) {
        onDelete(session.id);
      }
      return;
    }

    onSave(session.id, trimmed);
  };

  return (
    <div
      ref={ref}
      className="card transition-all duration-200"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <h4 className="text-lg font-semibold text-gray-900">
            Session #{sessionNumber}: {session.session_title}
          </h4>
          <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
            <span className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {formatDate(session.session_date)}
            </span>
            <span className="flex items-center">
              <Clock className="h-4 w-4 mr-1" />
              {new Date(session.session_date).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
                hour12: true
              })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        {!isEditing && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={() => onStartEdit(session.id, session.session_notes)}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit Note"
              aria-label={`Edit note for session ${sessionNumber}`}
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowDeleteConfirm(true)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Note"
              aria-label={`Delete note for session ${sessionNumber}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}

        {isEditing && (
          <div className="flex items-center space-x-2 ml-4">
            <button
              onClick={handleSaveClick}
              disabled={saving}
              className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center space-x-1 text-sm"
            >
              <Check className="h-4 w-4" />
              <span>{saving ? 'Saving...' : 'Save'}</span>
            </button>
            <button
              onClick={onCancel}
              disabled={saving}
              className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 flex items-center space-x-1 text-sm"
            >
              <X className="h-4 w-4" />
              <span>Cancel</span>
            </button>
          </div>
        )}
      </div>

      {/* Timestamps */}
      <div className="flex items-center space-x-4 mb-3 text-xs text-gray-500">
        <span>Created: {formatDateTime(session.created_at)}</span>
        {session.updated_at !== session.created_at && (
          <span>Last updated: {formatDateTime(session.updated_at)}</span>
        )}
      </div>

      {/* Note Content */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        {isEditing ? (
          <textarea
            ref={textareaRef}
            value={editContent}
            onChange={(e) => onEditContentChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
            placeholder="Enter session notes..."
            rows="6"
            disabled={saving}
            aria-label="Session note content"
            aria-describedby="note-help-text"
          />
        ) : (
          <div>
            <p className="text-gray-700 whitespace-pre-wrap">
              {shouldTruncate && !showFullNote
                ? session.session_notes.substring(0, MAX_PREVIEW_LENGTH) + '...'
                : session.session_notes
              }
            </p>
            {shouldTruncate && (
              <button
                onClick={() => setShowFullNote(!showFullNote)}
                className="text-primary-600 hover:text-primary-700 text-sm mt-2 font-medium"
              >
                {showFullNote ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        )}
      </div>

      {/* Hidden helper text for screen readers */}
      {isEditing && (
        <p id="note-help-text" className="sr-only">
          Press Ctrl+S to save or Escape to cancel
        </p>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Note</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this session note? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  onDelete(session.id);
                  setShowDeleteConfirm(false);
                }}
                className="px-4 py-2 text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

SessionNoteCard.displayName = 'SessionNoteCard';

export default SessionNoteCard;
