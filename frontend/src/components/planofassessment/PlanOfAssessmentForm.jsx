import React, { useState, useEffect, useRef, useCallback } from 'react';
import { planOfAssessmentAPI } from '../../services/api';
import { Save, Loader2, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';

const PlanOfAssessmentForm = ({ userId, partnerId, userName }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autosaveStatus, setAutosaveStatus] = useState(null); // 'saving', 'saved', 'error', null
  const autosaveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);
  const [planOfAssessment, setPlanOfAssessment] = useState([]);
  const [newAssessmentItem, setNewAssessmentItem] = useState('');

  useEffect(() => {
    if (userId) {
      loadPlanOfAssessment();
    } else {
      setPlanOfAssessment([]);
      setLoading(false);
    }
  }, [userId]);

  const loadPlanOfAssessment = async () => {
    if (!userId) {
      console.log('[PlanOfAssessment] No userId provided, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[PlanOfAssessment] Loading plan of assessment for userId:', userId);
      setLoading(true);
      const response = await planOfAssessmentAPI.get(userId);
      console.log('[PlanOfAssessment] API response:', response.data);

      if (response.data.planOfAssessment) {
        console.log('[PlanOfAssessment] Plan of assessment data found, loading into form');
        const poa = response.data.planOfAssessment;

        // Handle plan_of_assessment - can be array, string, or null
        // PostgreSQL JSONB fields are automatically parsed by pg library
        let parsedItems = [];
        try {
          if (poa.plan_of_assessment) {
            if (Array.isArray(poa.plan_of_assessment)) {
              parsedItems = poa.plan_of_assessment;
            } else if (typeof poa.plan_of_assessment === 'string') {
              // If it's a string, try to parse it
              parsedItems = JSON.parse(poa.plan_of_assessment);
            } else {
              // If it's already an object/array (from JSONB), use it directly
              parsedItems = poa.plan_of_assessment;
            }
          }
        } catch (e) {
          console.error('[PlanOfAssessment] Error parsing plan_of_assessment:', e);
          parsedItems = [];
        }

        setPlanOfAssessment(parsedItems);
      } else {
        console.log('[PlanOfAssessment] No plan of assessment found for this user');
        setPlanOfAssessment([]);
      }
    } catch (error) {
      console.error('[PlanOfAssessment] Failed to load plan of assessment:', error);
      setPlanOfAssessment([]);
    } finally {
      setLoading(false);
    }
  };

  // Autosave function
  const performAutosave = useCallback(async (isManual = false) => {
    if (!userId) return;

    try {
      if (isManual) {
        setSaving(true);
      } else {
        setAutosaveStatus('saving');
      }

      await planOfAssessmentAPI.save(userId, { planOfAssessment: { plan_of_assessment: planOfAssessment } });

      if (isManual) {
        alert('Plan of Assessment saved successfully!');
      } else {
        setAutosaveStatus('saved');
        // Clear the saved status after 3 seconds
        setTimeout(() => {
          setAutosaveStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save plan of assessment:', error);
      if (isManual) {
        alert('Failed to save Plan of Assessment. Please try again.');
      } else {
        setAutosaveStatus('error');
        // Clear the error status after 5 seconds
        setTimeout(() => {
          setAutosaveStatus(null);
        }, 5000);
      }
    } finally {
      if (isManual) {
        setSaving(false);
      }
    }
  }, [userId, planOfAssessment]);

  // Autosave effect - debounced
  useEffect(() => {
    // Skip autosave on initial load
    if (isInitialLoadRef.current) {
      isInitialLoadRef.current = false;
      return;
    }

    // Clear existing timeout
    if (autosaveTimeoutRef.current) {
      clearTimeout(autosaveTimeoutRef.current);
    }

    // Set new timeout for autosave (2 seconds debounce)
    autosaveTimeoutRef.current = setTimeout(() => {
      performAutosave(false);
    }, 2000);

    // Cleanup function
    return () => {
      if (autosaveTimeoutRef.current) {
        clearTimeout(autosaveTimeoutRef.current);
      }
    };
  }, [planOfAssessment, performAutosave]);

  // Reset autosave status when userId changes
  useEffect(() => {
    isInitialLoadRef.current = true;
    setAutosaveStatus(null);
  }, [userId]);

  const addAssessmentItem = () => {
    if (newAssessmentItem.trim()) {
      setPlanOfAssessment(prev => [...prev, newAssessmentItem.trim()]);
      setNewAssessmentItem('');
    }
  };

  const removeAssessmentItem = (index) => {
    setPlanOfAssessment(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    await performAutosave(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
        <p className="text-gray-600 dark:text-gray-300 ml-3">Loading Plan of Assessment...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button and Autosave Status - Sticky at top */}
      <div className="sticky top-0 z-10 bg-white dark:bg-dark-bg-primary border-b border-gray-200 dark:border-dark-border py-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Plan of Assessment
                </>
              )}
            </button>
          </div>
          
          {/* Autosave Status Indicator */}
          {autosaveStatus && (
            <div className={`flex items-center gap-2 text-sm ${
              autosaveStatus === 'saving' ? 'text-blue-600' :
              autosaveStatus === 'saved' ? 'text-green-600' :
              'text-red-600'
            }`}>
              {autosaveStatus === 'saving' && (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Auto-saving...</span>
                </>
              )}
              {autosaveStatus === 'saved' && (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Auto-saved</span>
                </>
              )}
              {autosaveStatus === 'error' && (
                <>
                  <AlertCircle className="h-4 w-4" />
                  <span>Auto-save failed</span>
                </>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Plan of Assessment Section */}
      <div className="card">
        <h3 className="text-lg font-semibold dark:text-white mb-4">Plan of Assessment</h3>
        <div>
          <div className="flex gap-2 mb-4">
            <input
              type="text"
              value={newAssessmentItem}
              onChange={(e) => setNewAssessmentItem(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && addAssessmentItem()}
              placeholder="Enter assessment item"
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400"
            />
            <button
              type="button"
              onClick={addAssessmentItem}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 transition-colors"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
          <div className="space-y-2">
            {planOfAssessment.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <p>No assessment items added yet. Add items using the input above.</p>
              </div>
            ) : (
              planOfAssessment.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                  <span className="dark:text-white flex-1">{item}</span>
                  <button
                    type="button"
                    onClick={() => removeAssessmentItem(index)}
                    className="ml-3 text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 transition-colors"
                    title="Remove item"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanOfAssessmentForm;

