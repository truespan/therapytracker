const db = require('../config/database');

// Keep the list of columns in one place to avoid mismatches between
// the database schema, the model, and the controller payload parsing.
const MSE_FIELDS = [
  'general_appearance_appearance',
  'general_appearance_age',
  'general_appearance_touch_with_surroundings',
  'general_appearance_eye_contact',
  'general_appearance_hair',
  'general_appearance_rapport',
  'general_appearance_comments',
  'attitude',
  'attitude_manner_of_relating',
  'attitude_rapport',
  'motor_behavior',
  'speech_intensity_tone',
  'speech_reaction_time',
  'speech_speed',
  'speech_prosody_tempo',
  'speech_ease_of_speech',
  'speech_productivity_volume',
  'speech_relevant_irrelevant',
  'speech_coherent_incoherent',
  'speech_goal_direction',
  'volition_made_phenomenon',
  'volition_somatic_passivity',
  'volition_echolalia_echopraxia',
  'cognitive_attention_concentration',
  'cognitive_attention',
  'cognitive_orientation_time',
  'cognitive_orientation_space',
  'cognitive_orientation_person',
  'cognitive_orientation_situation',
  'cognitive_orientation_sense_of_passage_of_time',
  'cognitive_memory_immediate_digit_forward',
  'cognitive_memory_immediate_digit_backward',
  'cognitive_memory_immediate_word_recall',
  'cognitive_memory_immediate',
  'cognitive_memory_recent',
  'cognitive_memory_remote',
  'cognitive_abstract_ability',
  'intelligence_general_information',
  'intelligence_calculation',
  'intelligence_global_impression',
  'intelligence_comprehension',
  'intelligence_vocabulary',
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
  'thought_stream',
  'thought_stream_normal',
  'thought_stream_retarded',
  'thought_stream_retarded_thought_blocking',
  'thought_stream_retarded_circumstantiality',
  'thought_stream_accelerated',
  'thought_stream_accelerated_flight_of_ideas',
  'thought_stream_accelerated_prolixity',
  'thought_stream_accelerated_pressure_of_speech',
  'thought_form',
  'thought_form_sample_talk',
  'thought_possession_obsessions_compulsions',
  'thought_possession_thought_alienation',
  'thought_possession_thought_alienation_insertion',
  'thought_possession_thought_alienation_broadcasting',
  'thought_possession_thought_alienation_withdrawal',
  'thought_possession_sample_talk',
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
  'other_psychotic_phenomena',
  'other_psychopathological_phenomena',
  'judgement_test',
  'judgement_social',
  'judgement_personal',
  'insight',
  'insight_details',
  'verbatim_report'
];

class MentalStatusExamination {
  static get fields() {
    return MSE_FIELDS;
  }

  static async findByUserIdAndPartnerId(userId, partnerId) {
    const result = await db.query(
      'SELECT * FROM mental_status_examinations WHERE user_id = $1 AND partner_id = $2',
      [userId, partnerId]
    );
    return result.rows[0];
  }

  static buildPayload(mentalStatus, userId, partnerId) {
    const payload = {
      user_id: parseInt(userId, 10),
      partner_id: partnerId
    };

    MSE_FIELDS.forEach((field) => {
      payload[field] = mentalStatus?.[field] ?? null;
    });

    return payload;
  }

  static async saveOrUpdate(mentalStatusData, client = null) {
    const dbClient = client || db;
    const columns = ['user_id', 'partner_id', ...MSE_FIELDS];
    const placeholders = columns.map((_, idx) => `$${idx + 1}`).join(', ');
    const updateSet = MSE_FIELDS.map((field) => `${field} = EXCLUDED.${field}`)
      .concat(['updated_at = NOW()'])
      .join(', ');
    const values = columns.map((col) => mentalStatusData[col] ?? null);

    const query = `
      INSERT INTO mental_status_examinations (${columns.join(', ')})
      VALUES (${placeholders})
      ON CONFLICT (user_id, partner_id)
      DO UPDATE SET ${updateSet}
      RETURNING *
    `;

    const result = await dbClient.query(query, values);
    return result.rows[0];
  }
}

module.exports = MentalStatusExamination;









