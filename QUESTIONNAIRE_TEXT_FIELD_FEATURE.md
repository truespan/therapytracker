# Questionnaire Text Field Feature

## Overview

Added support for an optional text box at the top of questionnaires, allowing users to provide free-form text responses (max 200 words) before answering structured questions.

## Implementation Summary

### Database Changes

**New Migration File:** `backend/database/migrations/add_questionnaire_text_field.sql`

1. **Added columns to `questionnaires` table:**
   - `has_text_field` (BOOLEAN) - Whether questionnaire includes a text field
   - `text_field_label` (VARCHAR 500) - Label/question for the text field
   - `text_field_placeholder` (TEXT) - Placeholder text for the text field

2. **New table: `user_questionnaire_text_responses`**
   - Stores user text responses
   - Links to assignments via `assignment_id`
   - Includes timestamp for tracking

### Backend Updates

**Files Modified:**

1. **`backend/src/models/Questionnaire.js`**
   - Updated `create()` to accept text field parameters
   - Updated `update()` to handle text field parameters

2. **`backend/src/models/QuestionnaireAssignment.js`**
   - Updated `saveResponses()` to save text responses
   - Added `getTextResponse()` method to retrieve text responses

3. **`backend/src/controllers/questionnaireController.js`**
   - Updated `createQuestionnaire()` to handle text field data
   - Updated `updateQuestionnaire()` to handle text field data
   - Updated `saveResponses()` to accept and save text responses
   - Updated `getResponses()` to return text responses along with regular responses

### Frontend Updates

**Files Modified:**

1. **`frontend/src/components/questionnaires/QuestionnaireBuilder.jsx`**
   - Added checkbox to enable text field
   - Added inputs for text field label and placeholder
   - Text field configuration appears in a highlighted section

2. **`frontend/src/components/questionnaires/UserQuestionnaireView.jsx`**
   - Added text area display at the top (before questions)
   - Added word count validation (max 200 words)
   - Added character count display
   - Text field is disabled in viewOnly mode
   - Loads and displays previous text responses

3. **`frontend/src/services/api.js`**
   - Updated `saveResponses()` to include text_response parameter

## Features

### For Partners (Creating Questionnaires)

✅ **Optional Text Field:**
- Checkbox to enable/disable text field
- Custom label (e.g., "Please describe your key issue(s) briefly here.")
- Custom placeholder text
- Appears in a highlighted box for visibility

### For Users (Completing Questionnaires)

✅ **Text Box Display:**
- Appears at the top, before all questions
- Large textarea (6 rows)
- Real-time word count (max 200 words)
- Character count display
- Visual design matches reference image style
- Required field (marked with asterisk)

✅ **Validation:**
- Must be filled if text field is enabled
- Maximum 200 words enforced
- Shows current word count
- Error message if exceeds limit

✅ **View Only Mode:**
- Text box is disabled (grayed out)
- Previous text response is displayed
- Cannot be edited

## UI Design

The text box follows the reference design with:
- Clean white background with subtle border
- Prominent label with asterisk for required field
- Placeholder text in gray
- Word count at bottom left
- Character count at bottom right
- Red warning when word limit exceeded
- Rounded corners and shadow for depth

## Migration Instructions

### 1. Apply Database Migration

```bash
psql -U your_username -d your_database_name -f backend/database/migrations/add_questionnaire_text_field.sql
```

### 2. Verify Migration

```sql
-- Check new columns
\d questionnaires

-- Check new table
\d user_questionnaire_text_responses

-- Expected columns in questionnaires:
-- has_text_field, text_field_label, text_field_placeholder
```

### 3. Restart Backend

```bash
cd backend
npm start
```

### 4. Test the Feature

1. Login as partner
2. Create new questionnaire
3. Check "Add a text box at the top (max 200 words)"
4. Enter label and placeholder
5. Add questions as usual
6. Save questionnaire
7. Assign to user
8. Login as user
9. Complete questionnaire with text box
10. Verify text is saved
11. View responses in read-only mode

## Usage Examples

### Example 1: General Therapy Intake

**Label:** "Please describe your key issue(s) briefly here."

**Placeholder:** "Share what brings you to therapy or what you'd like to work on..."

**Use Case:** Initial assessment to understand client's main concerns

### Example 2: Session Preparation

**Label:** "What would you like to focus on in today's session?"

**Placeholder:** "Describe any specific topics, concerns, or goals for this session..."

**Use Case:** Pre-session check-in for focused therapy

### Example 3: Progress Notes

**Label:** "How have you been feeling since our last session?"

**Placeholder:** "Share any changes, challenges, or progress you've experienced..."

**Use Case:** Tracking progress between sessions

### Example 4: Symptom Description

**Label:** "Please describe your symptoms in detail."

**Placeholder:** "Include when they started, how often they occur, and how they affect your daily life..."

**Use Case:** Detailed symptom assessment

## Technical Details

### Word Count Calculation

```javascript
const wordCount = textResponse.trim().split(/\s+/).filter(w => w).length;
```

- Trims whitespace
- Splits by one or more spaces
- Filters empty strings
- Counts remaining words

### Character Limit

- Set to 2000 characters in textarea `maxLength`
- Approximately 300-400 words depending on word length
- Word limit (200) is enforced separately

### Data Flow

1. **Partner creates questionnaire:**
   ```
   has_text_field: true
   text_field_label: "Your label"
   text_field_placeholder: "Your placeholder"
   ```

2. **User completes questionnaire:**
   ```
   text_response: "User's free-form text..."
   ```

3. **Backend saves:**
   ```
   user_questionnaire_text_responses table
   assignment_id → text_response
   ```

4. **Frontend retrieves:**
   ```
   GET /api/questionnaires/assignments/:id/responses
   Returns: { responses: [...], text_response: "..." }
   ```

## Validation Rules

### Partner Side (Creating):
- Label is optional (defaults to standard text)
- Placeholder is optional
- Can enable/disable at any time

### User Side (Completing):
- ✅ Required if text field is enabled
- ✅ Max 200 words
- ✅ Shows real-time word count
- ✅ Error if exceeds limit
- ✅ Error if empty when required

### View Only Mode:
- ✅ Text box is disabled
- ✅ Previous response is displayed
- ✅ Cannot be edited
- ✅ No asterisk shown

## Future Enhancements

Potential improvements:
- [ ] Make text field optional (not required)
- [ ] Configurable word limit
- [ ] Rich text formatting
- [ ] Auto-save drafts
- [ ] Export text responses to PDF
- [ ] Text analysis/sentiment tracking
- [ ] Multiple text fields per questionnaire
- [ ] Conditional text fields based on answers

## Files Changed

### Backend (4 files)
1. `backend/database/migrations/add_questionnaire_text_field.sql` (NEW)
2. `backend/src/models/Questionnaire.js` (MODIFIED)
3. `backend/src/models/QuestionnaireAssignment.js` (MODIFIED)
4. `backend/src/controllers/questionnaireController.js` (MODIFIED)

### Frontend (3 files)
1. `frontend/src/components/questionnaires/QuestionnaireBuilder.jsx` (MODIFIED)
2. `frontend/src/components/questionnaires/UserQuestionnaireView.jsx` (MODIFIED)
3. `frontend/src/services/api.js` (MODIFIED)

## Testing Checklist

- [ ] Apply database migration
- [ ] Create questionnaire with text field
- [ ] Create questionnaire without text field
- [ ] Edit questionnaire to add text field
- [ ] Edit questionnaire to remove text field
- [ ] Assign questionnaire with text field
- [ ] Complete questionnaire (text + questions)
- [ ] Validate 200 word limit
- [ ] Validate required field
- [ ] View responses in read-only mode
- [ ] Verify text is saved correctly
- [ ] Verify text displays in view mode
- [ ] Test with empty text (should fail)
- [ ] Test with >200 words (should fail)
- [ ] Test with exactly 200 words (should pass)

## Conclusion

The text field feature is now fully implemented and ready for use. Partners can add optional text boxes to questionnaires, and users can provide free-form responses with proper validation and word count tracking.

**Status:** ✅ Complete and Ready for Testing



































