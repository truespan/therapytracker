import React, { useState } from 'react';
import { profileAPI } from '../../services/api';
import { Plus, AlertCircle, CheckCircle } from 'lucide-react';

const CustomFieldManager = ({ onFieldAdded, sessionId, userId }) => {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    field_name: '',
    field_type: 'rating_5',
    category: 'Emotional Well-being'
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setError('');
    setSuccess(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.field_name.trim()) {
      setError('Field name is required');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // Include session_id for user custom fields
      const fieldData = {
        ...formData,
        ...(sessionId && { session_id: sessionId })
      };
      
      const response = await profileAPI.createField(fieldData);
      setSuccess(true);
      setFormData({
        field_name: '',
        field_type: 'rating_5',
        category: 'Emotional Well-being'
      });
      
      setTimeout(() => {
        setSuccess(false);
        setShowForm(false);
        if (onFieldAdded) {
          // Call callback to refresh the questionnaire
          onFieldAdded(response.data.field);
        }
      }, 1500);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create custom field');
    } finally {
      setLoading(false);
    }
  };

  if (!showForm) {
    return (
      <button
        onClick={() => setShowForm(true)}
        className="btn btn-secondary flex items-center space-x-2"
      >
        <Plus className="h-4 w-4" />
        <span>Add Custom Field</span>
      </button>
    );
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Add Custom Field</h3>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center space-x-2 text-red-700">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center space-x-2 text-green-700">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span className="text-sm">Custom field created successfully!</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="label">Field Name</label>
          <input
            type="text"
            name="field_name"
            value={formData.field_name}
            onChange={handleChange}
            className="input"
            placeholder="e.g., Work-Life Balance"
          />
        </div>

        <div>
          <label className="label">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="input"
          >
            <option value="Emotional Well-being">Emotional Well-being</option>
            <option value="Social & Relationships">Social & Relationships</option>
            <option value="Physical Health">Physical Health</option>
            <option value="Daily Functioning">Daily Functioning</option>
            <option value="Self-Care & Coping">Self-Care & Coping</option>
            <option value="Others">Others</option>
          </select>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            disabled={loading}
            className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Creating...' : 'Create Field'}
          </button>
          <button
            type="button"
            onClick={() => setShowForm(false)}
            className="btn btn-secondary"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default CustomFieldManager;

