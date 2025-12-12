-- Mental Status Examination data for partner dashboard
-- Stores text field responses per user/partner combination

CREATE TABLE IF NOT EXISTS mental_status_examinations (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,

    -- Section 1: General Appearance
    general_appearance_appearance TEXT,
    general_appearance_age TEXT,
    general_appearance_touch_with_surroundings TEXT,
    general_appearance_eye_contact TEXT,
    general_appearance_hair TEXT,
    general_appearance_rapport TEXT,
    general_appearance_comments TEXT,

    -- Section 2: Attitude
    attitude TEXT,
    attitude_manner_of_relating TEXT,
    attitude_rapport TEXT,

    -- Section 3: Motor Behavior (Conation)
    motor_behavior TEXT,

    -- Section 4: Speech
    speech_intensity_tone TEXT,
    speech_reaction_time TEXT,
    speech_speed TEXT,
    speech_prosody_tempo TEXT,
    speech_ease_of_speech TEXT,
    speech_productivity_volume TEXT,
    speech_relevant_irrelevant TEXT,
    speech_coherent_incoherent TEXT,
    speech_goal_direction TEXT,

    -- Section 5: Volition
    volition_made_phenomenon TEXT,
    volition_somatic_passivity TEXT,
    volition_echolalia_echopraxia TEXT,

    -- Section 6: Cognitive Functions
    cognitive_attention_concentration TEXT,
    cognitive_attention TEXT,
    cognitive_orientation_time TEXT,
    cognitive_orientation_space TEXT,
    cognitive_orientation_person TEXT,
    cognitive_orientation_situation TEXT,
    cognitive_orientation_sense_of_passage_of_time TEXT,
    cognitive_memory_immediate_digit_forward TEXT,
    cognitive_memory_immediate_digit_backward TEXT,
    cognitive_memory_immediate_word_recall TEXT,
    cognitive_memory_immediate TEXT,
    cognitive_memory_recent TEXT,
    cognitive_memory_remote TEXT,
    cognitive_abstract_ability TEXT,

    -- Section 7: General Intelligence
    intelligence_general_information TEXT,
    intelligence_calculation TEXT,
    intelligence_global_impression TEXT,
    intelligence_comprehension TEXT,
    intelligence_vocabulary TEXT,

    -- Section 8: Mood & Affect
    mood_affect_subjective TEXT,
    mood_affect_diurnal_variation TEXT,
    mood_affect_objective TEXT,
    mood_affect_depth TEXT,
    mood_affect_range TEXT,
    mood_affect_stability TEXT,
    mood_affect_congruence_to_thought TEXT,
    mood_affect_appropriate_to_situation TEXT,
    mood_affect_communicability TEXT,
    mood_affect_reactivity_to_stimulus TEXT,

    -- Section 9: Thought
    thought_stream TEXT,
    thought_stream_normal TEXT,
    thought_stream_retarded TEXT,
    thought_stream_retarded_thought_blocking TEXT,
    thought_stream_retarded_circumstantiality TEXT,
    thought_stream_accelerated TEXT,
    thought_stream_accelerated_flight_of_ideas TEXT,
    thought_stream_accelerated_prolixity TEXT,
    thought_stream_accelerated_pressure_of_speech TEXT,
    thought_form TEXT,
    thought_form_sample_talk TEXT,
    thought_possession_obsessions_compulsions TEXT,
    thought_possession_thought_alienation TEXT,
    thought_possession_thought_alienation_insertion TEXT,
    thought_possession_thought_alienation_broadcasting TEXT,
    thought_possession_thought_alienation_withdrawal TEXT,
    thought_possession_sample_talk TEXT,
    thought_content_religious_preoccupation TEXT,
    thought_content_phobias TEXT,
    thought_content_ideas TEXT,
    thought_content_ideas_hopelessness TEXT,
    thought_content_ideas_helplessness TEXT,
    thought_content_ideas_worthlessness TEXT,
    thought_content_ideas_guilt TEXT,
    thought_content_ideas_death_wishes TEXT,
    thought_content_ideas_suicide TEXT,
    thought_content_ideas_homicide TEXT,
    thought_content_ideas_hypochondriacal TEXT,
    thought_content_delusions_primary TEXT,
    thought_content_delusions_secondary TEXT,
    thought_content_delusions_systematised TEXT,
    thought_content_delusions_mood_congruent TEXT,
    thought_content_delusions_types TEXT,
    thought_content_delusions_sample_talk TEXT,

    -- Section 10: Perceptual Disorders
    perceptual_sensory_distortion TEXT,
    perceptual_sensory_deception TEXT,
    perceptual_projection TEXT,
    perceptual_modality TEXT,
    perceptual_content TEXT,
    perceptual_response_to_content TEXT,
    perceptual_frequency_diurnal_pattern TEXT,
    perceptual_thought_echo TEXT,
    perceptual_description TEXT,
    perceptual_others TEXT,

    -- Section 11: Other Psychotic Phenomena
    other_psychotic_phenomena TEXT,

    -- Section 12: Other Psychopathological Phenomena
    other_psychopathological_phenomena TEXT,

    -- Section 13: Judgement
    judgement_test TEXT,
    judgement_social TEXT,
    judgement_personal TEXT,

    -- Section 14: Insight
    insight TEXT,
    insight_details TEXT,

    -- Section 15: Verbatim Report
    verbatim_report TEXT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    CONSTRAINT mental_status_examinations_user_partner_unique UNIQUE (user_id, partner_id)
);

CREATE INDEX IF NOT EXISTS idx_mse_user ON mental_status_examinations(user_id);
CREATE INDEX IF NOT EXISTS idx_mse_partner ON mental_status_examinations(partner_id);








