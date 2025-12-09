import React, { useState, useEffect } from 'react';
import { generatedReportAPI, reportTemplateAPI, partnerAPI, userAPI } from '../../services/api';
import { FileText, AlertCircle, Save, Eye, Send, X, Trash2, Edit, Share, Ban, Plus, Download } from 'lucide-react';

const ClientReportsTab = ({ partnerId, userId, userName, sessionId, onReportCreated }) => {
  const [reports, setReports] = useState([]);
  const [templates, setTemplates] = useState([]);
  const [defaultTemplateId, setDefaultTemplateId] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [editingReport, setEditingReport] = useState(null);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewReport, setPreviewReport] = useState(null);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  // Form data
  const [formData, setFormData] = useState({
    report_name: '',
    client_name: '',
    client_age: '',
    client_sex: '',
    report_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    loadReports();
    loadTemplates();
    loadDefaultTemplate();
    loadClientData();
  }, [userId]);

  // If sessionId prop is provided, auto-open form
  useEffect(() => {
    if (sessionId && !showForm) {
      handleCreateNewReport();
    }
  }, [sessionId]);

  const loadReports = async () => {
    try {
      const response = await generatedReportAPI.getByClient(userId);
      setReports(response.data.reports || []);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports. Please try again.');
    }
  };

  const loadTemplates = async () => {
    try {
      setLoading(true);
      const response = await reportTemplateAPI.getAll();
      setTemplates(response.data.templates || []);
    } catch (err) {
      console.error('Failed to load templates:', err);
      setError('Failed to load report templates. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const loadDefaultTemplate = async () => {
    try {
      const response = await partnerAPI.getDefaultReportTemplate(partnerId);
      setDefaultTemplateId(response.data.default_template_id);
      if (response.data.template) {
        setSelectedTemplate(response.data.template.id);
      }
    } catch (err) {
      console.error('Failed to load default template:', err);
    }
  };

  const loadClientData = async () => {
    try {
      const response = await userAPI.getById(userId);
      const user = response.data.user;
      setFormData(prev => ({
        ...prev,
        client_name: user.name,
        client_age: user.age,
        client_sex: user.sex
      }));
    } catch (err) {
      console.error('Failed to load client data:', err);
    }
  };

  const handleCreateNewReport = () => {
    setEditingReport(null);
    setShowForm(true);
    setError(null);
    // Reset form with client data
    setFormData({
      report_name: '',
      client_name: formData.client_name,
      client_age: formData.client_age,
      client_sex: formData.client_sex,
      report_date: new Date().toISOString().split('T')[0],
      description: ''
    });
    // Set default template
    if (defaultTemplateId) {
      setSelectedTemplate(defaultTemplateId);
    }
  };

  const handleEditReport = (report) => {
    setEditingReport(report);
    setFormData({
      report_name: report.report_name,
      client_name: report.client_name,
      client_age: report.client_age,
      client_sex: report.client_sex,
      report_date: new Date(report.report_date).toISOString().split('T')[0],
      description: report.description
    });
    setSelectedTemplate(report.template_id);
    setShowForm(true);
    setError(null);
  };

  const handleViewReport = (report) => {
    setPreviewReport(report);
    setShowPreview(true);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleCancelForm = () => {
    setShowForm(false);
    setEditingReport(null);
    setError(null);
  };

  const handleSaveReport = async () => {
    if (!formData.report_name || !formData.client_name || !formData.report_date || !formData.description) {
      setError('Please fill in all required fields');
      return;
    }

    try {
      setSaving(true);
      setError(null);

      const reportData = {
        user_id: userId,
        template_id: selectedTemplate || null,
        ...formData
      };

      let response;
      if (editingReport) {
        response = await generatedReportAPI.update(editingReport.id, reportData);
      } else {
        response = await generatedReportAPI.create(reportData);
      }

      // Show preview
      setPreviewReport(response.data.report);
      setShowPreview(true);
      setShowForm(false);

      // Reload reports list
      await loadReports();

      if (onReportCreated) {
        onReportCreated();
      }
    } catch (err) {
      console.error('Failed to save report:', err);
      setError(err.response?.data?.error || 'Failed to save report. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleShareReport = async (report) => {
    try {
      if (report.is_shared) {
        await generatedReportAPI.unshare(report.id);
      } else {
        await generatedReportAPI.share(report.id);
      }
      await loadReports();
      if (showPreview) {
        setShowPreview(false);
      }
      alert(`Report ${report.is_shared ? 'unshared' : 'shared'} successfully with ${userName}!`);
    } catch (err) {
      console.error('Failed to share/unshare report:', err);
      alert('Failed to update sharing status. Please try again.');
    }
  };

  const handleDeleteReport = async (report) => {
    if (!window.confirm(`Are you sure you want to delete "${report.report_name}"?`)) {
      return;
    }

    try {
      await generatedReportAPI.delete(report.id);
      await loadReports();
      alert('Report deleted successfully');
    } catch (err) {
      console.error('Failed to delete report:', err);
      alert('Failed to delete report. Please try again.');
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      setDownloadingReportId(report.id);
      const response = await generatedReportAPI.download(report.id);
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date(report.report_date).toISOString().split('T')[0];
      const sanitizedName = (report.report_name || 'report').replace(/[^a-z0-9_\-]/gi, '_');
      link.href = url;
      link.download = `${sanitizedName}_${date}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert(err.response?.data?.error || 'Failed to download report with template. Please try again.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reports...</p>
        </div>
      </div>
    );
  }

  // Show form view
  if (showForm) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-gray-900">
            {editingReport ? 'Edit Report' : 'Create New Report'} for {userName}
          </h2>
          <button
            onClick={handleCancelForm}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
            <AlertCircle className="h-5 w-5 text-red-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="text-red-800 font-medium">Error</p>
              <p className="text-red-700 text-sm mt-1">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-red-600 hover:text-red-800">
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        <div className="card">
          <form className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Template
              </label>
              <select
                value={selectedTemplate || ''}
                onChange={(e) => setSelectedTemplate(parseInt(e.target.value))}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              >
                <option value="">Select a template (optional)</option>
                {templates.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name} {template.description ? `- ${template.description}` : ''}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Report Name *
                </label>
                <input
                  type="text"
                  name="report_name"
                  value={formData.report_name}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Enter report name"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Client Name *
                </label>
                <input
                  type="text"
                  name="client_name"
                  value={formData.client_name}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  placeholder="Client name"
                  required
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age
                </label>
                <input
                  type="number"
                  name="client_age"
                  value={formData.client_age}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  placeholder="Age"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sex
                </label>
                <input
                  type="text"
                  name="client_sex"
                  value={formData.client_sex}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent bg-gray-50"
                  placeholder="Sex"
                  readOnly
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date *
                </label>
                <input
                  type="date"
                  name="report_date"
                  value={formData.report_date}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description (Prescription Details) *
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleFormChange}
                rows="12"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                placeholder="Enter detailed prescription and report details..."
                required
              />
            </div>

            <div className="flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={handleCancelForm}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
                disabled={saving}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveReport}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors disabled:bg-gray-400 flex items-center space-x-2"
                disabled={saving}
              >
                <Save className="h-5 w-5" />
                <span>{saving ? 'Saving...' : (editingReport ? 'Update Report' : 'Save Report')}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  // Show reports list view
  return (
    <div className="space-y-6">
      {/* Header with Create button */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports for {userName}</h2>
          <p className="text-gray-600 mt-1">Manage and create reports for this client</p>
        </div>
        <button
          onClick={handleCreateNewReport}
          className="btn btn-primary flex items-center space-x-2"
        >
          <Plus className="h-5 w-5" />
          <span>Create New Report</span>
        </button>
      </div>

      {/* Reports List */}
      {reports.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
          <p className="text-gray-600 mb-6">
            Create your first report for {userName}
          </p>
          <button
            onClick={handleCreateNewReport}
            className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <Plus className="h-5 w-5" />
            <span>Create Report</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {reports.map((report) => (
            <div
              key={report.id}
              className="card hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-3 mb-2">
                    <FileText className="h-5 w-5 text-primary-600 flex-shrink-0" />
                    <h3 className="font-semibold text-gray-900 truncate">{report.report_name}</h3>
                    {report.is_shared && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded">
                        Shared
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>Date: {new Date(report.report_date).toLocaleDateString()}</p>
                    {report.description && (
                      <p className="line-clamp-2">{report.description}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center space-x-2 ml-4">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="View Report"
                  >
                    <Eye className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleEditReport(report)}
                    className="p-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                    title="Edit Report"
                  >
                    <Edit className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleShareReport(report)}
                    className={`p-2 rounded-lg transition-colors ${
                      report.is_shared
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                    title={report.is_shared ? 'Unshare Report' : 'Share Report'}
                  >
                    {report.is_shared ? <Ban className="h-5 w-5" /> : <Share className="h-5 w-5" />}
                  </button>
                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="p-2 text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                    title="Download with Template"
                    disabled={downloadingReportId === report.id}
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => handleDeleteReport(report)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete Report"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && previewReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900">Report Preview</h2>
              <button
                onClick={() => setShowPreview(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6">
              <div className="border-2 border-gray-200 rounded-lg p-6 mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-4">{previewReport.report_name}</h3>
                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div>
                    <span className="font-medium text-gray-700">Client Name:</span>
                    <span className="ml-2 text-gray-900">{previewReport.client_name}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Age:</span>
                    <span className="ml-2 text-gray-900">{previewReport.client_age || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Sex:</span>
                    <span className="ml-2 text-gray-900">{previewReport.client_sex || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700">Date:</span>
                    <span className="ml-2 text-gray-900">
                      {new Date(previewReport.report_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <div>
                  <h4 className="font-medium text-gray-700 mb-2">Report Details:</h4>
                  <div className="text-gray-900 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg">
                    {previewReport.description}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => handleDownloadReport(previewReport)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors flex items-center space-x-2 disabled:opacity-60"
                  disabled={downloadingReportId === previewReport.id}
                >
                  <Download className="h-5 w-5" />
                  <span>{downloadingReportId === previewReport.id ? 'Preparing...' : 'Download (.docx)'}</span>
                </button>
                <button
                  onClick={() => handleShareReport(previewReport)}
                  className={`px-4 py-2 rounded-lg transition-colors flex items-center space-x-2 ${
                    previewReport.is_shared
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-primary-600 text-white hover:bg-primary-700'
                  }`}
                >
                  {previewReport.is_shared ? <Ban className="h-5 w-5" /> : <Send className="h-5 w-5" />}
                  <span>{previewReport.is_shared ? 'Unshare with Client' : 'Share with Client'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClientReportsTab;
