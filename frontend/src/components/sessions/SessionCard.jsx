import React, { useState, useRef, useEffect } from 'react';
import { therapySessionAPI, questionnaireAPI } from '../../services/api';
import { Calendar, Clock, FileText, Edit, Trash2, Send, Tag, ClipboardList, Video, X, Plus, VideoIcon, Check, Link2, ExternalLink } from 'lucide-react';
import QuestionnaireViewModal from '../questionnaires/QuestionnaireViewModal';
import GoogleDriveLinkModal from './GoogleDriveLinkModal';
import { CurrencyIcon } from '../../utils/currencyIcon';

const SessionCard = ({ session, onEdit, onAssignQuestionnaire, onQuestionnaireDeleted, onGenerateReport, onScheduleVideo, onNoteChanged }) => {
  const [showPaymentNotes, setShowPaymentNotes] = useState(false);
  const [selectedQuestionnaire, setSelectedQuestionnaire] = useState(null);
  const [deleteConfirmQuestionnaire, setDeleteConfirmQuestionnaire] = useState(null);
  const [deletingQuestionnaire, setDeletingQuestionnaire] = useState(false);
  const [showGoogleDriveModal, setShowGoogleDriveModal] = useState(false);
  
  // Session notes editing state
  const [isEditingNote, setIsEditingNote] = useState(false);
  const [editNoteContent, setEditNoteContent] = useState('');
  const [savingNote, setSavingNote] = useState(false);
  const [showFullNote, setShowFullNote] = useState(false);
  const noteTextareaRef = useRef(null);

  const MAX_PREVIEW_LENGTH = 300;
  const shouldTruncateNote = !isEditingNote && session.session_notes && session.session_notes.length > MAX_PREVIEW_LENGTH;

  // Auto-focus textarea when entering edit mode
  useEffect(() => {
    if (isEditingNote && noteTextareaRef.current) {
      noteTextareaRef.current.focus();
      const length = noteTextareaRef.current.value.length;
      noteTextareaRef.current.setSelectionRange(length, length);
    }
  }, [isEditingNote]);

  // Auto-resize textarea
  useEffect(() => {
    if (isEditingNote && noteTextareaRef.current) {
      noteTextareaRef.current.style.height = 'auto';
      noteTextareaRef.current.style.height = noteTextareaRef.current.scrollHeight + 'px';
    }
  }, [isEditingNote, editNoteContent]);

  // Parse assigned questionnaires (they come as JSON from backend)
  const assignedQuestionnaires = session.assigned_questionnaires || [];

  // Debug logging
  console.log('Session:', session.session_title, 'Assigned questionnaires:', assignedQuestionnaires);

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

  const handleStartEditNote = () => {
    setIsEditingNote(true);
    setEditNoteContent(session.session_notes || '');
    setShowFullNote(false);
  };

  const handleCancelEditNote = () => {
    setIsEditingNote(false);
    setEditNoteContent('');
    setShowFullNote(false);
  };

  const handleSaveNote = async () => {
    const trimmedContent = editNoteContent.trim();

    if (trimmedContent.length === 0) {
      alert('Session note cannot be empty');
      return;
    }

    if (trimmedContent.length > 10000) {
      alert('Session note cannot exceed 10,000 characters');
      return;
    }

    try {
      setSavingNote(true);

      await therapySessionAPI.update(session.id, {
        session_notes: trimmedContent
      });

      setIsEditingNote(false);
      setEditNoteContent('');

      // Notify parent that note has changed
      if (onNoteChanged) {
        onNoteChanged();
      }
    } catch (err) {
      console.error('Failed to save note:', err);
      alert('Failed to save note: ' + (err.response?.data?.error || 'Unknown error'));
    } finally {
      setSavingNote(false);
    }
  };

  // Handle keyboard shortcuts for note editing
  useEffect(() => {
    if (!isEditingNote) return;

    const handleKeyDown = (e) => {
      // Ctrl+S / Cmd+S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveNote();
      }

      // Escape to cancel
      if (e.key === 'Escape') {
        handleCancelEditNote();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingNote]);

  return (
    <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:shadow-md transition-shadow bg-white dark:bg-gray-800">
      {/* Desktop: Two-column layout */}
      <div className="hidden lg:flex gap-4">
        {/* Left Side - Main Session Details */}
        <div className="flex-1">
          {/* Header with Title and Actions */}
          <div className="flex items-start justify-between mb-3">
            <div className="flex-1">
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {session.session_number ? `Session #${session.session_number}: ` : ''}{session.session_title}
              </h4>
              <div className="flex items-center space-x-2">
                {session.from_appointment && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100">
                    <Tag className="h-3 w-3 mr-1" />
                    From Appointment
                  </span>
                )}
                {session.from_video_session && (
                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                    <Video className="h-3 w-3 mr-1" />
                    Session type - Video
                  </span>
                )}
                {session.status && (
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                    session.status === 'completed' 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100'
                      : session.status === 'started'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-100'
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                  }`}>
                    {session.status === 'completed' ? 'Completed' : session.status === 'started' ? 'Started' : 'Scheduled'}
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 ml-4">
              {onScheduleVideo && !session.video_session_id && (
                <button
                  onClick={() => onScheduleVideo(session)}
                  className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                  title="Schedule Video Session"
                >
                  <VideoIcon className="h-4 w-4" />
                </button>
              )}
              <button
                onClick={() => onEdit(session)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Edit Session"
              >
                <Edit className="h-4 w-4" />
              </button>
              <button
                onClick={() => onAssignQuestionnaire(session)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-600 hover:bg-green-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Assign Questionnaire"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowGoogleDriveModal(true)}
                className={`p-2 rounded-lg transition-colors ${
                  (() => {
                    const links = session.google_drive_link;
                    if (!links) return false;
                    if (typeof links === 'string') return links.trim() !== '';
                    if (Array.isArray(links)) return links.length > 0;
                    return false;
                  })()
                    ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                    : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700'
                }`}
                title="Manage Google Drive Links"
              >
                <Link2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Date and Time */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              <span className="font-medium mr-2">Date:</span>
              <span>{formatDate(session.session_date)}</span>
            </div>
            <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
              <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
              <span className="font-medium mr-2">Time:</span>
              <span>{formatTime(session.session_date)}</span>
              {session.session_duration && (
                <span className="ml-2 text-gray-500 dark:text-gray-400">
                  ({session.session_duration} min)
                </span>
              )}
            </div>
          </div>

          {/* Session Notes Section */}
          <div className="mb-3 pt-3 px-3 pb-3 -mx-3 border-t border-gray-100 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <div className="flex items-center justify-between mb-2">
              <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
                <FileText className="h-4 w-4 mr-1.5" />
                Session Notes
              </h5>
            {!isEditingNote && (
              <button
                onClick={handleStartEditNote}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900 rounded transition-colors"
                title={session.session_notes ? "Edit Note" : "Add Note"}
              >
                {session.session_notes ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            )}
              {isEditingNote && (
                <div className="flex items-center space-x-2">
                  <button
                    onClick={handleSaveNote}
                    disabled={savingNote}
                    className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center space-x-1 text-sm"
                  >
                    <Check className="h-4 w-4" />
                    <span>{savingNote ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancelEditNote}
                    disabled={savingNote}
                    className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-1 text-sm"
                  >
                    <X className="h-4 w-4" />
                    <span>Cancel</span>
                  </button>
                </div>
              )}
            </div>
            {isEditingNote ? (
              <textarea
                ref={noteTextareaRef}
                value={editNoteContent}
                onChange={(e) => setEditNoteContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                placeholder="Enter session notes..."
                rows="6"
                disabled={savingNote}
              />
            ) : (
              <div>
                {session.session_notes && session.session_notes.trim().length > 0 ? (
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                    {shouldTruncateNote && !showFullNote
                      ? session.session_notes.substring(0, MAX_PREVIEW_LENGTH) + '...'
                      : session.session_notes}
                  </p>
                ) : (
                  <p className="text-gray-500 dark:text-gray-400 italic text-sm">No notes yet. Click the edit button to add notes.</p>
                )}
                {shouldTruncateNote && (
                  <button
                    onClick={() => setShowFullNote(!showFullNote)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm mt-2 font-medium"
                  >
                    {showFullNote ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Report Action */}
          {onGenerateReport && (
            <div className="mb-3 pt-3 border-t border-gray-100 dark:border-gray-600">
              <button
                onClick={() => onGenerateReport()}
                className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-1 transition-colors"
                title="Create Report"
              >
                <FileText className="h-4 w-4" />
                <span>Create Report</span>
              </button>
            </div>
          )}

          {/* Payment Notes */}
          {session.payment_notes && (
            <div className="mb-3">
              <div className="flex items-start text-sm">
                <CurrencyIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Payment:</span>
                  <p className="text-gray-600 dark:text-gray-300 mt-1">
                    {showPaymentNotes ? session.payment_notes : truncateText(session.payment_notes)}
                  </p>
                  {session.payment_notes.length > 100 && (
                    <button
                      onClick={() => setShowPaymentNotes(!showPaymentNotes)}
                      className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-xs mt-1 font-medium"
                    >
                      {showPaymentNotes ? 'Show less' : 'Show more'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Google Drive Links */}
          {(() => {
            // Parse google_drive_link - handle both old format (string) and new format (array)
            const parseLinks = (links) => {
              if (!links) return [];
              if (typeof links === 'string') {
                if (links.trim() === '') return [];
                return [{ url: links, label: '' }];
              }
              if (Array.isArray(links)) {
                return links.filter(link => link && link.url);
              }
              return [];
            };
            
            const driveLinks = parseLinks(session.google_drive_link);
            
            return driveLinks.length > 0 ? (
              <div className="mb-3">
                <div className="flex items-start text-sm">
                  <Link2 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <span className="font-medium text-gray-700 dark:text-gray-300">Google Drive:</span>
                    <div className="mt-1 space-y-1">
                      {driveLinks.map((link, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          {link.label && (
                            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                              {link.label}:
                            </span>
                          )}
                          <a
                            href={link.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-sm break-all"
                          >
                            {link.url}
                          </a>
                          <ExternalLink className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : null;
          })()}

          {/* Created At Footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
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
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
              {session.session_number ? `Session #${session.session_number}: ` : ''}{session.session_title}
            </h4>
            <div className="flex items-center space-x-2 flex-wrap">
              {session.from_appointment && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary-100 text-primary-900 dark:bg-primary-900 dark:text-primary-100">
                  <Tag className="h-3 w-3 mr-1" />
                  From Appointment
                </span>
              )}
              {session.from_video_session && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-100">
                  <Video className="h-3 w-3 mr-1" />
                  Session type - Video
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center space-x-2 ml-2">
            {onScheduleVideo && !session.video_session_id && (
              <button
                onClick={() => onScheduleVideo(session)}
                className="p-2 text-gray-600 dark:text-gray-300 hover:text-purple-600 hover:bg-purple-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
                title="Schedule Video Session"
              >
                <VideoIcon className="h-4 w-4" />
              </button>
            )}
            <button
              onClick={() => onEdit(session)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Edit Session"
            >
              <Edit className="h-4 w-4" />
            </button>
            <button
              onClick={() => onAssignQuestionnaire(session)}
              className="p-2 text-gray-600 dark:text-gray-300 hover:text-green-600 hover:bg-green-50 dark:hover:bg-gray-700 rounded-lg transition-colors"
              title="Assign Questionnaire"
            >
              <Send className="h-4 w-4" />
            </button>
            <button
              onClick={() => setShowGoogleDriveModal(true)}
              className={`p-2 rounded-lg transition-colors ${
                (() => {
                  const links = session.google_drive_link;
                  if (!links) return false;
                  if (typeof links === 'string') return links.trim() !== '';
                  if (Array.isArray(links)) return links.length > 0;
                  return false;
                })()
                  ? 'text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                  : 'text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-gray-700'
              }`}
              title="Manage Google Drive Links"
            >
              <Link2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Date and Time */}
        <div className="space-y-2 mb-3">
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <Calendar className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="font-medium mr-2">Date:</span>
            <span>{formatDate(session.session_date)}</span>
          </div>
          <div className="flex items-center text-sm text-gray-700 dark:text-gray-300">
            <Clock className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400" />
            <span className="font-medium mr-2">Time:</span>
            <span>{formatTime(session.session_date)}</span>
            {session.session_duration && (
              <span className="ml-2 text-gray-500 dark:text-gray-400">
                ({session.session_duration} min)
              </span>
            )}
          </div>
        </div>

        {/* Payment Notes */}
        {session.payment_notes && (
          <div className="mb-3">
            <div className="flex items-start text-sm">
              <CurrencyIcon className="h-4 w-4 mr-2 text-gray-500 dark:text-gray-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <span className="font-medium text-gray-700 dark:text-gray-300">Payment:</span>
                <p className="text-gray-600 dark:text-gray-300 mt-1">
                  {showPaymentNotes ? session.payment_notes : truncateText(session.payment_notes)}
                </p>
                {session.payment_notes.length > 100 && (
                  <button
                    onClick={() => setShowPaymentNotes(!showPaymentNotes)}
                    className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-xs mt-1 font-medium"
                  >
                    {showPaymentNotes ? 'Show less' : 'Show more'}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Google Drive Links - Mobile */}
        {(() => {
          // Parse google_drive_link - handle both old format (string) and new format (array)
          const parseLinks = (links) => {
            if (!links) return [];
            if (typeof links === 'string') {
              if (links.trim() === '') return [];
              return [{ url: links, label: '' }];
            }
            if (Array.isArray(links)) {
              return links.filter(link => link && link.url);
            }
            return [];
          };
          
          const driveLinks = parseLinks(session.google_drive_link);
          
          return driveLinks.length > 0 ? (
            <div className="mb-3">
              <div className="flex items-start text-sm">
                <Link2 className="h-4 w-4 mr-2 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <span className="font-medium text-gray-700 dark:text-gray-300">Google Drive:</span>
                  <div className="mt-1 space-y-1">
                    {driveLinks.map((link, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        {link.label && (
                          <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                            {link.label}:
                          </span>
                        )}
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 hover:underline text-sm break-all"
                        >
                          {link.url}
                        </a>
                        <ExternalLink className="h-3 w-3 text-blue-600 dark:text-blue-400 flex-shrink-0" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null;
        })()}

        {/* Session Notes Section - Mobile */}
        <div className="mb-3 pt-3 px-3 pb-3 -mx-3 border-t border-gray-100 dark:border-gray-600 bg-green-50 dark:bg-green-900/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-sm font-semibold text-gray-700 dark:text-gray-300 flex items-center">
              <FileText className="h-4 w-4 mr-1.5" />
              Session Notes
            </h5>
            {!isEditingNote && (
              <button
                onClick={handleStartEditNote}
                className="p-1.5 text-gray-500 dark:text-gray-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900 rounded transition-colors"
                title={session.session_notes ? "Edit Note" : "Add Note"}
              >
                {session.session_notes ? <Edit className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
              </button>
            )}
            {isEditingNote && (
              <div className="flex items-center space-x-2">
                <button
                  onClick={handleSaveNote}
                  disabled={savingNote}
                  className="px-3 py-1.5 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center space-x-1 text-sm"
                >
                  <Check className="h-4 w-4" />
                  <span>{savingNote ? 'Saving...' : 'Save'}</span>
                </button>
                <button
                  onClick={handleCancelEditNote}
                  disabled={savingNote}
                  className="px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 flex items-center space-x-1 text-sm"
                >
                  <X className="h-4 w-4" />
                  <span>Cancel</span>
                </button>
              </div>
            )}
          </div>
          {isEditingNote ? (
            <textarea
              ref={noteTextareaRef}
              value={editNoteContent}
              onChange={(e) => setEditNoteContent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              placeholder="Enter session notes..."
              rows="6"
              disabled={savingNote}
            />
          ) : (
            <div>
              {session.session_notes && session.session_notes.trim().length > 0 ? (
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {shouldTruncateNote && !showFullNote
                    ? session.session_notes.substring(0, MAX_PREVIEW_LENGTH) + '...'
                    : session.session_notes}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic text-sm">No notes yet. Click the edit button to add notes.</p>
              )}
              {shouldTruncateNote && (
                <button
                  onClick={() => setShowFullNote(!showFullNote)}
                  className="text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 text-sm mt-2 font-medium"
                >
                  {showFullNote ? 'Show less' : 'Show more'}
                </button>
              )}
            </div>
          )}
        </div>

        {/* Report Action - Mobile */}
        {onGenerateReport && (
          <div className="mb-3 pt-3 border-t border-gray-100 dark:border-gray-600">
            <button
              onClick={() => onGenerateReport()}
              className="text-sm px-3 py-1.5 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium flex items-center space-x-1 transition-colors"
              title="Create Report"
            >
              <FileText className="h-4 w-4" />
              <span>Create Report</span>
            </button>
          </div>
        )}

        {/* Assigned Questionnaires - Mobile (Below Payment) */}
        {assignedQuestionnaires.length > 0 && (
          <div className="mb-3 pt-3 border-t border-gray-200 dark:border-gray-600">
            <div className="flex items-center space-x-2 mb-3">
              <ClipboardList className="h-4 w-4 text-primary-600" />
              <h5 className="text-sm font-semibold text-gray-900 dark:text-white">
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
                        ? 'text-gray-500 dark:text-gray-400 cursor-not-allowed'
                        : 'text-gray-700 dark:text-gray-300 hover:text-primary-600 dark:hover:text-primary-400 hover:underline cursor-pointer'
                    }`}
                    disabled={questionnaire.status === 'pending'}
                    title={questionnaire.status === 'pending' ? 'Waiting for client to complete' : 'Click to view'}
                  >
                    {truncateQuestionnaireName(questionnaire.name)}
                  </button>

                  {/* Delete Icon */}
                  <button
                    onClick={() => setDeleteConfirmQuestionnaire(questionnaire.assignment_id)}
                    className="flex-shrink-0 p-1 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900 rounded transition-colors"
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
        <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
          Created {new Date(session.created_at).toLocaleString()}
        </div>
      </div>

      {/* Google Drive Link Modal */}
      {showGoogleDriveModal && (
        <GoogleDriveLinkModal
          session={session}
          onClose={() => setShowGoogleDriveModal(false)}
          onSuccess={() => {
            setShowGoogleDriveModal(false);
            // Reload session data by calling onNoteChanged which triggers a refresh
            if (onNoteChanged) {
              onNoteChanged();
            }
          }}
        />
      )}

      {/* Questionnaire View Modal */}
      <QuestionnaireViewModal
        isOpen={!!selectedQuestionnaire}
        onClose={() => setSelectedQuestionnaire(null)}
        assignmentId={selectedQuestionnaire?.assignment_id}
        questionnaireName={selectedQuestionnaire?.name}
      />

      {/* Delete Confirmation Dialog for Questionnaire */}
      {deleteConfirmQuestionnaire && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-2">Delete Assignment</h3>
            <p className="text-gray-600 dark:text-dark-text-secondary mb-4">
              Are you sure you want to delete this questionnaire assignment? This action cannot be undone.
            </p>
            <p className="text-sm text-gray-500 dark:text-dark-text-tertiary mb-6">
              Note: This will not affect any charts already created using this questionnaire's data.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirmQuestionnaire(null)}
                disabled={deletingQuestionnaire}
                className="px-4 py-2 text-gray-700 dark:text-dark-text-secondary bg-gray-100 dark:bg-dark-bg-secondary rounded-lg hover:bg-gray-200 dark:hover:bg-dark-bg-tertiary transition-colors disabled:opacity-50"
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
