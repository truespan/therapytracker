import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { blogAPI } from '../../services/api';
import { FileText, Plus, Edit, Save, X, CheckCircle, XCircle, AlertCircle, Search, Calendar, Tag, Trash2, User, Upload, Image as ImageIcon } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CATEGORIES = ['Workshop', 'Webinar', 'Training', 'Seminar', 'Others (Specify)'];

const BlogManagement = () => {
  const { user } = useAuth();
  const [blogs, setBlogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'create' | 'edit'
  const [editingBlog, setEditingBlog] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [saving, setSaving] = useState(false);
  const [blogToDelete, setBlogToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    event_date: '',
    event_time: '',
    fee: '',
    event_type: 'Online', // 'Online' or 'Offline'
    address: '', // For offline events
    max_participants: '', // Maximum participants (empty means unlimited)
    content: '',
    category: '',
    category_other: '',
    featured_image_url: '',
    published: false
  });
  const [uploadingImage, setUploadingImage] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);
  const [showFileTypeErrorDialog, setShowFileTypeErrorDialog] = useState(false);
  const [fileTypeError, setFileTypeError] = useState('');

  useEffect(() => {
    loadBlogs();
  }, []);

  const loadBlogs = async () => {
    try {
      setLoading(true);
      setError('');
      const response = await blogAPI.getMyBlogs();
      setBlogs(response.data || []);
    } catch (err) {
      console.error('Failed to load blogs:', err);
      setError(err.response?.data?.error || 'Failed to load blogs');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNew = () => {
    setFormData({
      title: '',
      event_date: '',
      event_time: '',
      fee: '',
      event_type: 'Online',
      address: '',
      max_participants: '',
      content: '',
      category: '',
      category_other: '',
      featured_image_url: '',
      published: false
    });
    setImagePreview(null);
    setEditingBlog(null);
    setViewMode('create');
    setError('');
    setSuccessMessage('');
  };

  const handleEdit = (blog) => {
    // Check if category is in the standard list, otherwise it's "Others (Specify)"
    const isStandardCategory = CATEGORIES.some(cat => cat === blog.category);
    const category = isStandardCategory ? (blog.category || '') : 'Others (Specify)';
    const category_other = isStandardCategory ? '' : (blog.category || '');
    
    setFormData({
      title: blog.title || '',
      event_date: blog.event_date || '',
      event_time: blog.event_time || '',
      fee: blog.fee || '',
      event_type: blog.event_type || 'Online',
      address: blog.address || '',
      max_participants: blog.max_participants || '',
      content: blog.content || '',
      category: category,
      category_other: category_other,
      featured_image_url: blog.featured_image_url || '',
      published: blog.published || false
    });
    setImagePreview(blog.featured_image_url || null);
    setEditingBlog(blog);
    setViewMode('edit');
    setError('');
    setSuccessMessage('');
  };

  const handleCancel = () => {
    setViewMode('list');
    setEditingBlog(null);
    setFormData({
      title: '',
      event_date: '',
      event_time: '',
      fee: '',
      event_type: 'Online',
      address: '',
      max_participants: '',
      content: '',
      category: '',
      category_other: '',
      featured_image_url: '',
      published: false
    });
    setImagePreview(null);
    setError('');
    setSuccessMessage('');
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleContentChange = (content) => {
    setFormData(prev => ({
      ...prev,
      content
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      setError('Title is required');
      return false;
    }
    if (formData.title.length > 255) {
      setError('Title must be 255 characters or less');
      return false;
    }
    if (!formData.event_date) {
      setError('Event date is required');
      return false;
    }
    if (!formData.event_time) {
      setError('Event time is required');
      return false;
    }
    // Validate address for offline events
    if (formData.event_type === 'Offline' && !formData.address.trim()) {
      setError('Address is required for offline events');
      return false;
    }
    // Validate max_participants if provided
    if (formData.max_participants && formData.max_participants !== '') {
      const maxParticipantsNum = parseInt(formData.max_participants);
      if (isNaN(maxParticipantsNum) || maxParticipantsNum <= 0) {
        setError('Maximum participants must be a positive integer');
        return false;
      }
    }
    if (formData.category === 'Others (Specify)' && !formData.category_other.trim()) {
      setError('Please specify the category');
      return false;
    }
    // Strip HTML tags to check actual content length
    const textContent = formData.content.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 10) {
      setError('Content must be at least 10 characters');
      return false;
    }
    return true;
  };

  // Helper function to construct image URL (similar to ImageUpload component)
  const getImageUrl = (imageUrl) => {
    if (!imageUrl) return null;
    if (imageUrl.startsWith('http')) return imageUrl;

    // Use environment variable for API URL, fallback to localhost for development
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
    const SERVER_BASE_URL = API_BASE_URL.replace('/api', '');

    // If imageUrl starts with /, it's a relative path
    if (imageUrl.startsWith('/')) {
      return `${SERVER_BASE_URL}${imageUrl}`;
    }

    // Otherwise, prepend the base URL
    return `${SERVER_BASE_URL}/${imageUrl}`;
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Reset file input to allow selecting the same file again if validation fails
    e.target.value = '';

    // Validate file type - check for specific image formats
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
    const allowedExtensions = ['.jpeg', '.jpg', '.png', '.gif', '.webp'];
    const fileName = file.name.toLowerCase();
    const fileExtension = fileName.substring(fileName.lastIndexOf('.'));
    
    if (!allowedTypes.includes(file.type) && !allowedExtensions.includes(fileExtension)) {
      setFileTypeError(`The file "${file.name}" is not a supported image format. Please upload an image in one of these formats: JPEG, JPG, PNG, GIF, or WebP.`);
      setShowFileTypeErrorDialog(true);
      return;
    }

    // Additional check for image type
    if (!file.type.startsWith('image/')) {
      setFileTypeError(`The file "${file.name}" is not recognized as an image file. Please upload an image in one of these formats: JPEG, JPG, PNG, GIF, or WebP.`);
      setShowFileTypeErrorDialog(true);
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    setError('');
    setUploadingImage(true);

    try {
      // Create preview immediately (like ImageUpload component)
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);

      // Create FormData for file upload
      const formDataToSend = new FormData();
      formDataToSend.append('eventImage', file);

      // Upload to backend
      const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
      const token = localStorage.getItem('token');
      
      const response = await fetch(`${API_URL}/upload/event-image`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formDataToSend
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Upload failed');
      }

      const data = await response.json();
      const imageUrl = data.image_url;
      
      setFormData(prev => ({
        ...prev,
        featured_image_url: imageUrl
      }));
      setImagePreview(imageUrl); // Update preview with actual URL from server
      
      setSuccessMessage('Image uploaded successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Failed to upload image');
      // Revert preview on error
      if (formData.featured_image_url) {
        setImagePreview(formData.featured_image_url);
      } else {
        setImagePreview(null);
      }
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setFormData(prev => ({
      ...prev,
      featured_image_url: ''
    }));
    setImagePreview(null);
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError('');
      setSuccessMessage('');

      if (viewMode === 'create') {
        // Prepare data for API - combine category and category_other if needed
        const apiData = {
          ...formData,
          category: formData.category === 'Others (Specify)' ? formData.category_other : formData.category
        };
        delete apiData.category_other;
        
        const response = await blogAPI.create(apiData);
        setSuccessMessage('Event created successfully!');
      } else if (viewMode === 'edit' && editingBlog) {
        // Prepare data for API - combine category and category_other if needed
        const apiData = {
          ...formData,
          category: formData.category === 'Others (Specify)' ? formData.category_other : formData.category
        };
        delete apiData.category_other;
        
        await blogAPI.update(editingBlog.id, apiData);
        setSuccessMessage('Event updated successfully!');
      }

      // Reload blogs and return to list view
      await loadBlogs();
      setTimeout(() => {
        setViewMode('list');
        setEditingBlog(null);
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('Failed to save event:', err);
      setError(err.response?.data?.error || 'Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteClick = (blog) => {
    setBlogToDelete(blog);
  };

  const handleDeleteConfirm = async () => {
    if (!blogToDelete) return;

    try {
      setDeleting(true);
      setError('');
      setSuccessMessage('');
      
      await blogAPI.delete(blogToDelete.id);
      setSuccessMessage('Event deleted successfully!');
      setBlogToDelete(null);
      
      // Reload blogs
      await loadBlogs();
      setTimeout(() => {
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('Failed to delete event:', err);
      setError(err.response?.data?.error || 'Failed to delete event');
      setBlogToDelete(null);
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteCancel = () => {
    setBlogToDelete(null);
  };

  // Check if user is in theraptrack_controlled organization
  const isTheraptrackControlled = user?.organization?.theraptrack_controlled || false;
  const isOwnBlog = (blog) => blog.author_id === user?.id;

  const filteredBlogs = blogs.filter(blog => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      blog.title.toLowerCase().includes(searchLower) ||
      (blog.category && blog.category.toLowerCase().includes(searchLower))
    );
  });

  // Quill editor modules configuration
  const quillModules = {
    toolbar: [
      [{ 'header': [1, 2, 3, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'list': 'ordered'}, { 'list': 'bullet' }],
      ['link', 'image'],
      ['clean']
    ]
  };

  const quillFormats = [
    'header',
    'bold', 'italic', 'underline',
    'list', 'bullet',
    'link', 'image'
  ];

  // List View
  if (viewMode === 'list') {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              {isTheraptrackControlled ? 'All Organization Events' : 'My Events'}
            </h2>
          <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
            {isTheraptrackControlled 
              ? 'Manage all events from your organization'
              : 'Manage your events'}
          </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create New Event
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-tertiary" />
          <input
            type="text"
            placeholder="Search events by title or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-secondary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
          />
        </div>

        {/* Messages */}
        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-400 text-sm">
            <XCircle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-400 text-sm">
            <CheckCircle className="h-4 w-4 flex-shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Blogs List */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-dark-primary-500"></div>
          </div>
        ) : filteredBlogs.length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-dark-bg-secondary rounded-lg border border-gray-200 dark:border-dark-border">
            <FileText className="h-12 w-12 mx-auto mb-4 text-gray-400 dark:text-dark-text-tertiary" />
            <p className="text-gray-600 dark:text-dark-text-secondary">
              {searchTerm ? 'No events match your search' : 'No events yet. Create your first event!'}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {filteredBlogs.map(blog => (
              <div
                key={blog.id}
                className="bg-white dark:bg-dark-bg-tertiary rounded-lg border border-gray-200 dark:border-dark-border p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-dark-text-primary">
                        {blog.title}
                      </h3>
                      {blog.published ? (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                          Published
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                          Draft
                        </span>
                      )}
                    </div>
                    

                    <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 dark:text-dark-text-tertiary">
                      {blog.category && (
                        <div className="flex items-center gap-1">
                          <Tag className="h-4 w-4" />
                          <span>{blog.category}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        <span>
                          {blog.published_at 
                            ? new Date(blog.published_at).toLocaleDateString()
                            : new Date(blog.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      {blog.author_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-4 w-4" />
                          <span>
                            {blog.author_name}
                            {!isOwnBlog(blog) && ' (Other Therapist)'}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEdit(blog)}
                      className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium whitespace-nowrap"
                    >
                      <Edit className="h-4 w-4" />
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteClick(blog)}
                      className="flex items-center gap-2 px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors font-medium whitespace-nowrap"
                    >
                      <Trash2 className="h-4 w-4" />
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {blogToDelete && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary mb-4">
                Confirm Delete
              </h3>
              <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                Are you sure you want to delete the event "{blogToDelete.title}"? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={handleDeleteCancel}
                  disabled={deleting}
                  className="px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors font-medium disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteConfirm}
                  disabled={deleting}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-lg hover:bg-red-700 dark:hover:bg-red-800 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {deleting ? 'Deleting...' : 'Delete'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* File Type Error Dialog */}
        {showFileTypeErrorDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Invalid File Type
                </h3>
              </div>
              <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                {fileTypeError}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowFileTypeErrorDialog(false);
                    setFileTypeError('');
                  }}
                  className="px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Create/Edit Form View
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
          {viewMode === 'create' ? 'Create New Event' : 'Edit Event'}
        </h2>
        <button
          onClick={handleCancel}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors"
        >
          <X className="h-5 w-5" />
          Cancel
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg flex items-center space-x-2 text-red-700 dark:text-red-400 text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {successMessage && (
        <div className="p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center space-x-2 text-green-700 dark:text-green-400 text-sm">
          <CheckCircle className="h-4 w-4 flex-shrink-0" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg border border-gray-200 dark:border-dark-border p-6 space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Title <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter event title"
            maxLength={255}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
            required
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            {formData.title.length}/255 characters
          </p>
        </div>

        {/* Date and Time */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Event Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              name="event_date"
              value={formData.event_date}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Event Time <span className="text-red-500">*</span>
            </label>
            <input
              type="time"
              name="event_time"
              value={formData.event_time}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
              required
            />
          </div>
        </div>

        {/* Fee and Event Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Fee (Amount)
            </label>
            <input
              type="number"
              name="fee"
              value={formData.fee}
              onChange={handleInputChange}
              placeholder="Enter fee amount (optional)"
              min="0"
              step="0.01"
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Event Type
            </label>
            <select
              name="event_type"
              value={formData.event_type}
              onChange={handleInputChange}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
            >
              <option value="Online">Online</option>
              <option value="Offline">Offline</option>
            </select>
          </div>
        </div>

        {/* Address field - shown only when Event Type is Offline */}
        {formData.event_type === 'Offline' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
              Address <span className="text-red-500">*</span>
            </label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleInputChange}
              placeholder="Enter the physical address for the offline event"
              rows={3}
              required={formData.event_type === 'Offline'}
              className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none resize-vertical"
            />
          </div>
        )}

        {/* Maximum Participants */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Maximum Participants
          </label>
          <input
            type="number"
            name="max_participants"
            value={formData.max_participants}
            onChange={handleInputChange}
            placeholder="Leave blank for unlimited participants"
            min="1"
            step="1"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            Leave blank to allow unlimited participants
          </p>
        </div>

        {/* Content */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Content <span className="text-red-500">*</span>
          </label>
          <div className="border border-gray-300 dark:border-dark-border rounded-lg overflow-hidden">
            <ReactQuill
              theme="snow"
              value={formData.content}
              onChange={handleContentChange}
              modules={quillModules}
              formats={quillFormats}
              placeholder="Write your event content here..."
              className="bg-white dark:bg-dark-bg-primary"
              style={{ minHeight: '300px' }}
            />
          </div>
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-2">
            Minimum 10 characters required
          </p>
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Category
          </label>
          <select
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
          >
            <option value="">Select a category (optional)</option>
            {CATEGORIES.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
          {formData.category === 'Others (Specify)' && (
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
                Specify Category <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                name="category_other"
                value={formData.category_other}
                onChange={handleInputChange}
                placeholder="Enter category name"
                className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
                required
              />
            </div>
          )}
        </div>

        {/* Featured Image Upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Event Image
          </label>
          {imagePreview ? (
            <div className="space-y-3">
              <div className="relative inline-block">
                <img
                  src={getImageUrl(imagePreview)}
                  alt="Event preview"
                  className="max-w-full h-auto max-h-64 rounded-lg border border-gray-300 dark:border-dark-border"
                  onError={(e) => {
                    console.error('Image load error:', e.target.src);
                    e.target.style.display = 'none';
                  }}
                />
                {uploadingImage && (
                  <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                    <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                  </div>
                )}
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={uploadingImage}
                  className="absolute top-2 right-2 p-2 bg-red-600 text-white rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  title="Remove image"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <button
                type="button"
                onClick={() => document.getElementById('image-upload-input').click()}
                disabled={uploadingImage}
                className="flex items-center gap-2 px-4 py-2 text-sm border border-gray-300 dark:border-dark-border rounded-lg hover:bg-gray-50 dark:hover:bg-dark-bg-secondary transition-colors text-gray-700 dark:text-dark-text-secondary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Upload className="h-4 w-4" />
                {uploadingImage ? 'Uploading...' : 'Change Image'}
              </button>
            </div>
          ) : (
            <div className="border-2 border-dashed border-gray-300 dark:border-dark-border rounded-lg p-6 text-center hover:border-primary-500 dark:hover:border-dark-primary-500 transition-colors">
              <input
                id="image-upload-input"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleImageUpload}
                className="hidden"
                disabled={uploadingImage}
              />
              <label
                htmlFor="image-upload-input"
                className="cursor-pointer flex flex-col items-center gap-2"
              >
                {uploadingImage ? (
                  <>
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 dark:border-dark-primary-500"></div>
                    <span className="text-sm text-gray-600 dark:text-dark-text-secondary">Uploading...</span>
                  </>
                ) : (
                  <>
                    <ImageIcon className="h-10 w-10 text-gray-400 dark:text-dark-text-tertiary" />
                    <span className="text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
                      Click to upload or drag and drop
                    </span>
                    <span className="text-xs font-medium px-3 py-1.5 bg-primary-100 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 rounded-md border border-primary-200 dark:border-primary-800">
                      Supported formats: JPEG, PNG, GIF, WebP. Max size: 5MB
                    </span>
                  </>
                )}
              </label>
            </div>
          )}
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-2">
            Optional: Upload an image for this event
          </p>
        </div>

        {/* Published Checkbox */}
        <div className="flex items-center">
          <input
            type="checkbox"
            name="published"
            id="published"
            checked={formData.published}
            onChange={handleInputChange}
            className="h-4 w-4 text-primary-600 dark:text-dark-primary-500 focus:ring-primary-500 dark:focus:ring-dark-primary-500 border-gray-300 dark:border-dark-border rounded"
          />
          <label htmlFor="published" className="ml-2 text-sm font-medium text-gray-700 dark:text-dark-text-secondary">
            Publish immediately
          </label>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200 dark:border-dark-border">
          <button
            onClick={handleCancel}
            className="px-6 py-2 text-gray-700 dark:text-dark-text-secondary hover:bg-gray-100 dark:hover:bg-dark-bg-secondary rounded-lg transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {viewMode === 'create' ? 'Create Event' : 'Save Changes'}
              </>
            )}
          </button>
        </div>

        {/* File Type Error Dialog */}
        {showFileTypeErrorDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-dark-bg-tertiary rounded-lg p-6 max-w-md w-full mx-4">
              <div className="flex items-center mb-4">
                <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 mr-3 flex-shrink-0" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-dark-text-primary">
                  Invalid File Type
                </h3>
              </div>
              <p className="text-gray-600 dark:text-dark-text-secondary mb-6">
                {fileTypeError}
              </p>
              <div className="flex justify-end">
                <button
                  onClick={() => {
                    setShowFileTypeErrorDialog(false);
                    setFileTypeError('');
                  }}
                  className="px-6 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium"
                >
                  OK
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default BlogManagement;


