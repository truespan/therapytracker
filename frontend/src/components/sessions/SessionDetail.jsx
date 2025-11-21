import React, { useState, useEffect } from 'react';
import { sessionAPI } from '../../services/api';
import { formatDate } from '../../utils/chartHelpers';
import { Calendar, User, Star, MessageSquare, ArrowLeft, ChevronDown, ChevronRight, FileText } from 'lucide-react';

const SessionDetail = ({ sessionId, onBack }) => {
  const [session, setSession] = useState(null);
  const [profileData, setProfileData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isMainIssueExpanded, setIsMainIssueExpanded] = useState(false);

  useEffect(() => {
    loadSessionDetail();
  }, [sessionId]);

  const loadSessionDetail = async () => {
    try {
      const response = await sessionAPI.getById(sessionId);
      setSession(response.data.session);
      setProfileData(response.data.profileData || []);
      setLoading(false);
    } catch (err) {
      setError('Failed to load session details');
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading session details...</div>;
  }

  if (error || !session) {
    return (
      <div className="card text-center py-8 text-red-600">
        {error || 'Session not found'}
      </div>
    );
  }

  const renderStars = (rating) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-5 w-5 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <button
        onClick={onBack}
        className="btn btn-secondary flex items-center space-x-2"
      >
        <ArrowLeft className="h-4 w-4" />
        <span>Back to Sessions</span>
      </button>

      <div className="card">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Session {session.session_number}
        </h2>

        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center space-x-2 text-gray-700">
            <Calendar className="h-5 w-5 text-gray-400" />
            <span>{formatDate(session.session_date)}</span>
          </div>

          {session.partner_name && (
            <div className="flex items-center space-x-2 text-gray-700">
              <User className="h-5 w-5 text-gray-400" />
              <span>{session.partner_name}</span>
            </div>
          )}
        </div>

        {/* Main Issue - Collapsible */}
        {session.main_issue && (
          <div className="mb-6 border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setIsMainIssueExpanded(!isMainIssueExpanded)}
              className="w-full px-4 py-3 bg-gray-50 hover:bg-gray-100 transition flex items-center justify-between"
            >
              <div className="flex items-center space-x-2">
                {isMainIssueExpanded ? (
                  <ChevronDown className="h-5 w-5 text-gray-600" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-gray-600" />
                )}
                <FileText className="h-4 w-4 text-gray-600" />
                <span className="font-medium text-gray-900">Key Issues Described</span>
              </div>
            </button>
            {isMainIssueExpanded && (
              <div className="px-4 py-3 bg-white border-t border-gray-200">
                <p className="text-gray-700 whitespace-pre-wrap">{session.main_issue}</p>
              </div>
            )}
          </div>
        )}

        {session.rating && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2">Session Rating</h3>
            {renderStars(session.rating)}
          </div>
        )}

        {session.feedback_text && (
          <div className="mb-6">
            <h3 className="text-sm font-medium text-gray-700 mb-2 flex items-center">
              <MessageSquare className="h-4 w-4 mr-2" />
              Feedback
            </h3>
            <p className="text-gray-800">{session.feedback_text}</p>
          </div>
        )}
      </div>

      {profileData.length > 0 && (
        <div className="card">
          <h3 className="text-lg font-semibold mb-4">Profile Assessment</h3>
          <div className="grid md:grid-cols-2 gap-4">
            {profileData.map((item) => (
              <div key={item.field_id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-gray-700 font-medium">{item.field_name}</span>
                <span className="text-primary-600 font-semibold">{item.rating_value}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default SessionDetail;

