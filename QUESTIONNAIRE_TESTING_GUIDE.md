# Custom Questionnaire System - Testing Guide

## Pre-Testing Setup

### 1. Apply Database Migration

```bash
mysql -u your_username -p your_database_name < backend/database/migrations/add_custom_questionnaires.sql
```

### 2. Verify Tables Created

```sql
SHOW TABLES LIKE '%questionnaire%';
```

Expected output:
- questionnaires
- questionnaire_questions
- questionnaire_answer_options
- user_questionnaire_assignments
- user_questionnaire_responses

### 3. Start Servers

```bash
# Terminal 1 - Backend
cd backend
npm start

# Terminal 2 - Frontend
cd frontend
npm start
```

## Testing Checklist

### Phase 1: Partner - Questionnaire Creation

#### Test 1.1: Create Basic Questionnaire
- [ ] Login as partner
- [ ] Navigate to Questionnaires tab
- [ ] Click "Create New Questionnaire"
- [ ] Enter name: "Test Questionnaire 1"
- [ ] Enter description: "This is a test questionnaire"
- [ ] Click "Add Question"
- [ ] Enter question text: "How are you feeling today?"
- [ ] Add 3 options:
  - [ ] "Good" with value 3
  - [ ] "Okay" with value 2
  - [ ] "Bad" with value 1
- [ ] Click "Save Questionnaire"
- [ ] Verify success message appears
- [ ] Verify questionnaire appears in list

**Expected Result:** Questionnaire is created and visible in the list with 1 question.

#### Test 1.2: Create Multi-Question Questionnaire
- [ ] Click "Create New Questionnaire"
- [ ] Enter name: "Mood Assessment"
- [ ] Add Question 1: "Rate your mood"
  - [ ] Add 5 options (Very Bad=1 to Very Good=5)
- [ ] Add Question 2: "Rate your energy"
  - [ ] Add 5 options (Very Low=1 to Very High=5)
- [ ] Add Question 3: "Rate your sleep quality"
  - [ ] Add 5 options (Very Poor=1 to Excellent=5)
- [ ] Click "Save Questionnaire"
- [ ] Verify questionnaire shows 3 questions in the list

**Expected Result:** Multi-question questionnaire is created successfully.

#### Test 1.3: Edit Existing Questionnaire
- [ ] Click "Edit" on "Test Questionnaire 1"
- [ ] Change name to "Updated Test Questionnaire"
- [ ] Add a new question: "How is your stress level?"
- [ ] Add 3 options for the new question
- [ ] Click "Save Questionnaire"
- [ ] Verify changes are saved
- [ ] Verify questionnaire now shows 2 questions

**Expected Result:** Questionnaire is updated with new name and additional question.

#### Test 1.4: Delete Question from Questionnaire
- [ ] Edit "Mood Assessment"
- [ ] Remove Question 2 (energy question)
- [ ] Click "Save Questionnaire"
- [ ] Verify questionnaire now has 2 questions instead of 3

**Expected Result:** Question is removed successfully.

#### Test 1.5: Reorder Questions
- [ ] Edit "Mood Assessment"
- [ ] Use up/down arrows to reorder questions
- [ ] Save questionnaire
- [ ] Verify questions appear in new order

**Expected Result:** Questions are reordered successfully.

#### Test 1.6: Delete Questionnaire
- [ ] Click "Delete" on "Test Questionnaire 1"
- [ ] Confirm deletion
- [ ] Verify questionnaire is removed from list

**Expected Result:** Questionnaire is deleted and no longer appears.

### Phase 2: Partner - Assignment

#### Test 2.1: Assign to Single User
- [ ] Click "Assign" on "Mood Assessment"
- [ ] Select one user from the list
- [ ] Click "Assign Questionnaire"
- [ ] Verify success message
- [ ] Check assignment count increases on questionnaire card

**Expected Result:** Questionnaire is assigned to the selected user.

#### Test 2.2: Assign to Multiple Users
- [ ] Click "Assign" on "Mood Assessment"
- [ ] Select 3 users from the list
- [ ] Click "Assign Questionnaire"
- [ ] Verify success message
- [ ] Check assignment count increases by 3

**Expected Result:** Questionnaire is assigned to all selected users.

#### Test 2.3: Search Users in Assignment Modal
- [ ] Click "Assign" on a questionnaire
- [ ] Type a user name in search box
- [ ] Verify filtered results
- [ ] Select filtered user
- [ ] Assign questionnaire

**Expected Result:** Search filters users correctly and assignment works.

#### Test 2.4: Select All Users
- [ ] Click "Assign" on a questionnaire
- [ ] Click "Select All" checkbox
- [ ] Verify all users are selected
- [ ] Click "Select All" again
- [ ] Verify all users are deselected

**Expected Result:** Select all functionality works correctly.

### Phase 3: User - Viewing Assignments

#### Test 3.1: View Pending Assignments
- [ ] Logout from partner account
- [ ] Login as a user who was assigned a questionnaire
- [ ] Navigate to Questionnaires tab
- [ ] Verify assigned questionnaire appears in "Pending" section
- [ ] Verify questionnaire details are correct (name, description, partner name)

**Expected Result:** User sees their assigned questionnaires.

#### Test 3.2: No Assignments Message
- [ ] Login as a user with no assignments
- [ ] Navigate to Questionnaires tab
- [ ] Verify "No Questionnaires Yet" message appears

**Expected Result:** Appropriate message shown when no assignments exist.

### Phase 4: User - Completing Questionnaires

#### Test 4.1: Complete Questionnaire
- [ ] Login as user with pending assignment
- [ ] Click "Complete Questionnaire"
- [ ] Verify all questions are displayed
- [ ] Answer all questions by selecting radio buttons
- [ ] Verify progress bar updates as you answer
- [ ] Click "Submit Questionnaire"
- [ ] Verify success message
- [ ] Verify questionnaire moves to "Completed" section

**Expected Result:** Questionnaire is completed and status updates.

#### Test 4.2: Validation - Incomplete Submission
- [ ] Start completing a questionnaire
- [ ] Leave one question unanswered
- [ ] Try to click "Submit Questionnaire"
- [ ] Verify submit button is disabled or shows error
- [ ] Answer remaining question
- [ ] Verify submit button becomes enabled

**Expected Result:** Cannot submit incomplete questionnaire.

#### Test 4.3: View Previous Responses
- [ ] Complete a questionnaire once
- [ ] Start completing the same questionnaire again (if reassigned)
- [ ] Click "Show Previous Responses"
- [ ] Verify previous answers are displayed
- [ ] Complete questionnaire with different answers
- [ ] Submit

**Expected Result:** Previous responses are visible and new responses are saved.

#### Test 4.4: Cancel Questionnaire
- [ ] Start completing a questionnaire
- [ ] Answer some questions
- [ ] Click "Cancel"
- [ ] Verify you return to questionnaire list
- [ ] Verify questionnaire is still pending

**Expected Result:** Canceling doesn't save partial responses.

### Phase 5: User - Viewing Charts

#### Test 5.1: View Chart After First Completion
- [ ] Complete a questionnaire
- [ ] Click "View Chart"
- [ ] Verify chart displays with one data point
- [ ] Verify all questions are shown
- [ ] Verify summary statistics are correct

**Expected Result:** Chart displays with initial data.

#### Test 5.2: View Chart After Multiple Completions
- [ ] Complete same questionnaire 3 times (over different days if possible)
- [ ] Click "View Chart"
- [ ] Verify chart shows trend across all completions
- [ ] Verify dates are correct on X-axis

**Expected Result:** Chart shows progression over time.

#### Test 5.3: Change Chart Type
- [ ] View a questionnaire chart
- [ ] Change from "Line Chart" to "Bar Chart"
- [ ] Verify chart updates
- [ ] Change to "Radar Chart"
- [ ] Verify radar chart displays latest data

**Expected Result:** All chart types display correctly.

#### Test 5.4: Filter by Question
- [ ] View chart for multi-question questionnaire
- [ ] Select specific question from filter dropdown
- [ ] Verify chart shows only that question's data
- [ ] Select "All Questions"
- [ ] Verify all questions are shown again

**Expected Result:** Question filter works correctly.

### Phase 6: Partner - Viewing Statistics

#### Test 6.1: View Questionnaire Statistics
- [ ] Login as partner
- [ ] Go to Questionnaires tab
- [ ] Verify each questionnaire card shows:
  - [ ] Number of questions
  - [ ] Number of assignments
  - [ ] Number of completions
  - [ ] Completion rate percentage
  - [ ] Completion rate progress bar

**Expected Result:** All statistics are accurate and displayed.

#### Test 6.2: View Assignment List
- [ ] Go to Questionnaires tab
- [ ] Note the assignment count on a questionnaire
- [ ] Assign to more users
- [ ] Verify count increases
- [ ] Have users complete it
- [ ] Verify completion count increases

**Expected Result:** Statistics update in real-time.

### Phase 7: Data Integrity

#### Test 7.1: Cascade Delete - Questionnaire
- [ ] Create a questionnaire with questions
- [ ] Assign it to users
- [ ] Have users complete it
- [ ] Delete the questionnaire
- [ ] Verify database:
  ```sql
  SELECT * FROM questionnaire_questions WHERE questionnaire_id = [deleted_id];
  SELECT * FROM user_questionnaire_assignments WHERE questionnaire_id = [deleted_id];
  SELECT * FROM user_questionnaire_responses WHERE assignment_id IN (SELECT id FROM user_questionnaire_assignments WHERE questionnaire_id = [deleted_id]);
  ```
- [ ] Verify all related records are deleted

**Expected Result:** Cascade delete removes all related data.

#### Test 7.2: Ownership Verification
- [ ] Login as Partner A
- [ ] Create a questionnaire
- [ ] Note the questionnaire ID
- [ ] Try to access questionnaire from Partner B's account (via API or URL manipulation)
- [ ] Verify access is denied

**Expected Result:** Partners can only access their own questionnaires.

#### Test 7.3: User Access Verification
- [ ] Assign questionnaire to User A
- [ ] Try to access assignment from User B's account
- [ ] Verify access is denied

**Expected Result:** Users can only access their own assignments.

### Phase 8: Edge Cases

#### Test 8.1: Empty Questionnaire
- [ ] Try to create questionnaire with no questions
- [ ] Verify validation error

**Expected Result:** Cannot create questionnaire without questions.

#### Test 8.2: Question Without Options
- [ ] Try to create question with no answer options
- [ ] Verify validation error

**Expected Result:** Cannot create question without options.

#### Test 8.3: Very Long Text
- [ ] Create questionnaire with very long name (500+ characters)
- [ ] Create question with very long text
- [ ] Verify text is handled properly (truncated or scrollable)

**Expected Result:** Long text doesn't break UI.

#### Test 8.4: Special Characters
- [ ] Create questionnaire with special characters in name: `Test & "Special" <Characters>`
- [ ] Create question with special characters
- [ ] Verify text is properly escaped and displayed

**Expected Result:** Special characters are handled correctly.

#### Test 8.5: Concurrent Editing
- [ ] Open same questionnaire in two browser tabs
- [ ] Edit in both tabs
- [ ] Save from first tab
- [ ] Save from second tab
- [ ] Verify final state is correct

**Expected Result:** Last save wins (or conflict detection if implemented).

### Phase 9: Performance

#### Test 9.1: Large Questionnaire
- [ ] Create questionnaire with 20 questions
- [ ] Each question has 10 options
- [ ] Assign to user
- [ ] Complete as user
- [ ] Verify performance is acceptable

**Expected Result:** System handles large questionnaires smoothly.

#### Test 9.2: Many Assignments
- [ ] Create questionnaire
- [ ] Assign to 50+ users
- [ ] Verify assignment completes in reasonable time
- [ ] Check database for proper indexing

**Expected Result:** Bulk assignment is performant.

#### Test 9.3: Chart with Many Data Points
- [ ] Complete same questionnaire 50+ times
- [ ] View chart
- [ ] Verify chart renders smoothly
- [ ] Verify data is aggregated properly

**Expected Result:** Chart handles many data points efficiently.

### Phase 10: Integration

#### Test 10.1: Works with Existing Sessions
- [ ] Verify default Mind-Body assessment still works
- [ ] Complete a session assessment
- [ ] Complete a custom questionnaire
- [ ] Verify both are tracked separately

**Expected Result:** Custom questionnaires don't interfere with existing assessments.

#### Test 10.2: Works with Calendar
- [ ] Create appointment
- [ ] Assign questionnaire
- [ ] Verify both systems work independently

**Expected Result:** No conflicts between features.

#### Test 10.3: Works with Video Sessions
- [ ] Schedule video session
- [ ] Assign questionnaire
- [ ] Join video session
- [ ] Complete questionnaire
- [ ] Verify both features work

**Expected Result:** All features coexist properly.

## Bug Reporting Template

If you find a bug, report it with:

```
**Bug Title:** [Brief description]

**Steps to Reproduce:**
1. 
2. 
3. 

**Expected Result:**
[What should happen]

**Actual Result:**
[What actually happened]

**Environment:**
- Browser: [Chrome/Firefox/Safari]
- OS: [Windows/Mac/Linux]
- User Role: [Partner/User]

**Screenshots:**
[If applicable]

**Console Errors:**
[Any errors from browser console]
```

## Success Criteria

The system passes testing if:
- [ ] All Phase 1-6 tests pass
- [ ] No critical bugs in Phase 7-8
- [ ] Performance is acceptable in Phase 9
- [ ] No conflicts in Phase 10
- [ ] No data loss or corruption
- [ ] All user roles work correctly
- [ ] Charts display accurate data
- [ ] Database integrity maintained

## Post-Testing Cleanup

After testing:
1. Delete test questionnaires
2. Remove test assignments
3. Clear test response data
4. Verify production data is intact

```sql
-- View test data
SELECT * FROM questionnaires WHERE name LIKE '%Test%';
SELECT * FROM user_questionnaire_assignments WHERE questionnaire_id IN (SELECT id FROM questionnaires WHERE name LIKE '%Test%');

-- Delete test data (be careful!)
DELETE FROM questionnaires WHERE name LIKE '%Test%';
```

## Production Deployment Checklist

Before deploying to production:
- [ ] All tests passed
- [ ] Database migration tested on staging
- [ ] Backup production database
- [ ] Apply migration to production
- [ ] Deploy backend code
- [ ] Deploy frontend code
- [ ] Verify basic functionality in production
- [ ] Monitor error logs for 24 hours
- [ ] Train users on new feature

## Conclusion

This testing guide ensures the Custom Questionnaire System is thoroughly validated before production use. Complete all phases systematically and document any issues found.

























































