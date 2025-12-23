# Google OAuth Implementation Plan

## Overview
Integrate Google Sign-In for the TheraP Track application to allow users to authenticate using their Google accounts.

## Architecture

### Database Changes
**File:** `backend/migrations/20241222_add_google_oauth_support.sql`

Add columns to `auth_credentials` table:
- `google_id` (VARCHAR 255) - Stores Google user ID
- `is_google_user` (BOOLEAN) - Flags Google-authenticated users
- Make `password_hash` nullable for Google users

### Backend Implementation

#### 1. Install Dependencies
```bash
cd backend
npm install google-auth-library
```

#### 2. Create Google Auth Controller
**File:** `backend/src/controllers/googleAuthController.js`

Handles Google token verification and user authentication:
- Verify Google ID token
- Check for existing user by google_id or email
- Create new user if doesn't exist
- Generate JWT token
- Return user data

#### 3. Create Google Auth Routes
**File:** `backend/src/routes/googleAuth.js`

Routes:
- `POST /auth/google` - Handle Google authentication

#### 4. Update Auth Model
**File:** `backend/src/models/Auth.js`

Add methods:
- `findByGoogleId(googleId)` - Find user by Google ID
- `createGoogleCredentials(authData)` - Create auth record for Google user
- Update `createCredentials` to handle nullable password

#### 5. Update Main Routes
**File:** `backend/src/routes/index.js`

Add Google auth routes:
```javascript
router.post('/auth/google', googleAuthController.authenticate);
```

### Frontend Implementation

#### 1. Install Dependencies
```bash
cd frontend
npm install @react-oauth/google
```

#### 2. Update App Entry Point
**File:** `frontend/src/index.jsx`

Wrap app with GoogleOAuthProvider:
```javascript
<GoogleOAuthProvider clientId={process.env.REACT_APP_GOOGLE_CLIENT_ID}>
  <App />
</GoogleOAuthProvider>
```

#### 3. Update API Service
**File:** `frontend/src/services/api.js`

Add Google auth endpoint:
```javascript
googleAuth: (token) => api.post('/auth/google', { token })
```

#### 4. Update Auth Context
**File:** `frontend/src/context/AuthContext.jsx`

Add Google login handler:
```javascript
const googleLogin = async (token) => {
  // Handle Google authentication
};
```

#### 5. Update Login Page
**File:** `frontend/src/pages/Login.jsx`

Add Google Sign-In button:
- Import GoogleLogin component
- Add button below regular login form
- Handle success and error cases

#### 6. Update Signup Page
**File:** `frontend/src/pages/Signup.jsx`

Add Google Sign-Up button:
- Import GoogleLogin component
- Add button at top of form
- Handle Google user creation

## User Flows

### New User Signup with Google
1. User clicks "Sign up with Google"
2. Google account selection popup appears
3. User selects account
4. Frontend sends ID token to backend
5. Backend verifies token and checks for existing user
6. If user exists: Prompt to login instead
7. If new user: Create account and generate JWT
8. User is logged in and redirected to dashboard

### Existing User Login with Google
1. User clicks "Sign in with Google"
2. Google account selection popup appears
3. User selects account
4. Frontend sends ID token to backend
5. Backend verifies token and finds existing user
6. Generate JWT token
7. User is logged in and redirected to dashboard

### Existing User Linking Google Account
1. Logged-in user goes to settings
2. Clicks "Link Google Account"
3. Google account selection popup appears
4. System links Google ID to existing account
5. User can now login with Google

## Environment Variables

### Backend (.env)
```
GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-google-client-secret
```

### Frontend (.env)
```
REACT_APP_GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com
```

## Security Considerations

1. **Token Verification**: All Google tokens verified server-side
2. **Email Matching**: Existing email addresses can link to Google accounts
3. **JWT Consistency**: Same JWT system for all auth methods
4. **No Password Exposure**: Google users have null password_hash
5. **CSRF Protection**: Google OAuth provides built-in protection

## Testing Checklist

- [ ] New user can sign up with Google
- [ ] Existing user can login with Google
- [ ] User can link Google account to existing account
- [ ] Google users cannot login with password
- [ ] Regular users cannot use Google login if email doesn't match
- [ ] JWT tokens work consistently across auth methods
- [ ] User data is properly synced between Google and local accounts

## Rollback Plan

If issues occur:
1. Revert database migration
2. Remove Google auth routes
3. Remove Google login buttons from frontend
4. Users can continue with regular email/password login

## Future Enhancements

1. **Account Linking UI**: Allow logged-in users to link/unlink Google accounts
2. **Multiple Providers**: Extend to support Facebook, Apple, etc.
3. **Migration Tool**: Help users migrate from password to Google auth
4. **Admin Controls**: Allow admins to manage OAuth settings