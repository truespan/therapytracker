import React, { useState, useEffect } from 'react';
import { reportTemplateAPI } from '../../services/api';
import { FileText, Download, Calendar, User as UserIcon } from 'lucide-react';

const ReportsTab = () => {
  const [templates, setTemplates] = useState([]);
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

  const handleDownload = async (template) => {
    try {
      const response = await reportTemplateAPI.download(template.id);

      // Create a blob from the response
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = template.file_name;
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

  const formatFileSize = (bytes) => {
    if (!bytes) return 'N/A';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(2) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
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
      <div className="card text-center py-12">
        <div className="text-red-600 mb-4">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg">{error}</p>
        </div>
        <button
          onClick={loadTemplates}
          className="btn btn-primary"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Report Templates</h2>
        <p className="text-gray-600">
          Browse and preview available report templates. You can select these templates when generating client reports.
        </p>
      </div>

      {templates.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Templates Available</h3>
          <p className="text-gray-600">
            No report templates have been uploaded yet. Please contact your administrator.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.map((template) => (
            <div
              key={template.id}
              className="card hover:shadow-lg transition-shadow cursor-pointer border-2 border-transparent hover:border-primary-200"
            >
              <div className="flex flex-col h-full">
                {/* Template Icon */}
                <div className="flex items-center justify-center h-32 bg-primary-50 rounded-lg mb-4">
                  <FileText className="h-16 w-16 text-primary-600" />
                </div>

                {/* Template Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">{template.name}</h3>

                  {template.description && (
                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {template.description}
                    </p>
                  )}

                  <div className="space-y-2 text-sm text-gray-500">
                    <div className="flex items-center space-x-2">
                      <FileText className="h-4 w-4" />
                      <span className="truncate">{template.file_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Uploaded {formatDate(template.created_at)}</span>
                    </div>
                    {template.uploaded_by_name && (
                      <div className="flex items-center space-x-2">
                        <UserIcon className="h-4 w-4" />
                        <span>By {template.uploaded_by_name}</span>
                      </div>
                    )}
                    <div className="text-xs text-gray-400">
                      Size: {formatFileSize(template.file_size)}
                    </div>
                  </div>
                </div>

                {/* Download Button */}
                <button
                  onClick={() => handleDownload(template)}
                  className="mt-4 w-full btn btn-primary flex items-center justify-center space-x-2"
                >
                  <Download className="h-4 w-4" />
                  <span>Download Template</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ReportsTab;
