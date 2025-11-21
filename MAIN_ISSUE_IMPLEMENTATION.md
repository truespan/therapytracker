# Main Issue Feature Implementation

## Overview
This document describes the implementation of the "Main Issue" feature in the Mind & Body Assessment Questionnaire. This feature allows users to describe their key issues in a text area (max 200 words) for each session.

## Key Features

### 1. Main Issue Text Input
- **Location**: Above all assessment questions in the Mind & Body Assessment Questionnaire
- **Word Limit**: 200 words maximum with real-time word counter
- **Placeholder**: "Share what brings you to therapy or what you'd like to work on..."
- **Privacy**: Each session has its own unique main issue text - never shared between sessions or users

### 2. Data Storage
- **Database**: New column `main_issue` added to the `sessions` table
- **Type**: TEXT field (allows for long-form text)
- **Session-specific**: Each session stores its own main issue independently

### 3. Display in Completed Sessions
- **Collapsible Section**: Main issue appears in a collapsible panel in SessionDetail view
- **Icon**: FileText icon with "Key Issues Described" label
- **Read-only**: Users can view but cannot edit main issue in completed sessions
- **Expandable**: Starts collapsed, can be expanded to read the full text

### 4. Mind-Body Profile Chart
- **Exclusion Confirmed**: Main issue text is NOT used in the Mind-Body Profile radar chart
- **Chart Data**: Only uses profile field ratings (Excellent, Good, Fair, Poor, Very Poor)
- **Separation**: Main issue is stored in sessions table, chart uses user_profiles table

## Implementation Details

### Database Changes

#### Migration File: `backend/database/migration_add_main_issue.sql`
```sql
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS main_issue TEXT;

COMMENT ON COLUMN sessions.main_issue IS 'User-provided description of key issues for this session (max 200 words)';
```

### Backend Changes

#### 1. Session Model (`backend/src/models/Session.js`)
- Updated `update()` method to handle `main_issue` field
- Added to COALESCE logic for safe updates

#### 2. Session Controller (`backend/src/controllers/sessionController.js`)
- Updated `updateSession()` to accept and save `main_issue` parameter
- Integrated with existing session update flow

### Frontend Changes

#### 1. AssessmentQuestionnaire Component (`frontend/src/components/profile/AssessmentQuestionnaire.jsx`)

**New State Variables:**
- `mainIssue`: Stores the main issue text
- `wordCount`: Tracks word count in real-time
- `MAX_WORDS`: Constant set to 200

**New Functions:**
- `handleMainIssueChange()`: Validates word count and updates state
- Updated `loadData()`: Loads existing main issue from session
- Updated `handleSubmit()`: Saves main issue before saving ratings

**UI Components:**
- Text area with 5 rows for editing (shown when not in viewOnly mode)
- Word counter showing current/max words (turns red if exceeded)
- Read-only display box for completed sessions (viewOnly mode)
- Styled with gray background and border for visual distinction

#### 2. SessionDetail Component (`frontend/src/components/sessions/SessionDetail.jsx`)

**New State:**
- `isMainIssueExpanded`: Controls collapsible section state

**New UI:**
- Collapsible panel with ChevronDown/ChevronRight icons
- FileText icon for visual identification
- "Key Issues Described" header
- Expandable content area with whitespace-pre-wrap for proper text formatting
- Positioned before session rating and feedback sections

## User Experience Flow

### For New Sessions (In Progress)
1. User opens assessment questionnaire
2. Sees main issue text area at the top (above all questions)
3. Can type up to 200 words describing their issues
4. Word counter updates in real-time
5. Text is saved when user submits the assessment

### For Completed Sessions (View Only)
1. User views completed session in UserDashboard
2. Main issue appears in a collapsed panel (if provided)
3. User can click to expand and read the full text
4. Text is displayed in read-only format
5. Cannot be edited after session is completed

### In SessionDetail View
1. User clicks on a completed session
2. Main issue appears in a collapsible section at the top
3. Starts collapsed to save space
4. Can be expanded to read the full description
5. Appears before rating and feedback sections

## Data Privacy & Security

- **Session Isolation**: Each session's main issue is completely separate
- **User Privacy**: Main issues are never shared between users
- **No Cross-Session Visibility**: Users cannot see main issues from other sessions in the current view
- **Read-Only After Completion**: Once a session is completed, main issue becomes read-only

## Technical Notes

### Word Count Implementation
- Uses regex split: `text.trim().split(/\s+/).filter(w => w.length > 0)`
- Counts actual words, not just whitespace-separated strings
- Prevents submission if word count exceeds 200

### API Integration
- Main issue is saved via `sessionAPI.update()` before saving profile ratings
- Loaded from session data in `sessionAPI.getById()`
- Separate from profile ratings data flow

### Chart Data Verification
- Confirmed: `transformMultipleSessionsForRadar()` only uses `ratings` data
- Main issue is stored in `sessions` table
- Profile ratings are stored in `user_profiles` table
- No overlap between main issue and chart data

## Files Modified

### Backend
1. `backend/database/migration_add_main_issue.sql` (NEW)
2. `backend/src/models/Session.js`
3. `backend/src/controllers/sessionController.js`

### Frontend
1. `frontend/src/components/profile/AssessmentQuestionnaire.jsx`
2. `frontend/src/components/sessions/SessionDetail.jsx`

## Migration Instructions

To apply the database migration:

```bash
cd backend
node -e "const db = require('./src/config/database'); const fs = require('fs'); const migration = fs.readFileSync('./database/migration_add_main_issue.sql', 'utf8'); db.query(migration).then(() => { console.log('Migration completed successfully'); process.exit(0); }).catch(err => { console.error('Migration failed:', err); process.exit(1); });"
```

Or manually run the SQL:
```bash
psql -U your_username -d therapy_tracker -f backend/database/migration_add_main_issue.sql
```

## Testing Checklist

- [ ] Database migration runs successfully
- [ ] Main issue text area appears in new sessions
- [ ] Word counter updates correctly
- [ ] Cannot exceed 200 words
- [ ] Main issue saves when submitting assessment
- [ ] Main issue loads correctly when reopening session
- [ ] Collapsible section appears in SessionDetail
- [ ] Main issue is read-only in completed sessions
- [ ] Main issue is NOT included in Mind-Body Profile chart
- [ ] Each session has independent main issue text

## Future Enhancements

Potential improvements for future versions:
1. Rich text formatting support
2. Ability to edit main issue after session completion (with audit trail)
3. Export main issues as part of session reports
4. Therapist view of main issues across sessions
5. Search/filter sessions by main issue keywords

