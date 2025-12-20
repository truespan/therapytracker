import React, { useState, useEffect, useRef } from 'react';
import { videoSessionAPI } from '../../services/api';
import { initDailyCall, cleanupDailyCall, getDailyRoomUrl, canJoinSession, formatTimeUntilSession } from '../../utils/videoHelper';
import { Video, Lock, Clock, AlertCircle, CheckCircle } from 'lucide-react';

const VideoSessionJoin = ({ sessionId, userName, onLeave }) => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [password, setPassword] = useState('');
  const [passwordVerified, setPasswordVerified] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [joined, setJoined] = useState(false);
  const videoContainerRef = useRef(null);
  const dailyCallRef = useRef(null);

  useEffect(() => {
    loadSessionData();

    return () => {
      // Cleanup Daily.co call when component unmounts
      if (dailyCallRef.current) {
        cleanupDailyCall(dailyCallRef.current);
      }
    };
  }, [sessionId]);

  const loadSessionData = async () => {
    try {
      setLoading(true);
      const response = await videoSessionAPI.getById(sessionId);
      setSession(response.data.session);
      
      // If password is not enabled, mark as verified
      if (!response.data.session.password_enabled) {
        setPasswordVerified(true);
      }
      
      setError('');
    } catch (err) {
      console.error('Failed to load session:', err);
      setError('Failed to load session details');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyPassword = async (e) => {
    e.preventDefault();
    setVerifying(true);
    setError('');

    try {
      const response = await videoSessionAPI.verifyPassword(sessionId, password);
      if (response.data.verified) {
        setPasswordVerified(true);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Invalid password');
    } finally {
      setVerifying(false);
    }
  };

  const handleJoinSession = async () => {
    if (!session || !passwordVerified) return;

    try {
      setLoading(true);

      // Get Daily.co room URL
      const roomUrl = session.daily_room_url || getDailyRoomUrl(session);

      if (!session.daily_room_url) {
        setError('Daily.co room URL not available. Please contact support.');
        setLoading(false);
        return;
      }

      // Initialize Daily.co call
      const callFrame = initDailyCall(
        roomUrl,
        videoContainerRef.current,
        {
          displayName: userName
        }
      );

      dailyCallRef.current = callFrame;
      setJoined(true);

      // Listen for when user leaves
      callFrame.on('left-meeting', () => {
        if (onLeave) {
          onLeave();
        }
      });

      // Listen for errors
      callFrame.on('error', (error) => {
        console.error('Daily.co error:', error);
        setError('Video call error occurred');
      });

      setLoading(false);
    } catch (err) {
      console.error('Failed to join session:', err);
      setError('Failed to join video session');
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center">
          <Video className="h-12 w-12 text-primary-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error && !session) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="card max-w-md text-center">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          {onLeave && (
            <button onClick={onLeave} className="btn btn-secondary">
              Go Back
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  // Check if user can join (15 minutes before session)
  const canJoin = canJoinSession(session.session_date);
  const timeUntil = formatTimeUntilSession(session.session_date);

  // If already joined, show Daily.co container
  if (joined) {
    return (
      <div className="h-screen w-full bg-black">
        <div ref={videoContainerRef} className="h-full w-full" />
      </div>
    );
  }

  // If password required and not verified, show password form
  if (session.password_enabled && !passwordVerified) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
        <div className="card max-w-md w-full">
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
              <Lock className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Password Required</h2>
            <p className="text-gray-600">
              This video session is password protected. Please enter the password provided by your therapist.
            </p>
          </div>

          <div className="bg-primary-50 border border-primary-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-gray-900 mb-2">{session.title}</h3>
            <p className="text-sm text-gray-600">
              {new Date(session.session_date).toLocaleString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
            <p className="text-sm text-gray-600">Duration: {session.duration_minutes} minutes</p>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleVerifyPassword} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Session Password
              </label>
              <input
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter 6-digit password"
                required
                maxLength="6"
                className="w-full px-4 py-3 text-center text-2xl font-mono border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>

            <button
              type="submit"
              disabled={verifying || password.length !== 6}
              className="w-full btn btn-primary"
            >
              {verifying ? 'Verifying...' : 'Verify & Continue'}
            </button>
          </form>

          {onLeave && (
            <button onClick={onLeave} className="w-full btn btn-secondary mt-3">
              Cancel
            </button>
          )}
        </div>
      </div>
    );
  }

  // Show join screen
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="card max-w-2xl w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-100 rounded-full mb-4">
            <Video className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">{session.title}</h2>
          <p className="text-gray-600">with {session.partner_name}</p>
        </div>

        <div className="bg-primary-50 border border-primary-200 rounded-lg p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-600 mb-1">Date & Time</p>
              <p className="font-semibold text-gray-900">
                {new Date(session.session_date).toLocaleString('en-US', {
                  weekday: 'long',
                  month: 'long',
                  day: 'numeric',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </p>
            </div>
            <div>
              <p className="text-gray-600 mb-1">Duration</p>
              <p className="font-semibold text-gray-900">{session.duration_minutes} minutes</p>
            </div>
          </div>

          {session.notes && (
            <div className="mt-4 pt-4 border-t border-primary-200">
              <p className="text-gray-600 mb-1">Notes</p>
              <p className="text-gray-900">{session.notes}</p>
            </div>
          )}
        </div>

        {!canJoin ? (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-yellow-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Session not yet available</p>
                <p className="text-sm text-gray-600">
                  You can join 15 minutes before the session starts.
                </p>
                <p className="text-sm font-medium text-yellow-700 mt-1">
                  Starts in: {timeUntil}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <CheckCircle className="h-6 w-6 text-green-600 flex-shrink-0" />
              <div>
                <p className="font-semibold text-gray-900">Ready to join</p>
                <p className="text-sm text-gray-600">
                  Click the button below to join the video session.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleJoinSession}
            disabled={!canJoin || loading}
            className="w-full btn btn-primary flex items-center justify-center space-x-2 text-lg py-3"
          >
            <Video className="h-6 w-6" />
            <span>{loading ? 'Joining...' : 'Join Video Session'}</span>
          </button>

          {onLeave && (
            <button onClick={onLeave} className="w-full btn btn-secondary">
              Go Back
            </button>
          )}
        </div>

        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            Make sure your camera and microphone are working before joining.
            You may be prompted to allow access to your devices.
          </p>
        </div>
      </div>
    </div>
  );
};

export default VideoSessionJoin;

