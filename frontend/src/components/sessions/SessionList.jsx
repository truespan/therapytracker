import React from 'react';
import { formatDate } from '../../utils/chartHelpers';
import { Calendar, Star, MessageSquare, CheckCircle, Clock, Trash2 } from 'lucide-react';

const SessionList = ({ sessions, onSessionClick, onDeleteSession, canDelete = false }) => {
  if (!sessions || sessions.length === 0) {
    return (
      <div className="card text-center py-8 text-gray-500">
        <Clock className="h-12 w-12 mx-auto mb-3 text-gray-400" />
        <p>No sessions yet</p>
        <p className="text-sm mt-2">Your therapy sessions will appear here</p>
      </div>
    );
  }

  const renderStars = (rating) => {
    return (
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? 'text-yellow-400 fill-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          onClick={() => onSessionClick && onSessionClick(session)}
          className={`card hover:shadow-lg transition cursor-pointer ${
            session.completed ? 'border-l-4 border-green-500' : 'border-l-4 border-yellow-500'
          }`}
        >
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center space-x-3 mb-2">
                <h4 className="font-semibold text-gray-900">
                  Session {session.session_number}
                </h4>
                {session.completed ? (
                  <span className="flex items-center text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Completed
                  </span>
                ) : (
                  <span className="flex items-center text-xs text-yellow-600 bg-yellow-50 px-2 py-1 rounded">
                    <Clock className="h-3 w-3 mr-1" />
                    In Progress
                  </span>
                )}
              </div>
              
              <div className="flex items-center text-sm text-gray-600 mb-2">
                <Calendar className="h-4 w-4 mr-1" />
                {formatDate(session.session_date)}
              </div>

              {session.partner_name && (
                <p className="text-sm text-gray-600 mb-2">
                  with <span className="font-medium">{session.partner_name}</span>
                </p>
              )}

              {session.rating && (
                <div className="flex items-center space-x-2 mb-2">
                  {renderStars(session.rating)}
                </div>
              )}

              {session.feedback_text && (
                <div className="flex items-start text-sm text-gray-700 mt-2">
                  <MessageSquare className="h-4 w-4 mr-2 mt-0.5 flex-shrink-0 text-gray-400" />
                  <p className="line-clamp-2">{session.feedback_text}</p>
                </div>
              )}
            </div>
            
            {/* Delete Button - Only for in-progress sessions */}
            {!session.completed && canDelete && onDeleteSession && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSession(session.id);
                }}
                className="text-red-600 hover:text-red-800 hover:bg-red-50 p-2 rounded transition ml-2"
                title="Delete Session"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SessionList;

