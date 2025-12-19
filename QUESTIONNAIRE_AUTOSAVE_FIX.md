# Questionnaire Auto-Save Fix - December 19, 2025

## Issue

Auto-save was not working when creating a new questionnaire. Users would type questions and options but see no indication that auto-save was (or wasn't) working.

## Root Cause

In `frontend/src/components/questionnaires/QuestionnaireBuilder.jsx` (lines 40-43), the auto-save logic **silently returned** when the questionnaire name was empty:

```javascript
// Don't autosave if questionnaire name is empty (required field)
if (!questionnaire.name.trim()) {
  return; // ❌ PROBLEM: Silent failure - no user feedback!
}
```

### Why This Was a Problem

1. **User Experience**: User starts creating questionnaire by:
   - Adding questions
   - Adding answer options
   - Filling in descriptions

2. **Expected Behavior**: Auto-save indicator shows "💾 Saving..." after changes

3. **Actual Behavior**:
   - Auto-save checks if name exists
   - Name is empty (user hasn't filled it yet)
   - Auto-save returns silently
   - **No indicator shown** - user has no idea why auto-save isn't working
   - User thinks auto-save is broken

## The Fix

Added visual feedback to inform users why auto-save isn't working:

### 1. Show "Waiting" Status

```javascript
// Don't autosave if questionnaire name is empty (required field)
if (!questionnaire.name.trim()) {
  // ✅ NEW: Show indicator that auto-save is waiting for name
  if (questionnaire.questions.length > 0 || questionnaire.description) {
    setAutosaveStatus('waiting');
  } else {
    setAutosaveStatus('');
  }
  return;
}
```

### 2. Display Helpful Message

```javascript
{autosaveStatus === 'waiting' && '⏳ Enter name to auto-save'}
```

With yellow background styling:
```javascript
autosaveStatus === 'waiting'
  ? 'bg-yellow-100 text-yellow-700'
```

## How It Works Now

### Scenario 1: User Has Content But No Name

1. User starts typing questions/options
2. Auto-save detects content exists (questions or description)
3. Auto-save checks name → empty
4. Shows: **"⏳ Enter name to auto-save"** (yellow badge)
5. User sees clear feedback and knows what to do

### Scenario 2: User Enters Name

1. User fills in questionnaire name
2. Auto-save detects name exists
3. Starts 2-second debounce timer
4. Shows: **"💾 Saving..."** (blue badge)
5. After successful save: **"✓ Saved"** (green badge)

### Scenario 3: Empty Questionnaire

1. User hasn't entered anything yet
2. No indicator shown (clean UI)
3. Once they start typing, appropriate indicator appears

## Auto-Save Status Indicators

| Status | Indicator | Color | Meaning |
|--------|-----------|-------|---------|
| `saving` | 💾 Saving... | Blue | Currently saving to server |
| `saved` | ✓ Saved | Green | Successfully saved |
| `waiting` | ⏳ Enter name to auto-save | Yellow | Has content but needs name |
| `error` | ✗ Save failed | Red | Save failed - try again |

## Changes Made

### File Modified
- **`frontend/src/components/questionnaires/QuestionnaireBuilder.jsx`**

### Lines Changed
1. **Lines 40-48**: Added waiting status logic
2. **Lines 410-425**: Added yellow styling and waiting message

## Testing

### Test Case 1: Create Questionnaire Without Name
1. Click "Create New Questionnaire"
2. Add a question
3. **Expected**: See "⏳ Enter name to auto-save" in yellow
4. Enter questionnaire name
5. **Expected**: See "💾 Saving..." then "✓ Saved"

### Test Case 2: Create Questionnaire With Name First
1. Click "Create New Questionnaire"
2. Enter questionnaire name immediately
3. Add a question
4. **Expected**: See "💾 Saving..." then "✓ Saved" (no waiting state)

### Test Case 3: Edit Existing Questionnaire
1. Edit an existing questionnaire
2. Make changes
3. **Expected**: See "💾 Saving..." then "✓ Saved" (no waiting state, name already exists)

## Deployment

### No Backend Changes Required
This is a frontend-only fix.

### Steps to Deploy

1. **Restart frontend**:
   ```bash
   cd frontend
   npm start
   ```

2. **Clear browser cache** (optional but recommended):
   - Press `Ctrl + Shift + R` (Windows/Linux)
   - Press `Cmd + Shift + R` (Mac)

3. **Test the fix**:
   - Navigate to Questionnaires
   - Click "Create New Questionnaire"
   - Start adding questions without entering a name
   - Verify yellow "⏳ Enter name to auto-save" appears
   - Enter a name
   - Verify auto-save works ("💾 Saving..." → "✓ Saved")

## User Benefits

1. **Clear Feedback**: Users immediately understand why auto-save isn't working
2. **Guided Experience**: Message tells them exactly what to do (enter name)
3. **No Data Loss Anxiety**: Users know the system is working, just waiting for required info
4. **Better UX**: No more silent failures or confusion

## Technical Details

### Auto-Save Flow

```
User makes change
      ↓
useEffect triggers (debounced 2 seconds)
      ↓
Check: hasInitialLoad?
      ↓ YES
Check: name.trim() exists?
      ↓ NO
Check: has content? (questions/description)
      ↓ YES
setAutosaveStatus('waiting') ← NEW FIX
      ↓
Show: "⏳ Enter name to auto-save"
      ↓
User enters name
      ↓
Auto-save proceeds normally
```

### Why 2-Second Debounce?

The auto-save waits 2 seconds after the last keystroke before saving. This prevents:
- Too many API calls while user is typing
- Server overload from rapid updates
- Network congestion

### Why Require Name?

The questionnaire name is the primary identifier and is required by the database schema. Without a name:
- Database insertion would fail
- Questionnaire list would show blank entries
- User couldn't identify which questionnaire is which

## Alternative Solutions Considered

### Option 1: Allow Empty Name (Rejected)
**Pros**: Auto-save would work immediately
**Cons**:
- Database constraint violation
- Poor UX (unnamed questionnaires)
- Confusing questionnaire list

### Option 2: Use localStorage for Drafts (Future Enhancement)
**Pros**: No data loss even without name
**Cons**:
- More complex implementation
- localStorage limits
- Sync issues between tabs

### Option 3: Auto-generate Names (Rejected)
**Pros**: Auto-save would always work
**Cons**:
- Users would need to rename later
- Generic names are confusing
- Not aligned with user intent

### ✅ Option 4: Show Clear Feedback (CHOSEN)
**Pros**:
- Simple implementation
- Clear user guidance
- No schema changes needed
- Maintains data quality

**Cons**: None significant

## Future Enhancements

Possible improvements for future versions:

1. **localStorage Backup**: Save draft to localStorage every 10 seconds
2. **Recover Lost Work**: On page reload, offer to restore from localStorage
3. **Name Suggestions**: Auto-suggest name based on questions (e.g., "Depression Screening - Draft")
4. **Save Without Name**: Allow saving with auto-generated names, then prompt for rename

---

**Status**: ✅ FIXED
**Date**: December 19, 2025
**Impact**: Users now get clear feedback about auto-save status
**Breaking Changes**: None
**Migration Required**: None
