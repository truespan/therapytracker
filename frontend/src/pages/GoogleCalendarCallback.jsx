import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, CheckCircle, XCircle } from 'lucide-react';

const GoogleCalendarCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Connecting Google Calendar...');
  const [hasProcessed, setHasProcessed] = useState(false); // Prevent double processing

  useEffect(() => {
    // Prevent double processing (React strict mode or re-renders)
    if (hasProcessed) {
      console.log('[Google Calendar Callback] Already processed, skipping...');
      return;
    }

    const handleCallback = async () => {
      const code = searchParams.get('code');
      const state = searchParams.get('state');

      if (!code || !state) {
        setStatus('error');
        setMessage('Invalid callback parameters. Please try connecting again.');
        setTimeout(() => {
          navigate(`/${user?.userType || 'user'}/dashboard`);
        }, 3000);
        return;
      }

      // Mark as processing to prevent duplicate calls
      setHasProcessed(true);

      try {
        const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
        console.log('[Google Calendar Callback] Making request to backend...');
        
        const response = await fetch(
          `${API_URL}/google-calendar/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`
        );

        const data = await response.json();
        console.log('[Google Calendar Callback] Response:', { ok: response.ok, success: data.success });

        if (response.ok && data.success) {
          setStatus('success');
          setMessage('Successfully connected to Google Calendar!');
          // Redirect after 2 seconds on success
          setTimeout(() => {
            navigate(`/${user?.userType || 'user'}/dashboard`);
          }, 2000);
        } else {
          setStatus('error');
          setMessage(data.message || data.error || 'Failed to connect Google Calendar');
          // Don't auto-redirect on error, let user read the message
        }
      } catch (error) {
        console.error('[Google Calendar Callback] Callback error:', error);
        setStatus('error');
        setMessage('Failed to connect Google Calendar. Please check your connection and try again.');
        // Don't auto-redirect on error
      }
    };

    handleCallback();
  }, [searchParams, navigate, user, hasProcessed]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="max-w-md w-full mx-4">
        <div className="card text-center">
          {status === 'processing' && (
            <>
              <Activity className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connecting Google Calendar</h2>
              <p className="text-gray-600">{message}</p>
            </>
          )}

          {status === 'success' && (
            <>
              <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Successful!</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <p className="text-sm text-gray-500">Redirecting to dashboard...</p>
            </>
          )}

          {status === 'error' && (
            <>
              <XCircle className="h-12 w-12 text-red-600 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Failed</h2>
              <p className="text-gray-600 mb-4">{message}</p>
              <div className="space-y-3">
                <button
                  onClick={() => navigate(`/${user?.userType || 'user'}/dashboard`)}
                  className="btn btn-primary w-full"
                >
                  Go to Dashboard
                </button>
                <p className="text-xs text-gray-500">
                  Tip: If you see "invalid_grant", try disconnecting and reconnecting from Settings.
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GoogleCalendarCallback;

