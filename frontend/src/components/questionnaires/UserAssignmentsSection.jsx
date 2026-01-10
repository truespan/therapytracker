import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';
import { ChevronDown, ChevronUp, ClipboardList, CheckCircle, Clock, Calendar, Trash2, X, ExternalLink } from 'lucide-react';
import QuestionnaireViewModal from './QuestionnaireViewModal';

const UserAssignmentsSection = ({ userId, userName }) => {
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isExpanded, setIsExpanded] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState(null);

  useEffect(() => {
    if (userId) {
      loadAssignments();
    }
  }, [userId]);

  const loadAssignments = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getUserAssignments(userId);
      setAssignments(response.data || []);
    } catch (err) {
      console.error('Failed to load assignments:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAssignment = async (assignmentId) => {
    try {
      setDeleting(true);
      await questionnaireAPI.deleteAssignment(assignmentId);
      // Reload assignments after deletion
      await loadAssignments();
      setDeleteConfirm(null);
    } catch (err) {
      console.error('Failed to delete assignment:', err);
      alert('Failed to delete assignment. Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  const pendingCount = assignments.filter(a => a.status === 'pending').length;
  const completedCount = assignments.filter(a => a.status === 'completed').length;

  return (
    <div className="card">
      {/* Header - Always Visible */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors rounded-lg"
      >
        <div className="flex items-center space-x-3">
          <ClipboardList className="h-6 w-6 text-primary-600" />
          <div className="text-left">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Questionnaires Assigned
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {assignments.length === 0
                ? 'No questionnaires assigned yet'
                : `${pendingCount} pending, ${completedCount} completed`
              }
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          {assignments.length > 0 && (
            <span className="text-sm text-gray-500 dark:text-gray-300 mr-2">
              {isExpanded ? 'Hide' : 'Show'} details
            </span>
          )}
          {isExpanded ? (
            <ChevronUp className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          ) : (
            <ChevronDown className="h-5 w-5 text-gray-500 dark:text-gray-300" />
          )}
        </div>
      </button>

      {/* Collapsible Content */}
      {isExpanded && (
        <div className="px-4 pb-4 pt-2 border-t border-gray-200 dark:border-gray-600 mt-2">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600 dark:text-gray-300">Loading assignments...</span>
            </div>
          ) : assignments.length === 0 ? (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              <ClipboardList className="h-12 w-12 mx-auto mb-3 text-gray-400 dark:text-gray-500" />
              <p>No questionnaires have been assigned to {userName} yet.</p>
              <p className="text-sm mt-2">Go to the Questionnaires tab to assign one.</p>
            </div>
          ) : (
            <div className="space-y-4 mt-4">
              {/* Pending Assignments */}
              {pendingCount > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1 text-yellow-600" />
                    Pending ({pendingCount})
                  </h4>
                  <div className="space-y-2">
                    {assignments
                      .filter(a => a.status === 'pending')
                      .map(assignment => (
                        <div
                          key={assignment.id}
                          className="p-3 bg-yellow-50 dark:bg-yellow-900 border-l-4 border-yellow-500 rounded-r-lg"
                        >
                          <div className="flex justify-between items-start gap-3">
                            <div className="flex-1">
                              <p className="font-medium text-gray-900 dark:text-white">{assignment.name}</p>
                              {assignment.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{assignment.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Assigned: {new Date(assignment.assigned_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                                Pending
                              </span>
                              {deleteConfirm === assignment.id ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleDeleteAssignment(assignment.id)}
                                    disabled={deleting}
                                    className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50"
                                  >
                                    {deleting ? 'Deleting...' : 'Confirm'}
                                  </button>
                                  <button
                                    onClick={() => setDeleteConfirm(null)}
                                    disabled={deleting}
                                    className="p-1 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-50"
                                    title="Cancel"
                                  >
                                    <X className="h-4 w-4" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setDeleteConfirm(assignment.id)}
                                  className="p-1 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 rounded transition-colors"
                                  title="Delete assignment"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Completed Assignments */}
              {completedCount > 0 && (
                <div>
                  <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                    <CheckCircle className="h-4 w-4 mr-1 text-green-600" />
                    Completed ({completedCount})
                  </h4>
                  <div className="space-y-2">
                    {assignments
                      .filter(a => a.status === 'completed')
                      .map(assignment => (
                        <div
                          key={assignment.id}
                          className="p-3 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 rounded-r-lg"
                        >
                          <div className="flex justify-between items-start">
                            <div className="flex-1">
                              <div 
                                onClick={() => setViewingAssignment(assignment)}
                                className="inline-flex items-center gap-1.5 font-medium text-primary-600 dark:text-primary-400 cursor-pointer underline hover:text-primary-700 dark:hover:text-primary-300 transition-colors group"
                              >
                                <span>{assignment.name}</span>
                                <ExternalLink className="h-3.5 w-3.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                              </div>
                              {assignment.description && (
                                <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">{assignment.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                                <span className="flex items-center">
                                  <Calendar className="h-3 w-3 mr-1" />
                                  Assigned: {new Date(assignment.assigned_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                                <span className="flex items-center">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Completed: {new Date(assignment.completed_at).toLocaleString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    hour12: true
                                  })}
                                </span>
                                <span>Responses: {assignment.response_count || 0}</span>
                              </div>
                            </div>
                            <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                              Completed
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Questionnaire View Modal */}
      {viewingAssignment && (
        <QuestionnaireViewModal
          isOpen={!!viewingAssignment}
          onClose={() => setViewingAssignment(null)}
          assignmentId={viewingAssignment.id}
          questionnaireName={viewingAssignment.name}
        />
      )}
    </div>
  );
};

export default UserAssignmentsSection;
