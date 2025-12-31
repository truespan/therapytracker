import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { GoogleLogin } from '@react-oauth/google';
import { useAuth } from '../context/AuthContext';
import { 
  TrendingUp, Users, BarChart3, Database, Smartphone, FileText, 
  Calendar, Video, StickyNote, Send, MessageCircle, Mail, Phone,
  CheckCircle, ArrowRight, Sparkles, Shield, Menu, X, Lock, Eye, EyeOff,
  AlertCircle, BookOpen, Newspaper, ChevronRight, ArrowUp
} from 'lucide-react';
import { Radar, RadarChart as RechartsRadar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { contactAPI } from '../services/api';
import { getResponsiveCloudinaryUrls, BACKGROUND_IMAGES } from '../utils/cloudinary';

const Home = () => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [formStatus, setFormStatus] = useState({ type: null, message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSection, setActiveSection] = useState('');
  const isScrollingRef = useRef(false);
  const [showScrollToTop, setShowScrollToTop] = useState(false);
  
  // Login form state
  const [loginFormData, setLoginFormData] = useState({
    email: '',
    password: '',
  });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const { login, googleLogin } = useAuth();
  const navigate = useNavigate();

  // Responsive background images state
  const [backgroundImages, setBackgroundImages] = useState({
    hero: '',
    about: '',
    howItWorks: '',
    blogs: '',
    login: ''
  });

  // Lazy loading state - track which images should be loaded
  const [imagesToLoad, setImagesToLoad] = useState({
    hero: true,        // Load hero immediately (above the fold)
    about: false,      // Lazy load
    howItWorks: false, // Lazy load
    blogs: false,      // Lazy load
    login: false       // Lazy load
  });

  const scrollToSection = (sectionId) => {
    const section = document.getElementById(sectionId);
    if (section) {
      isScrollingRef.current = true;
      section.scrollIntoView({ behavior: 'smooth', block: 'start' });
      setMobileMenuOpen(false);
      // Reset the flag after scroll animation completes
      setTimeout(() => {
        isScrollingRef.current = false;
      }, 1000);
    }
  };

  const scrollToTop = () => {
    isScrollingRef.current = true;
    window.scrollTo({ top: 0, behavior: 'smooth' });
    // Reset the flag and update FAB visibility after scroll animation completes
    setTimeout(() => {
      isScrollingRef.current = false;
      // Force update FAB visibility after scroll completes
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;
      setShowScrollToTop(scrollPosition > viewportHeight * 1.5);
    }, 1000);
  };

  // Update FAB visibility based on scroll position (always runs, even during programmatic scrolling)
  useEffect(() => {
    const handleScrollForFAB = () => {
      const scrollPosition = window.scrollY;
      const viewportHeight = window.innerHeight;
      // Show scroll-to-top button after scrolling ~1-2 viewport heights
      setShowScrollToTop(scrollPosition > viewportHeight * 1.5);
    };

    // Set initial state
    handleScrollForFAB();

    window.addEventListener('scroll', handleScrollForFAB, { passive: true });
    return () => window.removeEventListener('scroll', handleScrollForFAB);
  }, []);

  // Detect active section based on scroll position
  useEffect(() => {
    const sections = ['about-us', 'how-it-works', 'blogs-news', 'login', 'lets-talk'];
    
    const handleScroll = () => {
      // Don't update active section if we're programmatically scrolling
      if (isScrollingRef.current) return;

      const scrollPosition = window.scrollY;
      const offset = 250; // Offset for navbar and sticky header (60px banner + 80px nav + padding)
      
      // Find the section that's currently in view
      let currentSection = '';
      
      // Check sections from bottom to top to find the one we've scrolled past
      for (let i = sections.length - 1; i >= 0; i--) {
        const section = document.getElementById(sections[i]);
        if (section) {
          const sectionTop = section.offsetTop;
          
          // If we've scrolled past the start of this section (accounting for offset)
          if (scrollPosition + offset >= sectionTop) {
            currentSection = sections[i];
            break;
          }
        }
      }
      
      // Update active section
      setActiveSection(prev => prev !== currentSection ? currentSection : prev);
    };

    // Set initial active section
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Update background images based on screen size for responsive loading
  // Only loads images that are marked for loading (lazy loading)
  useEffect(() => {
    const updateBackgrounds = () => {
      const width = window.innerWidth;
      let size = 'desktop';
      
      if (width <= 768) {
        size = 'mobile';
      } else if (width <= 1280) {
        size = 'tablet';
      }

      // Get responsive URLs for each background image
      const heroUrls = getResponsiveCloudinaryUrls(BACKGROUND_IMAGES.backgroundImg2);
      const img1Urls = getResponsiveCloudinaryUrls(BACKGROUND_IMAGES.backgroundImg1);
      const img3Urls = getResponsiveCloudinaryUrls(BACKGROUND_IMAGES.backgroundImg3);
      const img4Urls = getResponsiveCloudinaryUrls(BACKGROUND_IMAGES.backgroundImg4);
      const img5Urls = getResponsiveCloudinaryUrls(BACKGROUND_IMAGES.backgroundImg5);
      const img6Urls = getResponsiveCloudinaryUrls(BACKGROUND_IMAGES.backgroundImg6);

      setBackgroundImages(prev => ({
        hero: imagesToLoad.hero ? heroUrls[size] : prev.hero,
        about: imagesToLoad.about ? img3Urls[size] : prev.about,
        howItWorks: imagesToLoad.howItWorks ? img6Urls[size] : prev.howItWorks,
        blogs: imagesToLoad.blogs ? img4Urls[size] : prev.blogs,
        login: imagesToLoad.login ? img5Urls[size] : prev.login
      }));
    };

    // Set initial backgrounds (only for images that should be loaded)
    updateBackgrounds();

    // Update on window resize
    window.addEventListener('resize', updateBackgrounds);
    return () => window.removeEventListener('resize', updateBackgrounds);
  }, [imagesToLoad]);

  // Lazy load background images using Intersection Observer
  useEffect(() => {
    // Hero image loads immediately, so skip it
    const lazyLoadSections = [
      { sectionId: 'about-us', imageKey: 'about' },
      { sectionId: 'how-it-works', imageKey: 'howItWorks' },
      { sectionId: 'blogs-news', imageKey: 'blogs' },
      { sectionId: 'login', imageKey: 'login' }
    ];

    const observers = [];

    lazyLoadSections.forEach(({ sectionId, imageKey }) => {
      const section = document.getElementById(sectionId);
      if (!section) return;

      const observer = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            // When section comes into view (with 200px margin for preloading)
            if (entry.isIntersecting) {
              setImagesToLoad(prev => ({
                ...prev,
                [imageKey]: true
              }));
              // Disconnect observer after loading to prevent unnecessary checks
              observer.disconnect();
            }
          });
        },
        {
          rootMargin: '200px', // Start loading 200px before section comes into view
          threshold: 0.01 // Trigger when even 1% of section is visible
        }
      );

      observer.observe(section);
      observers.push(observer);
    });

    // Cleanup: disconnect all observers on unmount
    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, []);

  // Sample data for chart visual
  const chartSampleData = [
    { field: 'Mental Clarity', value: 4 },
    { field: 'Emotions', value: 3.5 },
    { field: 'Relationships', value: 4.5 },
    { field: 'Physical Health', value: 3 },
    { field: 'Energy', value: 3.5 },
    { field: 'Sleep', value: 4 }
  ];

  const handleContactSubmit = async (e) => {
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

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoginLoading(true);

    const trimmedData = {
      email: loginFormData.email.trim(),
      password: loginFormData.password,
    };

    const result = await login(trimmedData);

    if (result.success) {
      if (result.user.userType === 'admin') {
        navigate('/admin');
      } else {
        navigate(`/${result.user.userType}/dashboard`);
      }
    } else {
      setLoginError(result.error);
    }

    setLoginLoading(false);
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setLoginError('');
    setLoginLoading(true);

    try {
      const result = await googleLogin(credentialResponse.credential);

      if (result.success) {
        if (result.user.userType === 'admin') {
          navigate('/admin');
        } else {
          navigate(`/${result.user.userType}/dashboard`);
        }
      } else {
        if (result.details?.error === 'Additional information required') {
          navigate('/signup', {
            state: {
              googleUser: result.details.googleUser,
              message: 'Please complete the signup form to create your account'
            }
          });
        } else {
          setLoginError(result.error || 'Google login failed');
        }
      }
    } catch (err) {
      setLoginError('An unexpected error occurred during Google login');
      console.error('Google login error:', err);
    } finally {
      setLoginLoading(false);
    }
  };

  const handleGoogleError = () => {
    setLoginError('Google login failed. Please try again.');
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

  // Sample blog posts for Blogs & News section
  const blogPosts = [
    {
      id: 1,
      title: 'The Future of Therapy Practice Management',
      excerpt: 'Discover how modern technology is transforming therapy practices and improving patient care.',
      date: 'January 15, 2025',
      category: 'Technology'
    },
    {
      id: 2,
      title: 'Understanding Progress Visualization in Therapy',
      excerpt: 'Learn how visual charts and graphs can enhance client understanding and engagement.',
      date: 'January 10, 2025',
      category: 'Clinical'
    },
    {
      id: 3,
      title: 'Best Practices for Secure Client Data Management',
      excerpt: 'Essential guidelines for maintaining HIPAA compliance in digital therapy platforms.',
      date: 'January 5, 2025',
      category: 'Security'
    }
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
            onClick={() => scrollToSection('lets-talk')}
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

      {/* Navigation Bar */}
      <nav className="sticky top-[60px] left-0 right-0 z-40 bg-white/95 dark:bg-dark-bg-primary/95 backdrop-blur-md shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-3">
              <div className="h-12 w-12 bg-white rounded-full flex items-center justify-center p-2 shadow-md">
                <img
                  src="/TheraPTrackLogoBgRemoved.png"
                  alt="TheraP Track Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <span className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">
                TheraP Track
              </span>
            </Link>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center space-x-8">
              <button
                onClick={() => scrollToSection('about-us')}
                className={`font-medium transition-colors ${
                  activeSection === 'about-us'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className={`font-medium transition-colors ${
                  activeSection === 'how-it-works'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('blogs-news')}
                className={`font-medium transition-colors ${
                  activeSection === 'blogs-news'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                Blogs & News
              </button>
              <button
                onClick={() => scrollToSection('login')}
                className={`font-medium transition-colors ${
                  activeSection === 'login'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                Login
              </button>
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden text-gray-700 dark:text-dark-text-primary"
            >
              {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="md:hidden pb-4 space-y-3">
              <button
                onClick={() => scrollToSection('about-us')}
                className={`block w-full text-left font-medium py-2 ${
                  activeSection === 'about-us'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                About Us
              </button>
              <button
                onClick={() => scrollToSection('how-it-works')}
                className={`block w-full text-left font-medium py-2 ${
                  activeSection === 'how-it-works'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                How It Works
              </button>
              <button
                onClick={() => scrollToSection('blogs-news')}
                className={`block w-full text-left font-medium py-2 ${
                  activeSection === 'blogs-news'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                Blogs & News
              </button>
              <button
                onClick={() => scrollToSection('login')}
                className={`block w-full text-left font-medium py-2 ${
                  activeSection === 'login'
                    ? 'text-primary-600 dark:text-dark-primary-500'
                    : 'text-gray-700 dark:text-dark-text-secondary hover:text-primary-600 dark:hover:text-dark-primary-500'
                }`}
              >
                Login
              </button>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center justify-center pt-24 overflow-hidden">
        {/* Modern Gradient Background with Pattern */}

          <div 
            className="absolute inset-0 bg-cover bg-center bg-no-repeat"
            style={{
              backgroundImage: imagesToLoad.hero && backgroundImages.hero 
                ? `url('${backgroundImages.hero}')` 
                : imagesToLoad.hero 
                  ? `url('/backgroundImg2.webp')` 
                  : 'none'
            }}
          ></div>

        {/* Dark overlay */}
        <div className="absolute inset-0 bg-black/60"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          {/* HIPAA Security Badge */}
          <div className="absolute top-6 right-6 hidden lg:block">
            <div className="group relative inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20 hover:bg-white/20 transition-all duration-300 cursor-help">
              <Shield className="h-5 w-5 text-yellow-300" />
              <span className="text-sm font-medium text-white">HIPAA-Aligned Security & Privacy</span>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 w-80 p-3 bg-gray-900 text-white text-sm rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-50 pointer-events-none">
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 -mb-1">
                  <div className="w-0 h-0 border-l-8 border-r-8 border-b-8 border-transparent border-b-gray-900"></div>
                </div>
                Designed using HIPAA-aligned security and privacy practices to help protect sensitive health information. Access is restricted to authorized users only.
              </div>
            </div>
          </div>

          <div className="h-24 w-24 mx-auto mb-8 bg-white rounded-full flex items-center justify-center p-3 shadow-2xl">
            <img
              src="/TheraPTrackLogoBgRemoved.png"
              alt="TheraP Track Logo"
              className="h-full w-full object-contain"
            />
          </div>
          
          <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            TheraP Track
          </h1>
          <p className="text-xl md:text-2xl mb-10 text-primary-100 max-w-3xl mx-auto leading-relaxed">
            Streamline your practice with comprehensive client management, data analytics, and professional reporting tools designed for modern therapy practices and effective client communication.
          </p>
          
          <div className="flex justify-center flex-wrap gap-4">
            <button
              onClick={() => scrollToSection('how-it-works')}
              className="bg-primary-700 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-primary-600 transition border-2 border-white/20 shadow-lg hover:shadow-xl"
            >
              Learn More
            </button>
          </div>
        </div>

        {/* Scroll Indicator */}
        <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce">
          <ArrowRight className="h-6 w-6 text-white rotate-90" />
        </div>
      </section>

      {/* About Us Section */}
      <section id="about-us" className="py-24 relative scroll-mt-28">
        {/* Subtle background image - transitioning from dark Hero */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-30"
          style={{
            backgroundImage: imagesToLoad.about && backgroundImages.about 
              ? `url('${backgroundImages.about}')` 
              : imagesToLoad.about 
                ? `url('/backgroundImg3.webp')` 
                : 'none'
          }}
        ></div>
        {/* Light overlay to ensure readability */}
        <div className="absolute inset-0 bg-white/10 dark:bg-dark-bg-primary/60"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              About Us
            </h2>
            <div className="w-24 h-1 bg-primary-600 dark:bg-dark-primary-600 mx-auto mb-6"></div>
          </div>

          {/* About Us Content */}
          <div className="max-w-4xl mx-auto space-y-12">
            {/* Main Description */}
            <div className="space-y-4">
              <p className="text-lg text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                TheraP Track is exclusively designed for therapists to manage appointments, sessions, assessments with automatic scoring, and visual tracking of client progress. The idea originated when an IT professional met a therapist, and together they identified the challenges therapists face with administrative tasks and fragmented tools during sessions.
              </p>
              <p className="text-lg text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                TheraP Track provides technical support to therapists without replacing them. The platform is built solely for therapists, with a deep understanding of clinical practice, respect for professional judgment, and adherence to ethical boundaries.
              </p>
              <p className="text-lg text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                After a successful one-month Beta phase, TheraP Track was further developed by integrating feedback, insights, and ethically approved features from practicing therapists, creating a platform that streamlines clinical practice responsibly and effectively.
              </p>
            </div>

            {/* Mission and Vision Section */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Mission */}
              <div className="p-6 bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md border-t-4 border-primary-600 dark:border-dark-primary-600">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                  Our Mission
                </h3>
                <p className="text-lg text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                  To empower therapists in providing effective care by reducing their administrative burden during and around clinical sessions.
                </p>
              </div>

              {/* Vision */}
              <div className="p-6 bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md border-t-4 border-primary-600 dark:border-dark-primary-600">
                <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                  Our Vision
                </h3>
                <p className="text-lg text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                  To build a Therapist-first, trusted digital platform where therapists are empowered with ethical, professional and intuitive technology that enhances their clinical practice.
                </p>
              </div>
            </div>

            {/* Why We Exist Section */}
            <div className="space-y-6">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-dark-text-primary">
                Why We Exist
              </h3>
              
              <div className="space-y-4">
                <h4 className="text-xl font-semibold text-gray-800 dark:text-dark-text-primary">
                  Key Challenges Therapists Face:
                </h4>
                
                <ul className="space-y-3 list-disc list-inside text-gray-700 dark:text-dark-text-secondary">
                  <li className="text-lg leading-relaxed">
                    <span className="font-medium">Time-consuming administrative tasks:</span> Managing appointments, session notes, assessments, visual progress tracking take significant time
                  </li>
                  <li className="text-lg leading-relaxed">
                    <span className="font-medium">Missed Appointments:</span> No easy way to share the availability with clients or send reminders for upcoming sessions
                  </li>
                  <li className="text-lg leading-relaxed">
                    <span className="font-medium">Struggling with Multiple Tools:</span> Facing struggle in handling multiple tools and papers for one session, making workflow cumbersome
                  </li>
                </ul>
              </div>

              <div className="mt-6 p-6 bg-primary-50 dark:bg-dark-bg-secondary rounded-lg border-l-4 border-primary-600 dark:border-dark-primary-600">
                <p className="text-lg text-gray-700 dark:text-dark-text-secondary leading-relaxed">
                  TheraP Track combines appointment scheduling, session notes, assessments, and visual progress tracking into a single platform, simplifying therapy management. It replaces multiple tools with one organized workspace – allows therapists to focus more on clinical practice while maintaining professional and ethical standard.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section - Current Homepage Content */}
      <section id="how-it-works" className="py-24 relative scroll-mt-28">
        {/* Subtle background image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-30"
          style={{
            backgroundImage: imagesToLoad.howItWorks && backgroundImages.howItWorks 
              ? `url('${backgroundImages.howItWorks}')` 
              : imagesToLoad.howItWorks 
                ? `url('/backgroundImg6.webp')` 
                : 'none'
          }}
        ></div>
        {/* Light overlay to ensure readability */}
        <div className="absolute inset-0 bg-white/10 dark:bg-dark-bg-primary/60"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              How It Works
            </h2>
            <div className="w-24 h-1 bg-primary-600 dark:bg-dark-primary-600 mx-auto mb-6"></div>
          </div>

          {/* Main Features */}
          <div className="grid md:grid-cols-2 gap-8 mb-16">
            {/* Smart Scheduling and Availability */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Smart Scheduling and Availability
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Streamline your practice with professionalism and clarity. Create your availability session slots for a week and publish for client view. This will allow clients to book sessions as per your schedule, which reduces manual back-and-forth communication.
              </p>
            </div>

            {/* Appointments, Sessions, and Two-way Reminders */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Appointments, Sessions, and Two-way Reminders
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Practice seamlessly with structured visualization of appointments and sessions inside the tool. Get session reminders synced through Google Calendar, and appointment reminders synced through WhatsApp notification - both for Therapists and clients. A two-way reminder system allows therapists to be more professional, organized, and timely, respecting professional boundaries and privacy.
              </p>
            </div>

            {/* Automatically Generated Links for Online Session */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Automatically Generated Links for Online Session
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                To save the time of Therapists in admin work and avoid manual conversations, a Google Meet link will be automatically created and sent to both Therapists and Clients for online sessions.
              </p>
            </div>

            {/* Record Session Notes */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Record Session Notes
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Record and organize session notes (ex., CH and MSE for Psychologists) in one single platform during the session, no need to change tabs, and write in paper and pencil. It supports professional documentation practices of all of your clients in one place, respecting professional judgement, confidentiality, and HIPAA-aligned security.
              </p>
            </div>

            {/* Secure Document Access */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Secure Document Access
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Attach past reports, prescriptions, and referrals of the clients through a Google Drive link in a single platform. It helps to organize and keep the records without duplicating or misplacing the important, sensitive documents.
              </p>
            </div>

            {/* Assessment and Automated Scoring */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Assessment and Automated Scoring
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Administer questionnaires with automatic scoring support (both direct and reverse scoring) to your clients - designed to assist therapists in recording the data and scoring while leaving interpretation and professional judgements entirely with the therapists.
              </p>
            </div>

            {/* Visual Progress Tracking */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Visual Progress Tracking
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Visualize your clients' progress with comparison charts, line graphs, or bar graphs that bring assessment data from respective sessions over time.
              </p>
            </div>

            {/* Report and Documentation */}
            <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md hover:shadow-xl transition-shadow">
              <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
                Report and Documentation
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                Develop reports or prescriptions with customized templates and share with the clients over a single platform.
              </p>
            </div>
          </div>

          {/* Other Features */}
          <div className="bg-white dark:bg-dark-bg-tertiary p-8 rounded-lg shadow-md">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary mb-6">
              Other Features
            </h3>
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  Payment Integration:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  Collect session fees directly through the TheraP Track platform. Accept advance payments (any percentage of the session fee) to reduce no-shows after appointments and to maintain clarity about the fees.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  Dark Theme:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  Dark theme is designed to reduce eye strain and help therapists continue extended clinical hours.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  All Device Friendly Platform:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  Use TheraP Track from any devices (Mobile, Laptop, PC, Tablet, Mac, iPhone) from anywhere as per your convenient.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  Custom Branding:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  The Custom Branding feature is included to add more professionalism to your therapy practice.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  Blogs and News:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  Write your daily blogs, insights, and news for your patients.
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  Priority Chat Support:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  Get help from TheraP Track technical team within 24 hours
                </p>
              </div>
              <div>
                <h4 className="font-semibold text-lg text-gray-900 dark:text-dark-text-primary mb-2">
                  Privacy is the Key:
                </h4>
                <p className="text-gray-600 dark:text-dark-text-secondary leading-relaxed">
                  TheraP Track aligns with HIPAA guidelines, provides a platform to record sensitive data respecting professional boundaries and ethics.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Blogs & News Section */}
      <section id="blogs-news" className="py-24 relative scroll-mt-28">
        {/* Background pattern */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-70 dark:opacity-70"
          style={{
            backgroundImage: imagesToLoad.blogs && backgroundImages.blogs 
              ? `url('${backgroundImages.blogs}')` 
              : imagesToLoad.blogs 
                ? `url('/backgroundImg4.webp')` 
                : 'none'
          }}
        ></div>
        {/* Overlay to ensure text readability */}
        <div className="absolute inset-0 bg-white/20 dark:bg-dark-bg-primary/60"></div>
        
        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              Blogs & News
            </h2>
            <div className="w-24 h-1 bg-primary-600 dark:bg-dark-primary-600 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 dark:text-dark-text-secondary max-w-2xl mx-auto">
              Stay updated with the latest insights, tips, and news from the therapy world
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {blogPosts.map((post) => (
              <article
                key={post.id}
                className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
              >
                <div className="h-48 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-dark-bg-secondary dark:to-dark-bg-primary flex items-center justify-center">
                  <Newspaper className="h-16 w-16 text-primary-600 dark:text-dark-primary-500" />
                </div>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-primary-600 dark:text-dark-primary-500 uppercase tracking-wide">
                      {post.category}
                    </span>
                    <span className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                      {post.date}
                    </span>
                  </div>
                  <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary mb-3 group-hover:text-primary-600 dark:group-hover:text-dark-primary-500 transition-colors">
                    {post.title}
                  </h3>
                  <p className="text-gray-600 dark:text-dark-text-secondary mb-4 line-clamp-3">
                    {post.excerpt}
                  </p>
                  <button className="flex items-center text-primary-600 dark:text-dark-primary-500 font-medium hover:text-primary-700 dark:hover:text-dark-primary-400 transition-colors">
                    Read More
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </button>
                </div>
              </article>
            ))}
          </div>

          <div className="text-center mt-12">
            <button className="bg-primary-600 dark:bg-dark-primary-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition">
              View All Posts
            </button>
          </div>
        </div>
      </section>

      {/* Login Section */}
      <section id="login" className="py-24 relative scroll-mt-28">
        {/* Background image - transitioning from Blogs section */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-40 dark:opacity-30"
          style={{
            backgroundImage: imagesToLoad.login && backgroundImages.login 
              ? `url('${backgroundImages.login}')` 
              : imagesToLoad.login 
                ? `url('/backgroundImg5.webp')` 
                : 'none'
          }}
        ></div>
        {/* Gradient overlay matching current style but with image underneath */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary-50/60 via-primary-100/50 to-primary-50/60 dark:from-dark-bg-secondary/60 dark:via-dark-bg-primary/50 dark:to-dark-bg-secondary/60"></div>
        
        <div className="relative z-10 max-w-md mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8">
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-dark-text-primary mb-4">
              Login
            </h2>
            <div className="w-24 h-1 bg-primary-600 dark:bg-dark-primary-600 mx-auto mb-6"></div>
            <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
              Sign in to access your account
            </p>
          </div>

          <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl p-6 md:p-8">
            <div className="text-center mb-6">
              <div className="h-14 w-14 mx-auto bg-white rounded-full flex items-center justify-center p-2 shadow-md mb-3">
                <img
                  src="/TheraPTrackLogoBgRemoved.png"
                  alt="TheraP Track Logo"
                  className="h-full w-full object-contain"
                />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-dark-text-primary">Welcome Back</h3>
              <p className="text-gray-600 dark:text-dark-text-secondary mt-1 text-sm">Sign in to your account</p>
            </div>

            {loginError && (
              <div className="mb-4 p-3 bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 rounded-lg flex items-center space-x-2 text-error-700 dark:text-error-300">
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
                <span className="text-sm">{loginError}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-5">
              <div>
                <label className="label">
                  <Mail className="inline h-4 w-4 mr-1" />
                  Email or Phone Number
                </label>
                <input
                  type="text"
                  name="email"
                  value={loginFormData.email}
                  onChange={(e) => setLoginFormData({ ...loginFormData, email: e.target.value })}
                  className="input"
                  placeholder="email@example.com or 9876543210"
                  required
                />
                <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
                  Enter phone number without country code (e.g., 9876543210)
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="label mb-0">
                    <Lock className="inline h-4 w-4 mr-1" />
                    Password
                  </label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary-600 dark:text-dark-primary-500 hover:text-primary-700 dark:hover:text-dark-primary-400 font-medium"
                  >
                    Forgot Password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    name="password"
                    value={loginFormData.password}
                    onChange={(e) => setLoginFormData({ ...loginFormData, password: e.target.value })}
                    className="input pr-10"
                    placeholder="••••••••"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-dark-text-tertiary hover:text-gray-700 dark:hover:text-dark-text-secondary"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loginLoading}
                className="w-full btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loginLoading ? 'Signing in...' : 'Sign In'}
              </button>
            </form>

            <div className="mt-5">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-dark-border"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-dark-bg-tertiary text-gray-500 dark:text-dark-text-tertiary">Or continue with</span>
                </div>
              </div>

              <div className="mt-3 flex justify-center">
                <GoogleLogin
                  onSuccess={handleGoogleSuccess}
                  onError={handleGoogleError}
                  theme="outline"
                  size="large"
                  text="signin_with"
                  shape="rectangular"
                  width={320}
                />
              </div>
            </div>

            <div className="mt-5 text-center space-y-2">
              <div className="pt-3 border-t border-gray-200 dark:border-dark-border">
                <p className="text-xs text-gray-500 dark:text-dark-text-tertiary">
                  Admin users should login with their admin credentials
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section (Let's Talk) */}
      <section id="lets-talk" className="py-24 bg-gradient-to-br from-primary-50 to-primary-100 dark:from-dark-bg-secondary dark:to-dark-bg-primary scroll-mt-28">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-4 mb-6">
              <MessageCircle className="h-8 w-8 text-primary-600 dark:text-dark-primary-500" />
              <Mail className="h-8 w-8 text-primary-600 dark:text-dark-primary-500" />
              <Phone className="h-8 w-8 text-primary-600 dark:text-dark-primary-500" />
            </div>
            <h2 className="text-4xl font-bold mb-4 text-gray-900 dark:text-dark-text-primary">Get in touch to begin your free trial</h2>
            <p className="text-lg text-gray-600 dark:text-dark-text-secondary">
              We will get back to you within 24 hrs.
            </p>
          </div>
          
          <form onSubmit={handleContactSubmit} className="bg-white dark:bg-dark-bg-tertiary rounded-lg shadow-xl p-8">
            {formStatus.type && (
              <div className={`mb-6 p-4 rounded-lg ${
                formStatus.type === 'success' 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 border border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 border border-red-200 dark:border-red-800'
              }`}>
                {formStatus.message}
              </div>
            )}
            
            <div className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Name <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="text"
                  id="name"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-primary-500 dark:focus:border-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="Your name"
                />
              </div>
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Email <span className="text-red-500 dark:text-red-400">*</span>
                </label>
                <input
                  type="email"
                  id="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-primary-500 dark:focus:border-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="your.email@example.com"
                />
              </div>
              
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                  Message
                </label>
                <textarea
                  id="message"
                  rows="5"
                  value={formData.message}
                  onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-primary-500 dark:focus:border-dark-primary-500 bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary dark:placeholder-dark-text-tertiary"
                  placeholder="Tell us how we can help you..."
                />
              </div>
              
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-primary-600 dark:bg-dark-primary-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
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
      </section>

      {/* Footer */}
      <footer className="bg-gray-800 dark:bg-dark-bg-primary text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="h-10 w-10 bg-white rounded-full flex items-center justify-center p-1">
                  <img
                    src="/TheraPTrackLogoBgRemoved.png"
                    alt="TheraP Track Logo"
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="text-lg font-bold">TheraP Track</span>
              </div>
              <p className="text-gray-400 text-sm">
                Streamline your therapy practice with comprehensive management tools.
              </p>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection('about-us')} className="text-gray-400 hover:text-white transition">
                    About Us
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('how-it-works')} className="text-gray-400 hover:text-white transition">
                    How It Works
                  </button>
                </li>
                <li>
                  <button onClick={() => scrollToSection('blogs-news')} className="text-gray-400 hover:text-white transition">
                    Blogs & News
                  </button>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/privacy-policy" className="text-gray-400 hover:text-white transition">
                    Privacy Policy
                  </Link>
                </li>
                <li>
                  <Link to="/terms-of-service" className="text-gray-400 hover:text-white transition">
                    Terms of Service
                  </Link>
                </li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Account</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <button onClick={() => scrollToSection('login')} className="text-gray-400 hover:text-white transition">
                    Login
                  </button>
                </li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-700 pt-8 text-center text-sm text-gray-400">
            <p>&copy; 2025 TheraP Track. All rights reserved.</p>
          </div>
        </div>
      </footer>

      {/* Scroll to Top FAB */}
      {showScrollToTop && (
        <button
          onClick={scrollToTop}
          className="fixed bottom-24 right-4 z-[999] w-12 h-12 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center group hover:scale-110 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
          aria-label="Scroll to top"
        >
          <ArrowUp className="h-5 w-5 transition-transform duration-300 group-hover:-translate-y-1" />
        </button>
      )}
    </div>
  );
};

export default Home;
