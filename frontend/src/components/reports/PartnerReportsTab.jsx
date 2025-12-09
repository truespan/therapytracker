import React, { useState, useEffect } from 'react';
import { reportTemplateAPI, partnerAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { FileText, AlertCircle, Save, X, Settings, CheckCircle } from 'lucide-react';

const PartnerReportsTab = () => {
  const { user } = useAuth();
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Default template settings
  const [defaultTemplateId, setDefaultTemplateId] = useState(null);
  const [selectedDefaultTemplate, setSelectedDefaultTemplate] = useState(null);
  const [savingDefaultTemplate, setSavingDefaultTemplate] = useState(false);
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);

  useEffect(() => {
    loadTemplates();
    loadDefaultTemplate();
  }, []);

  // Auto-select first template if none selected
  useEffect(() => {
    if (templates.length > 0 && !selectedDefaultTemplate && !defaultTemplateId) {
      setSelectedDefaultTemplate(templates[0].id);
    }
  }, [templates, selectedDefaultTemplate, defaultTemplateId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await reportTemplateAPI.getAll();
      setTemplates(response.data.templates || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load report templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const response = await partnerAPI.getDefaultReportTemplate(user.id);
      setDefaultTemplateId(response.data.default_template_id);
      if (response.data.template) {
        setSelectedDefaultTemplate(response.data.template.id);
      }
    } catch (err) {
      console.error('Failed to load default template:', err);
    }
  };

  const handleSaveDefaultTemplate = async () => {
    if (!selectedDefaultTemplate) {
      setError('Please select a template');
      return;
    }

    try {
      setSavingDefaultTemplate(true);
      setError(null);

      await partnerAPI.setDefaultReportTemplate(user.id, selectedDefaultTemplate);

      setDefaultTemplateId(selectedDefaultTemplate);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    } catch (err) {
      console.error('Failed to save default template:', err);
      setError(err.response?.data?.error || 'Failed to save default template. Please try again.');
    } finally {
      setSavingDefaultTemplate(false);
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading templates...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Reports Settings Section */}
      <div className="card">
        <div className="flex items-center space-x-3 mb-4">
          <Settings className="h-6 w-6 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">
            Reports Settings
          </h2>
        </div>
        <p className="text-gray-600 mb-6">
          Select a default report template that will be used for all your clients
        </p>

        {showSuccessMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 rounded-lg p-4 flex items-center space-x-3">
            <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
            <p className="text-green-800 font-medium">Default report template saved successfully!</p>
          </div>
        )}

        {templates.length === 0 ? (
          <div className="text-center py-8 bg-gray-50 rounded-lg">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No templates available. Please contact your administrator.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Default Template
              </label>
              <select
                value={selectedDefaultTemplate || ''}
                onChange={(e) => setSelectedDefaultTemplate(parseInt(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent text-base"
              >
                <option value="">Choose a template</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.description ? `- ${template.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center justify-end">
              <button
                onClick={handleSaveDefaultTemplate}
                disabled={!selectedDefaultTemplate || savingDefaultTemplate}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                <Save className="h-5 w-5" />
                <span>{savingDefaultTemplate ? 'Saving...' : 'Save Report Template'}</span>
              </button>
            </div>

            {defaultTemplateId && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-blue-800 text-sm">
                  <strong>Current default template:</strong> {templates.find(t => t.id === defaultTemplateId)?.name || 'None'}
                </p>
              </div>
            )}
          </div>
        )}
      </div>

    </div>
  );
};

export default PartnerReportsTab;
