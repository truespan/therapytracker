# Questionnaire Sub-headings Feature

## Overview

Added support for optional sub-headings to group questions together in questionnaires. Partners can now organize questions under logical sections like "Emotional Well-being", "Physical Health", etc.

## Implementation Summary

### Database Changes

**New Migration File:** `backend/database/migrations/add_question_subheadings.sql`

1. **Added column to `questionnaire_questions` table:**
   - `sub_heading` (VARCHAR 255) - Optional sub-heading to group questions

2. **Added index for performance:**
   - `idx_questionnaire_questions_sub_heading` on (questionnaire_id, sub_heading)

### Backend Updates

**Files Modified:**

1. **`backend/src/models/Questionnaire.js`**
   - Updated `addQuestion()` to accept sub_heading parameter
   - Updated `updateQuestion()` to handle sub_heading parameter

2. **`backend/src/controllers/questionnaireController.js`**
   - Updated `createQuestionnaire()` to save sub_heading for each question
   - Updated `updateQuestionnaire()` to handle sub_heading updates

### Frontend Updates

**Files Modified:**

1. **`frontend/src/components/questionnaires/QuestionnaireBuilder.jsx`**
   - Added sub_heading field to question object
   - Added input field for sub-heading (optional)
   - Appears with blue background to distinguish from question text
   - Placeholder: "e.g., Emotional Well-being, Physical Health, etc."

2. **`frontend/src/components/questionnaires/UserQuestionnaireView.jsx`**
   - Automatically groups questions by sub-heading
   - Displays sub-heading as a bold blue header with underline
   - Questions under same sub-heading are grouped together
   - Maintains original question numbering

## Features

### For Partners (Creating Questionnaires)

✅ **Optional Sub-heading Field:**
- Appears for each question in the builder
- Light blue background to distinguish it
- Placeholder text provides examples
- Can be left empty (optional)
- Questions with same sub-heading are automatically grouped

### For Users (Completing Questionnaires)

✅ **Grouped Display:**
- Questions are automatically grouped by sub-heading
- Sub-heading appears as a bold blue header
- Blue underline separates sections
- Original question numbering is preserved
- Clean visual hierarchy

## UI Design

### Partner View (Builder)

```
Question 1
┌─────────────────────────────────────────────┐
│ Sub-heading (optional)                      │
│ [Emotional Well-being                    ]  │ ← Blue background
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ [How is your mood this week?             ]  │ ← Question text
└─────────────────────────────────────────────┘
```

### User View (Completing)

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Emotional Well-being                    ← Bold blue header
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. How is your mood this week? *
   ○ Very Bad
   ○ Bad
   ● Neutral
   ○ Good
   ○ Very Good

2. How is your energy level? *
   ○ Very Low
   ● Low
   ○ Moderate
   ○ High
   ○ Very High

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Physical Health                         ← Bold blue header
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

3. How is your sleep quality? *
   ○ Very Poor
   ○ Poor
   ● Average
   ○ Good
   ○ Excellent
```

## Migration Instructions

### 1. Apply Database Migration

```bash
psql -U your_username -d your_database_name -f backend/database/migrations/add_question_subheadings.sql
```

### 2. Verify Migration

```sql
-- Check new column
\d questionnaire_questions

-- Expected: sub_heading column should exist

-- Check index
\di idx_questionnaire_questions_sub_heading
```

### 3. Restart Backend

```bash
cd backend
npm start
```

### 4. Test the Feature

1. Login as partner
2. Create new questionnaire or edit existing
3. For each question, optionally enter a sub-heading
4. Group questions by entering same sub-heading
5. Save questionnaire
6. Assign to user
7. Login as user
8. Complete questionnaire
9. Verify questions are grouped under sub-headings

## Usage Examples

### Example 1: Mental Health Assessment

**Sub-heading 1:** "Emotional Well-being"
- Question 1: How is your mood this week?
- Question 2: How anxious do you feel?
- Question 3: How is your stress level?

**Sub-heading 2:** "Physical Health"
- Question 4: How is your sleep quality?
- Question 5: How is your energy level?
- Question 6: How is your appetite?

**Sub-heading 3:** "Social Functioning"
- Question 7: How are your relationships?
- Question 8: How is your work performance?
- Question 9: How is your social engagement?

### Example 2: Therapy Progress Tracking

**Sub-heading 1:** "Symptoms"
- Questions about specific symptoms

**Sub-heading 2:** "Coping Strategies"
- Questions about coping mechanisms

**Sub-heading 3:** "Goals Progress"
- Questions about therapy goals

### Example 3: Mixed Grouping

Some questions can have sub-headings, others can be without:

- Question 1: (no sub-heading) - General question
- Question 2: (no sub-heading) - General question
- **Sub-heading:** "Specific Assessment"
  - Question 3-7: Grouped questions
- Question 8: (no sub-heading) - General question

## Technical Details

### Grouping Logic

The frontend automatically groups questions with the same sub-heading:

```javascript
// Group questions by sub-heading
const groupedQuestions = [];
let currentGroup = { sub_heading: null, questions: [] };

questionnaire.questions.forEach((question, index) => {
  if (question.sub_heading && question.sub_heading !== currentGroup.sub_heading) {
    if (currentGroup.questions.length > 0) {
      groupedQuestions.push(currentGroup);
    }
    currentGroup = { sub_heading: question.sub_heading, questions: [] };
  }
  currentGroup.questions.push({ ...question, originalIndex: index });
});
```

### Question Numbering

- Original question numbering is preserved (1, 2, 3, ...)
- Sub-headings don't affect numbering
- Questions maintain their order

### Data Structure

```json
{
  "question_text": "How is your mood?",
  "sub_heading": "Emotional Well-being",
  "question_order": 0,
  "options": [...]
}
```

## Best Practices

### For Partners

1. **Use Clear Sub-headings:**
   - Keep them short and descriptive
   - Use title case (e.g., "Emotional Well-being")
   - Be consistent across questionnaires

2. **Logical Grouping:**
   - Group related questions together
   - 3-7 questions per sub-heading is ideal
   - Don't over-segment (too many sub-headings)

3. **Optional Use:**
   - Not all questions need sub-headings
   - Use only when it improves clarity
   - Simple questionnaires may not need them

4. **Consistent Naming:**
   - Use same sub-heading names across questionnaires
   - Makes it easier for users to understand
   - Creates familiarity

### For Users

- Sub-headings provide context
- Help understand question categories
- Make long questionnaires easier to navigate
- Visual breaks improve readability

## Validation Rules

### Partner Side (Creating):
- ✅ Sub-heading is optional
- ✅ Can be any text (max 255 characters)
- ✅ Multiple questions can share same sub-heading
- ✅ Questions without sub-heading are displayed normally
- ✅ Can mix questions with and without sub-headings

### User Side (Completing):
- ✅ Sub-headings are display-only
- ✅ Automatically grouped
- ✅ No user interaction required
- ✅ Works in both edit and view-only modes

## Visual Styling

### Sub-heading Style:
```css
- Font: Bold, Large (text-lg)
- Color: Blue (#1D4ED8)
- Border: Bottom border, blue, 2px
- Margin: Bottom margin for spacing
```

### Sub-heading Input (Builder):
```css
- Background: Light blue (bg-blue-50)
- Border: Standard gray
- Placeholder: Gray text with examples
```

## Future Enhancements

Potential improvements:
- [ ] Collapsible sub-heading sections
- [ ] Sub-heading descriptions
- [ ] Color-coded sub-headings
- [ ] Sub-heading icons
- [ ] Reorder entire sections
- [ ] Copy/paste sections
- [ ] Sub-heading templates
- [ ] Analytics per sub-heading
- [ ] Conditional sub-headings
- [ ] Nested sub-headings

## Files Changed

### Backend (3 files)
1. `backend/database/migrations/add_question_subheadings.sql` (NEW)
2. `backend/src/models/Questionnaire.js` (MODIFIED)
3. `backend/src/controllers/questionnaireController.js` (MODIFIED)

### Frontend (2 files)
1. `frontend/src/components/questionnaires/QuestionnaireBuilder.jsx` (MODIFIED)
2. `frontend/src/components/questionnaires/UserQuestionnaireView.jsx` (MODIFIED)

## Testing Checklist

- [ ] Apply database migration
- [ ] Create questionnaire with sub-headings
- [ ] Create questionnaire without sub-headings
- [ ] Mix questions with and without sub-headings
- [ ] Use same sub-heading for multiple questions
- [ ] Edit questionnaire to add sub-headings
- [ ] Edit questionnaire to remove sub-headings
- [ ] Edit questionnaire to change sub-headings
- [ ] Assign questionnaire with sub-headings
- [ ] Complete questionnaire (verify grouping)
- [ ] View responses (verify grouping in view mode)
- [ ] Verify question numbering is correct
- [ ] Test with 10+ questions and 3+ sub-headings
- [ ] Test reordering questions with sub-headings

## Compatibility

✅ **Backward Compatible:**
- Existing questionnaires without sub-headings work normally
- Sub-heading column defaults to NULL
- No migration of existing data required
- New feature is purely additive

## Conclusion

The sub-headings feature is now fully implemented and ready for use. Partners can organize questions into logical sections, making questionnaires easier to understand and complete.

**Status:** ✅ Complete and Ready for Testing































