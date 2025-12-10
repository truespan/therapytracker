import React, { useState, useEffect } from 'react';
import { caseHistoryAPI } from '../../services/api';
import { Save, Loader2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

const CaseHistoryForm = ({ userId, partnerId }) => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState(new Set([1])); // Section 1 expanded by default
  const [formData, setFormData] = useState({
    // Section 1: Identification Data
    identification_name: '',
    identification_age: '',
    identification_gender: '',
    identification_father_husband_name: '',
    identification_education: '',
    identification_occupation: '',
    identification_marital_status: '',
    identification_religion: '',
    identification_nationality: '',
    identification_mother_tongue: '',
    identification_residence: '',
    identification_family_income: '',
    identification_socio_economic_background: '',
    identification_family_type: '',
    identification_domicile: '',
    identification_address: '',
    identification_source_of_referral: '',
    identification_reason_for_referral: '',
    
    // Section 2: Informant's Data
    informant_name: '',
    informant_age: '',
    informant_sex: '',
    informant_education: '',
    informant_occupation: '',
    informant_marital_status: '',
    informant_religion: '',
    informant_nationality: '',
    informant_mother_tongue: '',
    informant_relation_duration: '',
    informant_consistency: '',
    informant_reliability: '',
    
    // Section 3: Patient's Report
    patient_report_reliability: '',
    
    // Section 4: Chief Complaints
    chief_complaints: [],
    
    // Section 5: Family History (partial - family members handled separately)
    family_history_family_tree: '',
    family_history_psychiatric_illness: '',
    family_history_interaction_communication: '',
    family_history_interaction_leadership: '',
    family_history_interaction_decision_making: '',
    family_history_interaction_role: '',
    family_history_interaction_family_rituals: '',
    family_history_interaction_cohesiveness: '',
    family_history_interaction_family_burden: '',
    family_history_expressed_emotion_warmth: '',
    family_history_expressed_emotion_hostility: '',
    family_history_expressed_emotion_critical_comments: '',
    family_history_expressed_emotion_emotional_over_involvement: '',
    family_history_expressed_emotion_reinforcement: '',
    family_history_consanguinity: '',
    family_history_economic_social_status: '',
    family_history_home_atmosphere: '',
    family_history_sibling_rivalry: '',
    
    // Section 6: Personal History
    personal_history_birth_date: '',
    personal_history_birth_place: '',
    personal_history_mother_condition_pregnancy: '',
    personal_history_mother_condition_delivery: '',
    personal_history_mother_condition_after_delivery: '',
    personal_history_nature_of_delivery: '',
    personal_history_birth_weight: '',
    personal_history_feeding_method: '',
    personal_history_milestones_physical_development: '',
    personal_history_neurotic_symptoms_childhood: '',
    personal_history_health_childhood: '',
    personal_history_childhood_disorders: '',
    personal_history_home_atmosphere_childhood: '',
    
    // Section 7: Scholastic
    scholastic_age_standard_admission: '',
    scholastic_highest_grade_completed: '',
    scholastic_change_institution_cause: '',
    scholastic_academic_performance: '',
    scholastic_reason_discontinuation: '',
    scholastic_adjustment_school: '',
    scholastic_peer_relationships: '',
    scholastic_disciplinary_problems: '',
    scholastic_further_education: '',
    scholastic_extracurricular_activities: '',
    
    // Section 8: Vocation
    vocation_age_starting: '',
    vocation_nature_position: '',
    vocation_change_job_cause: '',
    vocation_nature_duration_present_job: '',
    vocation_working_past_year: '',
    vocation_work_record: '',
    vocation_adjustment_peers_authority: '',
    vocation_work_position_ambition: '',
    
    // Section 9: Menstrual History
    menstrual_menarche_age: '',
    menstrual_information_acquired_from: '',
    menstrual_reaction: '',
    menstrual_associated_discomfort: '',
    menstrual_regularity: '',
    menstrual_last_date: '',
    menstrual_amenorrhea: '',
    menstrual_menopause: '',
    menstrual_related_symptoms: '',
    
    // Section 10: Sexual
    sexual_source_information: '',
    sexual_age_acquisition: '',
    sexual_reaction_attitude: '',
    sexual_libido: '',
    sexual_masturbation: '',
    sexual_fantasy: '',
    sexual_heterosexual_homosexual: '',
    sexual_pre_marital_extra_marital: '',
    sexual_deviance: '',
    
    // Section 11: Marital
    marital_date_of_marriage: '',
    marital_type: '',
    marital_age_at_marriage: '',
    marital_partner_age_at_marriage: '',
    marital_spouse_education: '',
    marital_spouse_occupation: '',
    marital_adjustment: '',
    marital_sexual_life: '',
    marital_number_children_details: '',
    marital_extra_marital_relations: '',
    marital_other_details: '',
    
    // Section 12: Forensic
    forensic_history: '',
    
    // Section 13: Medical
    medical_history_nature_illness: '',
    medical_history_doctors_consulted: '',
    medical_history_medication: '',
    medical_history_hospitalization: '',
    medical_history_degree_recovery: '',
    medical_history_accidents_operations: '',
    
    // Section 14: Premorbid Personality
    premorbid_personality_self: '',
    premorbid_personality_sociability: '',
    premorbid_personality_responsibility: '',
    premorbid_personality_work_leisure: '',
    premorbid_personality_mood: '',
    premorbid_personality_character: '',
    premorbid_personality_attitudes_standards: '',
    premorbid_personality_habits: '',
    premorbid_personality_adjustments: '',
    premorbid_personality_food_sleep_pattern: '',
    
    // Section 15: Fantasy Life
    fantasy_life: '',
    
    // Section 16: Present Illness
    present_illness_evolution_symptoms: '',
    present_illness_mode_onset: '',
    present_illness_course: '',
    present_illness_progress: '',
    present_illness_sleep_change: '',
    present_illness_appetite_change: '',
    present_illness_sexual_interest_change: '',
    present_illness_energy_change: '',
    present_illness_negative_history: '',
    present_illness_treatment_history: '',
    
    // Section 17-23
    problem_conception: '',
    patient_view_responsibility: '',
    patient_pervasive_mood: '',
    impact_patient_attitude: '',
    role_functioning_biological: '',
    personal_care_negative_symptoms: '',
    additional_information: ''
  });

  const [familyMembers, setFamilyMembers] = useState({
    father: {
      name: '', age: '', education: '', occupation: '', religion: '',
      nationality: '', mother_tongue: '', health: '', personality: '', relationship_attitude: ''
    },
    mother: {
      name: '', age: '', education: '', occupation: '', religion: '',
      nationality: '', mother_tongue: '', health: '', personality: '', relationship_attitude: ''
    },
    siblings: [],
    others: []
  });

  const [newComplaint, setNewComplaint] = useState('');

  useEffect(() => {
    if (userId) {
      loadCaseHistory();
    } else {
      // Reset form when userId is cleared
      setFormData({
        identification_name: '',
        identification_age: '',
        identification_gender: '',
        identification_father_husband_name: '',
        identification_education: '',
        identification_occupation: '',
        identification_marital_status: '',
        identification_religion: '',
        identification_nationality: '',
        identification_mother_tongue: '',
        identification_residence: '',
        identification_family_income: '',
        identification_socio_economic_background: '',
        identification_family_type: '',
        identification_domicile: '',
        identification_address: '',
        identification_source_of_referral: '',
        identification_reason_for_referral: '',
        informant_name: '',
        informant_age: '',
        informant_sex: '',
        informant_education: '',
        informant_occupation: '',
        informant_marital_status: '',
        informant_religion: '',
        informant_nationality: '',
        informant_mother_tongue: '',
        informant_relation_duration: '',
        informant_consistency: '',
        informant_reliability: '',
        patient_report_reliability: '',
        chief_complaints: [],
        family_history_family_tree: '',
        family_history_psychiatric_illness: '',
        family_history_interaction_communication: '',
        family_history_interaction_leadership: '',
        family_history_interaction_decision_making: '',
        family_history_interaction_role: '',
        family_history_interaction_family_rituals: '',
        family_history_interaction_cohesiveness: '',
        family_history_interaction_family_burden: '',
        family_history_expressed_emotion_warmth: '',
        family_history_expressed_emotion_hostility: '',
        family_history_expressed_emotion_critical_comments: '',
        family_history_expressed_emotion_emotional_over_involvement: '',
        family_history_expressed_emotion_reinforcement: '',
        family_history_consanguinity: '',
        family_history_economic_social_status: '',
        family_history_home_atmosphere: '',
        family_history_sibling_rivalry: '',
        personal_history_birth_date: '',
        personal_history_birth_place: '',
        personal_history_mother_condition_pregnancy: '',
        personal_history_mother_condition_delivery: '',
        personal_history_mother_condition_after_delivery: '',
        personal_history_nature_of_delivery: '',
        personal_history_birth_weight: '',
        personal_history_feeding_method: '',
        personal_history_milestones_physical_development: '',
        personal_history_neurotic_symptoms_childhood: '',
        personal_history_health_childhood: '',
        personal_history_childhood_disorders: '',
        personal_history_home_atmosphere_childhood: '',
        scholastic_age_standard_admission: '',
        scholastic_highest_grade_completed: '',
        scholastic_change_institution_cause: '',
        scholastic_academic_performance: '',
        scholastic_reason_discontinuation: '',
        scholastic_adjustment_school: '',
        scholastic_peer_relationships: '',
        scholastic_disciplinary_problems: '',
        scholastic_further_education: '',
        scholastic_extracurricular_activities: '',
        vocation_age_starting: '',
        vocation_nature_position: '',
        vocation_change_job_cause: '',
        vocation_nature_duration_present_job: '',
        vocation_working_past_year: '',
        vocation_work_record: '',
        vocation_adjustment_peers_authority: '',
        vocation_work_position_ambition: '',
        menstrual_menarche_age: '',
        menstrual_information_acquired_from: '',
        menstrual_reaction: '',
        menstrual_associated_discomfort: '',
        menstrual_regularity: '',
        menstrual_last_date: '',
        menstrual_amenorrhea: '',
        menstrual_menopause: '',
        menstrual_related_symptoms: '',
        sexual_source_information: '',
        sexual_age_acquisition: '',
        sexual_reaction_attitude: '',
        sexual_libido: '',
        sexual_masturbation: '',
        sexual_fantasy: '',
        sexual_heterosexual_homosexual: '',
        sexual_pre_marital_extra_marital: '',
        sexual_deviance: '',
        marital_date_of_marriage: '',
        marital_type: '',
        marital_age_at_marriage: '',
        marital_partner_age_at_marriage: '',
        marital_spouse_education: '',
        marital_spouse_occupation: '',
        marital_adjustment: '',
        marital_sexual_life: '',
        marital_number_children_details: '',
        marital_extra_marital_relations: '',
        marital_other_details: '',
        forensic_history: '',
        medical_history_nature_illness: '',
        medical_history_doctors_consulted: '',
        medical_history_medication: '',
        medical_history_hospitalization: '',
        medical_history_degree_recovery: '',
        medical_history_accidents_operations: '',
        premorbid_personality_self: '',
        premorbid_personality_sociability: '',
        premorbid_personality_responsibility: '',
        premorbid_personality_work_leisure: '',
        premorbid_personality_mood: '',
        premorbid_personality_character: '',
        premorbid_personality_attitudes_standards: '',
        premorbid_personality_habits: '',
        premorbid_personality_adjustments: '',
        premorbid_personality_food_sleep_pattern: '',
        fantasy_life: '',
        present_illness_evolution_symptoms: '',
        present_illness_mode_onset: '',
        present_illness_course: '',
        present_illness_progress: '',
        present_illness_sleep_change: '',
        present_illness_appetite_change: '',
        present_illness_sexual_interest_change: '',
        present_illness_energy_change: '',
        present_illness_negative_history: '',
        present_illness_treatment_history: '',
        problem_conception: '',
        patient_view_responsibility: '',
        patient_pervasive_mood: '',
        impact_patient_attitude: '',
        role_functioning_biological: '',
        personal_care_negative_symptoms: '',
        additional_information: ''
      });
      setFamilyMembers({
        father: {
          name: '', age: '', education: '', occupation: '', religion: '',
          nationality: '', mother_tongue: '', health: '', personality: '', relationship_attitude: ''
        },
        mother: {
          name: '', age: '', education: '', occupation: '', religion: '',
          nationality: '', mother_tongue: '', health: '', personality: '', relationship_attitude: ''
        },
        siblings: [],
        others: []
      });
      setLoading(false);
    }
  }, [userId]);

  const loadCaseHistory = async () => {
    if (!userId) {
      console.log('[CaseHistory] No userId provided, skipping load');
      setLoading(false);
      return;
    }

    try {
      console.log('[CaseHistory] Loading case history for userId:', userId);
      setLoading(true);
      const response = await caseHistoryAPI.get(userId);
      console.log('[CaseHistory] API response:', response.data);

      if (response.data.caseHistory) {
        console.log('[CaseHistory] Case history data found, loading into form');
        const ch = response.data.caseHistory;

        // Handle chief_complaints - can be array, string, or null
        let parsedComplaints = [];
        try {
          if (ch.chief_complaints) {
            if (Array.isArray(ch.chief_complaints)) {
              parsedComplaints = ch.chief_complaints;
            } else if (typeof ch.chief_complaints === 'string') {
              parsedComplaints = JSON.parse(ch.chief_complaints);
            }
          }
        } catch (e) {
          console.error('[CaseHistory] Error parsing chief_complaints:', e);
          parsedComplaints = [];
        }

        setFormData({
          identification_name: ch.identification_name || '',
          identification_age: ch.identification_age || '',
          identification_gender: ch.identification_gender || '',
          identification_father_husband_name: ch.identification_father_husband_name || '',
          identification_education: ch.identification_education || '',
          identification_occupation: ch.identification_occupation || '',
          identification_marital_status: ch.identification_marital_status || '',
          identification_religion: ch.identification_religion || '',
          identification_nationality: ch.identification_nationality || '',
          identification_mother_tongue: ch.identification_mother_tongue || '',
          identification_residence: ch.identification_residence || '',
          identification_family_income: ch.identification_family_income || '',
          identification_socio_economic_background: ch.identification_socio_economic_background || '',
          identification_family_type: ch.identification_family_type || '',
          identification_domicile: ch.identification_domicile || '',
          identification_address: ch.identification_address || '',
          identification_source_of_referral: ch.identification_source_of_referral || '',
          identification_reason_for_referral: ch.identification_reason_for_referral || '',
          informant_name: ch.informant_name || '',
          informant_age: ch.informant_age || '',
          informant_sex: ch.informant_sex || '',
          informant_education: ch.informant_education || '',
          informant_occupation: ch.informant_occupation || '',
          informant_marital_status: ch.informant_marital_status || '',
          informant_religion: ch.informant_religion || '',
          informant_nationality: ch.informant_nationality || '',
          informant_mother_tongue: ch.informant_mother_tongue || '',
          informant_relation_duration: ch.informant_relation_duration || '',
          informant_consistency: ch.informant_consistency || '',
          informant_reliability: ch.informant_reliability || '',
          patient_report_reliability: ch.patient_report_reliability || '',
          chief_complaints: parsedComplaints,
          family_history_family_tree: ch.family_history_family_tree || '',
          family_history_psychiatric_illness: ch.family_history_psychiatric_illness || '',
          family_history_interaction_communication: ch.family_history_interaction_communication || '',
          family_history_interaction_leadership: ch.family_history_interaction_leadership || '',
          family_history_interaction_decision_making: ch.family_history_interaction_decision_making || '',
          family_history_interaction_role: ch.family_history_interaction_role || '',
          family_history_interaction_family_rituals: ch.family_history_interaction_family_rituals || '',
          family_history_interaction_cohesiveness: ch.family_history_interaction_cohesiveness || '',
          family_history_interaction_family_burden: ch.family_history_interaction_family_burden || '',
          family_history_expressed_emotion_warmth: ch.family_history_expressed_emotion_warmth || '',
          family_history_expressed_emotion_hostility: ch.family_history_expressed_emotion_hostility || '',
          family_history_expressed_emotion_critical_comments: ch.family_history_expressed_emotion_critical_comments || '',
          family_history_expressed_emotion_emotional_over_involvement: ch.family_history_expressed_emotion_emotional_over_involvement || '',
          family_history_expressed_emotion_reinforcement: ch.family_history_expressed_emotion_reinforcement || '',
          family_history_consanguinity: ch.family_history_consanguinity || '',
          family_history_economic_social_status: ch.family_history_economic_social_status || '',
          family_history_home_atmosphere: ch.family_history_home_atmosphere || '',
          family_history_sibling_rivalry: ch.family_history_sibling_rivalry || '',
          personal_history_birth_date: ch.personal_history_birth_date || '',
          personal_history_birth_place: ch.personal_history_birth_place || '',
          personal_history_mother_condition_pregnancy: ch.personal_history_mother_condition_pregnancy || '',
          personal_history_mother_condition_delivery: ch.personal_history_mother_condition_delivery || '',
          personal_history_mother_condition_after_delivery: ch.personal_history_mother_condition_after_delivery || '',
          personal_history_nature_of_delivery: ch.personal_history_nature_of_delivery || '',
          personal_history_birth_weight: ch.personal_history_birth_weight || '',
          personal_history_feeding_method: ch.personal_history_feeding_method || '',
          personal_history_milestones_physical_development: ch.personal_history_milestones_physical_development || '',
          personal_history_neurotic_symptoms_childhood: ch.personal_history_neurotic_symptoms_childhood || '',
          personal_history_health_childhood: ch.personal_history_health_childhood || '',
          personal_history_childhood_disorders: ch.personal_history_childhood_disorders || '',
          personal_history_home_atmosphere_childhood: ch.personal_history_home_atmosphere_childhood || '',
          scholastic_age_standard_admission: ch.scholastic_age_standard_admission || '',
          scholastic_highest_grade_completed: ch.scholastic_highest_grade_completed || '',
          scholastic_change_institution_cause: ch.scholastic_change_institution_cause || '',
          scholastic_academic_performance: ch.scholastic_academic_performance || '',
          scholastic_reason_discontinuation: ch.scholastic_reason_discontinuation || '',
          scholastic_adjustment_school: ch.scholastic_adjustment_school || '',
          scholastic_peer_relationships: ch.scholastic_peer_relationships || '',
          scholastic_disciplinary_problems: ch.scholastic_disciplinary_problems || '',
          scholastic_further_education: ch.scholastic_further_education || '',
          scholastic_extracurricular_activities: ch.scholastic_extracurricular_activities || '',
          vocation_age_starting: ch.vocation_age_starting || '',
          vocation_nature_position: ch.vocation_nature_position || '',
          vocation_change_job_cause: ch.vocation_change_job_cause || '',
          vocation_nature_duration_present_job: ch.vocation_nature_duration_present_job || '',
          vocation_working_past_year: ch.vocation_working_past_year || '',
          vocation_work_record: ch.vocation_work_record || '',
          vocation_adjustment_peers_authority: ch.vocation_adjustment_peers_authority || '',
          vocation_work_position_ambition: ch.vocation_work_position_ambition || '',
          menstrual_menarche_age: ch.menstrual_menarche_age || '',
          menstrual_information_acquired_from: ch.menstrual_information_acquired_from || '',
          menstrual_reaction: ch.menstrual_reaction || '',
          menstrual_associated_discomfort: ch.menstrual_associated_discomfort || '',
          menstrual_regularity: ch.menstrual_regularity || '',
          menstrual_last_date: ch.menstrual_last_date || '',
          menstrual_amenorrhea: ch.menstrual_amenorrhea || '',
          menstrual_menopause: ch.menstrual_menopause || '',
          menstrual_related_symptoms: ch.menstrual_related_symptoms || '',
          sexual_source_information: ch.sexual_source_information || '',
          sexual_age_acquisition: ch.sexual_age_acquisition || '',
          sexual_reaction_attitude: ch.sexual_reaction_attitude || '',
          sexual_libido: ch.sexual_libido || '',
          sexual_masturbation: ch.sexual_masturbation || '',
          sexual_fantasy: ch.sexual_fantasy || '',
          sexual_heterosexual_homosexual: ch.sexual_heterosexual_homosexual || '',
          sexual_pre_marital_extra_marital: ch.sexual_pre_marital_extra_marital || '',
          sexual_deviance: ch.sexual_deviance || '',
          marital_date_of_marriage: ch.marital_date_of_marriage || '',
          marital_type: ch.marital_type || '',
          marital_age_at_marriage: ch.marital_age_at_marriage || '',
          marital_partner_age_at_marriage: ch.marital_partner_age_at_marriage || '',
          marital_spouse_education: ch.marital_spouse_education || '',
          marital_spouse_occupation: ch.marital_spouse_occupation || '',
          marital_adjustment: ch.marital_adjustment || '',
          marital_sexual_life: ch.marital_sexual_life || '',
          marital_number_children_details: ch.marital_number_children_details || '',
          marital_extra_marital_relations: ch.marital_extra_marital_relations || '',
          marital_other_details: ch.marital_other_details || '',
          forensic_history: ch.forensic_history || '',
          medical_history_nature_illness: ch.medical_history_nature_illness || '',
          medical_history_doctors_consulted: ch.medical_history_doctors_consulted || '',
          medical_history_medication: ch.medical_history_medication || '',
          medical_history_hospitalization: ch.medical_history_hospitalization || '',
          medical_history_degree_recovery: ch.medical_history_degree_recovery || '',
          medical_history_accidents_operations: ch.medical_history_accidents_operations || '',
          premorbid_personality_self: ch.premorbid_personality_self || '',
          premorbid_personality_sociability: ch.premorbid_personality_sociability || '',
          premorbid_personality_responsibility: ch.premorbid_personality_responsibility || '',
          premorbid_personality_work_leisure: ch.premorbid_personality_work_leisure || '',
          premorbid_personality_mood: ch.premorbid_personality_mood || '',
          premorbid_personality_character: ch.premorbid_personality_character || '',
          premorbid_personality_attitudes_standards: ch.premorbid_personality_attitudes_standards || '',
          premorbid_personality_habits: ch.premorbid_personality_habits || '',
          premorbid_personality_adjustments: ch.premorbid_personality_adjustments || '',
          premorbid_personality_food_sleep_pattern: ch.premorbid_personality_food_sleep_pattern || '',
          fantasy_life: ch.fantasy_life || '',
          present_illness_evolution_symptoms: ch.present_illness_evolution_symptoms || '',
          present_illness_mode_onset: ch.present_illness_mode_onset || '',
          present_illness_course: ch.present_illness_course || '',
          present_illness_progress: ch.present_illness_progress || '',
          present_illness_sleep_change: ch.present_illness_sleep_change || '',
          present_illness_appetite_change: ch.present_illness_appetite_change || '',
          present_illness_sexual_interest_change: ch.present_illness_sexual_interest_change || '',
          present_illness_energy_change: ch.present_illness_energy_change || '',
          present_illness_negative_history: ch.present_illness_negative_history || '',
          present_illness_treatment_history: ch.present_illness_treatment_history || '',
          problem_conception: ch.problem_conception || '',
          patient_view_responsibility: ch.patient_view_responsibility || '',
          patient_pervasive_mood: ch.patient_pervasive_mood || '',
          impact_patient_attitude: ch.impact_patient_attitude || '',
          role_functioning_biological: ch.role_functioning_biological || '',
          personal_care_negative_symptoms: ch.personal_care_negative_symptoms || '',
          additional_information: ch.additional_information || ''
        });

        // Load family members
        if (response.data.familyMembers && response.data.familyMembers.length > 0) {
          const members = response.data.familyMembers;
          const newFamilyMembers = {
            father: { name: '', age: '', education: '', occupation: '', religion: '', nationality: '', mother_tongue: '', health: '', personality: '', relationship_attitude: '' },
            mother: { name: '', age: '', education: '', occupation: '', religion: '', nationality: '', mother_tongue: '', health: '', personality: '', relationship_attitude: '' },
            siblings: [],
            others: []
          };

          members.forEach(member => {
            if (member.member_type === 'father') {
              newFamilyMembers.father = {
                name: member.name || '', age: member.age || '', education: member.education || '',
                occupation: member.occupation || '', religion: member.religion || '', nationality: member.nationality || '',
                mother_tongue: member.mother_tongue || '', health: member.health || '', personality: member.personality || '',
                relationship_attitude: member.relationship_attitude || ''
              };
            } else if (member.member_type === 'mother') {
              newFamilyMembers.mother = {
                name: member.name || '', age: member.age || '', education: member.education || '',
                occupation: member.occupation || '', religion: member.religion || '', nationality: member.nationality || '',
                mother_tongue: member.mother_tongue || '', health: member.health || '', personality: member.personality || '',
                relationship_attitude: member.relationship_attitude || ''
              };
            } else if (member.member_type === 'sibling') {
              newFamilyMembers.siblings.push({
                name: member.name || '', age: member.age || '', sex: member.sex || '', education: member.education || '',
                occupation: member.occupation || '', religion: member.religion || '', nationality: member.nationality || '',
                mother_tongue: member.mother_tongue || '', health: member.health || '', personality: member.personality || '',
                relationship_attitude: member.relationship_attitude || '', sibling_number: member.sibling_number || newFamilyMembers.siblings.length + 1
              });
            } else if (member.member_type === 'other') {
              newFamilyMembers.others.push({
                name: member.name || '', age: member.age || '', education: member.education || '',
                occupation: member.occupation || '', religion: member.religion || '', nationality: member.nationality || '',
                mother_tongue: member.mother_tongue || '', health: member.health || '', personality: member.personality || '',
                relationship_attitude: member.relationship_attitude || '', other_label: member.other_label || ''
              });
            }
          });

          setFamilyMembers(newFamilyMembers);
        }
      } else {
        console.log('[CaseHistory] No case history found for this user');
      }
    } catch (error) {
      console.error('[CaseHistory] Failed to load case history:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFamilyMemberChange = (type, index, field, value) => {
    setFamilyMembers(prev => {
      const newMembers = { ...prev };
      if (type === 'father' || type === 'mother') {
        newMembers[type] = { ...newMembers[type], [field]: value };
      } else {
        // Map 'sibling' -> 'siblings', 'other' -> 'others'
        const arrayKey = type === 'sibling' ? 'siblings' : 'others';
        newMembers[arrayKey] = [...newMembers[arrayKey]];
        newMembers[arrayKey][index] = { ...newMembers[arrayKey][index], [field]: value };
      }
      return newMembers;
    });
  };

  const addSibling = () => {
    setFamilyMembers(prev => ({
      ...prev,
      siblings: [...prev.siblings, {
        name: '', age: '', sex: '', education: '', occupation: '', religion: '',
        nationality: '', mother_tongue: '', health: '', personality: '',
        relationship_attitude: '', sibling_number: prev.siblings.length + 1
      }]
    }));
  };

  const removeSibling = (index) => {
    setFamilyMembers(prev => ({
      ...prev,
      siblings: prev.siblings.filter((_, i) => i !== index)
    }));
  };

  const addOther = () => {
    setFamilyMembers(prev => ({
      ...prev,
      others: [...prev.others, {
        name: '', age: '', education: '', occupation: '', religion: '',
        nationality: '', mother_tongue: '', health: '', personality: '',
        relationship_attitude: '', other_label: ''
      }]
    }));
  };

  const removeOther = (index) => {
    setFamilyMembers(prev => ({
      ...prev,
      others: prev.others.filter((_, i) => i !== index)
    }));
  };

  const addComplaint = () => {
    if (newComplaint.trim()) {
      setFormData(prev => ({
        ...prev,
        chief_complaints: [...prev.chief_complaints, newComplaint.trim()]
      }));
      setNewComplaint('');
    }
  };

  const removeComplaint = (index) => {
    setFormData(prev => ({
      ...prev,
      chief_complaints: prev.chief_complaints.filter((_, i) => i !== index)
    }));
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
    try {
      setSaving(true);
      
      // Helper function to clean up family member data
      const cleanFamilyMember = (member) => {
        const cleaned = { ...member };
        // Convert empty strings to null for numeric fields
        if (cleaned.age === '' || cleaned.age === null || cleaned.age === undefined) {
          cleaned.age = null;
        } else if (typeof cleaned.age === 'string') {
          const parsed = parseInt(cleaned.age, 10);
          cleaned.age = isNaN(parsed) ? null : parsed;
        }
        // Convert empty strings to null for sibling_number
        if (cleaned.sibling_number !== undefined) {
          if (cleaned.sibling_number === '' || cleaned.sibling_number === null) {
            cleaned.sibling_number = null;
          } else if (typeof cleaned.sibling_number === 'string') {
            const parsed = parseInt(cleaned.sibling_number, 10);
            cleaned.sibling_number = isNaN(parsed) ? null : parsed;
          }
        }
        // Convert empty strings to null for text fields
        Object.keys(cleaned).forEach(key => {
          if (key !== 'age' && key !== 'sibling_number' && key !== 'member_type') {
            if (cleaned[key] === '') {
              cleaned[key] = null;
            }
          }
        });
        return cleaned;
      };
      
      // Prepare family members array
      const familyMembersArray = [];
      
      // Add father
      if (familyMembers.father.name || familyMembers.father.age) {
        familyMembersArray.push(cleanFamilyMember({
          member_type: 'father',
          ...familyMembers.father
        }));
      }
      
      // Add mother
      if (familyMembers.mother.name || familyMembers.mother.age) {
        familyMembersArray.push(cleanFamilyMember({
          member_type: 'mother',
          ...familyMembers.mother
        }));
      }
      
      // Add siblings
      familyMembers.siblings.forEach((sibling, index) => {
        if (sibling.name || sibling.age) {
          familyMembersArray.push(cleanFamilyMember({
            member_type: 'sibling',
            ...sibling,
            sibling_number: sibling.sibling_number || index + 1
          }));
        }
      });
      
      // Add others
      familyMembers.others.forEach(other => {
        if (other.name || other.age) {
          familyMembersArray.push(cleanFamilyMember({
            member_type: 'other',
            ...other
          }));
        }
      });

      await caseHistoryAPI.save(userId, {
        caseHistory: formData,
        familyMembers: familyMembersArray
      });

      alert('Case history saved successfully!');
    } catch (error) {
      console.error('Failed to save case history:', error);
      alert('Failed to save case history. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const renderField = (label, fieldName, type = 'text', options = null, memberType = null, memberIndex = null) => {
    const value = memberType 
      ? (memberType === 'father' || memberType === 'mother'
          ? familyMembers[memberType][fieldName] || ''
          : familyMembers[memberType === 'sibling' ? 'siblings' : 'others'][memberIndex][fieldName] || '')
      : formData[fieldName] || '';

    const onChange = memberType
      ? (e) => handleFamilyMemberChange(memberType, memberIndex, fieldName, e.target.value)
      : (e) => handleInputChange(fieldName, e.target.value);

    return (
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        {type === 'textarea' ? (
          <textarea
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            rows={3}
          />
        ) : type === 'select' && options ? (
          <select
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">Select...</option>
            {options.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        ) : type === 'date' ? (
          <input
            type="date"
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        ) : type === 'number' ? (
          <input
            type="number"
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        ) : (
          <input
            type="text"
            value={value}
            onChange={onChange}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        )}
      </div>
    );
  };

  const renderFamilyMemberFields = (type, member, index = null) => {
    const isSibling = type === 'sibling';
    const isOther = type === 'other';
    const prefix = isSibling ? `Sibling ${index + 1}` : isOther ? `Other ${index + 1}` : type.charAt(0).toUpperCase() + type.slice(1);
    
    return (
      <div className="border border-gray-200 rounded-lg p-4 mb-4 bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h4 className="font-semibold text-gray-800">{prefix}</h4>
          {(isSibling || isOther) && (
            <button
              type="button"
              onClick={() => isSibling ? removeSibling(index) : removeOther(index)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {renderField(`${prefix} - Name`, 'name', 'text', null, type, index)}
          {renderField(`${prefix} - Age`, 'age', 'number', null, type, index)}
          {isSibling && renderField(`${prefix} - Sex`, 'sex', 'select', [
            { value: 'Male', label: 'Male' },
            { value: 'Female', label: 'Female' },
            { value: 'Others', label: 'Others' }
          ], type, index)}
          {renderField(`${prefix} - Education`, 'education', 'text', null, type, index)}
          {renderField(`${prefix} - Occupation`, 'occupation', 'text', null, type, index)}
          {renderField(`${prefix} - Religion`, 'religion', 'text', null, type, index)}
          {renderField(`${prefix} - Nationality`, 'nationality', 'text', null, type, index)}
          {renderField(`${prefix} - Mother Tongue`, 'mother_tongue', 'text', null, type, index)}
          {renderField(`${prefix} - Health`, 'health', 'textarea', null, type, index)}
          {renderField(`${prefix} - Personality`, 'personality', 'textarea', null, type, index)}
          {renderField(`${prefix} - Relationship with & attitude towards Patient`, 'relationship_attitude', 'textarea', null, type, index)}
          {isOther && renderField(`${prefix} - Label (e.g., Grandfather, Uncle)`, 'other_label', 'text', null, type, index)}
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    );
  }

  const sectionTitles = {
    1: 'Identification Data',
    2: "Informant's Data",
    3: "Patient's Report",
    4: 'Chief Complaints',
    5: 'Family History',
    6: 'Personal History',
    7: 'Scholastic and Extracurricular Activities',
    8: 'Vocation / Occupation',
    9: 'Menstrual History',
    10: 'Sexual Inclination & Practices',
    11: 'Marital History',
    12: 'Forensic History',
    13: 'Medical History (Physical/ Psychological)',
    14: 'Premorbid Personality',
    15: 'Fantasy Life',
    16: 'History of Present Illness',
    17: 'Is the problem conceived as interpersonal, somatic, neither?',
    18: "Patient's view of responsibility for the problems?",
    19: "Patient's pervasive and persistent mood.",
    20: "Impact of present illness on patient's attitude",
    21: 'Role functioning and Biological functions',
    22: 'Personal care and important negative symptoms',
    23: 'Additional Information'
  };

  return (
    <div className="space-y-6">
      {/* Save Button - Sticky at top */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200 py-3 mb-6 -mx-4 px-4 sm:mx-0 sm:px-0">
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
              Save Case History
            </>
          )}
        </button>
      </div>

      {/* Section 1: Identification Data */}
      <div className="card">
        <button
          onClick={() => toggleSection(1)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">1. {sectionTitles[1]}</h3>
          {expandedSections.has(1) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(1) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Name', 'identification_name')}
            {renderField('Age', 'identification_age', 'number')}
            {renderField('Gender', 'identification_gender')}
            {renderField("Father's/Husband's Name", 'identification_father_husband_name')}
            {renderField('Education', 'identification_education')}
            {renderField('Occupation', 'identification_occupation')}
            {renderField('Marital Status', 'identification_marital_status')}
            {renderField('Religion', 'identification_religion')}
            {renderField('Nationality', 'identification_nationality')}
            {renderField('Mother Tongue', 'identification_mother_tongue')}
            {renderField('Residence', 'identification_residence')}
            {renderField('Family Income (Monthly)', 'identification_family_income')}
            {renderField('Socio Economic Background', 'identification_socio_economic_background')}
            {renderField('Family Type', 'identification_family_type')}
            {renderField('Domicile', 'identification_domicile')}
            {renderField('Address', 'identification_address', 'textarea')}
            {renderField('Source of Referral', 'identification_source_of_referral')}
            {renderField('Reason for Referral', 'identification_reason_for_referral', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 2: Informant's Data */}
      <div className="card">
        <button
          onClick={() => toggleSection(2)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">2. {sectionTitles[2]}</h3>
          {expandedSections.has(2) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(2) && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {renderField('Name', 'informant_name')}
            {renderField('Age', 'informant_age', 'number')}
            {renderField('Sex', 'informant_sex')}
            {renderField('Education', 'informant_education')}
            {renderField('Occupation', 'informant_occupation')}
            {renderField('Marital Status', 'informant_marital_status')}
            {renderField('Religion', 'informant_religion')}
            {renderField('Nationality', 'informant_nationality')}
            {renderField('Mother Tongue', 'informant_mother_tongue')}
            {renderField('Relation (duration & continuity of stay) with The Patient', 'informant_relation_duration', 'textarea')}
            {renderField('Consistency & Corroborativeness of Information Provided', 'informant_consistency', 'textarea')}
            {renderField('Reliability of Information', 'informant_reliability', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 3: Patient's Report */}
      <div className="card">
        <button
          onClick={() => toggleSection(3)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">3. {sectionTitles[3]}</h3>
          {expandedSections.has(3) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(3) && (
          <div>
            {renderField('Reliability of Information', 'patient_report_reliability', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 4: Chief Complaints */}
      <div className="card">
        <button
          onClick={() => toggleSection(4)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">4. {sectionTitles[4]}</h3>
          {expandedSections.has(4) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(4) && (
          <div>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={newComplaint}
                onChange={(e) => setNewComplaint(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && addComplaint()}
                placeholder="Enter chief complaint"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
              <button
                type="button"
                onClick={addComplaint}
                className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-2">
              {formData.chief_complaints.map((complaint, index) => (
                <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                  <span>{complaint}</span>
                  <button
                    type="button"
                    onClick={() => removeComplaint(index)}
                    className="text-red-600 hover:text-red-800"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Section 5: Family History */}
      <div className="card">
        <button
          onClick={() => toggleSection(5)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">5. {sectionTitles[5]}</h3>
          {expandedSections.has(5) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(5) && (
          <div className="space-y-6">
            {renderField('1. Family Tree', 'family_history_family_tree', 'textarea')}
            {renderField('2. History of psychiatric illness /Retardation / Suicide / Substance /Dependency / Epilepsy', 'family_history_psychiatric_illness', 'textarea')}
            
            <div>
              <h4 className="font-semibold mb-4">3. History of family members</h4>
              
              {/* Father */}
              {renderFamilyMemberFields('father', familyMembers.father)}
              
              {/* Mother */}
              {renderFamilyMemberFields('mother', familyMembers.mother)}
              
              {/* Siblings */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">Siblings</h5>
                  <button
                    type="button"
                    onClick={addSibling}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add Sibling
                  </button>
                </div>
                {familyMembers.siblings.map((sibling, index) => 
                  renderFamilyMemberFields('sibling', sibling, index)
                )}
              </div>
              
              {/* Others */}
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <h5 className="font-medium">Others</h5>
                  <button
                    type="button"
                    onClick={addOther}
                    className="flex items-center gap-1 text-primary-600 hover:text-primary-800"
                  >
                    <Plus className="h-4 w-4" />
                    Add Other
                  </button>
                </div>
                {familyMembers.others.map((other, index) => 
                  renderFamilyMemberFields('other', other, index)
                )}
              </div>
              
              {renderField('Sibling Rivalry (if any)', 'family_history_sibling_rivalry', 'textarea')}
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">4. Family Interaction Pattern</h4>
              {renderField('Communication', 'family_history_interaction_communication', 'textarea')}
              {renderField('Leadership', 'family_history_interaction_leadership', 'textarea')}
              {renderField('Decision Making', 'family_history_interaction_decision_making', 'textarea')}
              {renderField('Role', 'family_history_interaction_role', 'textarea')}
              {renderField('Family Rituals', 'family_history_interaction_family_rituals', 'textarea')}
              {renderField('Cohesiveness', 'family_history_interaction_cohesiveness', 'textarea')}
              {renderField('Family Burden', 'family_history_interaction_family_burden', 'textarea')}
              
              <h5 className="font-medium mt-4 mb-2">Expressed Emotion</h5>
              {renderField('a) Warmth', 'family_history_expressed_emotion_warmth', 'text')}
              {renderField('b) Hostility', 'family_history_expressed_emotion_hostility', 'text')}
              {renderField('c) Critical comments', 'family_history_expressed_emotion_critical_comments', 'text')}
              {renderField('d) Emotional Over involvement', 'family_history_expressed_emotion_emotional_over_involvement', 'text')}
              {renderField('e) Reinforcement', 'family_history_expressed_emotion_reinforcement', 'text')}
            </div>
            
            {renderField('5. Consanguinity (Present / Absent)', 'family_history_consanguinity', 'text')}
            {renderField('6. Economic & Social Status', 'family_history_economic_social_status', 'textarea')}
            {renderField('7. Home Atmosphere', 'family_history_home_atmosphere', 'textarea')}
          </div>
        )}
      </div>

      {/* Continue with remaining sections... Due to length, I'll create a helper function */}
      {/* Sections 6-23 would follow the same pattern */}
      {/* For brevity, I'll show a few more key sections and then provide a pattern for the rest */}

      {/* Section 6: Personal History */}
      <div className="card">
        <button
          onClick={() => toggleSection(6)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">6. {sectionTitles[6]}</h3>
          {expandedSections.has(6) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(6) && (
          <div className="space-y-4">
            <h4 className="font-semibold">1. Birth & Development History</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Date of birth', 'personal_history_birth_date', 'date')}
              {renderField('Place of birth', 'personal_history_birth_place')}
              {renderField("Mother's condition during pregnancy", 'personal_history_mother_condition_pregnancy', 'textarea')}
              {renderField("Mother's condition during delivery", 'personal_history_mother_condition_delivery', 'textarea')}
              {renderField("Mother's condition after delivery", 'personal_history_mother_condition_after_delivery', 'textarea')}
              {renderField('Nature of delivery', 'personal_history_nature_of_delivery')}
              {renderField('Birth Weight', 'personal_history_birth_weight')}
              {renderField('Breast fed / Bottle fed', 'personal_history_feeding_method')}
              {renderField('Milestones of physical development', 'personal_history_milestones_physical_development', 'textarea')}
              {renderField('Neurotic symptoms during childhood', 'personal_history_neurotic_symptoms_childhood', 'textarea')}
              {renderField('Health during childhood', 'personal_history_health_childhood', 'textarea')}
            </div>
            {renderField('2. Presence of childhood disorders', 'personal_history_childhood_disorders', 'textarea')}
            {renderField('3. Home atmosphere in childhood and adolescence', 'personal_history_home_atmosphere_childhood', 'textarea')}
          </div>
        )}
      </div>

      {/* Remaining sections 7-23 follow similar pattern */}
      {/* I'll create a simplified version that shows all sections but with collapsible UI */}
      {/* For production, each section should be fully implemented like sections 1-6 above */}

      {/* Section 7: Scholastic and Extracurricular Activities */}
      <div className="card">
        <button
          onClick={() => toggleSection(7)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">7. {sectionTitles[7]}</h3>
          {expandedSections.has(7) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(7) && (
          <div className="space-y-4">
            <h4 className="font-semibold">Academic history</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Age & standard of admission', 'scholastic_age_standard_admission')}
              {renderField('Highest grade completed', 'scholastic_highest_grade_completed')}
              {renderField('Change of institution (cause)', 'scholastic_change_institution_cause', 'textarea')}
              {renderField('Academic performance', 'scholastic_academic_performance', 'textarea')}
              {renderField('Reason for discontinuation', 'scholastic_reason_discontinuation', 'textarea')}
              {renderField('Adjustment in school situation', 'scholastic_adjustment_school', 'textarea')}
              {renderField('Peer relationships', 'scholastic_peer_relationships', 'textarea')}
              {renderField('Any disciplinary problems', 'scholastic_disciplinary_problems', 'textarea')}
              {renderField('Further education (whether reality/wish)', 'scholastic_further_education', 'textarea')}
            </div>
            {renderField('Extracurricular Activities', 'scholastic_extracurricular_activities', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 8: Vocation / Occupation */}
      <div className="card">
        <button
          onClick={() => toggleSection(8)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">8. {sectionTitles[8]}</h3>
          {expandedSections.has(8) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(8) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Age of starting, nature, position', 'vocation_age_starting', 'textarea')}
              {renderField('Change of job (cause)', 'vocation_change_job_cause', 'textarea')}
              {renderField('Nature & Duration of present job', 'vocation_nature_duration_present_job', 'textarea')}
              {renderField('Has P been working in the past 1yr/ atleast 6mnths (a. Yes b. No)', 'vocation_working_past_year')}
              {renderField('Work record (a. Good b. Satisfactory c. Unsatisfactory)', 'vocation_work_record')}
              {renderField('Adjustment with peers and authority', 'vocation_adjustment_peers_authority', 'textarea')}
              {renderField('Work Position (Ambition): (a. Rising b. Static c. Falling)', 'vocation_work_position_ambition')}
            </div>
          </div>
        )}
      </div>

      {/* Section 9: Menstrual History */}
      <div className="card">
        <button
          onClick={() => toggleSection(9)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">9. {sectionTitles[9]}</h3>
          {expandedSections.has(9) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(9) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Menarche (Age of starting)', 'menstrual_menarche_age')}
              {renderField('Information acquired from', 'menstrual_information_acquired_from', 'textarea')}
              {renderField('Her reaction', 'menstrual_reaction', 'textarea')}
              {renderField('Associated Psychological/ Physical discomfort', 'menstrual_associated_discomfort', 'textarea')}
              {renderField('Regularity', 'menstrual_regularity')}
              {renderField('Last date of menstruation', 'menstrual_last_date', 'date')}
              {renderField('Any Amenorrhea', 'menstrual_amenorrhea', 'textarea')}
              {renderField('Menopause', 'menstrual_menopause', 'textarea')}
            </div>
            {renderField('Any related symptoms', 'menstrual_related_symptoms', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 10: Sexual Inclination & Practices */}
      <div className="card">
        <button
          onClick={() => toggleSection(10)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">10. {sectionTitles[10]}</h3>
          {expandedSections.has(10) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(10) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Source of sexual information (if any received)', 'sexual_source_information', 'textarea')}
              {renderField('Age of acquisition of information', 'sexual_age_acquisition')}
              {renderField('Reaction and attitude', 'sexual_reaction_attitude', 'textarea')}
              {renderField('Libido', 'sexual_libido', 'textarea')}
              {renderField('Masturbation', 'sexual_masturbation', 'textarea')}
              {renderField('Sexual fantasy', 'sexual_fantasy', 'textarea')}
              {renderField('Heterosexual/Homosexual experiences (specify if others)', 'sexual_heterosexual_homosexual', 'textarea')}
              {renderField('Pre-marital, Extra-marital relations (if any)', 'sexual_pre_marital_extra_marital', 'textarea')}
              {renderField('Sexual Deviance (a. Present b. Absent)', 'sexual_deviance')}
            </div>
          </div>
        )}
      </div>

      {/* Section 11: Marital History */}
      <div className="card">
        <button
          onClick={() => toggleSection(11)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">11. {sectionTitles[11]}</h3>
          {expandedSections.has(11) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(11) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Date of marriage', 'marital_date_of_marriage', 'date')}
              {renderField('Type of marriage', 'marital_type')}
              {renderField('Age at marriage', 'marital_age_at_marriage', 'number')}
              {renderField('Age of the partner at marriage', 'marital_partner_age_at_marriage', 'number')}
              {renderField('Education of the spouse', 'marital_spouse_education')}
              {renderField('Occupation of the spouse', 'marital_spouse_occupation')}
              {renderField('Marital adjustment', 'marital_adjustment', 'textarea')}
              {renderField('Sexual life', 'marital_sexual_life', 'textarea')}
              {renderField('Number of children & their details', 'marital_number_children_details', 'textarea')}
              {renderField('Extra marital relation/s', 'marital_extra_marital_relations', 'textarea')}
            </div>
            {renderField('Other important details', 'marital_other_details', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 12: Forensic History */}
      <div className="card">
        <button
          onClick={() => toggleSection(12)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">12. {sectionTitles[12]}</h3>
          {expandedSections.has(12) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(12) && (
          <div className="space-y-4">
            {renderField('Forensic History', 'forensic_history', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 13: Medical History (Physical/ Psychological) */}
      <div className="card">
        <button
          onClick={() => toggleSection(13)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">13. {sectionTitles[13]}</h3>
          {expandedSections.has(13) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(13) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('Nature of illness', 'medical_history_nature_illness', 'textarea')}
              {renderField('Doctor/s consulted', 'medical_history_doctors_consulted', 'textarea')}
              {renderField('Medication administered', 'medical_history_medication', 'textarea')}
              {renderField('Hospitalization record (if any)', 'medical_history_hospitalization', 'textarea')}
              {renderField('Degree of recovery', 'medical_history_degree_recovery', 'textarea')}
              {renderField('Accident/s or operation/s (if any)', 'medical_history_accidents_operations', 'textarea')}
            </div>
          </div>
        )}
      </div>

      {/* Section 14: Premorbid Personality */}
      <div className="card">
        <button
          onClick={() => toggleSection(14)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">14. {sectionTitles[14]}</h3>
          {expandedSections.has(14) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(14) && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {renderField('1. Self', 'premorbid_personality_self', 'textarea')}
              {renderField('2. Sociability', 'premorbid_personality_sociability', 'textarea')}
              {renderField('3. Responsibility taking', 'premorbid_personality_responsibility', 'textarea')}
              {renderField('4. Work & Leisure', 'premorbid_personality_work_leisure', 'textarea')}
              {renderField('5. Mood', 'premorbid_personality_mood', 'textarea')}
              {renderField('6. Character', 'premorbid_personality_character', 'textarea')}
              {renderField('7. Attitudes & Standards', 'premorbid_personality_attitudes_standards', 'textarea')}
              {renderField('8. Habits', 'premorbid_personality_habits', 'textarea')}
              {renderField('9. Adjustments', 'premorbid_personality_adjustments', 'textarea')}
              {renderField('10. Food & Sleep pattern', 'premorbid_personality_food_sleep_pattern', 'textarea')}
            </div>
          </div>
        )}
      </div>

      {/* Section 15: Fantasy Life */}
      <div className="card">
        <button
          onClick={() => toggleSection(15)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">15. {sectionTitles[15]}</h3>
          {expandedSections.has(15) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(15) && (
          <div className="space-y-4">
            {renderField('Fantasy Life', 'fantasy_life', 'textarea')}
          </div>
        )}
      </div>

      {/* Section 16: History of Present Illness */}
      <div className="card">
        <button
          onClick={() => toggleSection(16)}
          className="w-full flex items-center justify-between text-left mb-4"
        >
          <h3 className="text-lg font-semibold">16. {sectionTitles[16]}</h3>
          {expandedSections.has(16) ? <ChevronUp /> : <ChevronDown />}
        </button>
        {expandedSections.has(16) && (
          <div className="space-y-4">
            {renderField('1. Evolution and Sequence of Symptoms', 'present_illness_evolution_symptoms', 'textarea')}
            
            <div>
              <h4 className="font-semibold mb-2">2. Mode of onset</h4>
              {renderField('Mode of onset (a. Sudden/ Abrupt (within 48 hrs.) b. Acute (within 2weeks) c. Insidious (>2weeks))', 'present_illness_mode_onset', 'textarea')}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">3. Course of illness</h4>
              {renderField('Course of illness (a. Continuous b. Episodic c. Fluctuating d. Others (specify))', 'present_illness_course', 'textarea')}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">4. Progress</h4>
              {renderField('Progress (a. Status Quo b. Improving c. Deteriorating d. Static)', 'present_illness_progress', 'textarea')}
            </div>
            
            <div>
              <h4 className="font-semibold mb-2">5. Biological Functioning (Any change)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderField('1. Sleep (a. Unchanged b. Increased c. Decreased)', 'present_illness_sleep_change')}
                {renderField('2. Appetite (a. Unchanged b. Increased c. Decreased)', 'present_illness_appetite_change')}
                {renderField('3. Sexual interest & activity (a. Unchanged b. Increased c. Decreased)', 'present_illness_sexual_interest_change')}
                {renderField('4. Energy (a. Unchanged b. Increased c. Decreased)', 'present_illness_energy_change')}
              </div>
            </div>
            
            {renderField('6. Negative History', 'present_illness_negative_history', 'textarea')}
            {renderField('7. Treatment History', 'present_illness_treatment_history', 'textarea')}
          </div>
        )}
      </div>

      {/* Remaining sections 17-23 - Collapsible sections */}
      {[17, 18, 19, 20, 21, 22, 23].map(sectionNum => (
        <div key={sectionNum} className="card">
          <button
            onClick={() => toggleSection(sectionNum)}
            className="w-full flex items-center justify-between text-left mb-4"
          >
            <h3 className="text-lg font-semibold">{sectionNum}. {sectionTitles[sectionNum]}</h3>
            {expandedSections.has(sectionNum) ? <ChevronUp /> : <ChevronDown />}
          </button>
          {expandedSections.has(sectionNum) && (
            <div className="space-y-4">
              {/* Section-specific fields would go here */}
              {/* For now, showing a generic textarea for each section */}
              {renderField(sectionTitles[sectionNum], Object.keys(formData).find(key => key.startsWith(sectionNum === 17 ? 'problem_conception' : sectionNum === 18 ? 'patient_view_responsibility' : sectionNum === 19 ? 'patient_pervasive_mood' : sectionNum === 20 ? 'impact_patient_attitude' : sectionNum === 21 ? 'role_functioning_biological' : sectionNum === 22 ? 'personal_care_negative_symptoms' : 'additional_information')) || 'additional_information', 'textarea')}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default CaseHistoryForm;

