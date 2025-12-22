/**
 * Encryption Constants for HIPAA & GDPR Compliance
 * Defines which fields should be encrypted for each data model
 */

// CaseHistory Model - Fields to encrypt (145+ sensitive fields)
const CASE_HISTORY_SENSITIVE_FIELDS = [
  // Section 1: Identification Data (High Sensitivity)
  'identification_name',
  'identification_father_husband_name',
  'identification_address',
  'identification_source_of_referral',
  'identification_reason_for_referral',
  
  // Section 2: Informant's Data (High Sensitivity)
  'informant_name',
  'informant_education',
  'informant_occupation',
  'informant_religion',
  'informant_nationality',
  'informant_mother_tongue',
  'informant_consistency',
  'informant_reliability',
  
  // Section 3: Patient's Report
  'patient_report_reliability',
  
  // Section 4: Chief Complaints (Medical Sensitivity)
  'chief_complaints',
  
  // Section 5: Family History (High Sensitivity)
  'family_history_family_tree',
  'family_history_psychiatric_illness',
  'family_history_interaction_communication',
  'family_history_interaction_leadership',
  'family_history_interaction_decision_making',
  'family_history_interaction_role',
  'family_history_interaction_family_rituals',
  'family_history_interaction_cohesiveness',
  'family_history_interaction_family_burden',
  'family_history_expressed_emotion_warmth',
  'family_history_expressed_emotion_hostility',
  'family_history_expressed_emotion_critical_comments',
  'family_history_expressed_emotion_emotional_over_involvement',
  'family_history_expressed_emotion_reinforcement',
  'family_history_consanguinity',
  'family_history_economic_social_status',
  'family_history_home_atmosphere',
  'family_history_sibling_rivalry',
  
  // Section 6: Personal History (Medical Sensitivity)
  'personal_history_birth_date',
  'personal_history_birth_place',
  'personal_history_mother_condition_pregnancy',
  'personal_history_mother_condition_delivery',
  'personal_history_mother_condition_after_delivery',
  'personal_history_nature_of_delivery',
  'personal_history_birth_weight',
  'personal_history_feeding_method',
  'personal_history_milestones_physical_development',
  'personal_history_neurotic_symptoms_childhood',
  'personal_history_health_childhood',
  'personal_history_childhood_disorders',
  'personal_history_home_atmosphere_childhood',
  
  // Section 7: Scholastic
  'scholastic_age_standard_admission',
  'scholastic_highest_grade_completed',
  'scholastic_change_institution_cause',
  'scholastic_academic_performance',
  'scholastic_reason_discontinuation',
  'scholastic_adjustment_school',
  'scholastic_peer_relationships',
  'scholastic_disciplinary_problems',
  'scholastic_further_education',
  'scholastic_extracurricular_activities',
  
  // Section 8: Vocation
  'vocation_age_starting',
  'vocation_nature_position',
  'vocation_change_job_cause',
  'vocation_nature_duration_present_job',
  'vocation_working_past_year',
  'vocation_work_record',
  'vocation_adjustment_peers_authority',
  'vocation_work_position_ambition',
  
  // Section 9: Menstrual History (High Sensitivity)
  'menstrual_menarche_age',
  'menstrual_information_acquired_from',
  'menstrual_reaction',
  'menstrual_associated_discomfort',
  'menstrual_regularity',
  'menstrual_last_date',
  'menstrual_amenorrhea',
  'menstrual_menopause',
  'menstrual_related_symptoms',
  
  // Section 10: Sexual (Very High Sensitivity)
  'sexual_source_information',
  'sexual_age_acquisition',
  'sexual_reaction_attitude',
  'sexual_libido',
  'sexual_masturbation',
  'sexual_fantasy',
  'sexual_heterosexual_homosexual',
  'sexual_pre_marital_extra_marital',
  'sexual_deviance',
  
  // Section 11: Marital (High Sensitivity)
  'marital_date_of_marriage',
  'marital_type',
  'marital_age_at_marriage',
  'marital_partner_age_at_marriage',
  'marital_spouse_education',
  'marital_spouse_occupation',
  'marital_adjustment',
  'marital_sexual_life',
  'marital_number_children_details',
  'marital_extra_marital_relations',
  'marital_other_details',
  
  // Section 12: Forensic (Very High Sensitivity)
  'forensic_history',
  
  // Section 13: Medical (High Sensitivity)
  'medical_history_nature_illness',
  'medical_history_doctors_consulted',
  'medical_history_medication',
  'medical_history_hospitalization',
  'medical_history_degree_recovery',
  'medical_history_accidents_operations',
  
  // Section 14: Premorbid Personality
  'premorbid_personality_self',
  'premorbid_personality_sociability',
  'premorbid_personality_responsibility',
  'premorbid_personality_work_leisure',
  'premorbid_personality_mood',
  'premorbid_personality_character',
  'premorbid_personality_attitudes_standards',
  'premorbid_personality_habits',
  'premorbid_personality_adjustments',
  'premorbid_personality_food_sleep_pattern',
  
  // Section 15: Fantasy Life
  'fantasy_life',
  
  // Section 16: Present Illness (Medical Sensitivity)
  'present_illness_evolution_symptoms',
  'present_illness_mode_onset',
  'present_illness_course',
  'present_illness_progress',
  'present_illness_sleep_change',
  'present_illness_appetite_change',
  'present_illness_sexual_interest_change',
  'present_illness_energy_change',
  'present_illness_negative_history',
  'present_illness_treatment_history',
  
  // Sections 17-23: Additional Information
  'problem_conception',
  'patient_view_responsibility',
  'patient_pervasive_mood',
  'impact_patient_attitude',
  'role_functioning_biological',
  'personal_care_negative_symptoms',
  'additional_information'
];

// MentalStatusExamination Model - Fields to encrypt (109+ fields)
// All fields except foreign keys and metadata
const MENTAL_STATUS_SENSITIVE_FIELDS = [
  // General Appearance
  'general_appearance_appearance',
  'general_appearance_age',
  'general_appearance_touch_with_surroundings',
  'general_appearance_eye_contact',
  'general_appearance_hair',
  'general_appearance_rapport',
  'general_appearance_comments',
  
  // Attitude
  'attitude',
  'attitude_manner_of_relating',
  'attitude_rapport',
  
  // Motor Behavior
  'motor_behavior',
  
  // Speech
  'speech_intensity_tone',
  'speech_reaction_time',
  'speech_speed',
  'speech_prosody_tempo',
  'speech_ease_of_speech',
  'speech_productivity_volume',
  'speech_relevant_irrelevant',
  'speech_coherent_incoherent',
  'speech_goal_direction',
  
  // Volition
  'volition_made_phenomenon',
  'volition_somatic_passivity',
  'volition_echolalia_echopraxia',
  
  // Cognitive - Attention & Concentration
  'cognitive_attention_concentration',
  'cognitive_attention',
  
  // Cognitive - Orientation
  'cognitive_orientation_time',
  'cognitive_orientation_space',
  'cognitive_orientation_person',
  'cognitive_orientation_situation',
  'cognitive_orientation_sense_of_passage_of_time',
  
  // Cognitive - Memory
  'cognitive_memory_immediate_digit_forward',
  'cognitive_memory_immediate_digit_backward',
  'cognitive_memory_immediate_word_recall',
  'cognitive_memory_immediate',
  'cognitive_memory_recent',
  'cognitive_memory_remote',
  
  // Cognitive - Abstract Ability
  'cognitive_abstract_ability',
  
  // Intelligence
  'intelligence_general_information',
  'intelligence_calculation',
  'intelligence_global_impression',
  'intelligence_comprehension',
  'intelligence_vocabulary',
  
  // Mood and Affect
  'mood_affect_subjective',
  'mood_affect_diurnal_variation',
  'mood_affect_objective',
  'mood_affect_depth',
  'mood_affect_range',
  'mood_affect_stability',
  'mood_affect_congruence_to_thought',
  'mood_affect_appropriate_to_situation',
  'mood_affect_communicability',
  'mood_affect_reactivity_to_stimulus',
  
  // Thought Stream
  'thought_stream',
  'thought_stream_normal',
  'thought_stream_retarded',
  'thought_stream_retarded_thought_blocking',
  'thought_stream_retarded_circumstantiality',
  'thought_stream_accelerated',
  'thought_stream_accelerated_flight_of_ideas',
  'thought_stream_accelerated_prolixity',
  'thought_stream_accelerated_pressure_of_speech',
  
  // Thought Form
  'thought_form',
  'thought_form_sample_talk',
  
  // Thought Possession
  'thought_possession_obsessions_compulsions',
  'thought_possession_thought_alienation',
  'thought_possession_thought_alienation_insertion',
  'thought_possession_thought_alienation_broadcasting',
  'thought_possession_thought_alienation_withdrawal',
  'thought_possession_sample_talk',
  
  // Thought Content
  'thought_content_religious_preoccupation',
  'thought_content_phobias',
  'thought_content_ideas',
  'thought_content_ideas_hopelessness',
  'thought_content_ideas_helplessness',
  'thought_content_ideas_worthlessness',
  'thought_content_ideas_guilt',
  'thought_content_ideas_death_wishes',
  'thought_content_ideas_suicide',
  'thought_content_ideas_homicide',
  'thought_content_ideas_hypochondriacal',
  'thought_content_delusions_primary',
  'thought_content_delusions_secondary',
  'thought_content_delusions_systematised',
  'thought_content_delusions_mood_congruent',
  'thought_content_delusions_types',
  'thought_content_delusions_sample_talk',
  
  // Perceptual Disturbances
  'perceptual_sensory_distortion',
  'perceptual_sensory_deception',
  'perceptual_projection',
  'perceptual_modality',
  'perceptual_content',
  'perceptual_response_to_content',
  'perceptual_frequency_diurnal_pattern',
  'perceptual_thought_echo',
  'perceptual_description',
  'perceptual_others',
  
  // Other Psychotic Phenomena
  'other_psychotic_phenomena',
  'other_psychopathological_phenomena',
  
  // Judgement
  'judgement_test',
  'judgement_social',
  'judgement_personal',
  
  // Insight
  'insight',
  'insight_details',
  
  // Verbatim Report (Very High Sensitivity)
  'verbatim_report'
];

// Questionnaire Response Model - Fields to encrypt
const QUESTIONNAIRE_SENSITIVE_FIELDS = [
  'answer_text',
  'additional_notes'
];

// Appointment Model - Fields to encrypt
const APPOINTMENT_SENSITIVE_FIELDS = [
  'notes'
];

// Fields that need to remain searchable (will use blind indexing)
const SEARCHABLE_ENCRYPTED_FIELDS = {
  case_history: [
    'identification_name',  // Patient search
    'chief_complaints'      // Symptom search
  ],
  mental_status: [],        // No searchable fields (all highly sensitive)
  questionnaire: [],        // No searchable fields
  appointment: []           // No searchable fields
};

// Data type mappings for key management
const DATA_TYPE_MAPPINGS = {
  case_history: 'case_history',
  mental_status_examination: 'mental_status',
  questionnaire_response: 'questionnaire',
  appointment: 'appointment'
};

// Encryption key types
const KEY_TYPES = {
  MASTER: 'master',
  ORGANIZATION: 'organization',
  DATA: 'data'
};

// Audit operation types
const AUDIT_OPERATIONS = {
  ENCRYPT: 'encrypt',
  DECRYPT: 'decrypt',
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',
  KEY_MANAGEMENT: 'key_management',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION_FAILURE: 'authorization_failure'
};

// HIPAA data retention periods (in days)
const HIPAA_RETENTION_PERIODS = {
  case_history: 2555,      // 7 years
  mental_status: 2555,     // 7 years  
  questionnaire: 2555,     // 7 years
  appointment: 2555,       // 7 years
  audit_log: 2555          // 7 years
};

// GDPR data categories for encryption
const GDPR_DATA_CATEGORIES = {
  SPECIAL: 'special_category',      // Health data, sexual orientation, etc.
  PERSONAL: 'personal_data',        // Names, addresses, etc.
  SENSITIVE: 'sensitive_data'       // Requires extra protection
};

// Field sensitivity levels for risk assessment
const SENSITIVITY_LEVELS = {
  LOW: 'low',           // Non-sensitive metadata
  MEDIUM: 'medium',     // Personal but not highly sensitive
  HIGH: 'high',         // Medical/psychological data
  VERY_HIGH: 'very_high' // Sexual, forensic, highly sensitive mental health data
};

// Map fields to sensitivity levels (for risk assessment and compliance reporting)
const FIELD_SENSITIVITY_MAP = {
  case_history: {
    // Very High Sensitivity
    'sexual_source_information': SENSITIVITY_LEVELS.VERY_HIGH,
    'sexual_masturbation': SENSITIVITY_LEVELS.VERY_HIGH,
    'sexual_fantasy': SENSITIVITY_LEVELS.VERY_HIGH,
    'sexual_deviance': SENSITIVITY_LEVELS.VERY_HIGH,
    'forensic_history': SENSITIVITY_LEVELS.VERY_HIGH,
    'marital_sexual_life': SENSITIVITY_LEVELS.VERY_HIGH,
    'marital_extra_marital_relations': SENSITIVITY_LEVELS.VERY_HIGH,
    
    // High Sensitivity
    'identification_name': SENSITIVITY_LEVELS.HIGH,
    'chief_complaints': SENSITIVITY_LEVELS.HIGH,
    'medical_history_nature_illness': SENSITIVITY_LEVELS.HIGH,
    'medical_history_medication': SENSITIVITY_LEVELS.HIGH,
    'present_illness_evolution_symptoms': SENSITIVITY_LEVELS.HIGH,
    'verbatim_report': SENSITIVITY_LEVELS.HIGH,
    
    // Medium Sensitivity
    'identification_address': SENSITIVITY_LEVELS.MEDIUM,
    'identification_occupation': SENSITIVITY_LEVELS.MEDIUM,
    'informant_name': SENSITIVITY_LEVELS.MEDIUM
  }
};

module.exports = {
  CASE_HISTORY_SENSITIVE_FIELDS,
  MENTAL_STATUS_SENSITIVE_FIELDS,
  QUESTIONNAIRE_SENSITIVE_FIELDS,
  APPOINTMENT_SENSITIVE_FIELDS,
  SEARCHABLE_ENCRYPTED_FIELDS,
  DATA_TYPE_MAPPINGS,
  KEY_TYPES,
  AUDIT_OPERATIONS,
  HIPAA_RETENTION_PERIODS,
  GDPR_DATA_CATEGORIES,
  SENSITIVITY_LEVELS,
  FIELD_SENSITIVITY_MAP
};