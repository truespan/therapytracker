import React, { useState, useEffect } from 'react';
import { whatsappAPI } from '../../services/api';
import { 
  MessageSquare, 
  Send, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  RefreshCw,
  Activity,
  Clock,
  Phone,
  TrendingUp,
  FileText
} from 'lucide-react';

const WhatsAppSettingsTab = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [logs, setLogs] = useState([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [statistics, setStatistics] = useState(null);
  const [loadingStats, setLoadingStats] = useState(false);

  useEffect(() => {
    loadStatus();
    loadRecentLogs();
    loadStatistics();
  }, []);

  const loadStatus = async () => {
    try {
      setLoading(true);
      const response = await whatsappAPI.getStatus();
      setStatus(response.data);
    } catch (error) {
      console.error('Error loading WhatsApp status:', error);
      setStatus({
        success: false,
        error: error.response?.data?.error || 'Failed to load WhatsApp status'
      });
    } finally {
      setLoading(false);
    }
  };

  const loadRecentLogs = async () => {
    try {
      setLoadingLogs(true);
      const response = await whatsappAPI.getLogs({ limit: 10 });
      setLogs(response.data.logs || []);
    } catch (error) {
      console.error('Error loading logs:', error);
    } finally {
      setLoadingLogs(false);
    }
  };

  const loadStatistics = async () => {
    try {
      setLoadingStats(true);
      const response = await whatsappAPI.getStatistics(30);
      setStatistics(response.data);
    } catch (error) {
      console.error('Error loading statistics:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleTest = async () => {
    if (!phoneNumber.trim()) {
      alert('Please enter a phone number');
      return;
    }

    // Validate phone number format (basic check)
    const phoneRegex = /^\+?\d{10,15}$/;
    const cleanedPhone = phoneNumber.replace(/[\s\-\(\)]/g, '');
    
    if (!phoneRegex.test(cleanedPhone)) {
      alert('Please enter a valid phone number (e.g., +919876543210 or 9876543210)');
      return;
    }

    // Format phone number (add + if missing and it's a 10-digit Indian number)
    let formattedPhone = cleanedPhone;
    if (cleanedPhone.length === 10 && !cleanedPhone.startsWith('+')) {
      formattedPhone = `+91${cleanedPhone}`;
    } else if (!formattedPhone.startsWith('+')) {
      formattedPhone = `+${formattedPhone}`;
    }

    try {
      setTesting(true);
      setTestResult(null);

      const response = await whatsappAPI.testIntegration(formattedPhone);
      setTestResult({
        success: true,
        message: response.data.message,
        messageSid: response.data.messageSid,
        phoneNumber: response.data.phoneNumber
      });
      
      // Reload status and logs after test
      setTimeout(() => {
        loadStatus();
        loadRecentLogs();
        loadStatistics();
      }, 1000);
    } catch (error) {
      console.error('Error testing WhatsApp:', error);
      const errorData = error.response?.data;
      const statusCode = error.response?.status || errorData?.status;
      const isSandboxError = errorData?.isSandboxError || false;
      
      setTestResult({
        success: false,
        error: errorData?.error || 'Failed to send test message',
        isSandboxError: isSandboxError,
        phoneNumber: formattedPhone,
        statusCode: statusCode,
        details: errorData?.details
      });
    } finally {
      setTesting(false);
    }
  };

  const getStatusBadge = (statusValue) => {
    const statusMap = {
      'sent': { color: 'bg-blue-100 text-blue-800', icon: Send },
      'delivered': { color: 'bg-green-100 text-green-800', icon: CheckCircle },
      'read': { color: 'bg-purple-100 text-purple-800', icon: CheckCircle },
      'failed': { color: 'bg-red-100 text-red-800', icon: XCircle },
    };
    
    const config = statusMap[statusValue] || { color: 'bg-gray-100 text-gray-800', icon: AlertCircle };
    const Icon = config.icon;
    
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.color}`}>
        <Icon className="h-3 w-3 mr-1" />
        {statusValue}
      </span>
    );
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
          <MessageSquare className="h-8 w-8" />
          WhatsApp Settings
        </h1>
        <p className="text-gray-600 dark:text-dark-text-secondary mt-1">
          Manage and test WhatsApp integration
        </p>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Service Status
          </h2>
          <button
            onClick={loadStatus}
            className="text-primary-600 hover:text-primary-800 dark:text-dark-primary-400 dark:hover:text-dark-primary-300"
            title="Refresh Status"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {status?.success ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Service Status</span>
                {status.service?.enabled ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Enabled
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800">
                    <XCircle className="h-4 w-4 mr-1" />
                    Disabled
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">Configuration</span>
                {status.service?.configured ? (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Configured
                  </span>
                ) : (
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-yellow-100 text-yellow-800">
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Not Configured
                  </span>
                )}
              </div>
            </div>
            
            {status.service?.fromNumber && (
              <div className="p-4 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg">
                <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">WhatsApp Number: </span>
                <span className="text-sm text-gray-900 dark:text-dark-text-primary font-mono">{status.service.fromNumber}</span>
              </div>
            )}

            {status.statistics && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Total Sent</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    {status.statistics.sent?.total || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                    {status.statistics.sent?.today || 0} today
                  </div>
                </div>
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Delivered</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    {status.statistics.delivered?.total || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                    {status.statistics.delivered?.today || 0} today
                  </div>
                </div>
                <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div className="text-sm text-gray-600 dark:text-dark-text-secondary">Failed</div>
                  <div className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
                    {status.statistics.failed?.total || 0}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                    {status.statistics.failed?.today || 0} today
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
            <p className="text-red-800 dark:text-red-300">{status?.error || 'Failed to load status'}</p>
          </div>
        )}
      </div>

      {/* Test WhatsApp */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary mb-4 flex items-center gap-2">
          <Send className="h-5 w-5" />
          Test WhatsApp Integration
        </h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Phone Number
            </label>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={phoneNumber}
                  onChange={(e) => setPhoneNumber(e.target.value)}
                  placeholder="+919876543210 or 9876543210"
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-dark-bg-secondary dark:text-dark-text-primary"
                  disabled={testing}
                />
              </div>
              <button
                onClick={handleTest}
                disabled={testing || !phoneNumber.trim()}
                className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2 font-medium transition-colors"
              >
                {testing ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Send Test
                  </>
                )}
              </button>
            </div>
            <p className="mt-2 text-xs text-gray-500 dark:text-dark-text-tertiary">
              Enter phone number in international format (e.g., +919876543210) or 10-digit Indian number
            </p>
          </div>

          {testResult && (
            <div className={`p-4 rounded-lg ${
              testResult.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              <div className="flex items-start gap-2">
                {testResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
                ) : (
                  <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${
                    testResult.success 
                      ? 'text-green-800 dark:text-green-300' 
                      : 'text-red-800 dark:text-red-300'
                  }`}>
                    {testResult.success ? 'Test Message Sent Successfully!' : 'Test Failed'}
                  </p>
                  {testResult.success ? (
                    <div className="mt-2 text-sm text-green-700 dark:text-green-400">
                      <p>Message ID: <span className="font-mono">{testResult.messageSid}</span></p>
                      <p>Phone: {testResult.phoneNumber}</p>
                    </div>
                  ) : (
                    <div className="mt-2">
                      <p className="text-sm text-red-700 dark:text-red-400 font-medium mb-2">{testResult.error}</p>
                      {testResult.statusCode === 401 && (
                        <div className="mt-3 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                          <p className="text-sm font-semibold text-red-800 dark:text-red-300 mb-2">
                            🔐 Authentication Error (401)
                          </p>
                          <p className="text-xs text-red-700 dark:text-red-400 mb-2">
                            The Vonage API credentials are incorrect or invalid. Please verify your configuration.
                          </p>
                          {testResult.details?.troubleshooting ? (
                            <>
                              <p className="text-xs font-semibold text-red-800 dark:text-red-300 mt-3 mb-2">
                                Troubleshooting Steps:
                              </p>
                              <ol className="text-xs text-red-700 dark:text-red-400 list-decimal list-inside space-y-1 mb-2">
                                {testResult.details.troubleshooting.steps.map((step, index) => (
                                  <li key={index}>{step}</li>
                                ))}
                              </ol>
                              <div className="mt-2 p-2 bg-white dark:bg-dark-bg-secondary rounded border border-red-300 dark:border-red-700">
                                <p className="text-xs text-gray-700 dark:text-dark-text-secondary">
                                  <strong>Environment Variables Required:</strong>
                                </p>
                                <ul className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1 list-disc list-inside space-y-1">
                                  <li><code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">VONAGE_API_KEY</code> - Your Vonage API Key</li>
                                  <li><code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">VONAGE_API_SECRET</code> - Your Vonage API Secret</li>
                                  <li><code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">VONAGE_WHATSAPP_NUMBER</code> - Your WhatsApp Business Number (E.164 format, e.g., +919655846492)</li>
                                  <li><code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">WHATSAPP_ENABLED</code> - Set to <code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">true</code></li>
                                </ul>
                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-2">
                                  <strong>Important:</strong> After updating your <code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">.env</code> file, you must restart your backend server for changes to take effect.
                                </p>
                              </div>
                              <p className="text-xs text-red-700 dark:text-red-400 mt-2">
                                Access your <a href="https://dashboard.nexmo.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Vonage Dashboard</a> to verify your API credentials.
                              </p>
                            </>
                          ) : (
                            <p className="text-xs text-red-700 dark:text-red-400">
                              Please check your backend <code className="bg-red-100 dark:bg-red-900/30 px-1 rounded">.env</code> file and ensure VONAGE_API_KEY and VONAGE_API_SECRET are correctly set.
                            </p>
                          )}
                          {testResult.details && (
                            <details className="mt-2">
                              <summary className="text-xs text-red-700 dark:text-red-400 cursor-pointer">View Error Details</summary>
                              <pre className="mt-2 p-2 bg-white dark:bg-dark-bg-secondary rounded text-xs overflow-auto">
                                {typeof testResult.details === 'string' ? testResult.details : JSON.stringify(testResult.details, null, 2)}
                              </pre>
                            </details>
                          )}
                        </div>
                      )}
                      {testResult.statusCode === 422 && (
                        <div className="mt-3 p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg">
                          {testResult.isSandboxError ? (
                            <>
                              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                                📱 Sandbox Registration Required
                              </p>
                              <p className="text-xs text-orange-700 dark:text-orange-400 mb-2">
                                This phone number needs to be registered in your Vonage WhatsApp sandbox before you can send messages.
                              </p>
                              <ol className="text-xs text-orange-700 dark:text-orange-400 list-decimal list-inside space-y-1">
                                <li>Go to <a href="https://dashboard.nexmo.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Vonage Dashboard</a></li>
                                <li>Navigate to: <strong>Messages and Dispatch</strong> → <strong>Sandbox</strong> → <strong>WhatsApp</strong></li>
                                <li>Find the <strong>"Sandbox Recipients"</strong> section</li>
                                <li>Click <strong>"Add Number"</strong></li>
                                <li>Enter the phone number in E.164 format <strong>WITHOUT</strong> the + sign:</li>
                              </ol>
                              <div className="mt-2 p-2 bg-white dark:bg-dark-bg-secondary rounded border border-orange-300 dark:border-orange-700">
                                <p className="text-xs font-mono text-gray-900 dark:text-dark-text-primary">
                                  {testResult.phoneNumber ? testResult.phoneNumber.replace('+', '') : '919876543210'}
                                </p>
                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary mt-1">
                                  ✅ Correct format: <code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">919876543210</code>
                                </p>
                                <p className="text-xs text-gray-600 dark:text-dark-text-secondary">
                                  ❌ Wrong format: <code className="bg-gray-100 dark:bg-dark-bg-tertiary px-1 rounded">+919876543210</code>
                                </p>
                              </div>
                              <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                                After registering, wait a few seconds and try sending the test message again.
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-sm font-semibold text-orange-800 dark:text-orange-300 mb-2">
                                ⚠️ Production Mode Error (422)
                              </p>
                              <p className="text-xs text-orange-700 dark:text-orange-400 mb-2">
                                This error typically occurs in production mode when:
                              </p>
                              <ul className="text-xs text-orange-700 dark:text-orange-400 list-disc list-inside space-y-1 mb-2">
                                <li>The recipient number hasn't initiated a conversation with your WhatsApp Business number</li>
                                <li>The recipient needs to send you a message first (24-hour window rule)</li>
                                <li>Your WhatsApp Business account has restrictions</li>
                                <li>Message template approval is required (if using templates)</li>
                              </ul>
                              <div className="mt-2 p-2 bg-white dark:bg-dark-bg-secondary rounded border border-orange-300 dark:border-orange-700">
                                <p className="text-xs font-semibold text-gray-900 dark:text-dark-text-primary mb-1">Solution:</p>
                                <p className="text-xs text-gray-700 dark:text-dark-text-secondary">
                                  Ask the recipient (<strong>{testResult.phoneNumber}</strong>) to send a WhatsApp message to your business number (<strong>+919655846492</strong>) first. 
                                  After they message you, you'll have a 24-hour window to send them messages.
                                </p>
                              </div>
                              <p className="text-xs text-orange-700 dark:text-orange-400 mt-2">
                                Check your <a href="https://dashboard.nexmo.com/" target="_blank" rel="noopener noreferrer" className="underline font-medium">Vonage Dashboard</a> → Messages and Dispatch → Activity for detailed error information.
                              </p>
                              {testResult.details && (
                                <details className="mt-2">
                                  <summary className="text-xs text-orange-700 dark:text-orange-400 cursor-pointer">View Error Details</summary>
                                  <pre className="mt-2 p-2 bg-white dark:bg-dark-bg-secondary rounded text-xs overflow-auto">
                                    {typeof testResult.details === 'string' ? testResult.details : JSON.stringify(testResult.details, null, 2)}
                                  </pre>
                                </details>
                              )}
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Recent Logs */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Recent Notifications
          </h2>
          <button
            onClick={loadRecentLogs}
            className="text-primary-600 hover:text-primary-800 dark:text-dark-primary-400 dark:hover:text-dark-primary-300"
            title="Refresh Logs"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {loadingLogs ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-dark-text-tertiary">
            <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
              <thead className="bg-gray-50 dark:bg-dark-bg-secondary">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">User</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Phone</th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-dark-bg-tertiary divide-y divide-gray-200 dark:divide-dark-border">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg-secondary">
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-dark-text-primary">
                      {log.user_name || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary font-mono">
                      {log.user_phone || log.phone_number || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {getStatusBadge(log.status)}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-dark-text-secondary">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {formatDate(log.created_at)}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default WhatsAppSettingsTab;

