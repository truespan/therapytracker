<!-- 8abcc6e2-e42d-4dba-a4cc-8859a9a7ca08 2eff6969-74b4-4ac9-bdfb-33aeba34d9c5 -->
# TheraP Track MVP Implementation Plan

## Architecture Overview

**Stack**: React + Node.js/Express + PostgreSQL

**Chart Library**: Recharts (for radar/spider charts)

**Auth**: JWT-based authentication

**Deployment Ready**: Docker configuration included

## Database Schema (PostgreSQL)

Create tables for:

- `users` (patients) - id, name, sex, age, email, contact, address, photo_url, partner_id, created_at
- `partners` (therapists) - id, name, sex, age, email, contact, address, photo_url, organization_id, created_at
- `organizations` - id, name, date_of_creation, email, contact, address, photo_url, created_at
- `auth_credentials` - id, user_type (user/partner/organization), reference_id, email, password_hash
- `profile_fields` - id, field_name, field_type (rating_5/rating_4/energy_levels/sleep_quality), category (problem/mind/relationship/physical), is_default, created_by_user_id
- `user_profiles` - id, user_id, session_id, field_id, rating_value, recorded_at
- `sessions` - id, user_id, partner_id, session_number, session_date, feedback_text, rating (1-5 stars), completed
- `user_partner_assignments` - user_id, partner_id, assigned_at

## Backend (Node.js/Express)

**File Structure:**

```
backend/
├── src/
│   ├── config/
│   │   └── database.js (PostgreSQL connection)
│   ├── models/ (Database models/queries)
│   │   ├── User.js
│   │   ├── Partner.js
│   │   ├── Organization.js
│   │   ├── Session.js
│   │   └── Profile.js
│   ├── controllers/ (Business logic)
│   │   ├── authController.js
│   │   ├── userController.js
│   │   ├── partnerController.js
│   │   ├── organizationController.js
│   │   └── sessionController.js
│   ├── routes/
│   │   └── index.js (All API routes)
│   ├── middleware/
│   │   ├── auth.js (JWT verification)
│   │   └── roleCheck.js (Role-based access)
│   └── server.js
├── package.json
└── .env.example
```

**Key API Endpoints:**

- `POST /api/auth/signup` - Register (user/partner/organization)
- `POST /api/auth/login` - Login
- `GET /api/users/:id/profile` - Get user profile with all sessions
- `POST /api/users/:id/profile` - Create/update profile ratings
- `GET /api/users/:id/sessions` - Get all sessions for user
- `POST /api/sessions` - Create new session
- `PUT /api/sessions/:id` - Update session feedback
- `GET /api/partners/:id/users` - Get all users for a partner
- `GET /api/organizations/:id/partners` - Get all partners for organization
- `POST /api/profile-fields` - Add custom field
- `GET /api/profile-fields` - Get all fields (default + custom)

## Frontend (React)

**File Structure:**

```
frontend/
├── src/
│   ├── components/
│   │   ├── auth/
│   │   │   ├── SignupForm.jsx
│   │   │   └── LoginForm.jsx
│   │   ├── charts/
│   │   │   ├── RadarChart.jsx (Mind-body map visualization)
│   │   │   └── ProgressComparison.jsx (Compare sessions)
│   │   ├── dashboard/
│   │   │   ├── UserDashboard.jsx
│   │   │   ├── PartnerDashboard.jsx
│   │   │   └── OrganizationDashboard.jsx
│   │   ├── profile/
│   │   │   ├── ProfileQuestionnaire.jsx (Initial + re-rating)
│   │   │   ├── CustomFieldManager.jsx
│   │   │   └── PreviousRatings.jsx (Show previous scores)
│   │   ├── sessions/
│   │   │   ├── SessionList.jsx
│   │   │   ├── SessionFeedback.jsx (Rating + write-up)
│   │   │   └── SessionDetail.jsx
│   │   └── layout/
│   │       ├── Navbar.jsx
│   │       └── Sidebar.jsx
│   ├── pages/
│   │   ├── Home.jsx
│   │   ├── Login.jsx
│   │   ├── Signup.jsx
│   │   ├── UserDashboardPage.jsx
│   │   ├── PartnerDashboardPage.jsx
│   │   └── OrganizationDashboardPage.jsx
│   ├── services/
│   │   └── api.js (Axios API calls)
│   ├── context/
│   │   └── AuthContext.jsx (User authentication state)
│   ├── utils/
│   │   ├── chartHelpers.js (Transform data for charts)
│   │   └── validators.js (Form validation)
│   ├── App.jsx
│   └── index.jsx
├── package.json
└── .env.example
```

**Key Features:**

1. **Authentication Flow**

   - Role selection (User/Partner/Organization)
   - Signup forms with mandatory/optional fields
   - Login with JWT token storage
   - Protected routes based on role

2. **User Dashboard**

   - Radar chart showing current mind-body profile
   - Session history with comparison view
   - Button to rate/re-rate profile
   - Printable profile report

3. **Profile Questionnaire**

   - 10 default fields (categorized: Problem, Mind, Relationship, Physical)
   - Custom fields added by user/partner
   - Show previous ratings when re-rating
   - Different input types: 5-point scale, sleep quality, energy levels

4. **Session Management**

   - Create new session (tracks session number)
   - Add feedback (text + 1-5 star rating)
   - View session history

5. **Partner Dashboard**

   - List of assigned users
   - View each user's progress
   - Access to user radar charts
   - Add custom fields for users

6. **Organization Dashboard**

   - List of partners in organization
   - View partner statistics
   - Access to all user data under organization

7. **Radar Chart Visualization**

   - Multi-axis radar chart with 10+ dimensions
   - Overlay multiple sessions for comparison
   - Color-coded by session
   - Export/print functionality

## Default Profile Fields Configuration

**Rating Scale Mapping:**

- Excellent = 5
- Good = 4
- Fair = 3
- Poor = 2
- Very Poor = 1

**Fields:**

1. Main Problem Statement (5-point)
2. Mental Clarity (5-point)
3. Emotions Management (5-point)
4. Relationship with Spouse/Partner (5-point)
5. Friends Circle (5-point)
6. Relationship with Colleagues (5-point)
7. Digestion (5-point)
8. Addictions (5-point)
9. Sleep Quality (custom: Always/Mostly/Sometimes/Rarely/Very rarely)
10. General Energy Levels (custom: Energetic/Tired/Drained/Fatigued)

## Implementation Approach

1. **Database Setup** - Create PostgreSQL database, tables, and seed default profile fields
2. **Backend Core** - Auth system, database models, middleware
3. **Backend APIs** - All CRUD endpoints with role-based access
4. **Frontend Auth** - Signup/login pages with role selection
5. **Profile System** - Questionnaire component with previous ratings display
6. **Radar Chart** - Recharts integration with data transformation
7. **Dashboards** - Role-specific dashboards with data visualization
8. **Session Management** - Create, update, and view sessions
9. **Styling** - Modern, clean UI with responsive design
10. **Testing & Polish** - Test all flows, add error handling

## Technologies & Libraries

**Backend:**

- express (^4.18.0)
- pg (PostgreSQL client)
- bcrypt (password hashing)
- jsonwebtoken (JWT auth)
- cors
- dotenv

**Frontend:**

- react (^18.0.0)
- react-router-dom (routing)
- recharts (charts)
- axios (API calls)
- tailwindcss (styling)
- lucide-react (icons)

## Deliverables

- Fully functional MVP with all core features
- PostgreSQL database with sample data
- README with setup instructions
- Environment configuration examples
- Docker setup (optional but recommended)

### To-dos

- [x] Set up PostgreSQL database schema with all tables and relationships
- [x] Create backend project structure with Express server, config, and middleware
- [x] Implement authentication system (signup, login, JWT) for all three roles
- [x] Build all REST API endpoints for users, partners, organizations, profiles, and sessions
- [x] Create React app structure with routing, context, and base components
- [x] Build signup and login pages for all user types with form validation
- [x] Create profile questionnaire component with 10 default fields and previous ratings display
- [x] Implement radar chart visualization using Recharts with session comparison
- [x] Build user dashboard with radar chart, session history, and progress tracking
- [x] Create partner dashboard to view and manage assigned users
- [x] Build organization dashboard to view partners and overall statistics
- [x] Implement session creation, feedback submission, and history viewing
- [x] Add functionality for users and partners to create custom profile fields
- [x] Apply modern, responsive styling with Tailwind CSS across all components
- [x] Create README with setup instructions, API documentation, and usage guide