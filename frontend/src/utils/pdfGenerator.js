import jsPDF from 'jspdf';

/**
 * Generate PDF for Case History form
 */
export const generateCaseHistoryPDF = (formData, familyMembers, userName) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (2 * margin);
  const lineHeight = 7;
  const sectionSpacing = 10;

  // Helper function to add text with word wrap
  const addText = (text, x, y, maxWidth, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text || 'Not provided', maxWidth);
    doc.text(lines, x, y);
    return lines.length * lineHeight;
  };

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Case History', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Patient: ${userName || 'N/A'}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += sectionSpacing;

  // Section 1: Identification Data
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Identification Data', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  const identificationFields = [
    { label: 'Name', value: formData.identification_name },
    { label: 'Age', value: formData.identification_age },
    { label: 'Gender', value: formData.identification_gender },
    { label: "Father's/Husband's Name", value: formData.identification_father_husband_name },
    { label: 'Education', value: formData.identification_education },
    { label: 'Occupation', value: formData.identification_occupation },
    { label: 'Marital Status', value: formData.identification_marital_status },
    { label: 'Religion', value: formData.identification_religion },
    { label: 'Nationality', value: formData.identification_nationality },
    { label: 'Mother Tongue', value: formData.identification_mother_tongue },
    { label: 'Residence', value: formData.identification_residence },
    { label: 'Family Income (Monthly)', value: formData.identification_family_income },
    { label: 'Socio Economic Background', value: formData.identification_socio_economic_background },
    { label: 'Family Type', value: formData.identification_family_type },
    { label: 'Domicile', value: formData.identification_domicile },
    { label: 'Address', value: formData.identification_address },
    { label: 'Source of Referral', value: formData.identification_source_of_referral },
    { label: 'Reason for Referral', value: formData.identification_reason_for_referral },
  ];

  identificationFields.forEach(field => {
    checkNewPage(10);
    const height = addText(`${field.label}: ${field.value}`, margin, yPosition, maxWidth);
    yPosition += height + 2;
  });

  yPosition += sectionSpacing;

  // Section 2: Informant's Data
  checkNewPage(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('2. Informant\'s Data', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  const informantFields = [
    { label: 'Name', value: formData.informant_name },
    { label: 'Age', value: formData.informant_age },
    { label: 'Sex', value: formData.informant_sex },
    { label: 'Education', value: formData.informant_education },
    { label: 'Occupation', value: formData.informant_occupation },
    { label: 'Marital Status', value: formData.informant_marital_status },
    { label: 'Religion', value: formData.informant_religion },
    { label: 'Nationality', value: formData.informant_nationality },
    { label: 'Mother Tongue', value: formData.informant_mother_tongue },
    { label: 'Relation (duration & continuity of stay) with The Patient', value: formData.informant_relation_duration },
    { label: 'Consistency & Corroborativeness of Information Provided', value: formData.informant_consistency },
    { label: 'Reliability of Information', value: formData.informant_reliability },
  ];

  informantFields.forEach(field => {
    checkNewPage(10);
    const height = addText(`${field.label}: ${field.value}`, margin, yPosition, maxWidth);
    yPosition += height + 2;
  });

  yPosition += sectionSpacing;

  // Section 3: Patient's Report
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('3. Patient\'s Report', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  checkNewPage(10);
  const patientReportHeight = addText(`Reliability of Information: ${formData.patient_report_reliability}`, margin, yPosition, maxWidth);
  yPosition += patientReportHeight + sectionSpacing;

  // Section 4: Chief Complaints
  checkNewPage(10);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('4. Chief Complaints', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  if (formData.chief_complaints && formData.chief_complaints.length > 0) {
    formData.chief_complaints.forEach((complaint, index) => {
      checkNewPage(8);
      const height = addText(`${index + 1}. ${complaint}`, margin, yPosition, maxWidth);
      yPosition += height + 2;
    });
  } else {
    checkNewPage(8);
    yPosition += addText('No complaints recorded', margin, yPosition, maxWidth) + 2;
  }
  yPosition += sectionSpacing;

  // Section 5: Family History
  checkNewPage(15);
  doc.setFontSize(14);
  doc.setFont('helvetica', 'bold');
  doc.text('5. Family History', margin, yPosition);
  yPosition += 8;
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');

  // Family Tree
  checkNewPage(10);
  const familyTreeHeight = addText(`Family Tree: ${formData.family_history_family_tree}`, margin, yPosition, maxWidth);
  yPosition += familyTreeHeight + 5;

  // Family Members
  if (familyMembers) {
    if (familyMembers.father && (familyMembers.father.name || familyMembers.father.age)) {
      checkNewPage(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Father:', margin, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      const fatherFields = ['name', 'age', 'education', 'occupation', 'religion', 'nationality', 'mother_tongue', 'health', 'personality', 'relationship_attitude'];
      fatherFields.forEach(field => {
        checkNewPage(8);
        const value = familyMembers.father[field] || '';
        if (value) {
          const height = addText(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`, margin + 5, yPosition, maxWidth - 5);
          yPosition += height + 2;
        }
      });
      yPosition += 3;
    }

    if (familyMembers.mother && (familyMembers.mother.name || familyMembers.mother.age)) {
      checkNewPage(15);
      doc.setFont('helvetica', 'bold');
      doc.text('Mother:', margin, yPosition);
      yPosition += 6;
      doc.setFont('helvetica', 'normal');
      const motherFields = ['name', 'age', 'education', 'occupation', 'religion', 'nationality', 'mother_tongue', 'health', 'personality', 'relationship_attitude'];
      motherFields.forEach(field => {
        checkNewPage(8);
        const value = familyMembers.mother[field] || '';
        if (value) {
          const height = addText(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`, margin + 5, yPosition, maxWidth - 5);
          yPosition += height + 2;
        }
      });
      yPosition += 3;
    }

    if (familyMembers.siblings && familyMembers.siblings.length > 0) {
      familyMembers.siblings.forEach((sibling, index) => {
        checkNewPage(15);
        doc.setFont('helvetica', 'bold');
        doc.text(`Sibling ${index + 1}:`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        const siblingFields = ['name', 'age', 'sex', 'education', 'occupation', 'religion', 'nationality', 'mother_tongue', 'health', 'personality', 'relationship_attitude'];
        siblingFields.forEach(field => {
          checkNewPage(8);
          const value = sibling[field] || '';
          if (value) {
            const height = addText(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`, margin + 5, yPosition, maxWidth - 5);
            yPosition += height + 2;
          }
        });
        yPosition += 3;
      });
    }

    if (familyMembers.others && familyMembers.others.length > 0) {
      familyMembers.others.forEach((other, index) => {
        checkNewPage(15);
        doc.setFont('helvetica', 'bold');
        doc.text(`Other ${index + 1} (${other.other_label || 'Family Member'}):`, margin, yPosition);
        yPosition += 6;
        doc.setFont('helvetica', 'normal');
        const otherFields = ['name', 'age', 'education', 'occupation', 'religion', 'nationality', 'mother_tongue', 'health', 'personality', 'relationship_attitude'];
        otherFields.forEach(field => {
          checkNewPage(8);
          const value = other[field] || '';
          if (value) {
            const height = addText(`${field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}: ${value}`, margin + 5, yPosition, maxWidth - 5);
            yPosition += height + 2;
          }
        });
        yPosition += 3;
      });
    }
  }

  // Family History other fields
  const familyHistoryFields = [
    { label: 'History of psychiatric illness /Retardation / Suicide / Substance /Dependency / Epilepsy', value: formData.family_history_psychiatric_illness },
    { label: 'Communication', value: formData.family_history_interaction_communication },
    { label: 'Leadership', value: formData.family_history_interaction_leadership },
    { label: 'Decision Making', value: formData.family_history_interaction_decision_making },
    { label: 'Role', value: formData.family_history_interaction_role },
    { label: 'Family Rituals', value: formData.family_history_interaction_family_rituals },
    { label: 'Cohesiveness', value: formData.family_history_interaction_cohesiveness },
    { label: 'Family Burden', value: formData.family_history_interaction_family_burden },
    { label: 'Expressed Emotion - Warmth', value: formData.family_history_expressed_emotion_warmth },
    { label: 'Expressed Emotion - Hostility', value: formData.family_history_expressed_emotion_hostility },
    { label: 'Expressed Emotion - Critical comments', value: formData.family_history_expressed_emotion_critical_comments },
    { label: 'Expressed Emotion - Emotional Over involvement', value: formData.family_history_expressed_emotion_emotional_over_involvement },
    { label: 'Expressed Emotion - Reinforcement', value: formData.family_history_expressed_emotion_reinforcement },
    { label: 'Consanguinity (Present / Absent)', value: formData.family_history_consanguinity },
    { label: 'Economic & Social Status', value: formData.family_history_economic_social_status },
    { label: 'Home Atmosphere', value: formData.family_history_home_atmosphere },
    { label: 'Sibling Rivalry (if any)', value: formData.family_history_sibling_rivalry },
  ];

  familyHistoryFields.forEach(field => {
    checkNewPage(10);
    const height = addText(`${field.label}: ${field.value}`, margin, yPosition, maxWidth);
    yPosition += height + 2;
  });

  yPosition += sectionSpacing;

  // Continue with remaining sections (6-23) - similar pattern
  const remainingSections = [
    { num: 6, title: 'Personal History', fields: [
      { label: 'Date of birth', value: formData.personal_history_birth_date },
      { label: 'Place of birth', value: formData.personal_history_birth_place },
      { label: "Mother's condition during pregnancy", value: formData.personal_history_mother_condition_pregnancy },
      { label: "Mother's condition during delivery", value: formData.personal_history_mother_condition_delivery },
      { label: "Mother's condition after delivery", value: formData.personal_history_mother_condition_after_delivery },
      { label: 'Nature of delivery', value: formData.personal_history_nature_of_delivery },
      { label: 'Birth Weight', value: formData.personal_history_birth_weight },
      { label: 'Breast fed / Bottle fed', value: formData.personal_history_feeding_method },
      { label: 'Milestones of physical development', value: formData.personal_history_milestones_physical_development },
      { label: 'Neurotic symptoms during childhood', value: formData.personal_history_neurotic_symptoms_childhood },
      { label: 'Health during childhood', value: formData.personal_history_health_childhood },
      { label: 'Presence of childhood disorders', value: formData.personal_history_childhood_disorders },
      { label: 'Home atmosphere in childhood and adolescence', value: formData.personal_history_home_atmosphere_childhood },
    ]},
    { num: 7, title: 'Scholastic and Extracurricular Activities', fields: [
      { label: 'Age & standard of admission', value: formData.scholastic_age_standard_admission },
      { label: 'Highest grade completed', value: formData.scholastic_highest_grade_completed },
      { label: 'Change of institution (cause)', value: formData.scholastic_change_institution_cause },
      { label: 'Academic performance', value: formData.scholastic_academic_performance },
      { label: 'Reason for discontinuation', value: formData.scholastic_reason_discontinuation },
      { label: 'Adjustment in school situation', value: formData.scholastic_adjustment_school },
      { label: 'Peer relationships', value: formData.scholastic_peer_relationships },
      { label: 'Any disciplinary problems', value: formData.scholastic_disciplinary_problems },
      { label: 'Further education (whether reality/wish)', value: formData.scholastic_further_education },
      { label: 'Extracurricular Activities', value: formData.scholastic_extracurricular_activities },
    ]},
    { num: 8, title: 'Vocation / Occupation', fields: [
      { label: 'Age of starting, nature, position', value: formData.vocation_age_starting },
      { label: 'Change of job (cause)', value: formData.vocation_change_job_cause },
      { label: 'Nature & Duration of present job', value: formData.vocation_nature_duration_present_job },
      { label: 'Has P been working in the past 1yr/ atleast 6mnths', value: formData.vocation_working_past_year },
      { label: 'Work record', value: formData.vocation_work_record },
      { label: 'Adjustment with peers and authority', value: formData.vocation_adjustment_peers_authority },
      { label: 'Work Position (Ambition)', value: formData.vocation_work_position_ambition },
    ]},
    { num: 9, title: 'Menstrual History', fields: [
      { label: 'Menarche (Age of starting)', value: formData.menstrual_menarche_age },
      { label: 'Information acquired from', value: formData.menstrual_information_acquired_from },
      { label: 'Her reaction', value: formData.menstrual_reaction },
      { label: 'Associated Psychological/ Physical discomfort', value: formData.menstrual_associated_discomfort },
      { label: 'Regularity', value: formData.menstrual_regularity },
      { label: 'Last date of menstruation', value: formData.menstrual_last_date },
      { label: 'Any Amenorrhea', value: formData.menstrual_amenorrhea },
      { label: 'Menopause', value: formData.menstrual_menopause },
      { label: 'Any related symptoms', value: formData.menstrual_related_symptoms },
    ]},
    { num: 10, title: 'Sexual Inclination & Practices', fields: [
      { label: 'Source of sexual information (if any received)', value: formData.sexual_source_information },
      { label: 'Age of acquisition of information', value: formData.sexual_age_acquisition },
      { label: 'Reaction and attitude', value: formData.sexual_reaction_attitude },
      { label: 'Libido', value: formData.sexual_libido },
      { label: 'Masturbation', value: formData.sexual_masturbation },
      { label: 'Sexual fantasy', value: formData.sexual_fantasy },
      { label: 'Heterosexual/Homosexual experiences', value: formData.sexual_heterosexual_homosexual },
      { label: 'Pre-marital, Extra-marital relations (if any)', value: formData.sexual_pre_marital_extra_marital },
      { label: 'Sexual Deviance', value: formData.sexual_deviance },
    ]},
    { num: 11, title: 'Marital History', fields: [
      { label: 'Date of marriage', value: formData.marital_date_of_marriage },
      { label: 'Type of marriage', value: formData.marital_type },
      { label: 'Age at marriage', value: formData.marital_age_at_marriage },
      { label: 'Age of the partner at marriage', value: formData.marital_partner_age_at_marriage },
      { label: 'Education of the spouse', value: formData.marital_spouse_education },
      { label: 'Occupation of the spouse', value: formData.marital_spouse_occupation },
      { label: 'Marital adjustment', value: formData.marital_adjustment },
      { label: 'Sexual life', value: formData.marital_sexual_life },
      { label: 'Number of children & their details', value: formData.marital_number_children_details },
      { label: 'Extra marital relation/s', value: formData.marital_extra_marital_relations },
      { label: 'Other important details', value: formData.marital_other_details },
    ]},
    { num: 12, title: 'Forensic History', fields: [
      { label: 'Forensic History', value: formData.forensic_history },
    ]},
    { num: 13, title: 'Medical History (Physical/ Psychological)', fields: [
      { label: 'Nature of illness', value: formData.medical_history_nature_illness },
      { label: 'Doctor/s consulted', value: formData.medical_history_doctors_consulted },
      { label: 'Medication administered', value: formData.medical_history_medication },
      { label: 'Hospitalization record (if any)', value: formData.medical_history_hospitalization },
      { label: 'Degree of recovery', value: formData.medical_history_degree_recovery },
      { label: 'Accident/s or operation/s (if any)', value: formData.medical_history_accidents_operations },
    ]},
    { num: 14, title: 'Premorbid Personality', fields: [
      { label: 'Self', value: formData.premorbid_personality_self },
      { label: 'Sociability', value: formData.premorbid_personality_sociability },
      { label: 'Responsibility taking', value: formData.premorbid_personality_responsibility },
      { label: 'Work & Leisure', value: formData.premorbid_personality_work_leisure },
      { label: 'Mood', value: formData.premorbid_personality_mood },
      { label: 'Character', value: formData.premorbid_personality_character },
      { label: 'Attitudes & Standards', value: formData.premorbid_personality_attitudes_standards },
      { label: 'Habits', value: formData.premorbid_personality_habits },
      { label: 'Adjustments', value: formData.premorbid_personality_adjustments },
      { label: 'Food & Sleep pattern', value: formData.premorbid_personality_food_sleep_pattern },
    ]},
    { num: 15, title: 'Fantasy Life', fields: [
      { label: 'Fantasy Life', value: formData.fantasy_life },
    ]},
    { num: 16, title: 'History of Present Illness', fields: [
      { label: 'Evolution and Sequence of Symptoms', value: formData.present_illness_evolution_symptoms },
      { label: 'Mode of onset', value: formData.present_illness_mode_onset },
      { label: 'Course of illness', value: formData.present_illness_course },
      { label: 'Progress', value: formData.present_illness_progress },
      { label: 'Sleep (change)', value: formData.present_illness_sleep_change },
      { label: 'Appetite (change)', value: formData.present_illness_appetite_change },
      { label: 'Sexual interest & activity (change)', value: formData.present_illness_sexual_interest_change },
      { label: 'Energy (change)', value: formData.present_illness_energy_change },
      { label: 'Negative History', value: formData.present_illness_negative_history },
      { label: 'Treatment History', value: formData.present_illness_treatment_history },
    ]},
    { num: 17, title: 'Is the problem conceived as interpersonal, somatic, neither?', fields: [
      { label: 'Problem Conception', value: formData.problem_conception },
    ]},
    { num: 18, title: "Patient's view of responsibility for the problems?", fields: [
      { label: "Patient's view of responsibility", value: formData.patient_view_responsibility },
    ]},
    { num: 19, title: "Patient's pervasive and persistent mood.", fields: [
      { label: "Patient's pervasive mood", value: formData.patient_pervasive_mood },
    ]},
    { num: 20, title: "Impact of present illness on patient's attitude", fields: [
      { label: 'Impact on patient attitude', value: formData.impact_patient_attitude },
    ]},
    { num: 21, title: 'Role functioning and Biological functions', fields: [
      { label: 'Role functioning and Biological functions', value: formData.role_functioning_biological },
    ]},
    { num: 22, title: 'Personal care and important negative symptoms', fields: [
      { label: 'Personal care and negative symptoms', value: formData.personal_care_negative_symptoms },
    ]},
    { num: 23, title: 'Additional Information', fields: [
      { label: 'Additional Information', value: formData.additional_information },
    ]},
  ];

  remainingSections.forEach(section => {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${section.num}. ${section.title}`, margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    section.fields.forEach(field => {
      checkNewPage(10);
      const height = addText(`${field.label}: ${field.value}`, margin, yPosition, maxWidth);
      yPosition += height + 2;
    });

    yPosition += sectionSpacing;
  });

  // Save the PDF
  const fileName = `Case_History_${userName || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

/**
 * Generate PDF for Mental Status Examination form
 */
export const generateMentalStatusPDF = (formData, userName) => {
  const doc = new jsPDF();
  let yPosition = 20;
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;
  const maxWidth = pageWidth - (2 * margin);
  const lineHeight = 7;
  const sectionSpacing = 10;

  // Helper function to add text with word wrap
  const addText = (text, x, y, maxWidth, fontSize = 10) => {
    doc.setFontSize(fontSize);
    const lines = doc.splitTextToSize(text || 'Not provided', maxWidth);
    doc.text(lines, x, y);
    return lines.length * lineHeight;
  };

  // Helper function to add a new page if needed
  const checkNewPage = (requiredSpace) => {
    if (yPosition + requiredSpace > doc.internal.pageSize.getHeight() - 20) {
      doc.addPage();
      yPosition = 20;
      return true;
    }
    return false;
  };

  // Title
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('Mental Status Examination', margin, yPosition);
  yPosition += 10;
  
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Patient: ${userName || 'N/A'}`, margin, yPosition);
  yPosition += 8;
  doc.text(`Date: ${new Date().toLocaleDateString()}`, margin, yPosition);
  yPosition += sectionSpacing;

  // Define all sections with their fields
  const sections = [
    {
      num: 1,
      title: 'General Appearance',
      fields: [
        { label: 'Appearance', value: formData.general_appearance_appearance },
        { label: 'Age', value: formData.general_appearance_age },
        { label: 'Touch with the surroundings', value: formData.general_appearance_touch_with_surroundings },
        { label: 'Eye contact', value: formData.general_appearance_eye_contact },
        { label: 'Hair', value: formData.general_appearance_hair },
        { label: 'Rapport', value: formData.general_appearance_rapport },
        { label: 'Comments', value: formData.general_appearance_comments },
      ]
    },
    {
      num: 2,
      title: 'Attitude',
      fields: [
        { label: 'Attitude', value: formData.attitude },
        { label: 'Manner of relating', value: formData.attitude_manner_of_relating },
        { label: 'Rapport', value: formData.attitude_rapport },
      ]
    },
    {
      num: 3,
      title: 'Motor Behavior (Conation)',
      fields: [
        { label: 'Motor Behavior', value: formData.motor_behavior },
      ]
    },
    {
      num: 4,
      title: 'Speech',
      fields: [
        { label: 'Intensity/ Tone', value: formData.speech_intensity_tone },
        { label: 'Reaction time', value: formData.speech_reaction_time },
        { label: 'Speed', value: formData.speech_speed },
        { label: 'Prosody/ Tempo', value: formData.speech_prosody_tempo },
        { label: 'Ease of speech', value: formData.speech_ease_of_speech },
        { label: 'Productivity/ Volume', value: formData.speech_productivity_volume },
        { label: 'Relevant/ Irrelevant to Context/ Situation', value: formData.speech_relevant_irrelevant },
        { label: 'Coherent/ Incoherent', value: formData.speech_coherent_incoherent },
        { label: 'Goal-direction', value: formData.speech_goal_direction },
      ]
    },
    {
      num: 5,
      title: 'Volition',
      fields: [
        { label: 'Made phenomenon', value: formData.volition_made_phenomenon },
        { label: 'Somatic Passivity', value: formData.volition_somatic_passivity },
        { label: 'Echolalia/ Echopraxia/ Other Catatonic features', value: formData.volition_echolalia_echopraxia },
      ]
    },
    {
      num: 6,
      title: 'Cognitive Functions',
      fields: [
        { label: 'Attention & Concentration', value: formData.cognitive_attention_concentration },
        { label: 'Attention', value: formData.cognitive_attention },
        { label: 'Orientation - Time', value: formData.cognitive_orientation_time },
        { label: 'Orientation - Space', value: formData.cognitive_orientation_space },
        { label: 'Orientation - Person', value: formData.cognitive_orientation_person },
        { label: 'Orientation - Situation', value: formData.cognitive_orientation_situation },
        { label: 'Orientation - Sense of passage of time', value: formData.cognitive_orientation_sense_of_passage_of_time },
        { label: 'Memory - Immediate (Digit Forward, Digit Backward, Word Recall)', value: formData.cognitive_memory_immediate_digit_forward || formData.cognitive_memory_immediate_digit_backward || formData.cognitive_memory_immediate_word_recall || formData.cognitive_memory_immediate },
        { label: 'Memory - Recent', value: formData.cognitive_memory_recent },
        { label: 'Memory - Remote', value: formData.cognitive_memory_remote },
        { label: 'Abstract ability', value: formData.cognitive_abstract_ability },
      ]
    },
    {
      num: 7,
      title: 'General Intelligence',
      fields: [
        { label: 'General Information', value: formData.intelligence_general_information },
        { label: 'Calculation', value: formData.intelligence_calculation },
        { label: 'Intelligence (Global impression)', value: formData.intelligence_global_impression },
        { label: 'Comprehension', value: formData.intelligence_comprehension },
        { label: 'Vocabulary', value: formData.intelligence_vocabulary },
      ]
    },
    {
      num: 8,
      title: 'Mood & Affect',
      fields: [
        { label: 'Subjective', value: formData.mood_affect_subjective },
        { label: 'Diurnal variation', value: formData.mood_affect_diurnal_variation },
        { label: 'Objective Affect', value: formData.mood_affect_objective },
        { label: 'Depth', value: formData.mood_affect_depth },
        { label: 'Range', value: formData.mood_affect_range },
        { label: 'Stability', value: formData.mood_affect_stability },
        { label: 'Congruence to the thought', value: formData.mood_affect_congruence_to_thought },
        { label: 'Appropriate to the situation', value: formData.mood_affect_appropriate_to_situation },
        { label: 'Communicability', value: formData.mood_affect_communicability },
        { label: 'Reactivity to the stimulus', value: formData.mood_affect_reactivity_to_stimulus },
      ]
    },
    {
      num: 9,
      title: 'Thought',
      fields: [
        { label: 'Stream', value: formData.thought_stream },
        { label: 'Stream - Normal', value: formData.thought_stream_normal },
        { label: 'Stream - Retarded', value: formData.thought_stream_retarded },
        { label: 'Stream - Retarded (Thought Blocking)', value: formData.thought_stream_retarded_thought_blocking },
        { label: 'Stream - Retarded (Circumstantiality)', value: formData.thought_stream_retarded_circumstantiality },
        { label: 'Stream - Accelerated', value: formData.thought_stream_accelerated },
        { label: 'Stream - Accelerated (Flight of ideas)', value: formData.thought_stream_accelerated_flight_of_ideas },
        { label: 'Stream - Accelerated (Prolixity)', value: formData.thought_stream_accelerated_prolixity },
        { label: 'Stream - Accelerated (Pressure of speech)', value: formData.thought_stream_accelerated_pressure_of_speech },
        { label: 'Form', value: formData.thought_form },
        { label: 'Form - Sample Talk', value: formData.thought_form_sample_talk },
        { label: 'Possession - Obsessions & Compulsions', value: formData.thought_possession_obsessions_compulsions },
        { label: 'Possession - Thought Alienation', value: formData.thought_possession_thought_alienation },
        { label: 'Possession - Thought Alienation (Insertion)', value: formData.thought_possession_thought_alienation_insertion },
        { label: 'Possession - Thought Alienation (Broadcasting)', value: formData.thought_possession_thought_alienation_broadcasting },
        { label: 'Possession - Thought Alienation (Withdrawal)', value: formData.thought_possession_thought_alienation_withdrawal },
        { label: 'Possession - Sample Talk', value: formData.thought_possession_sample_talk },
        { label: 'Content - Religious preoccupation', value: formData.thought_content_religious_preoccupation },
        { label: 'Content - Phobias', value: formData.thought_content_phobias },
        { label: 'Content - Ideas', value: formData.thought_content_ideas },
        { label: 'Content - Ideas (Hopelessness)', value: formData.thought_content_ideas_hopelessness },
        { label: 'Content - Ideas (Helplessness)', value: formData.thought_content_ideas_helplessness },
        { label: 'Content - Ideas (Worthlessness)', value: formData.thought_content_ideas_worthlessness },
        { label: 'Content - Ideas (Guilt)', value: formData.thought_content_ideas_guilt },
        { label: 'Content - Ideas (Death wishes)', value: formData.thought_content_ideas_death_wishes },
        { label: 'Content - Ideas (Suicide)', value: formData.thought_content_ideas_suicide },
        { label: 'Content - Ideas (Homicide)', value: formData.thought_content_ideas_homicide },
        { label: 'Content - Ideas (Hypochondriacal)', value: formData.thought_content_ideas_hypochondriacal },
        { label: 'Content - Delusions (Primary)', value: formData.thought_content_delusions_primary },
        { label: 'Content - Delusions (Secondary)', value: formData.thought_content_delusions_secondary },
        { label: 'Content - Delusions (Systematised)', value: formData.thought_content_delusions_systematised },
        { label: 'Content - Delusions (Mood congruent)', value: formData.thought_content_delusions_mood_congruent },
        { label: 'Content - Delusions (Types)', value: formData.thought_content_delusions_types },
        { label: 'Content - Delusions (Sample Talk)', value: formData.thought_content_delusions_sample_talk },
      ]
    },
    {
      num: 10,
      title: 'Perceptual Disorders',
      fields: [
        { label: 'Sensory Distortion', value: formData.perceptual_sensory_distortion },
        { label: 'Sensory Deception', value: formData.perceptual_sensory_deception },
        { label: 'Projection', value: formData.perceptual_projection },
        { label: 'Modality', value: formData.perceptual_modality },
        { label: 'Content', value: formData.perceptual_content },
        { label: 'Response to content', value: formData.perceptual_response_to_content },
        { label: 'Frequency & diurnal pattern', value: formData.perceptual_frequency_diurnal_pattern },
        { label: 'Thought echo', value: formData.perceptual_thought_echo },
        { label: 'Description', value: formData.perceptual_description },
        { label: 'Others', value: formData.perceptual_others },
      ]
    },
    {
      num: 11,
      title: 'Other Psychotic Phenomena',
      fields: [
        { label: 'Other Psychotic Phenomena', value: formData.other_psychotic_phenomena },
      ]
    },
    {
      num: 12,
      title: 'Other Psychopathological Phenomena',
      fields: [
        { label: 'Other Psychopathological Phenomena', value: formData.other_psychopathological_phenomena },
      ]
    },
    {
      num: 13,
      title: 'Judgement',
      fields: [
        { label: 'Test', value: formData.judgement_test },
        { label: 'Social', value: formData.judgement_social },
        { label: 'Personal', value: formData.judgement_personal },
      ]
    },
    {
      num: 14,
      title: 'Insight',
      fields: [
        { label: 'Insight', value: formData.insight },
        { label: 'Insight Details', value: formData.insight_details },
      ]
    },
    {
      num: 15,
      title: 'Verbatim Report',
      fields: [
        { label: 'Verbatim Report', value: formData.verbatim_report },
      ]
    },
    {
      num: 16,
      title: 'Behavior Observation (BO)',
      fields: [
        { label: 'Behavior Observation', value: formData.behavior_observation },
      ]
    },
  ];

  // Render each section
  sections.forEach(section => {
    checkNewPage(15);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text(`${section.num}. ${section.title}`, margin, yPosition);
    yPosition += 8;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    section.fields.forEach(field => {
      if (field.value) {
        checkNewPage(10);
        const height = addText(`${field.label}: ${field.value}`, margin, yPosition, maxWidth);
        yPosition += height + 2;
      }
    });

    yPosition += sectionSpacing;
  });

  // Save the PDF
  const fileName = `Mental_Status_Examination_${userName || 'Patient'}_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

