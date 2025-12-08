import React, { useState, useEffect } from 'react';
import { questionnaireAPI } from '../../services/api';

const QuestionnaireList = ({ partnerId, onEdit, onAssign, onCreateNew }) => {
  const [questionnaires, setQuestionnaires] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  useEffect(() => {
    loadQuestionnaires();
  }, [partnerId]);

  const loadQuestionnaires = async () => {
    try {
      setLoading(true);
      const response = await questionnaireAPI.getByPartner(partnerId);
      setQuestionnaires(response.data);
    } catch (err) {
      setError('Failed to load questionnaires');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await questionnaireAPI.delete(id);
      setQuestionnaires(questionnaires.filter(q => q.id !== id));
      setDeleteConfirm(null);
    } catch (err) {
      setError('Failed to delete questionnaire');
      console.error(err);
    }
  };

  const filteredQuestionnaires = questionnaires.filter(q =>
    q.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (q.description && q.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const getCompletionRate = (questionnaire) => {
    const total = parseInt(questionnaire.assignment_count) || 0;
    const completed = parseInt(questionnaire.completed_count) || 0;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center p-8">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-800">Questionnaires</h2>
        <button
          onClick={onCreateNew}
          className="px-4 py-2 sm:px-6 sm:py-2 bg-primary-600 text-white text-sm sm:text-base rounded-lg hover:bg-primary-700 transition-colors"
        >
          + Create New Questionnaire
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      {/* Search Bar */}
      <div className="mb-6">
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search questionnaires..."
          className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>

      {/* Questionnaires Grid */}
      {filteredQuestionnaires.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-gray-500 text-lg mb-4">
            {searchTerm ? 'No questionnaires found matching your search' : 'No questionnaires yet'}
          </p>
          {!searchTerm && (
            <button
              onClick={onCreateNew}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
            >
              Create Your First Questionnaire
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredQuestionnaires.map((questionnaire) => (
            <div
              key={questionnaire.id}
              className="bg-white rounded-lg shadow-md hover:shadow-lg transition-shadow p-6 border border-gray-200"
            >
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-800 mb-2">
                  {questionnaire.name}
                </h3>
                {questionnaire.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {questionnaire.description}
                  </p>
                )}
              </div>

              {/* Statistics */}
              <div className="mb-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Questions:</span>
                  <span className="font-medium text-gray-800">
                    {questionnaire.question_count || 0}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Assigned to:</span>
                  <span className="font-medium text-gray-800">
                    {questionnaire.assignment_count || 0} users
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Completed:</span>
                  <span className="font-medium text-gray-800">
                    {questionnaire.completed_count || 0}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">Completion Rate:</span>
                    <span className="font-medium text-gray-800">
                      {getCompletionRate(questionnaire)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-600 h-2 rounded-full transition-all"
                      style={{ width: `${getCompletionRate(questionnaire)}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              {/* Created Date */}
              <div className="text-xs text-gray-500 mb-4">
                Created: {new Date(questionnaire.created_at).toLocaleDateString()}
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => onAssign(questionnaire)}
                  className="flex-1 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-full hover:bg-green-700 transition-colors"
                >
                  Assign
                </button>
                <button
                  onClick={() => onEdit(questionnaire.id)}
                  className="flex-1 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-full hover:bg-primary-700 transition-colors"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteConfirm(questionnaire.id)}
                  className="flex-1 px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-full hover:bg-red-700 transition-colors"
                >
                  Delete
                </button>
              </div>

              {/* Delete Confirmation */}
              {deleteConfirm === questionnaire.id && (
                <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded">
                  <p className="text-sm text-red-800 mb-2">
                    Are you sure you want to delete this questionnaire?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleDelete(questionnaire.id)}
                      className="flex-1 px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700"
                    >
                      Yes, Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirm(null)}
                      className="flex-1 px-3 py-1 bg-gray-300 text-gray-700 text-sm rounded hover:bg-gray-400"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default QuestionnaireList;




























