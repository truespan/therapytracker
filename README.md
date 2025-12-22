# Therapy Tracker MVP

A comprehensive web application for tracking therapy progress through visual mind-body maps. The application supports three user roles: Users (patients), Partners (therapists), and Organizations.

## Features

### For Users (Patients)
- Complete mind-body profile assessments before and after each therapy session
- Visualize progress using interactive radar charts
- Compare ratings across multiple sessions
- Rate yourself on 10 default fields plus custom fields
- Add feedback and ratings for each therapy session
- Track improvements over time in mental, physical, and relational aspects
- Receive WhatsApp notifications for appointment confirmations

### For Partners (Therapists)
- View all assigned clients and their progress
- Create new therapy sessions for clients
- Access client mind-body maps and session history
- Add custom assessment fields for specific client needs
- Monitor client improvements across sessions
- Automatic WhatsApp notifications sent to clients when appointments are created

### For Organizations
- Overview dashboard with statistics
- View all therapists and their clients
- Access comprehensive data across the organization
- Monitor overall therapy effectiveness
- Manage WhatsApp notification settings and view delivery statistics

## Tech Stack

### Backend
- **Node.js** with **Express.js** - RESTful API server
- **PostgreSQL** - Relational database
- **JWT** - Authentication
- **bcrypt** - Password hashing

### Frontend
- **React 18** - UI library
- **React Router** - Client-side routing
- **Recharts** - Radar chart visualization
- **Tailwind CSS** - Styling
- **Axios** - HTTP client
- **Lucide React** - Icons

## Project Structure

```
therapy-tracker/
├── backend/
│   ├── database/
│   │   ├── schema.sql          # Database schema
│   │   └── seed.sql            # Sample data
│   ├── src/
│   │   ├── config/
│   │   │   └── database.js     # PostgreSQL connection
│   │   ├── controllers/        # Request handlers
│   │   ├── middleware/         # Auth & role checking
│   │   ├── models/            # Database models
│   │   ├── routes/            # API routes
│   │   └── server.js          # Express server
│   └── package.json
│
└── frontend/
    ├── public/
    ├── src/
    │   ├── components/
    │   │   ├── auth/          # Login & signup
    │   │   ├── charts/        # Radar charts
    │   │   ├── dashboard/     # Role-based dashboards
    │   │   ├── layout/        # Navbar
    │   │   ├── profile/       # Questionnaire & fields
    │   │   └── sessions/      # Session management
    │   ├── context/           # Auth context
    │   ├── pages/             # Page components
    │   ├── services/          # API calls
    │   ├── utils/             # Helpers & validators
    │   ├── App.jsx
    │   └── index.jsx
    └── package.json
```

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- PostgreSQL (v13 or higher)
- npm or yarn

### 1. Database Setup

First, create a PostgreSQL database:

```bash
psql -U postgres
CREATE DATABASE therapy_tracker;
\q
```

Run the schema to create tables:

```bash
psql -U postgres -d therapy_tracker -f backend/database/schema.sql
```

(Optional) Load sample data:

```bash
psql -U postgres -d therapy_tracker -f backend/database/seed.sql
```

### 2. Backend Setup

Navigate to the backend directory:

```bash
cd backend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```bash
cp .env.example .env
```

Update the `.env` file with your configuration:

```env
PORT=5000
DATABASE_URL=postgresql://postgres:password@localhost:5432/therapy_tracker
JWT_SECRET=your_super_secret_jwt_key_change_in_production
NODE_ENV=development
```

Start the backend server:

```bash
npm start
```

For development with auto-restart:

```bash
npm run dev
```

The API will be available at `http://localhost:5000`

### 3. Frontend Setup

Navigate to the frontend directory:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

Create a `.env` file:

```bash
REACT_APP_API_URL=http://localhost:5000/api
```

Start the frontend development server:

```bash
npm start
```

The application will open at `http://localhost:3000`

## API Documentation

### Authentication Endpoints

#### POST `/api/auth/signup`
Register a new user, partner, or organization.

**Request Body:**
```json
{
  "userType": "user|partner|organization",
  "email": "user@example.com",
  "password": "password123",
  "name": "John Doe",
  "sex": "Male",
  "age": 30,
  "contact": "+1-555-0100",
  "address": "123 Main St",
  "organization_id": 1  // Required for partners
}
```

#### POST `/api/auth/login`
Authenticate a user.

**Request Body:**
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "token": "jwt_token_here",
  "user": {
    "id": 1,
    "userType": "user",
    "name": "John Doe",
    ...
  }
}
```

#### GET `/api/auth/me`
Get current authenticated user details.

**Headers:** `Authorization: Bearer <token>`

### User Endpoints

- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/:id` - Update user details
- `GET /api/users/:id/profile` - Get user's profile history
- `GET /api/users/:id/sessions` - Get user's sessions
- `POST /api/users/assign-partner` - Assign user to partner

### Partner Endpoints

- `GET /api/partners/:id` - Get partner by ID
- `PUT /api/partners/:id` - Update partner details
- `GET /api/partners/:id/users` - Get partner's assigned users
- `GET /api/partners/:partnerId/users/:userId/profile` - Get user profile

### Organization Endpoints

- `GET /api/organizations/:id` - Get organization by ID
- `PUT /api/organizations/:id` - Update organization details
- `GET /api/organizations/:id/partners` - Get organization's partners
- `GET /api/organizations/:id/users` - Get all users in organization

### Session Endpoints

- `POST /api/sessions` - Create new session
- `GET /api/sessions/:id` - Get session details
- `GET /api/users/:userId/sessions` - Get user's sessions
- `PUT /api/sessions/:id` - Update session feedback
- `POST /api/sessions/:sessionId/profile` - Save session profile ratings

### Profile Field Endpoints

- `GET /api/profile-fields` - Get all profile fields
- `POST /api/profile-fields` - Create custom field
- `GET /api/profile-data/users/:userId` - Get user's profile data

## Default Profile Fields

1. **Main Problem Statement** (5-point: Excellent to Very Poor)
2. **Mental Clarity** (5-point)
3. **Emotions Management** (5-point)
4. **Relationship with Spouse/Partner** (5-point)
5. **Friends Circle** (5-point)
6. **Relationship with Colleagues in Workplace** (5-point)
7. **Digestion** (5-point)
8. **Addictions** (5-point)
9. **Sleep Quality** (Always, Mostly, Sometimes, Rarely, Very rarely)
10. **General Energy Levels** (Energetic, Tired, Drained, Fatigued)

## Sample Data

If you loaded the seed data, you can use these credentials:

**Organization:**
- Email: `contact@wellnesscenter.com`
- Password: `password123`

**Partner (Therapist):**
- Email: `sarah.johnson@wellnesscenter.com`
- Password: `password123`

**User (Patient):**
- Email: `john.doe@email.com`
- Password: `password123`

## Usage Flow

### For Users:
1. Sign up as a user
2. Wait to be assigned to a therapist
3. Complete initial mind-body assessment
4. After each therapy session, re-rate yourself
5. View your progress on radar charts
6. Compare sessions over time

### For Therapists:
1. Sign up as a partner (select organization)
2. View assigned clients
3. Create new sessions for clients
4. View client progress and mind-body maps
5. Add custom assessment fields as needed

### For Organizations:
1. Sign up as an organization
2. View all therapists and clients
3. Monitor overall statistics
4. Access comprehensive progress data

## Development

### Running Tests
```bash
# Backend
cd backend
npm test

# Frontend
cd frontend
npm test
```

### Building for Production

**Backend:**
```bash
cd backend
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
```

The build files will be in `frontend/build/`

## Environment Variables

### Backend (.env)
```
PORT=5000
DATABASE_URL=postgresql://user:password@localhost:5432/therapy_tracker
JWT_SECRET=your_jwt_secret_key
NODE_ENV=production
```

### Frontend (.env)
```
REACT_APP_API_URL=https://your-api-domain.com/api
```

## WhatsApp Notifications

The system includes automated WhatsApp notifications for appointment confirmations. When appointments are created or slots are booked, clients receive WhatsApp messages with appointment details.

### Setup Instructions

1. **Install Dependencies**:
```bash
cd backend
npm install twilio
```

2. **Configure Environment Variables**:
Add to your `.env.production` file:
```env
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token
TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886
WHATSAPP_ENABLED=true
```

3. **Run Database Migration**:
```bash
psql -U postgres -d therapy_tracker -f backend/database/migrations/001_add_whatsapp_notifications.sql
```

4. **Test the Integration**:
```bash
# Get service status
curl -H "Authorization: Bearer YOUR_TOKEN" http://localhost:5000/api/whatsapp/status

# Send test message
curl -X POST http://localhost:5000/api/whatsapp/test \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"phoneNumber": "+919876543210"}'
```

### Features

- **Automatic Notifications**: Sent when appointments are created or slots are booked
- **Phone Validation**: Supports Indian (+91) and international formats
- **Error Handling**: Non-blocking - appointment creation succeeds even if WhatsApp fails
- **Logging**: All notifications logged to database for monitoring
- **Admin Controls**: API endpoints for testing, monitoring, and managing notifications

### Documentation

- **[Detailed Setup Guide](backend/WHATSAPP_SETUP_GUIDE.md)**: Complete step-by-step setup instructions
- **[Quick Reference](backend/WHATSAPP_QUICK_REFERENCE.md)**: Quick start guide and API reference
- **[Implementation Plan](plans/whatsapp-notification-implementation.md)**: Technical architecture and design decisions

## Security Considerations

- All passwords are hashed using bcrypt
- JWT tokens expire after 7 days
- Role-based access control on all endpoints
- SQL injection prevention through parameterized queries
- CORS enabled for specified origins
- WhatsApp credentials stored in environment variables (never committed)
- Phone numbers validated before sending messages

## Future Enhancements

- Email/SMS appointment reminders (in addition to WhatsApp)
- Calendar integration for appointments
- Export reports as PDF
- Mobile app versions
- Real-time notifications
- Video session integration
- Advanced analytics and insights
- Multi-language support

## Troubleshooting

### Database Connection Issues
- Verify PostgreSQL is running
- Check DATABASE_URL in .env
- Ensure database exists and schema is loaded

### Frontend Not Connecting to Backend
- Verify backend is running on correct port
- Check REACT_APP_API_URL in frontend .env
- Clear browser cache and restart dev server

### Authentication Issues
- Check JWT_SECRET is set in backend .env
- Verify token is being sent in Authorization header
- Check token expiration

## License

This project is created as an MVP demonstration.

## Support

For issues and questions, please create an issue in the repository.

