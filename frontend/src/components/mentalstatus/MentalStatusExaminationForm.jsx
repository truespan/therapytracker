import React, { useEffect, useState, useRef, useCallback } from 'react';
import { mentalStatusAPI } from '../../services/api';
import { Save, Loader2, ChevronDown, ChevronUp, CheckCircle2, AlertCircle } from 'lucide-react';

const INITIAL_FORM_STATE = {
  // Section 1: General Appearance
  general_appearance_appearance: '',
  general_appearance_age: '',
  general_appearance_touch_with_surroundings: '',
  general_appearance_eye_contact: '',
  general_appearance_hair: '',
  general_appearance_rapport: '',
  general_appearance_comments: '',

  // Section 2: Attitude
  attitude: '',
  attitude_manner_of_relating: '',
  attitude_rapport: '',

  // Section 3: Motor Behavior (Conation)
  motor_behavior: '',

  // Section 4: Speech
  speech_intensity_tone: '',
  speech_reaction_time: '',
  speech_speed: '',
  speech_prosody_tempo: '',
  speech_ease_of_speech: '',
  speech_productivity_volume: '',
  speech_relevant_irrelevant: '',
  speech_coherent_incoherent: '',
  speech_goal_direction: '',

  // Section 5: Volition
  volition_made_phenomenon: '',
  volition_somatic_passivity: '',
  volition_echolalia_echopraxia: '',

  // Section 6: Cognitive Functions
  cognitive_attention_concentration: '',
  cognitive_attention: '',
  cognitive_orientation_time: '',
  cognitive_orientation_space: '',
  cognitive_orientation_person: '',
  cognitive_orientation_situation: '',
  cognitive_orientation_sense_of_passage_of_time: '',
  cognitive_memory_immediate_digit_forward: '',
  cognitive_memory_immediate_digit_backward: '',
  cognitive_memory_immediate_word_recall: '',
  cognitive_memory_immediate: '',
  cognitive_memory_recent: '',
  cognitive_memory_remote: '',
  cognitive_abstract_ability: '',

  // Section 7: General Intelligence
  intelligence_general_information: '',
  intelligence_calculation: '',
  intelligence_global_impression: '',
  intelligence_comprehension: '',
  intelligence_vocabulary: '',

  // Section 8: Mood & Affect
  mood_affect_subjective: '',
  mood_affect_diurnal_variation: '',
  mood_affect_objective: '',
  mood_affect_depth: '',
  mood_affect_range: '',
  mood_affect_stability: '',
  mood_affect_congruence_to_thought: '',
  mood_affect_appropriate_to_situation: '',
  mood_affect_communicability: '',
  mood_affect_reactivity_to_stimulus: '',

  // Section 9: Thought
  thought_stream: '',
  thought_stream_normal: '',
  thought_stream_retarded: '',
  thought_stream_retarded_thought_blocking: '',
  thought_stream_retarded_circumstantiality: '',
  thought_stream_accelerated: '',
  thought_stream_accelerated_flight_of_ideas: '',
  thought_stream_accelerated_prolixity: '',
  thought_stream_accelerated_pressure_of_speech: '',
  thought_form: '',
  thought_form_sample_talk: '',
  thought_possession_obsessions_compulsions: '',
  thought_possession_thought_alienation: '',
  thought_possession_thought_alienation_insertion: '',
  thought_possession_thought_alienation_broadcasting: '',
  thought_possession_thought_alienation_withdrawal: '',
  thought_possession_sample_talk: '',
  thought_content_religious_preoccupation: '',
  thought_content_phobias: '',
  thought_content_ideas: '',
  thought_content_ideas_hopelessness: '',
  thought_content_ideas_helplessness: '',
  thought_content_ideas_worthlessness: '',
  thought_content_ideas_guilt: '',
  thought_content_ideas_death_wishes: '',
  thought_content_ideas_suicide: '',
  thought_content_ideas_homicide: '',
  thought_content_ideas_hypochondriacal: '',
  thought_content_delusions_primary: '',
  thought_content_delusions_secondary: '',
  thought_content_delusions_systematised: '',
  thought_content_delusions_mood_congruent: '',
  thought_content_delusions_types: '',
  thought_content_delusions_sample_talk: '',

  // Section 10: Perceptual Disorders
  perceptual_sensory_distortion: '',
  perceptual_sensory_deception: '',
  perceptual_projection: '',
  perceptual_modality: '',
  perceptual_content: '',
  perceptual_response_to_content: '',
  perceptual_frequency_diurnal_pattern: '',
  perceptual_thought_echo: '',
  perceptual_description: '',
  perceptual_others: '',

  // Section 11: Other Psychotic Phenomena
  other_psychotic_phenomena: '',

  // Section 12: Other Psychopathological Phenomena
  other_psychopathological_phenomena: '',

  // Section 13: Judgement
  judgement_test: '',
  judgement_social: '',
  judgement_personal: '',

  // Section 14: Insight
  insight: '',
  insight_details: '',

  // Section 15: Verbatim Report
  verbatim_report: '',

  // Section 16: Behavior Observation (BO)
  behavior_observation: ''
};

const MentalStatusExaminationForm = ({ userId, partnerId }) => {
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [autosaveStatus, setAutosaveStatus] = useState(null); // 'saving', 'saved', 'error', null
  const [expandedSections, setExpandedSections] = useState(new Set([1])); // Section 1 expanded by default
  const [formData, setFormData] = useState(() => ({ ...INITIAL_FORM_STATE }));
  const autosaveTimeoutRef = useRef(null);
  const isInitialLoadRef = useRef(true);

  const mapApiDataToForm = (apiData) => {
    if (!apiData) {
      return { ...INITIAL_FORM_STATE };
    }

    return Object.keys(INITIAL_FORM_STATE).reduce((acc, key) => {
      const value = apiData[key];
      acc[key] = value === null || value === undefined ? '' : value;
      return acc;
    }, { ...INITIAL_FORM_STATE });
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

      await mentalStatusAPI.save(userId, { mentalStatus: formData });

      if (isManual) {
        alert('Mental Status Examination data saved successfully.');
      } else {
        setAutosaveStatus('saved');
        // Clear the saved status after 3 seconds
        setTimeout(() => {
          setAutosaveStatus(null);
        }, 3000);
      }
    } catch (error) {
      console.error('Failed to save MSE data:', error);
      if (isManual) {
        alert('Failed to save Mental Status Examination data. Please try again.');
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
  }, [userId, formData]);

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
  }, [formData, performAutosave]);

  useEffect(() => {
    const fetchMentalStatus = async () => {
      if (!userId || !partnerId) {
        setFormData({ ...INITIAL_FORM_STATE });
        setLoading(false);
        return;
      }

      setLoading(true);
      setExpandedSections(new Set([1]));

      try {
        const response = await mentalStatusAPI.get(userId);
        setFormData(mapApiDataToForm(response.data?.mentalStatus));
      } catch (error) {
        console.error('Failed to load MSE data:', error);
        setFormData({ ...INITIAL_FORM_STATE });
      } finally {
        setLoading(false);
      }
    };

    fetchMentalStatus();
    // Reset autosave status when userId changes
    isInitialLoadRef.current = true;
    setAutosaveStatus(null);
  }, [userId, partnerId]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const toggleSection = (sectionNum) => {
    setExpandedSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(sectionNum)) {
        newSet.delete(sectionNum);
      } else {
        newSet.add(sectionNum);
      }
      return newSet;
    });
  };

  const handleSave = async () => {
    if (!userId) {
      alert('Please select a client before saving the Mental Status Examination.');
      return;
    }

    await performAutosave(true);
  };

  const renderField = (label, fieldName, type = 'text', options = null, rows = 3, showLabel = true) => {
    const value = formData[fieldName] || '';

    return (
      <div className="mb-4">
        {showLabel && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={rows}
            aria-label={label}
          />
        ) : type === 'select' && options ? (
          <select
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === 'radio' && options ? (
          <div className="space-y-2">
            {options.map(opt => (
              <label key={opt.value} className="flex items-center">
                <input
                  type="radio"
                  name={fieldName}
                  value={opt.value}
                  checked={value === opt.value}
                  onChange={(e) => handleInputChange(fieldName, e.target.value)}
                  className="mr-2"
                />
                <span>{opt.label}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            value={value}
            onChange={(e) => handleInputChange(fieldName, e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={label}
          />
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="card text-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-primary-600 mx-auto mb-2" />
        <p className="text-gray-600">Loading Mental Status Examination...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Save Button and Autosave Status - Sticky at top */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
        <div className="flex items-center justify-between gap-4">
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
                Save Mental Status Examination
              </>
            )}
          </button>
          
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

      {/* Section 1: General Appearance */}
      <div className="card">
        <button
          onClick={() => toggleSection(1)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">1. General Appearance</h3>
          {expandedSections.has(1) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(1) && (
          <div className="space-y-4">
            {renderField('Appearance', 'general_appearance_appearance')}
            {renderField('Age', 'general_appearance_age')}
            {renderField('Touch with the surroundings (a. Present b. Partial c. Absent)', 'general_appearance_touch_with_surroundings')}
            {renderField('Eye contact (a. Present b. Partial c. Absent)', 'general_appearance_eye_contact')}
            {renderField('Hair (Well groomed / Negligent / Disheveled)', 'general_appearance_hair')}
            {renderField('Rapport (Easily established / Established with difficulty / Not possible)', 'general_appearance_rapport')}
            {renderField('Comments', 'general_appearance_comments', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 2: Attitude */}
      <div className="card">
        <button
          onClick={() => toggleSection(2)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">2. Attitude</h3>
          {expandedSections.has(2) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(2) && (
          <div className="space-y-4">
            {renderField('Attitude (Co-operative/ Uncooperative/ Attentive/ Defensive/ Evasive/ Guarded/ Suspicious/ Hostile/ Ingratiating/ Playful/ Exhibitionistic/ Seductive/ Distractible/ Others (specify))', 'attitude', 'textarea', null, 4)}
            {renderField('Manner of relating (relaxed, tense, over-familiar, aggressive, uninhibited, withdrawn, etc.)', 'attitude_manner_of_relating')}
            {renderField('Rapport', 'attitude_rapport')}
          </div>
        )}
      </div>

      {/* Section 3: Motor Behavior (Conation) */}
      <div className="card">
        <button
          onClick={() => toggleSection(3)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">3. Motor Behavior (Conation)</h3>
          {expandedSections.has(3) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(3) && (
          <div className="space-y-4">
            {renderField(
              'Motor Behavior',
              'motor_behavior',
              'textarea',
              null
            )}
            <p className="text-sm text-gray-600">
              Options: Inactive/ Hyperactive/ Restless/ Awkward/ Gestures/ Self injurious/ Retarded/ Tics/ Mannerisms/ Stereotypes/ Hallucinatory behavior/ Touching examiner/ Utilization behavior/ Aggressive/ Preoccupied/ Silly smiling/ Waxy flexibility/ Negativism/ Ambi-tendency/ Rigidity/ Automatic obedience/ Abnormal movements or postures/ Catatonic features/ Involuntary movements/ Tremor/ Dystonia/ Dyskinesia/ Chorea/ Athetosis etc.
            </p>
          </div>
        )}
      </div>

      {/* Section 4: Speech */}
      <div className="card">
        <button
          onClick={() => toggleSection(4)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">4. Speech</h3>
          {expandedSections.has(4) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(4) && (
          <div className="space-y-4">
            {renderField('Intensity/ Tone (a. Soft b. Audible c. Loud)', 'speech_intensity_tone')}
            {renderField('Reaction time (a. Normal b. Shortened c. Delayed)', 'speech_reaction_time')}
            {renderField('Speed (a. Normal b. Very slow c. Rapid d. Pressure of speech)', 'speech_speed')}
            {renderField('Prosody/ Tempo (a. Normal fluctuations b. Monotonous)', 'speech_prosody_tempo')}
            {renderField('Ease of speech (Spontaneous / Hesitant / Mute / Slurring / Stuttering / Whispering / Muttering / Speaks when questioned)', 'speech_ease_of_speech')}
            {renderField('Productivity/ Volume (a. Normal b. Overabundant c. Poverty of speech d. Poverty of Content)', 'speech_productivity_volume')}
            {renderField('Relevant/ Irrelevant to Context/ Situation', 'speech_relevant_irrelevant')}
            {renderField('Coherent/ Incoherent', 'speech_coherent_incoherent')}
            {renderField('Goal-direction (a. Goal-directed b. Non Goal-directed c. Circumstantial d. Tangential)', 'speech_goal_direction')}
          </div>
        )}
      </div>

      {/* Section 5: Volition */}
      <div className="card">
        <button
          onClick={() => toggleSection(5)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">5. Volition</h3>
          {expandedSections.has(5) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(5) && (
          <div className="space-y-4">
            {renderField('Made phenomenon (a. Made affect b. Made Impulse c. Made act)', 'volition_made_phenomenon')}
            {renderField('Somatic Passivity', 'volition_somatic_passivity')}
            {renderField('Echolalia/ Echopraxia/ Other Catatonic features', 'volition_echolalia_echopraxia')}
          </div>
        )}
      </div>

      {/* Section 6: Cognitive Functions */}
      <div className="card">
        <button
          onClick={() => toggleSection(6)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">6. Cognitive Functions</h3>
          {expandedSections.has(6) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(6) && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Attention & Concentration</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Assess by clinical behaviour and serial subtraction 100-7; 40-3; month/days of the week backward, backward counting)
              </p>
              {renderField('Attention (a. Easily aroused & sustained b. Easy to arouse but not sustained c. Difficulty to arouse & sustained d. Difficulty to arouse but not sustained)', 'cognitive_attention')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Orientation</h4>
              {renderField('Time', 'cognitive_orientation_time')}
              {renderField('Space', 'cognitive_orientation_space')}
              {renderField('Person', 'cognitive_orientation_person')}
              {renderField('Situation', 'cognitive_orientation_situation')}
              {renderField('Sense of passage of time', 'cognitive_orientation_sense_of_passage_of_time')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Memory</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Assess by clinical behaviour and immediate - DF and DB, verbal immediate recall; recent - recall of items and events of last one or two days; address test with five facts, objects test with five unrelated objects and verbal story; remote - personal and impersonal events, topographic memory and memory of skills)
              </p>
              {renderField('Immediate (a. Digit Forward b. Digit Backward c. Word Recall)', 'cognitive_memory_immediate', 'textarea')}
              {renderField('Recent', 'cognitive_memory_recent')}
              {renderField('Remote (Personal & Impersonal)', 'cognitive_memory_remote')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. Abstract ability</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Assess by clinical behaviour & tests of similarities, dissimilarities, proverbs, absurdities. Record verbatim responses)
              </p>
              {renderField('Abstract ability (a. Concrete b. Functional c. Conceptual d. Over abstraction)', 'cognitive_abstract_ability', 'textarea', null, 3)}
            </div>
          </div>
        )}
      </div>

      {/* Section 7: General Intelligence */}
      <div className="card">
        <button
          onClick={() => toggleSection(7)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">7. General Intelligence</h3>
          {expandedSections.has(7) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(7) && (
          <div className="space-y-4">
            {renderField('1. General Information (Assess with reference to subject\'s background)', 'intelligence_general_information', 'textarea')}
            {renderField('2. Calculation (Assess by verbal and written, one and two step problems)', 'intelligence_calculation', 'textarea')}
            {renderField('3. Intelligence (Global impression based on comprehension, general information, calculation, abstract ability and judgement)', 'intelligence_global_impression', 'textarea')}
            {renderField('4. Comprehension', 'intelligence_comprehension', 'textarea')}
            {renderField('5. Vocabulary', 'intelligence_vocabulary', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 8: Mood & Affect */}
      <div className="card">
        <button
          onClick={() => toggleSection(8)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">8. Mood & Affect</h3>
          {expandedSections.has(8) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(8) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              (Comment on the following aspects detailing both verbal and non-verbal behaviour, subjective mood, objectively-quality of affect, appropriateness, range, reactivity, mobility, communicability etc.)
            </p>
            <div>
              <h4 className="font-semibold mb-2">1. Subjective</h4>
              {renderField('Diurnal variation (a. No b. Yes (Worse in morning/ evening/ night))', 'mood_affect_diurnal_variation')}
            </div>
            <div>
              <h4 className="font-semibold mb-2">2. Objective</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Euthymic/ Anxious/ Panicky/ Fearful/ Depressed/ Weeping spell/ Irritable/ Enraged/ Cheerful/ Euphoric/ Elated/ La-belle Indifference/ Blunted/ Flat)
              </p>
              {renderField('Objective Affect', 'mood_affect_objective', 'textarea')}
            </div>
            {renderField('3. Depth (a. Normal b. Shallow)', 'mood_affect_depth')}
            {renderField('4. Range (a. Adequate b. Restricted)', 'mood_affect_range')}
            {renderField('5. Stability (a. Stable b. Labile c. Incontinence)', 'mood_affect_stability')}
            {renderField('6. Congruence to the thought', 'mood_affect_congruence_to_thought')}
            {renderField('7. Appropriate to the situation', 'mood_affect_appropriate_to_situation')}
            {renderField('8. Communicability', 'mood_affect_communicability')}
            {renderField('9. Reactivity to the stimulus', 'mood_affect_reactivity_to_stimulus', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 9: Thought */}
      <div className="card">
        <button
          onClick={() => toggleSection(9)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">9. Thought</h3>
          {expandedSections.has(9) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(9) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-4">
              (Document verbatim samples of speech and when relevant, written samples under the following heads to substantiate inferences)
            </p>
            
            <div>
              <h4 className="font-semibold mb-2">1. Stream</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Comment on the spontaneity, volubility, acceleration, pressured speech, flight of ideas, prolixity, retardation, Poverty of speech, circumstantiality, tangentiality, perseveration, thought blocking)
              </p>
              {renderField('Stream - Normal', 'thought_stream_normal')}
              {renderField('Retarded (a. Thought Blocking b. Circumstantiality)', 'thought_stream_retarded')}
              {renderField('Accelerated (a. Flight of ideas b. Prolixity c. Pressure of speech)', 'thought_stream_accelerated')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Form</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Give samples and comments on loosening of associations, derailment, neologism etc)
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Normal/ Derailment/ Loosening of associations/ Neologisms/ Word Approximations/ Word Salad/ Incoherence/ Clang/ Illogicality/ Tangentiality/ Distractible speech/ Perseveration/ Circumstantiality/ Loss of goal/ Selfreference
              </p>
              {renderField('Form', 'thought_form')}
              {renderField('Sample Talk', 'thought_form_sample_talk', 'textarea')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Possession</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Comment on obsessions and thought alienation experiences e.g. thought insertion, thought withdrawal and thought broadcasting)
              </p>
              {renderField('1. Obsessions & Compulsions', 'thought_possession_obsessions_compulsions')}
              {renderField('2. Thought Alienation (a. Thought insertion b. Thought broadcasting c. Thought withdrawal)', 'thought_possession_thought_alienation')}
              {renderField('Sample Talk', 'thought_possession_sample_talk', 'textarea')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">4. Content</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Comment on all the dominant preoccupations of the subject including worry, phobia, somatic symptoms, ideas of reference, persecution, grandeur, hypochondriasis, worthlessness, helplessness, hopelessness, suicide, guilt, sin, nihilism, negation, love, control, infidelity, etc. Distinguish between ideas, overvalued ideas and delusion. Describe the delusion as primary/secondary, systematized/unsystematised, mood congruent/mood incongruent wherever relevant)
              </p>
              <div className="space-y-2">
                <h5 className="font-medium">1. Religious preoccupation/ Philosophical preoccupation/ Sex preoccupation/ Somatic preoccupation/ Preoccupation with precipitating factors/ Excess day dreaming etc.</h5>
                {renderField('Religious/ Philosophical/ Sex/ Somatic preoccupation/ Precipitating factors/ Excess day dreaming', 'thought_content_religious_preoccupation', 'textarea', null, 3, false)}
              </div>
              <div className="space-y-2">
                <h5 className="font-medium">2. Phobias</h5>
                {renderField('Phobias', 'thought_content_phobias', 'text', null, 3, false)}
              </div>
              <div className="space-y-2">
                <h5 className="font-medium">3. Ideas of: Hopelessness/Helplessness/Worthlessness/Guilt/Death wishes/Suicide/Homicide/Hypochondriacal</h5>
                {renderField('Ideas: Hopelessness/Helplessness/Worthlessness/Guilt/Death wishes/Suicide/Homicide/Hypochondriacal', 'thought_content_ideas', 'textarea', null, 3, false)}
              </div>
              <div className="space-y-2">
                <h5 className="font-medium">4. Delusions</h5>
                {renderField('a. Primary delusions', 'thought_content_delusions_primary')}
                {renderField('b. Secondary delusions', 'thought_content_delusions_secondary')}
                {renderField('c. Systematised/ Non systematized', 'thought_content_delusions_systematised')}
                {renderField('d. Mood congruent/ Mood incongruent', 'thought_content_delusions_mood_congruent')}
                {renderField('e. Types', 'thought_content_delusions_types')}
                {renderField('Sample Talk', 'thought_content_delusions_sample_talk', 'textarea')}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Section 10: Perceptual Disorders */}
      <div className="card">
        <button
          onClick={() => toggleSection(10)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">10. Perceptual Disorders</h3>
          {expandedSections.has(10) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(10) && (
          <div className="space-y-4">
            <div>
              <h4 className="font-semibold mb-2">1. Sensory Distortion</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Comment on the dulled or heightened perception and changes in quality)
              </p>
              {renderField('Sensory Distortion', 'perceptual_sensory_distortion', 'textarea')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">2. Sensory Deception</h4>
              <p className="text-sm text-gray-600 mb-2">
                (Comment on the following phenomena using the following guidelines: continuous v/s discontinuous, three dimensionality, control, clarity, veridicality, diurnal pattern, objective v/s subjective space, modality, content, response to content, insight into phenomena, Schneiderian hallucination etc. Distinguish between –true hallucination, pseudo-hallucination, imagery, illusion, autoscopic or other (specify))
              </p>
              {renderField('Sensory Deception', 'perceptual_sensory_deception', 'textarea')}
            </div>

            <div>
              <h4 className="font-semibold mb-2">3. Perception</h4>
              {renderField('1. Projection (a. Internal/External b. Illusion/ Hallucination)', 'perceptual_projection')}
              {renderField('2. Modality', 'perceptual_modality')}
              {renderField('3. Content', 'perceptual_content')}
              {renderField('4. Response to content', 'perceptual_response_to_content')}
              {renderField('5. Frequency & diurnal pattern', 'perceptual_frequency_diurnal_pattern')}
              {renderField('6. Thought echo/ Second person/ Third person (intensity, clarity, vividness & insight)', 'perceptual_thought_echo')}
              {renderField('Description', 'perceptual_description', 'textarea')}
              {renderField('7. Others (Extracampine/ Autoscopic/ Reflex/ Functional/ Pseudohallucinations etc.)', 'perceptual_others')}
            </div>
          </div>
        )}
      </div>

      {/* Section 11: Other Psychotic Phenomena */}
      <div className="card">
        <button
          onClick={() => toggleSection(11)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">11. Other Psychotic Phenomena</h3>
          {expandedSections.has(11) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(11) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">
              (Not detailed elsewhere using verbatim report– somatic passivity, made act, affect & impulse, others (specify))
            </p>
            {renderField('Other Psychotic Phenomena', 'other_psychotic_phenomena', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 12: Other Psychopathological Phenomena */}
      <div className="card">
        <button
          onClick={() => toggleSection(12)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">12. Other Psychopathological Phenomena</h3>
          {expandedSections.has(12) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(12) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">
              (Depersonalization – derealization/ Déjà vu/ Jamais vu/ Retrospective falsification/ Confabulation body image disturbance and other phenomena not listed above)
            </p>
            {renderField('Other Psychopathological Phenomena', 'other_psychopathological_phenomena', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 13: Judgement */}
      <div className="card">
        <button
          onClick={() => toggleSection(13)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">13. Judgement</h3>
          {expandedSections.has(13) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(13) && (
          <div className="space-y-4">
            {renderField('1. Test (a. Poor b. Satisfactory c. Intact)', 'judgement_test')}
            {renderField('2. Social (a. Poor b. Satisfactory c. Intact)', 'judgement_social')}
            {renderField('3. Personal (a. Poor b. Satisfactory c. Intact)', 'judgement_personal')}
          </div>
        )}
      </div>

      {/* Section 14: Insight */}
      <div className="card">
        <button
          onClick={() => toggleSection(14)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">14. Insight</h3>
          {expandedSections.has(14) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(14) && (
          <div className="space-y-4">
            <p className="text-sm text-gray-600 mb-2">
              (ASSESSMENT – 
              1. GRADE I (Complete denial of illness):
              2. GRADE II (Slight awareness of being sick but denying at the same time):
              3. GRADE III (Awareness of being sick but blaming it on external factors):
              4. GRADE IV (Awareness that illness is due to something unknown in the patient):
              5. GRADE V (Intellectual insight):
              6. GRADE VI (True emotional insight):)
            </p>
            {renderField('Insight (1. GRADE I (Complete denial of illness) 2. GRADE II (Slight awareness of being sick but denying at the same time) 3. GRADE III (Awareness of being sick but blaming it on external factors) 4. GRADE IV (Awareness that illness is due to something unknown in the patient) 5. GRADE V (Intellectual insight) 6. GRADE VI (True emotional insight))', 'insight', 'textarea', null, 4)}
          </div>
        )}
      </div>

      {/* Section 15: Verbatim Report */}
      <div className="card">
        <button
          onClick={() => toggleSection(15)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">15. Verbatim Report</h3>
          {expandedSections.has(15) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(15) && (
          <div className="space-y-4">
            {renderField('Verbatim Report', 'verbatim_report', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 16: Behavior Observation (BO) */}
      <div className="card">
        <button
          onClick={() => toggleSection(16)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">16. Behavior Observation (BO)</h3>
          {expandedSections.has(16) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(16) && (
          <div className="space-y-4">
            {renderField('Behavior Observation', 'behavior_observation', 'textarea')}
          </div>
        )}
      </div>
    </div>
  );
};

export default MentalStatusExaminationForm;

