import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { blogAPI } from '../../services/api';
import { FileText, Plus, Edit, Save, X, CheckCircle, XCircle, AlertCircle, Search, Calendar, Tag } from 'lucide-react';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const CATEGORIES = ['Technology', 'Clinical', 'Security', 'Wellness', 'Research', 'Others'];

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

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    featured_image_url: '',
    published: false
  });

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
      excerpt: '',
      content: '',
      category: '',
      featured_image_url: '',
      published: false
    });
    setEditingBlog(null);
    setViewMode('create');
    setError('');
    setSuccessMessage('');
  };

  const handleEdit = (blog) => {
    setFormData({
      title: blog.title || '',
      excerpt: blog.excerpt || '',
      content: blog.content || '',
      category: blog.category || '',
      featured_image_url: blog.featured_image_url || '',
      published: blog.published || false
    });
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
      excerpt: '',
      content: '',
      category: '',
      featured_image_url: '',
      published: false
    });
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
    // Strip HTML tags to check actual content length
    const textContent = formData.content.replace(/<[^>]*>/g, '').trim();
    if (textContent.length < 10) {
      setError('Content must be at least 10 characters');
      return false;
    }
    if (formData.featured_image_url && !isValidUrl(formData.featured_image_url)) {
      setError('Please enter a valid URL for featured image');
      return false;
    }
    return true;
  };

  const isValidUrl = (string) => {
    try {
      new URL(string);
      return true;
    } catch (_) {
      return false;
    }
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
        const response = await blogAPI.create(formData);
        setSuccessMessage('Blog created successfully!');
      } else if (viewMode === 'edit' && editingBlog) {
        await blogAPI.update(editingBlog.id, formData);
        setSuccessMessage('Blog updated successfully!');
      }

      // Reload blogs and return to list view
      await loadBlogs();
      setTimeout(() => {
        setViewMode('list');
        setEditingBlog(null);
        setSuccessMessage('');
      }, 2000);
    } catch (err) {
      console.error('Failed to save blog:', err);
      setError(err.response?.data?.error || 'Failed to save blog');
    } finally {
      setSaving(false);
    }
  };

  const filteredBlogs = blogs.filter(blog => {
    if (!searchTerm) return true;
    const searchLower = searchTerm.toLowerCase();
    return (
      blog.title.toLowerCase().includes(searchLower) ||
      (blog.excerpt && blog.excerpt.toLowerCase().includes(searchLower)) ||
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
              My Blogs
            </h2>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Manage your blog posts and news articles
            </p>
          </div>
          <button
            onClick={handleCreateNew}
            className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium"
          >
            <Plus className="h-5 w-5" />
            Create New Blog
          </button>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400 dark:text-dark-text-tertiary" />
          <input
            type="text"
            placeholder="Search blogs by title, excerpt, or category..."
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
              {searchTerm ? 'No blogs match your search' : 'No blogs yet. Create your first blog post!'}
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
                    
                    {blog.excerpt && (
                      <p className="text-gray-600 dark:text-dark-text-secondary mb-3 line-clamp-2">
                        {blog.excerpt}
                      </p>
                    )}

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
                    </div>
                  </div>

                  <button
                    onClick={() => handleEdit(blog)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 dark:bg-dark-primary-600 text-white rounded-lg hover:bg-primary-700 dark:hover:bg-dark-primary-700 transition-colors font-medium whitespace-nowrap"
                  >
                    <Edit className="h-4 w-4" />
                    Edit
                  </button>
                </div>
              </div>
            ))}
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
          {viewMode === 'create' ? 'Create New Blog' : 'Edit Blog'}
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
            placeholder="Enter blog title"
            maxLength={255}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
            required
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            {formData.title.length}/255 characters
          </p>
        </div>

        {/* Excerpt */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Excerpt
          </label>
          <textarea
            name="excerpt"
            value={formData.excerpt}
            onChange={handleInputChange}
            placeholder="Brief summary of the blog post (optional)"
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none resize-none"
          />
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
              placeholder="Write your blog content here..."
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
        </div>

        {/* Featured Image URL */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-2">
            Featured Image URL
          </label>
          <input
            type="url"
            name="featured_image_url"
            value={formData.featured_image_url}
            onChange={handleInputChange}
            placeholder="https://example.com/image.jpg"
            className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg bg-white dark:bg-dark-bg-primary text-gray-900 dark:text-dark-text-primary focus:ring-2 focus:ring-primary-500 dark:focus:ring-dark-primary-500 focus:border-transparent outline-none"
          />
          <p className="text-xs text-gray-500 dark:text-dark-text-tertiary mt-1">
            Optional: URL to a featured image for this blog post
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
                {viewMode === 'create' ? 'Create Blog' : 'Save Changes'}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default BlogManagement;

