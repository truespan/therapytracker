import React from 'react';
import { Link } from 'react-router-dom';
import { TrendingUp, Users, BarChart3 } from 'lucide-react';

const Home = () => {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <div className="text-center">
            <div className="h-20 w-20 mx-auto mb-6 bg-white rounded-full flex items-center justify-center p-2">
              <img
                src="/TheraPTrackLogoBgRemoved.png"
                alt="Therapy Tracker Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-5xl font-bold mb-6">Therapy Tracker</h1>
            <p className="text-xl mb-8 text-primary-100">
              Track your therapy progress with visual mind-body maps
            </p>
            <div className="flex justify-center space-x-4">
              <Link to="/signup" className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-primary-50 transition">
                Get Started
              </Link>
              <Link to="/login" className="bg-primary-700 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-600 transition">
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">Key Features</h2>
        <div className="grid md:grid-cols-3 gap-8">
          <div className="card text-center">
            <BarChart3 className="h-12 w-12 mx-auto mb-4 text-primary-600" />
            <h3 className="text-xl font-semibold mb-3">Visual Progress Tracking</h3>
            <p className="text-gray-600">
              Monitor your therapy progress with interactive radar charts showing your mind-body profile across sessions.
            </p>
          </div>
          
          <div className="card text-center">
            <TrendingUp className="h-12 w-12 mx-auto mb-4 text-primary-600" />
            <h3 className="text-xl font-semibold mb-3">Session-by-Session Analysis</h3>
            <p className="text-gray-600">
              Compare your ratings over time to see improvements in mental clarity, relationships, and physical health.
            </p>
          </div>
          
          <div className="card text-center">
            <Users className="h-12 w-12 mx-auto mb-4 text-primary-600" />
            <h3 className="text-xl font-semibold mb-3">Multi-Role Support</h3>
            <p className="text-gray-600">
              Designed for users, therapists, and organizations with role-based dashboards and access control.
            </p>
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-gray-100 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12 text-gray-900">How It Works</h2>
          <div className="grid md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">1</div>
              <h4 className="font-semibold mb-2">Sign Up</h4>
              <p className="text-sm text-gray-600">Create your account as a user, therapist, or organization</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">2</div>
              <h4 className="font-semibold mb-2">Initial Assessment</h4>
              <p className="text-sm text-gray-600">Complete your mind-body profile questionnaire</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">3</div>
              <h4 className="font-semibold mb-2">Track Progress</h4>
              <p className="text-sm text-gray-600">Re-rate yourself after each therapy session</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-12 w-12 flex items-center justify-center mx-auto mb-4 text-xl font-bold">4</div>
              <h4 className="font-semibold mb-2">Visualize Growth</h4>
              <p className="text-sm text-gray-600">See your progress on interactive charts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p>&copy; 2024 Therapy Tracker. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default Home;

