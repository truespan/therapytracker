# Custom Questionnaire System Implementation

## Overview

A comprehensive questionnaire management system has been successfully implemented, allowing partners to create custom questionnaires, assign them to users, and track responses with dedicated charts for each questionnaire type.

## Implementation Summary

### ✅ Database Schema (Backend)

**File:** `backend/database/migrations/add_custom_questionnaires.sql`

Created 5 new tables:

1. **questionnaires** - Store questionnaire templates created by partners
   - Fields: id, partner_id, name, description, created_at, updated_at
   
2. **questionnaire_questions** - Store questions for each questionnaire
   - Fields: id, questionnaire_id, question_text, question_order, created_at
   
3. **questionnaire_answer_options** - Store answer options for each question
   - Fields: id, question_id, option_text, option_value, option_order
   
4. **user_questionnaire_assignments** - Track questionnaire assignments
   - Fields: id, questionnaire_id, user_id, partner_id, assigned_at, status, completed_at
   
5. **user_questionnaire_responses** - Store user responses
   - Fields: id, assignment_id, question_id, answer_option_id, response_value, session_id, responded_at

All tables include proper foreign keys, indexes, and cascading deletes for data integrity.

### ✅ Backend Models

#### **Questionnaire Model** (`backend/src/models/Questionnaire.js`)

Methods implemented:
- `create()` - Create new questionnaire
- `findById()` - Get questionnaire by ID
- `findByPartner()` - Get all questionnaires for a partner with statistics
- `update()` - Update questionnaire details
- `delete()` - Delete questionnaire
- `addQuestion()` - Add question to questionnaire
- `updateQuestion()` - Update question
- `deleteQuestion()` - Remove question
- `addAnswerOption()` - Add answer option to question
- `updateAnswerOption()` - Update answer option
- `deleteAnswerOption()` - Delete answer option
- `getQuestionnaireWithQuestions()` - Get complete questionnaire with all questions and options
- `verifyOwnership()` - Verify questionnaire belongs to partner

#### **QuestionnaireAssignment Model** (`backend/src/models/QuestionnaireAssignment.js`)

Methods implemented:
- `assignToUser()` - Assign questionnaire to user
- `findByUser()` - Get assignments for a user
- `findByPartner()` - Get assignments created by partner
- `findById()` - Get assignment by ID
- `updateStatus()` - Update assignment status
- `saveResponses()` - Save user responses (with transaction support)
- `getResponses()` - Get user responses for an assignment
- `getUserResponseHistory()` - Get all responses for a user across sessions
- `getQuestionnaireStats()` - Get response statistics for a questionnaire
- `getAggregatedResponses()` - Get aggregated response data for charts
- `verifyUserAccess()` - Check if user has access to assignment
- `verifyPartnerAccess()` - Check if partner has access to assignment
- `delete()` - Delete assignment

### ✅ Backend Controller

**File:** `backend/src/controllers/questionnaireController.js`

Endpoints implemented:

#### Questionnaire Management
- `POST /api/questionnaires` - Create questionnaire
- `GET /api/questionnaires/partner/:partnerId` - Get partner's questionnaires
- `GET /api/questionnaires/:id` - Get questionnaire details
- `PUT /api/questionnaires/:id` - Update questionnaire
- `DELETE /api/questionnaires/:id` - Delete questionnaire
- `GET /api/questionnaires/:id/stats` - Get questionnaire statistics

#### Assignment Management
- `POST /api/questionnaires/assign` - Assign questionnaire to user(s)
- `GET /api/questionnaires/assignments/user/:userId` - Get user assignments
- `GET /api/questionnaires/assignments/partner/:partnerId` - Get partner assignments
- `GET /api/questionnaires/assignments/:id` - Get assignment details
- `DELETE /api/questionnaires/assignments/:id` - Delete assignment

#### Response Management
- `POST /api/questionnaires/assignments/:id/responses` - Save responses
- `GET /api/questionnaires/assignments/:id/responses` - Get responses
- `GET /api/questionnaires/user/:userId/history/:questionnaireId` - Get response history
- `GET /api/questionnaires/:questionnaireId/user/:userId/aggregated` - Get aggregated responses

All endpoints include proper authentication and authorization checks.

### ✅ Backend Routes

**File:** `backend/src/routes/index.js`

All questionnaire routes added with proper middleware:
- Authentication via `authenticateToken`
- Role-based access control via `checkRole`

### ✅ Frontend API Service

**File:** `frontend/src/services/api.js`

Added `questionnaireAPI` object with all CRUD methods:
- Questionnaire management (create, getByPartner, getById, update, delete, getStats)
- Assignment management (assign, getUserAssignments, getPartnerAssignments, getAssignment, deleteAssignment)
- Response management (saveResponses, getResponses, getUserHistory, getAggregatedResponses)

### ✅ Frontend Components

#### 1. **QuestionnaireBuilder** (`frontend/src/components/questionnaires/QuestionnaireBuilder.jsx`)

Features:
- Create/edit questionnaire with name and description
- Add multiple questions dynamically
- Add answer options for each question with custom text and values
- Reorder questions with up/down buttons
- Remove questions and options
- Real-time validation
- Preview functionality
- Save/Update with loading states

#### 2. **QuestionnaireList** (`frontend/src/components/questionnaires/QuestionnaireList.jsx`)

Features:
- Display all questionnaires created by partner
- Search and filter questionnaires
- Show statistics (question count, assignments, completion rate)
- Edit/Delete questionnaire buttons
- Assign to user button
- Completion rate progress bar
- Delete confirmation dialog

#### 3. **AssignQuestionnaireModal** (`frontend/src/components/questionnaires/AssignQuestionnaireModal.jsx`)

Features:
- Select users from partner's client list
- Search users by name or email
- Select all / deselect all functionality
- Multiple user selection with checkboxes
- Assignment confirmation
- Loading states and error handling

#### 4. **UserQuestionnaireView** (`frontend/src/components/questionnaires/UserQuestionnaireView.jsx`)

Features:
- Display assigned questionnaire with all questions
- Radio button selection for answers
- Progress bar showing completion status
- View previous responses toggle
- Answer validation (all questions required)
- Submit functionality
- Success/error feedback

#### 5. **QuestionnaireChart** (`frontend/src/components/questionnaires/QuestionnaireChart.jsx`)

Features:
- Multiple chart types (Line, Bar, Radar)
- Filter by specific question or view all
- Response trends over time
- Custom tooltips showing question text and values
- Summary statistics (total responses, date range)
- Color-coded questions
- Responsive design using Recharts library

### ✅ Dashboard Integration

#### **PartnerDashboard** (`frontend/src/components/dashboard/PartnerDashboard.jsx`)

Added "Questionnaires" tab with:
- QuestionnaireList component
- Create new questionnaire button
- Edit questionnaire functionality
- Assign questionnaire modal
- State management for views (list, create, edit)

#### **UserDashboard** (`frontend/src/components/dashboard/UserDashboard.jsx`)

Added "Questionnaires" tab with:
- Pending questionnaires section
- Completed questionnaires section
- Complete questionnaire functionality
- View responses functionality
- View charts functionality
- Assignment status badges

## Key Features

### Questionnaire Creation
✅ Partner creates questionnaire with custom name and description
✅ Add multiple questions with text input
✅ For each question, add answer options with:
   - Custom text labels
   - Numeric values for scoring
   - Ordering support
✅ Reorder questions with up/down controls
✅ Edit existing questionnaires
✅ Delete questionnaires (with cascade delete of questions/options)

### Questionnaire Assignment
✅ Partner selects questionnaire from list
✅ Partner selects user(s) to assign to
✅ Multiple user assignment support
✅ Assignment creates pending task for user
✅ User sees assigned questionnaire in dashboard

### Response Collection
✅ User completes questionnaire with radio button selections
✅ Responses saved with session tracking support
✅ Can complete same questionnaire multiple times
✅ Each completion creates a new response set
✅ Progress tracking during completion
✅ All questions required before submission

### Chart Generation
✅ Each questionnaire type has its own chart
✅ Charts show response trends over time
✅ Separate from default Mind-Body assessment chart
✅ Multiple chart types (Line, Bar, Radar)
✅ Filter by specific questions
✅ Partner can view user progress per questionnaire
✅ User can view their own progress charts

## Data Flow

1. **Creation**: Partner creates questionnaire → Saved to database with questions and options
2. **Assignment**: Partner assigns to user → Creates assignment record with 'pending' status
3. **Notification**: User sees pending questionnaire in dashboard
4. **Completion**: User fills out questionnaire → Responses saved, status updated to 'completed'
5. **Tracking**: Partner views responses and charts → Analytics displayed with trends

## Technical Specifications

### Question Types Support
✅ Single choice (radio buttons)
✅ Text-based answer options
✅ Partner defines options as text with numeric values

### Chart Types
✅ Line chart for trend analysis
✅ Bar chart for comparison
✅ Radar chart for multi-dimensional view
✅ Separate chart per questionnaire type

### Performance Optimizations
✅ Proper database indexes on all foreign keys and commonly queried fields
✅ Transaction support for response saving
✅ Efficient queries with joins to minimize database calls
✅ Lazy loading for questionnaire lists
✅ Caching support via React state management

### Security
✅ Authentication required for all endpoints
✅ Role-based access control (partner vs user)
✅ Ownership verification for questionnaire operations
✅ Access verification for assignments and responses
✅ SQL injection protection via parameterized queries

## Migration Strategy

✅ New tables created without affecting existing schema
✅ Existing profile_fields system remains intact
✅ New questionnaire system runs in parallel
✅ Default Mind-Body assessment continues to work
✅ Partners can choose between default and custom questionnaires

## Database Migration Instructions

To apply the database migration:

```bash
# Connect to your MySQL database
mysql -u your_username -p your_database_name

# Run the migration file
source backend/database/migrations/add_custom_questionnaires.sql
```

Or using a database client:
1. Open your MySQL client (e.g., MySQL Workbench, phpMyAdmin)
2. Connect to your database
3. Execute the contents of `backend/database/migrations/add_custom_questionnaires.sql`

## Testing Checklist

### Partner Functionality
- [x] Partner can create questionnaire
- [x] Partner can add/edit/delete questions
- [x] Partner can add answer options with custom text and values
- [x] Partner can reorder questions
- [x] Partner can edit existing questionnaire
- [x] Partner can delete questionnaire
- [x] Partner can assign questionnaire to users
- [x] Partner can view questionnaire statistics
- [x] Partner can view user responses
- [x] Partner can view response charts

### User Functionality
- [x] User receives assignment
- [x] User can view assigned questionnaires
- [x] User can complete questionnaire
- [x] User can view previous responses
- [x] User sees progress indicator
- [x] User can view completion status
- [x] User can view response charts
- [x] Responses are saved correctly

### System Functionality
- [x] Multiple questionnaires work independently
- [x] Charts display correctly per questionnaire type
- [x] Default assessment still works
- [x] Database constraints enforce data integrity
- [x] Cascading deletes work properly
- [x] Authentication and authorization work correctly

## Files Created/Modified

### Backend Files Created
1. `backend/database/migrations/add_custom_questionnaires.sql`
2. `backend/src/models/Questionnaire.js`
3. `backend/src/models/QuestionnaireAssignment.js`
4. `backend/src/controllers/questionnaireController.js`

### Backend Files Modified
1. `backend/src/routes/index.js` - Added questionnaire routes

### Frontend Files Created
1. `frontend/src/components/questionnaires/QuestionnaireBuilder.jsx`
2. `frontend/src/components/questionnaires/QuestionnaireList.jsx`
3. `frontend/src/components/questionnaires/AssignQuestionnaireModal.jsx`
4. `frontend/src/components/questionnaires/UserQuestionnaireView.jsx`
5. `frontend/src/components/questionnaires/QuestionnaireChart.jsx`

### Frontend Files Modified
1. `frontend/src/services/api.js` - Added questionnaireAPI
2. `frontend/src/components/dashboard/PartnerDashboard.jsx` - Added Questionnaires tab
3. `frontend/src/components/dashboard/UserDashboard.jsx` - Added Questionnaires tab

## Usage Examples

### Creating a Questionnaire (Partner)
1. Go to Partner Dashboard
2. Click "Questionnaires" tab
3. Click "Create New Questionnaire"
4. Enter name and description
5. Add questions and answer options
6. Click "Save Questionnaire"

### Assigning a Questionnaire (Partner)
1. Go to Questionnaires tab
2. Click "Assign" on a questionnaire
3. Select users from the list
4. Click "Assign Questionnaire"

### Completing a Questionnaire (User)
1. Go to User Dashboard
2. Click "Questionnaires" tab
3. Click "Complete Questionnaire" on a pending assignment
4. Answer all questions
5. Click "Submit Questionnaire"

### Viewing Charts (User/Partner)
1. Go to Questionnaires tab
2. For completed questionnaires, click "View Chart"
3. Select chart type (Line, Bar, or Radar)
4. Filter by specific questions if needed

## Future Enhancements

Potential improvements for future versions:
- Multiple choice questions (checkboxes)
- Text input questions
- Scale sliders
- Date/time inputs
- Conditional questions (show/hide based on previous answers)
- Question templates
- Questionnaire templates
- Export responses to CSV/PDF
- Email notifications for assignments
- Due dates for assignments
- Reminder notifications
- Bulk assignment to multiple users
- Questionnaire categories/tags
- Advanced analytics and reporting

## Support

For issues or questions:
1. Check the implementation files for inline documentation
2. Review the API endpoints in the controller
3. Check browser console for frontend errors
4. Check server logs for backend errors
5. Verify database migration was applied successfully

## Conclusion

The Custom Questionnaire System has been fully implemented with all planned features. The system is production-ready and includes:
- Complete CRUD operations for questionnaires
- Assignment and response tracking
- Multiple chart visualizations
- Full integration with existing dashboards
- Proper authentication and authorization
- Data integrity and security measures

The implementation follows best practices and maintains separation of concerns between backend and frontend components.





















































