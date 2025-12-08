-- Case History Database Schema
-- This schema extends the existing database with case history tables

-- Main case history table
CREATE TABLE IF NOT EXISTS case_histories (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    partner_id INTEGER NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
    
    -- Section 1: Identification Data
    identification_name TEXT,
    identification_age INTEGER,
    identification_gender TEXT,
    identification_father_husband_name TEXT,
    identification_education TEXT,
    identification_occupation TEXT,
    identification_marital_status TEXT,
    identification_religion TEXT,
    identification_nationality TEXT,
    identification_mother_tongue TEXT,
    identification_residence TEXT,
    identification_family_income TEXT,
    identification_socio_economic_background TEXT,
    identification_family_type TEXT,
    identification_domicile TEXT,
    identification_address TEXT,
    identification_source_of_referral TEXT,
    identification_reason_for_referral TEXT,
    
    -- Section 2: Informant's Data
    informant_name TEXT,
    informant_age INTEGER,
    informant_sex TEXT,
    informant_education TEXT,
    informant_occupation TEXT,
    informant_marital_status TEXT,
    informant_religion TEXT,
    informant_nationality TEXT,
    informant_mother_tongue TEXT,
    informant_relation_duration TEXT,
    informant_consistency TEXT,
    informant_reliability TEXT,
    
    -- Section 3: Patient's Report
    patient_report_reliability TEXT,
    
    -- Section 4: Chief Complaints (stored as JSON array)
    chief_complaints JSONB DEFAULT '[]'::jsonb,
    
    -- Section 5: Family History (partial - family members in separate table)
    family_history_family_tree TEXT,
    family_history_psychiatric_illness TEXT,
    family_history_interaction_communication TEXT,
    family_history_interaction_leadership TEXT,
    family_history_interaction_decision_making TEXT,
    family_history_interaction_role TEXT,
    family_history_interaction_family_rituals TEXT,
    family_history_interaction_cohesiveness TEXT,
    family_history_interaction_family_burden TEXT,
    family_history_expressed_emotion_warmth TEXT,
    family_history_expressed_emotion_hostility TEXT,
    family_history_expressed_emotion_critical_comments TEXT,
    family_history_expressed_emotion_emotional_over_involvement TEXT,
    family_history_expressed_emotion_reinforcement TEXT,
    family_history_consanguinity TEXT,
    family_history_economic_social_status TEXT,
    family_history_home_atmosphere TEXT,
    family_history_sibling_rivalry TEXT,
    
    -- Section 6: Personal History
    personal_history_birth_date DATE,
    personal_history_birth_place TEXT,
    personal_history_mother_condition_pregnancy TEXT,
    personal_history_mother_condition_delivery TEXT,
    personal_history_mother_condition_after_delivery TEXT,
    personal_history_nature_of_delivery TEXT,
    personal_history_birth_weight TEXT,
    personal_history_feeding_method TEXT,
    personal_history_milestones_physical_development TEXT,
    personal_history_neurotic_symptoms_childhood TEXT,
    personal_history_health_childhood TEXT,
    personal_history_childhood_disorders TEXT,
    personal_history_home_atmosphere_childhood TEXT,
    
    -- Section 7: Scholastic and Extracurricular Activities
    scholastic_age_standard_admission TEXT,
    scholastic_highest_grade_completed TEXT,
    scholastic_change_institution_cause TEXT,
    scholastic_academic_performance TEXT,
    scholastic_reason_discontinuation TEXT,
    scholastic_adjustment_school TEXT,
    scholastic_peer_relationships TEXT,
    scholastic_disciplinary_problems TEXT,
    scholastic_further_education TEXT,
    scholastic_extracurricular_activities TEXT,
    
    -- Section 8: Vocation / Occupation
    vocation_age_starting TEXT,
    vocation_nature_position TEXT,
    vocation_change_job_cause TEXT,
    vocation_nature_duration_present_job TEXT,
    vocation_working_past_year TEXT,
    vocation_work_record TEXT,
    vocation_adjustment_peers_authority TEXT,
    vocation_work_position_ambition TEXT,
    
    -- Section 9: Menstrual History
    menstrual_menarche_age TEXT,
    menstrual_information_acquired_from TEXT,
    menstrual_reaction TEXT,
    menstrual_associated_discomfort TEXT,
    menstrual_regularity TEXT,
    menstrual_last_date DATE,
    menstrual_amenorrhea TEXT,
    menstrual_menopause TEXT,
    menstrual_related_symptoms TEXT,
    
    -- Section 10: Sexual Inclination & Practices
    sexual_source_information TEXT,
    sexual_age_acquisition TEXT,
    sexual_reaction_attitude TEXT,
    sexual_libido TEXT,
    sexual_masturbation TEXT,
    sexual_fantasy TEXT,
    sexual_heterosexual_homosexual TEXT,
    sexual_pre_marital_extra_marital TEXT,
    sexual_deviance TEXT,
    
    -- Section 11: Marital History
    marital_date_of_marriage DATE,
    marital_type TEXT,
    marital_age_at_marriage INTEGER,
    marital_partner_age_at_marriage INTEGER,
    marital_spouse_education TEXT,
    marital_spouse_occupation TEXT,
    marital_adjustment TEXT,
    marital_sexual_life TEXT,
    marital_number_children_details TEXT,
    marital_extra_marital_relations TEXT,
    marital_other_details TEXT,
    
    -- Section 12: Forensic History
    forensic_history TEXT,
    
    -- Section 13: Medical History
    medical_history_nature_illness TEXT,
    medical_history_doctors_consulted TEXT,
    medical_history_medication TEXT,
    medical_history_hospitalization TEXT,
    medical_history_degree_recovery TEXT,
    medical_history_accidents_operations TEXT,
    
    -- Section 14: Premorbid Personality
    premorbid_personality_self TEXT,
    premorbid_personality_sociability TEXT,
    premorbid_personality_responsibility TEXT,
    premorbid_personality_work_leisure TEXT,
    premorbid_personality_mood TEXT,
    premorbid_personality_character TEXT,
    premorbid_personality_attitudes_standards TEXT,
    premorbid_personality_habits TEXT,
    premorbid_personality_adjustments TEXT,
    premorbid_personality_food_sleep_pattern TEXT,
    
    -- Section 15: Fantasy Life
    fantasy_life TEXT,
    
    -- Section 16: History of Present Illness
    present_illness_evolution_symptoms TEXT,
    present_illness_mode_onset TEXT,
    present_illness_course TEXT,
    present_illness_progress TEXT,
    present_illness_sleep_change TEXT,
    present_illness_appetite_change TEXT,
    present_illness_sexual_interest_change TEXT,
    present_illness_energy_change TEXT,
    present_illness_negative_history TEXT,
    present_illness_treatment_history TEXT,
    
    -- Section 17: Problem Conception
    problem_conception TEXT,
    
    -- Section 18: Patient's View of Responsibility
    patient_view_responsibility TEXT,
    
    -- Section 19: Patient's Pervasive Mood
    patient_pervasive_mood TEXT,
    
    -- Section 20: Impact on Patient's Attitude
    impact_patient_attitude TEXT,
    
    -- Section 21: Role Functioning and Biological Functions
    role_functioning_biological TEXT,
    
    -- Section 22: Personal Care and Negative Symptoms
    personal_care_negative_symptoms TEXT,
    
    -- Section 23: Additional Information
    additional_information TEXT,
    
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, partner_id)
);

-- Family members table (for Section 5, subsection 3)
CREATE TABLE IF NOT EXISTS case_history_family_members (
    id SERIAL PRIMARY KEY,
    case_history_id INTEGER NOT NULL REFERENCES case_histories(id) ON DELETE CASCADE,
    member_type VARCHAR(20) NOT NULL CHECK (member_type IN ('father', 'mother', 'sibling', 'other')),
    name TEXT,
    age INTEGER,
    education TEXT,
    occupation TEXT,
    religion TEXT,
    nationality TEXT,
    mother_tongue TEXT,
    health TEXT,
    personality TEXT,
    relationship_attitude TEXT,
    sibling_number INTEGER, -- For ordering siblings (1, 2, 3, etc.)
    other_label TEXT, -- For "Others" category to specify who (e.g., "Grandfather", "Uncle")
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_case_histories_user ON case_histories(user_id);
CREATE INDEX IF NOT EXISTS idx_case_histories_partner ON case_histories(partner_id);
CREATE INDEX IF NOT EXISTS idx_case_history_family_members_case_history ON case_history_family_members(case_history_id);
CREATE INDEX IF NOT EXISTS idx_case_history_family_members_type ON case_history_family_members(member_type);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_case_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for case_histories
CREATE TRIGGER update_case_histories_updated_at
    BEFORE UPDATE ON case_histories
    FOR EACH ROW
    EXECUTE FUNCTION update_case_history_updated_at();

-- Create trigger for case_history_family_members
CREATE TRIGGER update_case_history_family_members_updated_at
    BEFORE UPDATE ON case_history_family_members
    FOR EACH ROW
    EXECUTE FUNCTION update_case_history_updated_at();

