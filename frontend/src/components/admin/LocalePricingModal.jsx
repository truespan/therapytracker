import React, { useState, useEffect } from 'react';
import { X, Plus, Trash2, Save, Globe, AlertCircle, Edit2, CheckCircle } from 'lucide-react';
import { subscriptionPlanAPI } from '../../services/api';

const LocalePricingModal = ({ isOpen, plan, onClose, onSave }) => {
  const [locales, setLocales] = useState([]);
  const [availableLocales, setAvailableLocales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [editingLocale, setEditingLocale] = useState(null);
  const [showAddForm, setShowAddForm] = useState(false);

  const [formData, setFormData] = useState({
    country_code: '',
    locale: '',
    currency_code: 'USD', // Default to USD (will change to INR if India is selected)
    individual_yearly_price: '',
    individual_quarterly_price: '',
    individual_monthly_price: '',
    organization_yearly_price: '',
    organization_quarterly_price: '',
    organization_monthly_price: '',
    is_active: true
  });

  useEffect(() => {
    if (isOpen && plan) {
      loadData();
    }
  }, [isOpen, plan]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [localesRes, availableRes] = await Promise.all([
        subscriptionPlanAPI.getPlanLocales(plan.id),
        subscriptionPlanAPI.getAvailableLocales()
      ]);
      setLocales(localesRes.data.locales || []);
      setAvailableLocales(availableRes.data.locales || []);
    } catch (err) {
      console.error('Failed to load locale data:', err);
      setError(err.response?.data?.error || 'Failed to load locale pricing');
    } finally {
      setLoading(false);
    }
  };

  const handleLocaleSelect = (selectedLocale) => {
    const locale = availableLocales.find(l => 
      l.country_code === selectedLocale.country_code && l.locale === selectedLocale.locale
    );
    if (locale) {
      // Automatically set currency based on country
      // India uses INR, all others use USD
      const currencyCode = locale.country_code === 'IN' ? 'INR' : 'USD';
      
      setFormData({
        ...formData,
        country_code: locale.country_code,
        locale: locale.locale,
        currency_code: currencyCode
      });
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleEdit = (locale) => {
    setEditingLocale(locale.id);
    setFormData({
      country_code: locale.country_code,
      locale: locale.locale,
      currency_code: locale.currency_code,
      individual_yearly_price: locale.individual_yearly_price,
      individual_quarterly_price: locale.individual_quarterly_price,
      individual_monthly_price: locale.individual_monthly_price,
      organization_yearly_price: locale.organization_yearly_price,
      organization_quarterly_price: locale.organization_quarterly_price,
      organization_monthly_price: locale.organization_monthly_price,
      is_active: locale.is_active
    });
    setShowAddForm(true);
  };

  const handleDelete = async (localeId) => {
    if (!window.confirm('Are you sure you want to delete this locale pricing?')) {
      return;
    }

    try {
      await subscriptionPlanAPI.deletePlanLocale(plan.id, localeId);
      setSuccess('Locale pricing deleted successfully');
      loadData();
      if (onSave) onSave();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete locale pricing');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setError(null);
      
      const data = {
        ...formData,
        individual_yearly_price: parseFloat(formData.individual_yearly_price),
        individual_quarterly_price: parseFloat(formData.individual_quarterly_price),
        individual_monthly_price: parseFloat(formData.individual_monthly_price),
        organization_yearly_price: parseFloat(formData.organization_yearly_price),
        organization_quarterly_price: parseFloat(formData.organization_quarterly_price),
        organization_monthly_price: parseFloat(formData.organization_monthly_price)
      };

      await subscriptionPlanAPI.upsertPlanLocale(plan.id, data);
      setSuccess('Locale pricing saved successfully');
      resetForm();
      loadData();
      if (onSave) onSave();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save locale pricing');
      setTimeout(() => setError(null), 5000);
    } finally {
      setSaving(false);
    }
  };

  const resetForm = () => {
    setFormData({
      country_code: '',
      locale: '',
      currency_code: 'USD', // Default to USD (will change to INR if India is selected)
      individual_yearly_price: '',
      individual_quarterly_price: '',
      individual_monthly_price: '',
      organization_yearly_price: '',
      organization_quarterly_price: '',
      organization_monthly_price: '',
      is_active: true
    });
    setEditingLocale(null);
    setShowAddForm(false);
  };

  if (!isOpen) return null;

  // Find used locales to filter available options
  const usedLocales = locales.map(l => `${l.country_code}-${l.locale}`);
  const filteredAvailableLocales = availableLocales.filter(l => 
    !usedLocales.includes(`${l.country_code}-${l.locale}`) || editingLocale
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-dark-bg-secondary rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="border-b border-gray-200 dark:border-dark-border px-6 py-4 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-dark-text-primary">
              Locale Pricing - {plan?.plan_name}
            </h2>
            <p className="text-sm text-gray-600 dark:text-dark-text-secondary mt-1">
              Manage pricing for different countries and locales
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-dark-text-secondary"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Messages */}
        {(error || success) && (
          <div className={`px-6 py-3 ${error ? 'bg-red-50 dark:bg-red-900/20' : 'bg-green-50 dark:bg-green-900/20'}`}>
            <div className="flex items-center space-x-2">
              {error ? (
                <>
                  <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                  <span className="text-sm text-red-700 dark:text-red-300">{error}</span>
                </>
              ) : (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                  <span className="text-sm text-green-700 dark:text-green-300">{success}</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
            </div>
          ) : (
            <>
              {/* Add/Edit Form */}
              {showAddForm && (
                <div className="bg-gray-50 dark:bg-dark-bg-tertiary rounded-lg p-6 mb-6">
                  <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-dark-text-primary">
                    {editingLocale ? 'Edit Locale Pricing' : 'Add Locale Pricing'}
                  </h3>
                  <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Country & Locale <span className="text-red-500">*</span>
                        </label>
                        <select
                          name="locale"
                          value={formData.locale}
                          onChange={(e) => {
                            const selected = availableLocales.find(l => l.locale === e.target.value);
                            if (selected) handleLocaleSelect(selected);
                          }}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                          disabled={!!editingLocale}
                        >
                          <option value="">Select locale...</option>
                          {filteredAvailableLocales.map(locale => (
                            <option key={`${locale.country_code}-${locale.locale}`} value={locale.locale}>
                              {locale.name} ({locale.currency_code})
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Currency <span className="text-red-500">*</span>
                          {formData.country_code && formData.country_code !== 'IN' && (
                            <span className="text-xs text-gray-500 ml-2">(USD for all non-India locales)</span>
                          )}
                        </label>
                        <input
                          type="text"
                          name="currency_code"
                          value={formData.currency_code}
                          onChange={handleChange}
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary disabled:bg-gray-100 dark:disabled:bg-gray-800 disabled:cursor-not-allowed"
                          placeholder="USD, INR, etc."
                          required
                          maxLength="3"
                          disabled={formData.country_code && formData.country_code !== 'IN'}
                        />
                        {formData.country_code && formData.country_code !== 'IN' && (
                          <p className="text-xs text-gray-500 mt-1">
                            USD is automatically used for all non-India locales
                          </p>
                        )}
                      </div>
                      <div className="flex items-end">
                        <label className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={handleChange}
                            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                          <span className="text-sm text-gray-700 dark:text-dark-text-secondary">Active</span>
                        </label>
                      </div>
                    </div>

                    {/* Individual Prices */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Individual Monthly Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="individual_monthly_price"
                          value={formData.individual_monthly_price}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Individual Quarterly Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="individual_quarterly_price"
                          value={formData.individual_quarterly_price}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Individual Yearly Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="individual_yearly_price"
                          value={formData.individual_yearly_price}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                        />
                      </div>
                    </div>

                    {/* Organization Prices */}
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Organization Monthly Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="organization_monthly_price"
                          value={formData.organization_monthly_price}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Organization Quarterly Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="organization_quarterly_price"
                          value={formData.organization_quarterly_price}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-dark-text-secondary mb-1">
                          Organization Yearly Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="organization_yearly_price"
                          value={formData.organization_yearly_price}
                          onChange={handleChange}
                          step="0.01"
                          min="0"
                          className="w-full px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg focus:ring-2 focus:ring-primary-500 dark:bg-dark-bg-primary dark:text-dark-text-primary"
                          required
                        />
                      </div>
                    </div>

                    <div className="flex justify-end space-x-3 pt-4">
                      <button
                        type="button"
                        onClick={resetForm}
                        className="px-4 py-2 border border-gray-300 dark:border-dark-border rounded-lg text-gray-700 dark:text-dark-text-secondary hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={saving}
                        className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                      >
                        <Save className="h-4 w-4" />
                        <span>{saving ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </form>
                </div>
              )}

              {/* Add Button */}
              {!showAddForm && (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="mb-4 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 flex items-center space-x-2"
                >
                  <Plus className="h-5 w-5" />
                  <span>Add Locale Pricing</span>
                </button>
              )}

              {/* Locales List */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-dark-border">
                  <thead className="bg-gray-50 dark:bg-dark-bg-tertiary">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Country</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Locale</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Currency</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Individual (M/Q/Y)</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Organization (M/Q/Y)</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Status</th>
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 dark:text-dark-text-tertiary uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white dark:bg-dark-bg-secondary divide-y divide-gray-200 dark:divide-dark-border">
                    {locales.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-4 py-12 text-center">
                          <Globe className="h-12 w-12 text-gray-400 mx-auto mb-2" />
                          <p className="text-gray-600 dark:text-dark-text-secondary">
                            No locale pricing configured. Click "Add Locale Pricing" to get started.
                          </p>
                        </td>
                      </tr>
                    ) : (
                      locales.map((locale) => (
                        <tr key={locale.id} className="hover:bg-gray-50 dark:hover:bg-dark-bg-tertiary">
                          <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-dark-text-primary">
                            {locale.country_code}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text-secondary">
                            {locale.locale}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 dark:text-dark-text-secondary">
                            {locale.currency_code}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700 dark:text-dark-text-secondary">
                            {locale.currency_code} {locale.individual_monthly_price} / {locale.individual_quarterly_price} / {locale.individual_yearly_price}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-700 dark:text-dark-text-secondary">
                            {locale.currency_code} {locale.organization_monthly_price} / {locale.organization_quarterly_price} / {locale.organization_yearly_price}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            {locale.is_active ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400">
                                Active
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
                                Inactive
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-4 whitespace-nowrap text-center">
                            <div className="flex items-center justify-center space-x-2">
                              <button
                                onClick={() => handleEdit(locale)}
                                className="text-primary-700 hover:text-primary-900 dark:text-primary-400 dark:hover:text-primary-300"
                                title="Edit"
                              >
                                <Edit2 className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleDelete(locale.id)}
                                className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                                title="Delete"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default LocalePricingModal;
