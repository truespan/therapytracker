import React, { useState, useEffect } from 'react';
import { reportTemplateAPI } from '../../services/api';
import { FileText, Download, AlertCircle, CheckCircle } from 'lucide-react';

const ClientReportTab = ({ userId, userName, partnerId }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    loadTemplates();
  }, []);

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

  const handleSelectTemplate = (template) => {
    setSelectedTemplate(template);
  };

  const handleDownloadTemplate = async (template) => {
    try {
      const response = await reportTemplateAPI.download(template.id);

      // Create a blob from the response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Create download link with client name
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      // Generate filename: TemplateName_ClientName_Date.docx
      const date = new Date().toISOString().split('T')[0];
      const sanitizedClientName = userName.replace(/[^a-zA-Z0-9]/g, '_');
      const sanitizedTemplateName = template.name.replace(/[^a-zA-Z0-9]/g, '_');
      link.download = `${sanitizedTemplateName}_${sanitizedClientName}_${date}.docx`;
      document.body.appendChild(link);
      link.click();

      // Cleanup
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download template:', err);
      alert('Failed to download template. Please try again.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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

  if (error) {
    return (
      <div className="card">
        <div className="flex items-start space-x-3 text-red-600">
          <AlertCircle className="h-6 w-6 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Error Loading Templates</p>
            <p className="text-sm mt-1">{error}</p>
            <button
              onClick={loadTemplates}
              className="mt-3 btn btn-primary text-sm"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="card bg-primary-50 border-2 border-primary-200">
        <div className="flex items-start space-x-3">
          <AlertCircle className="h-6 w-6 text-primary-700 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-semibold text-primary-900">Generate Report for {userName}</h3>
            <p className="text-primary-900 text-sm mt-1">
              Select a report template below to download and fill in with client information.
              The template will be customized with the client's name for easy identification.
            </p>
          </div>
        </div>
      </div>

      {selectedTemplate && (
        <div className="card bg-green-50 border-2 border-green-200">
          <div className="flex items-start space-x-3">
            <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-green-900">Selected Template</h3>
              <p className="text-green-800 text-sm mt-1">
                <strong>{selectedTemplate.name}</strong> - Click "Download Template" below to get the document.
              </p>
            </div>
            <button
              onClick={() => setSelectedTemplate(null)}
              className="text-green-600 hover:text-green-800 text-sm font-medium"
            >
              Change
            </button>
          </div>
        </div>
      )}

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
          <p className="text-gray-600">
            No report templates have been uploaded yet. Please contact your administrator to upload templates.
          </p>
        </div>
      ) : (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Available Report Templates</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`card cursor-pointer transition-all ${
                    selectedTemplate?.id === template.id
                      ? 'border-2 border-primary-600 bg-primary-50'
                      : 'border-2 border-gray-200 hover:border-primary-300'
                  }`}
                  onClick={() => handleSelectTemplate(template)}
                >
                  <div className="flex items-start space-x-4">
                    <div className="flex-shrink-0">
                      <div className={`p-3 rounded-lg ${
                        selectedTemplate?.id === template.id
                          ? 'bg-primary-100'
                          : 'bg-gray-100'
                      }`}>
                        <FileText className={`h-8 w-8 ${
                          selectedTemplate?.id === template.id
                            ? 'text-primary-600'
                            : 'text-gray-600'
                        }`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-gray-900 truncate">{template.name}</h4>
                      {template.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">
                          {template.description}
                        </p>
                      )}
                      <div className="flex items-center justify-between mt-3">
                        <span className="text-xs text-gray-500">
                          Uploaded {formatDate(template.created_at)}
                        </span>
                        {selectedTemplate?.id === template.id && (
                          <span className="text-xs font-medium text-primary-600 flex items-center">
                            <CheckCircle className="h-4 w-4 mr-1" />
                            Selected
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {selectedTemplate && (
            <div className="card bg-white border-2 border-primary-200">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold text-gray-900">Ready to Generate Report</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Download the selected template and fill in {userName}'s information
                  </p>
                </div>
                <button
                  onClick={() => handleDownloadTemplate(selectedTemplate)}
                  className="btn btn-primary flex items-center space-x-2 w-full sm:w-auto"
                >
                  <Download className="h-5 w-5" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ClientReportTab;
