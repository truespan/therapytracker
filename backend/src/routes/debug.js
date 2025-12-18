const express = require('express');
const router = express.Router();
const db = require('../config/database');
const dateUtils = require('../utils/dateUtils');

/**
 * DEBUG ENDPOINT: Check timezone configuration
 * Access: GET /api/debug/timezone
 * Use this to verify timezone handling in production
 */
router.get('/timezone', async (req, res) => {
  try {
    // Check database timezone
    const dbTz = await db.query('SHOW timezone');

    // Test dateUtils conversion
    const testDate = '2025-12-18';
    const testTime = '23:30';
    const testTimezone = 'Asia/Kolkata';
    const converted = dateUtils.combineDateAndTime(testDate, testTime, testTimezone);

    // Check if dateUtils functions exist
    const functionsExist = {
      fromZonedTime: typeof dateUtils.combineDateAndTime === 'function',
      getUserTimezone: typeof dateUtils.getUserTimezone === 'function',
    };

    res.json({
      status: 'ok',
      database_timezone: dbTz.rows[0].TimeZone,
      test_conversion: {
        input: `${testDate} ${testTime} (${testTimezone})`,
        output_utc: converted.toISOString(),
        expected: '2025-12-18T18:00:00.000Z',
        is_correct: converted.toISOString() === '2025-12-18T18:00:00.000Z'
      },
      dateUtils_functions: functionsExist,
      backend_deployed_at: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * DEBUG ENDPOINT: Test availability slot creation
 * Access: GET /api/debug/test-slot
 */
router.get('/test-slot', async (req, res) => {
  try {
    const partnerId = req.query.partner_id || 1;

    // Check if partner exists
    const partnerCheck = await db.query('SELECT id FROM partners WHERE id = $1 LIMIT 1', [partnerId]);

    if (partnerCheck.rows.length === 0) {
      return res.json({
        status: 'error',
        message: `No partner found with id=${partnerId}. Please provide a valid partner_id query parameter.`
      });
    }

    // Test the exact flow that happens when creating a slot
    const testData = {
      slot_date: '2025-12-19',
      start_time: '23:30',
      end_time: '23:45',
      timezone: 'Asia/Kolkata'
    };

    const userTimezone = testData.timezone || 'UTC';
    const start_datetime = dateUtils.combineDateAndTime(testData.slot_date, testData.start_time, userTimezone);
    const end_datetime = dateUtils.combineDateAndTime(testData.slot_date, testData.end_time, userTimezone);

    res.json({
      status: 'ok',
      test_data: testData,
      computed_values: {
        start_datetime_utc: start_datetime.toISOString(),
        end_datetime_utc: end_datetime.toISOString(),
        expected_start: '2025-12-19T18:00:00.000Z',
        expected_end: '2025-12-19T18:15:00.000Z',
        is_correct: start_datetime.toISOString() === '2025-12-19T18:00:00.000Z'
      },
      formatted_for_postgres: {
        start: dateUtils.formatForPostgres(start_datetime),
        end: dateUtils.formatForPostgres(end_datetime)
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message,
      stack: error.stack
    });
  }
});

/**
 * DEBUG ENDPOINT: Log incoming slot creation requests
 * This middleware logs what timezone parameter is being sent
 */
router.post('/log-slot-request', (req, res) => {
  console.log('\n=== SLOT CREATION DEBUG ===');
  console.log('Request body:', JSON.stringify(req.body, null, 2));
  console.log('Timezone parameter:', req.body.timezone);
  console.log('Has timezone:', !!req.body.timezone);
  console.log('========================\n');

  res.json({
    status: 'logged',
    received_timezone: req.body.timezone || 'NOT PROVIDED',
    has_timezone: !!req.body.timezone,
    full_body: req.body
  });
});

module.exports = router;
