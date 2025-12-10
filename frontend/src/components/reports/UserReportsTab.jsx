import React, { useState, useEffect } from 'react';
import { generatedReportAPI } from '../../services/api';
import { FileText, Calendar, User as UserIcon, Eye, Download, X, AlertCircle } from 'lucide-react';

const UserReportsTab = ({ userId, onReportViewed }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [showPreview, setShowPreview] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [downloadingReportId, setDownloadingReportId] = useState(null);

  useEffect(() => {
    loadReports();

    // Cleanup blob URL on unmount
    return () => {
      if (previewPdfUrl) {
        window.URL.revokeObjectURL(previewPdfUrl);
      }
    };
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const response = await generatedReportAPI.getUserSharedReports();
      setReports(response.data.reports || []);
      setError(null);
    } catch (err) {
      console.error('Failed to load reports:', err);
      setError('Failed to load reports. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const isMobileDevice = () => {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  };

  const handleViewReport = async (report) => {
    // Mark report as read immediately
    await markReportAsRead(report.id);

    // On mobile, open PDF in new tab instead of iframe
    if (isMobileDevice()) {
      try {
        const response = await generatedReportAPI.download(report.id);
        const blob = new Blob([response.data], { type: 'application/pdf' });
        const pdfUrl = window.URL.createObjectURL(blob);
        window.open(pdfUrl, '_blank');
        // Cleanup after a delay
        setTimeout(() => window.URL.revokeObjectURL(pdfUrl), 100);
      } catch (err) {
        console.error('Failed to open PDF:', err);
        alert('Failed to open PDF. Please try downloading instead.');
      }
      return;
    }

    // Desktop: Show in modal
    setSelectedReport(report);
    setShowPreview(true);
    setLoadingPreview(true);
    setPreviewPdfUrl(null);

    try {
      // Fetch the PDF as a blob
      const response = await generatedReportAPI.download(report.id);
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const pdfUrl = window.URL.createObjectURL(blob);
      setPreviewPdfUrl(pdfUrl);
    } catch (err) {
      console.error('Failed to load PDF preview:', err);
      alert('Failed to load PDF preview. Please try downloading instead.');
    } finally {
      setLoadingPreview(false);
    }
  };

  const markReportAsRead = async (reportId) => {
    try {
      await generatedReportAPI.markAsViewed(reportId);
      // Notify parent component to update the unread count
      if (onReportViewed) {
        onReportViewed();
      }
    } catch (err) {
      console.error('Failed to mark report as viewed:', err);
      // Silent fail - not critical if this fails
    }
  };

  const handleDownloadReport = async (report) => {
    try {
      setDownloadingReportId(report.id);
      const response = await generatedReportAPI.download(report.id);
      const blob = new Blob([response.data], {
        type: 'application/pdf'
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      const date = new Date(report.report_date).toISOString().split('T')[0];
      const sanitizedName = (report.report_name || 'report').replace(/[^a-z0-9_\-]/gi, '_');
      link.href = url;
      link.download = `${sanitizedName}_${date}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report:', err);
      alert(err.response?.data?.error || 'Failed to download report. Please try again.');
    } finally {
      setDownloadingReportId(null);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  if (error) {
    return (
      <div className="card text-center py-12">
        <div className="text-red-600 mb-4">
          <FileText className="h-16 w-16 mx-auto mb-4" />
          <p className="text-lg">{error}</p>
        </div>
        <button
          onClick={loadReports}
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
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Your Reports</h2>
        <p className="text-gray-600">
          View and download reports shared with you by your therapist
        </p>
      </div>

      {reports.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Reports Yet</h3>
          <p className="text-gray-600">
            Your therapist hasn't shared any reports with you yet.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {reports.map((report) => (
            <div key={report.id} className="card hover:shadow-lg transition-shadow">
              <div className="flex flex-col h-full">
                {/* Report Icon */}
                <div className="flex items-center justify-center h-24 bg-primary-50 rounded-lg mb-4">
                  <FileText className="h-12 w-12 text-primary-600" />
                </div>

                {/* Report Info */}
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    {report.report_name}
                  </h3>

                  <div className="space-y-2 text-sm text-gray-600">
                    <div className="flex items-center space-x-2">
                      <UserIcon className="h-4 w-4" />
                      <span>{report.partner_name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>{formatDate(report.shared_at || report.created_at)}</span>
                    </div>
                    {report.template_name && (
                      <div className="text-xs text-gray-500">
                        Template: {report.template_name}
                      </div>
                    )}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-4 flex items-center space-x-2">
                  <button
                    onClick={() => handleViewReport(report)}
                    className="flex-1 btn btn-primary flex items-center justify-center space-x-2 text-sm"
                  >
                    <Eye className="h-4 w-4" />
                    <span>View</span>
                  </button>
                  <button
                    onClick={() => handleDownloadReport(report)}
                    className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-60"
                    title="Download PDF"
                    disabled={downloadingReportId === report.id}
                  >
                    <Download className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Preview Modal */}
      {showPreview && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-5xl w-full h-[95vh] overflow-hidden flex flex-col">
            <div className="bg-white border-b border-gray-200 p-6 flex items-center justify-between flex-shrink-0">
              <h2 className="text-xl font-bold text-gray-900">Report Preview - {selectedReport.report_name}</h2>
              <button
                onClick={() => {
                  setShowPreview(false);
                  setSelectedReport(null);
                  if (previewPdfUrl) {
                    window.URL.revokeObjectURL(previewPdfUrl);
                    setPreviewPdfUrl(null);
                  }
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex-1 overflow-hidden flex flex-col p-6">
              {loadingPreview ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading PDF preview...</p>
                  </div>
                </div>
              ) : previewPdfUrl ? (
                <iframe
                  src={previewPdfUrl}
                  className="w-full h-full border-2 border-gray-200 rounded-lg"
                  title="Report Preview"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <AlertCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
                    <p className="text-gray-600">Failed to load PDF preview</p>
                  </div>
                </div>
              )}
            </div>

            <div className="border-t border-gray-200 p-6 flex items-center justify-end space-x-3 flex-shrink-0">
              <button
                onClick={() => handleDownloadReport(selectedReport)}
                className="px-4 py-2 btn btn-primary flex items-center space-x-2 disabled:opacity-60"
                disabled={downloadingReportId === selectedReport.id}
              >
                <Download className="h-5 w-5" />
                <span>{downloadingReportId === selectedReport.id ? 'Preparing...' : 'Download PDF'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserReportsTab;
