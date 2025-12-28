# Custom Questionnaire System - Quick Start Guide

## Setup Instructions

### 1. Database Migration

First, apply the database migration to create the necessary tables:

```bash
# Connect to MySQL
mysql -u your_username -p your_database_name

# Run the migration
source backend/database/migrations/add_custom_questionnaires.sql

# Or copy and paste the SQL content directly
```

### 2. Restart Backend Server

```bash
cd backend
npm start
```

The backend will automatically load the new models and routes.

### 3. Restart Frontend Server

```bash
cd frontend
npm start
```

The frontend will automatically include the new components.

## For Partners (Therapists)

### Creating Your First Questionnaire

1. **Login** to your partner account
2. Navigate to **Dashboard**
3. Click the **"Questionnaires"** tab
4. Click **"+ Create New Questionnaire"**

5. **Fill in the details:**
   - **Name**: e.g., "Anxiety Assessment"
   - **Description**: e.g., "Weekly anxiety level tracking"

6. **Add Questions:**
   - Click **"+ Add Question"**
   - Enter question text: e.g., "How anxious do you feel today?"
   
7. **Add Answer Options:**
   - Click **"+ Add Option"** for each answer
   - Example options:
     - Text: "Not at all anxious" | Value: 1
     - Text: "Slightly anxious" | Value: 2
     - Text: "Moderately anxious" | Value: 3
     - Text: "Very anxious" | Value: 4
     - Text: "Extremely anxious" | Value: 5

8. **Add More Questions** as needed
9. Click **"Save Questionnaire"**

### Assigning a Questionnaire to Users

1. In the **Questionnaires** tab, find your questionnaire
2. Click **"Assign"** button
3. **Select users** from your client list (use checkboxes)
4. Click **"Assign Questionnaire"**
5. Users will see the assignment in their dashboard

### Viewing Results

1. Go to **Questionnaires** tab
2. Click on a questionnaire to see statistics:
   - Total assignments
   - Completion rate
   - Number of responses

3. To view individual user responses:
   - Go to **Clients** tab
   - Select a user
   - View their questionnaire responses and charts

## For Users (Clients)

### Completing an Assigned Questionnaire

1. **Login** to your user account
2. Navigate to **Dashboard**
3. Click the **"Questionnaires"** tab
4. You'll see two sections:
   - **Pending** - Questionnaires you need to complete
   - **Completed** - Questionnaires you've already completed

5. Click **"Complete Questionnaire"** on a pending item
6. **Answer all questions** by selecting radio buttons
7. Watch the progress bar fill up as you answer
8. Click **"Submit Questionnaire"** when all questions are answered

### Viewing Your Progress

1. In the **Questionnaires** tab
2. Find a completed questionnaire
3. Click **"View Chart"** to see your progress over time
4. Options:
   - **Chart Type**: Line, Bar, or Radar
   - **Filter**: View all questions or specific ones
   - See trends and patterns in your responses

## Example Use Cases

### Use Case 1: Weekly Mood Tracking

**Questionnaire Name:** "Weekly Mood Check"

**Questions:**
1. "How would you rate your overall mood this week?"
   - Very Poor (1)
   - Poor (2)
   - Neutral (3)
   - Good (4)
   - Excellent (5)

2. "How well did you sleep this week?"
   - Very Poorly (1)
   - Poorly (2)
   - Average (3)
   - Well (4)
   - Very Well (5)

3. "How was your energy level?"
   - Very Low (1)
   - Low (2)
   - Moderate (3)
   - High (4)
   - Very High (5)

**Assignment:** Assign to all active clients weekly

### Use Case 2: Anxiety Assessment

**Questionnaire Name:** "GAD-7 Style Assessment"

**Questions:**
1. "Feeling nervous, anxious, or on edge"
   - Not at all (0)
   - Several days (1)
   - More than half the days (2)
   - Nearly every day (3)

2. "Not being able to stop or control worrying"
   - Not at all (0)
   - Several days (1)
   - More than half the days (2)
   - Nearly every day (3)

[Continue with more questions...]

### Use Case 3: Session Preparation

**Questionnaire Name:** "Pre-Session Check-in"

**Questions:**
1. "What would you like to focus on in today's session?"
   - Past events (1)
   - Current challenges (2)
   - Future goals (3)
   - Relationships (4)
   - Other (5)

2. "How urgent is this topic?"
   - Not urgent (1)
   - Somewhat urgent (2)
   - Urgent (3)
   - Very urgent (4)

## Tips and Best Practices

### For Partners

1. **Keep it Simple**: Start with 3-5 questions for your first questionnaire
2. **Clear Questions**: Use simple, direct language
3. **Consistent Scale**: Use the same scale (e.g., 1-5) across similar questions
4. **Regular Assignments**: Assign questionnaires at consistent intervals
5. **Review Trends**: Look at charts to identify patterns over time
6. **Combine with Sessions**: Link questionnaire responses to therapy sessions

### For Users

1. **Be Honest**: Answer truthfully for accurate tracking
2. **Be Consistent**: Complete questionnaires at the same time (e.g., every Monday)
3. **Review Charts**: Look at your progress charts regularly
4. **Discuss Results**: Share interesting patterns with your therapist
5. **Complete Promptly**: Try to complete assigned questionnaires within a few days

## Troubleshooting

### Partner Issues

**Problem:** Can't see the Questionnaires tab
- **Solution:** Make sure you're logged in as a partner (not user)
- **Solution:** Clear browser cache and refresh

**Problem:** Can't assign questionnaire to a user
- **Solution:** Verify the user is assigned to you as a client
- **Solution:** Check that the questionnaire has at least one question

**Problem:** Charts not showing data
- **Solution:** Ensure users have completed the questionnaire at least once
- **Solution:** Check that responses were saved successfully

### User Issues

**Problem:** Can't see assigned questionnaires
- **Solution:** Refresh the page
- **Solution:** Check the Questionnaires tab (not Assessments tab)

**Problem:** Can't submit questionnaire
- **Solution:** Make sure all questions are answered
- **Solution:** Check for error messages at the top of the page

**Problem:** Charts show no data
- **Solution:** Complete the questionnaire at least once
- **Solution:** Wait a few seconds after submission and refresh

## Advanced Features

### Linking to Sessions

When completing a questionnaire, you can optionally link it to a therapy session:
- This helps track progress within the context of your therapy timeline
- Responses can be viewed alongside session notes

### Multiple Completions

Users can complete the same questionnaire multiple times:
- Each completion creates a new data point
- Charts show trends across all completions
- Useful for tracking progress over weeks/months

### Response History

Users can view their previous responses:
- Click "Show Previous Responses" when completing a questionnaire
- Compare current feelings with past responses
- Identify patterns and changes

## API Endpoints Reference

For developers integrating with the system:

### Questionnaire Management
- `POST /api/questionnaires` - Create questionnaire
- `GET /api/questionnaires/partner/:partnerId` - Get partner's questionnaires
- `GET /api/questionnaires/:id` - Get questionnaire details
- `PUT /api/questionnaires/:id` - Update questionnaire
- `DELETE /api/questionnaires/:id` - Delete questionnaire

### Assignment Management
- `POST /api/questionnaires/assign` - Assign to users
- `GET /api/questionnaires/assignments/user/:userId` - Get user assignments
- `GET /api/questionnaires/assignments/partner/:partnerId` - Get partner assignments

### Response Management
- `POST /api/questionnaires/assignments/:id/responses` - Save responses
- `GET /api/questionnaires/assignments/:id/responses` - Get responses
- `GET /api/questionnaires/:questionnaireId/user/:userId/aggregated` - Get chart data

## Support

If you encounter any issues:
1. Check the browser console for errors (F12)
2. Check the server logs for backend errors
3. Verify the database migration was applied
4. Ensure you're using the latest version of the code

## Next Steps

After setting up the system:
1. Create 2-3 test questionnaires
2. Assign them to a test user account
3. Complete the questionnaires as the user
4. View the charts and responses
5. Iterate and refine your questionnaires based on feedback

## Conclusion

The Custom Questionnaire System provides a flexible way to track client progress beyond the standard Mind-Body assessment. Use it to:
- Monitor specific symptoms or behaviors
- Prepare for therapy sessions
- Track treatment effectiveness
- Engage clients between sessions
- Gather structured feedback

Start simple and expand as you become more comfortable with the system!















































