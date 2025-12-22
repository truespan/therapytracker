import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  TrendingUp, Users, BarChart3, Database, Smartphone, FileText, 
  Calendar, Video, StickyNote, Send, MessageCircle, Mail, Phone,
  CheckCircle, ArrowRight, Sparkles, Shield
} from 'lucide-react';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { contactAPI } from '../services/api';

const Home = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState({ type: null, message: '' });
  const [submitting, setSubmitting] = useState(false);

  const scrollToContact = () => {
    const contactSection = document.getElementById('lets-talk');
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Sample data for chart visual
  const chartSampleData = [
    { field: 'Mental Clarity', value: 4 },
    { field: 'Emotions', value: 3.5 },
    { field: 'Relationships', value: 4.5 },
    { field: 'Physical Health', value: 3 },
    { field: 'Energy', value: 3.5 },
    { field: 'Sleep', value: 4 }
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormStatus({ type: null, message: '' });

    try {
      const response = await contactAPI.submit(formData);
      setFormStatus({ 
        type: 'success', 
        message: response.data.message || 'Thank you for contacting us! We will get back to you soon.' 
      });
      setFormData({ name: '', email: '', message: '' });
    } catch (error) {
      setFormStatus({ 
        type: 'error', 
        message: error.response?.data?.error || 'Failed to submit form. Please try again later.' 
      });
    } finally {
      setSubmitting(false);
    }
  };

  const features = [
    {
      icon: Users,
      title: 'Client Management',
      description: 'Manage all your clients in one unified platform with easy assignment, tracking, and profile management.',
      color: 'text-blue-600'
    },
    {
      icon: Database,
      title: 'Data Analysis & Storage',
      description: 'Secure, comprehensive data storage and analytics with PostgreSQL database for reliable session history tracking.',
      color: 'text-purple-600'
    },
    {
      icon: Smartphone,
      title: 'Mobile Access',
      description: 'Access your practice from any device, anywhere. Fully responsive design ensures seamless experience on mobile, tablet, and desktop.',
      color: 'text-green-600'
    },
    {
      icon: FileText,
      title: 'Industry Reports',
      description: 'Generate professional reports with industry-standard metrics and custom report templates for comprehensive client documentation.',
      color: 'text-orange-600'
    },
    {
      icon: BarChart3,
      title: 'Visual Communication',
      description: 'Share progress charts and graphs with clients to visualize therapy progress and improvements over time.',
      color: 'text-primary-600',
      hasVisual: true
    },
    {
      icon: Calendar,
      title: 'Calendar Integration',
      description: 'Sync with Google Calendar for seamless appointment management and automated scheduling.',
      color: 'text-red-600'
    },
    {
      icon: Video,
      title: 'Video Sessions',
      description: 'Conduct online therapy sessions with integrated video capabilities for remote client consultations.',
      color: 'text-indigo-600'
    },
    {
      icon: StickyNote,
      title: 'Session Notes',
      description: 'Document sessions with comprehensive note-taking system and maintain complete session history.',
      color: 'text-yellow-600'
    },
    {
      icon: Send,
      title: 'Report Delivery',
      description: 'Automatically send reports to clients via email with professional formatting and secure delivery.',
      color: 'text-pink-600'
    }
  ];

  const benefits = [
    { text: 'Better client management with centralized database' },
    { text: 'Improved data organization and analytics' },
    { text: 'Enhanced client communication through visual charts' },
    { text: 'Streamlined workflow with calendar integration' },
    { text: 'Professional reporting with industry standards' }
  ];

  return (
    <div className="min-h-screen">
      {/* Free Trial Banner */}
      <div className="py-3 px-4 sticky top-0 z-50 shadow-lg" style={{ backgroundColor: '#FFF4CC', color: '#5C3A00' }}>
        <div className="max-w-7xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            <span className="font-semibold text-sm sm:text-base">
              🧪 Beta Access — TherapTrack is currently in beta. Complimentary access for therapists until 31 Dec 2025. Phase 1 launch on 01 Jan 2026.
            </span>
          </div>
          <button
            onClick={scrollToContact}
            className="px-4 py-2 rounded-lg font-semibold transition text-sm sm:text-base flex items-center gap-2"
            style={{ backgroundColor: '#007a6d', color: 'white' }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#006157'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = '#007a6d'}
          >
            Start Free Trial
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-br from-primary-600 to-primary-800 text-white relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          {/* HIPAA Security Badge - positioned at top right under Start Free Trial button */}
          <div className="absolute top-6 right-6">
            <div className="group relative inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-help">
              {/* Simple, bright yellow shield - should be clearly visible */}
              <Shield className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium text-white">HIPAA-Aligned Security & Privacy</span>
              
              {/* Tooltip - positioned below the badge to avoid banner overlap */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none">
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
                </div>
                Designed using HIPAA-aligned security and privacy practices to help protect sensitive health information. Access is restricted to authorized users only.
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <div className="h-20 w-20 mx-auto mb-6 bg-white rounded-full flex items-center justify-center p-2">
              <img
                src="/TheraPTrackLogoBgRemoved.png"
                alt="TheraP Track Logo"
                className="h-full w-full object-contain"
              />
            </div>
            <h1 className="text-5xl font-bold mb-6">TheraP Track</h1>
            <p className="text-xl mb-8 text-primary-100 max-w-3xl mx-auto">
              Streamline your practice with comprehensive client management, data analytics, and professional reporting tools designed for modern therapy practices and effective client communication.
            </p>
            
            <div className="flex justify-center space-x-4 flex-wrap gap-4">
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

      {/* Key Features Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">Key Features</h2>
        <p className="text-center text-gray-600 mb-12 text-lg">
          Everything you need to manage your therapy practice effectively
        </p>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => {
            const IconComponent = feature.icon;
            return (
              <div 
                key={index}
                className="card text-center p-8 hover:shadow-xl transition-shadow duration-300 border-2 border-transparent hover:border-primary-200"
              >
                <div className={`${feature.color} mb-6 flex justify-center`}>
                  <IconComponent className="h-16 w-16" />
                </div>
                <h3 className="text-2xl font-semibold mb-4 text-gray-900">{feature.title}</h3>
                <p className="text-gray-600 mb-4 leading-relaxed">
                  {feature.description}
                </p>
                {feature.hasVisual && (
                  <div className="mt-6 bg-white rounded-lg p-4 border border-gray-200">
                    <ResponsiveContainer width="100%" height={250}>
                      <RechartsRadar data={chartSampleData}>
                        <PolarGrid stroke="#e5e7eb" />
                        <PolarAngleAxis 
                          dataKey="field" 
                          tick={{ fill: '#374151', fontSize: 10 }}
                          tickLine={false}
                        />
                        <PolarRadiusAxis
                          angle={90}
                          domain={[0, 5]}
                          tick={{ fill: '#6b7280', fontSize: 8 }}
                          tickCount={6}
                        />
                        <Radar
                          name="Progress"
                          dataKey="value"
                          stroke="#00897b"
                          fill="#00897b"
                          fillOpacity={0.3}
                          strokeWidth={2}
                        />
                      </RechartsRadar>
                    </ResponsiveContainer>
                    <p className="text-xs text-gray-500 mt-2">Example: Client Progress Visualization</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Benefits Section */}
      <div className="bg-gray-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">How This Helps You</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Transform your therapy practice with powerful management tools
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-start gap-3 bg-white p-6 rounded-lg shadow-sm">
                <CheckCircle className="h-6 w-6 text-primary-600 flex-shrink-0 mt-1" />
                <p className="text-gray-700">{benefit.text}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* How It Works */}
      <div className="bg-white py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-4xl font-bold text-center mb-4 text-gray-900">How It Works</h2>
          <p className="text-center text-gray-600 mb-12 text-lg">
            Get started in four simple steps
          </p>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                1
              </div>
              <h4 className="font-semibold mb-2 text-lg">Sign Up</h4>
              <p className="text-sm text-gray-600">Create your account as a user, therapist, or organization</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                2
              </div>
              <h4 className="font-semibold mb-2 text-lg">Initial Assessment</h4>
              <p className="text-sm text-gray-600">Complete your mind-body profile questionnaire</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                3
              </div>
              <h4 className="font-semibold mb-2 text-lg">Track Progress</h4>
              <p className="text-sm text-gray-600">Re-rate yourself after each therapy session</p>
            </div>
            <div className="text-center">
              <div className="bg-primary-600 text-white rounded-full h-16 w-16 flex items-center justify-center mx-auto mb-4 text-2xl font-bold shadow-lg">
                4
              </div>
              <h4 className="font-semibold mb-2 text-lg">Visualize Growth</h4>
              <p className="text-sm text-gray-600">See your progress on interactive charts</p>
            </div>
          </div>
        </div>
      </div>

      {/* Let's Talk Contact Form */}
      <div id="lets-talk" className="bg-gradient-to-br from-primary-50 to-primary-100 py-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-4 mb-6">
              <MessageCircle className="h-8 w-8 text-primary-600" />
              <Mail className="h-8 w-8 text-primary-600" />
              <Phone className="h-8 w-8 text-primary-600" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-gray-900">Get in touch to begin your free trial</h2>
            <p className="text-lg text-gray-600">
              We will get back to you within 24 hrs.
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl p-8">
            {formStatus.type && (
              <div className={`mb-6 p-4 rounded-lg ${
                formStatus.type === 'success' 
                  ? 'bg-green-50 text-green-800 border border-green-200' 
                  : 'bg-red-50 text-red-800 border border-red-200'
              }`}>
                {formStatus.message}
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows="5"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Tell us how we can help you..."
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                    Sending...
                  </>
                ) : (
                  <>
                    Contact Me
                    <Send className="h-5 w-5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-800 text-white py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <p className="mb-4">&copy; 2025 TheraP Track. All rights reserved.</p>
            <div className="flex justify-center space-x-6 text-sm">
              <Link 
                to="/privacy-policy" 
                className="text-gray-300 hover:text-white transition underline"
              >
                Privacy Policy
              </Link>
              <Link 
                to="/terms-of-service" 
                className="text-gray-300 hover:text-white transition underline"
              >
                Terms of Service
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
