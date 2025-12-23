# Google OAuth Setup Guide

This guide will help you set up Google Sign-In for the TheraP Track application.

## Prerequisites

- Google account with access to Google Cloud Console
- TheraP Track application deployed or running locally
- Access to environment configuration files

## Step 1: Create Google OAuth Credentials

### 1.1 Access Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Sign in with your Google account
3. Create a new project or select an existing one

### 1.2 Enable Google Sign-In API

1. In the left sidebar, go to **APIs & Services** > **Library**
2. Search for "Google Sign-In API" or "Google Identity Services"
3. Click on the API and enable it for your project

### 1.3 Create OAuth 2.0 Credentials

1. Go to **APIs & Services** > **Credentials**
2. Click **Create Credentials** > **OAuth 2.0 Client ID**
3. Configure the OAuth consent screen:
   - User Type: External
   - App Name: "TheraP Track"
   - User support email: Your support email
   - Developer contact email: Your email
   - Scopes: Add "email", "profile", "openid"
   - Test users: Add your email and any test accounts

4. Create the OAuth client:
   - Application type: Web application
   - Name: "TheraP Track Web Client"
   - Authorized JavaScript origins:
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)
   - Authorized redirect URIs:
     - `http://localhost:3000` (for local development)
     - `https://your-production-domain.com` (for production)

5. Click **Create** and save the **Client ID** and **Client Secret**

## Step 2: Configure Backend Environment

### 2.1 Add Environment Variables

Add these variables to your backend `.env` file:

```bash
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=your-client-secret
```

### 2.2 Database Migration

Run the database migration to add Google OAuth support:

```bash
cd backend
psql -U your_db_user -d your_db_name -f migrations/20241222_add_google_oauth_support.sql
```

Or if using a migration tool:
```bash
npm run migrate
```

## Step 3: Configure Frontend Environment

### 3.1 Add Environment Variables

Add this variable to your frontend `.env` file:

```bash
# Google OAuth Configuration
REACT_APP_GOOGLE_CLIENT_ID=your-client-id.apps.googleusercontent.com
```

**Note:** The Client ID is the same for both frontend and backend, but the frontend uses the `REACT_APP_` prefix.

## Step 4: Verify Installation

### 4.1 Install Dependencies

Backend dependencies should already be installed:
```bash
cd backend
npm install google-auth-library
```

Frontend dependencies should already be installed:
```bash
cd frontend
npm install @react-oauth/google
```

### 4.2 Test the Integration

1. Start your backend server:
```bash
cd backend
npm run dev
```

2. Start your frontend server:
```bash
cd frontend
npm start
```

3. Navigate to the login page (`/login`)
4. You should see a "Sign in with Google" button
5. Click it and test the Google Sign-In flow

## Step 5: Configure OAuth Consent Screen (Production)

For production use, you need to verify your OAuth consent screen:

1. Go to **APIs & Services** > **OAuth consent screen**
2. Click **Publish App** or **Submit for Verification**
3. Provide required information:
   - Application homepage: Your app's URL
   - Application privacy policy link: Link to privacy policy
   - Application terms of service link: Link to terms of service
   - Application logo: Your app logo (optional)

4. Submit for verification (required if your app uses sensitive scopes)

## Step 6: Security Considerations

### 6.1 Environment Variables

- Never commit `.env` files to version control
- Use different OAuth credentials for development and production
- Rotate client secrets regularly
- Use strong, unique secrets for each environment

### 6.2 Domain Configuration

- Only add domains you control to authorized origins
- Use HTTPS for all production URLs
- Don't use wildcard domains unless absolutely necessary

### 6.3 User Data Handling

- Google user data is verified server-side before creating accounts
- Email addresses are used to link existing accounts to Google
- Google users don't have passwords stored in the database
- JWT tokens are used consistently across all authentication methods

## Troubleshooting

### Issue: "Invalid OAuth client ID"

**Solution:**
- Verify the Client ID in your environment variables matches the Google Cloud Console
- Ensure the Client ID is correctly formatted (ends with `.apps.googleusercontent.com`)
- Check that the OAuth client is not deleted or disabled

### Issue: "Origin not allowed"

**Solution:**
- Add your domain to the "Authorized JavaScript origins" in Google Cloud Console
- Include both `http://localhost:3000` and your production domain
- Wait a few minutes for changes to propagate

### Issue: "redirect_uri_mismatch"

**Solution:**
- Verify the redirect URI in your OAuth client settings
- Ensure it matches exactly with your application's URL
- For local development, use `http://localhost:3000`

### Issue: "Google login failed"

**Solution:**
- Check browser console for detailed error messages
- Verify the Google ID token is being sent correctly to the backend
- Ensure the backend can verify tokens with Google's servers
- Check that `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set correctly

### Issue: "Additional information required"

**Solution:**
- This is expected for new Google users
- The system redirects to the signup form with pre-filled Google data
- Users need to complete additional required fields (partner ID, contact, etc.)

## Testing Checklist

- [ ] Google Sign-In button appears on login page
- [ ] Google Sign-In button appears on signup page
- [ ] New users can sign up with Google
- [ ] Existing users can login with Google
- [ ] Google accounts link to existing email accounts
- [ ] JWT tokens work correctly for Google users
- [ ] User data is properly stored and retrieved
- [ ] Error handling works correctly
- [ ] Mobile responsiveness is maintained

## Support

If you encounter issues:

1. Check the browser console for frontend errors
2. Check the backend logs for server errors
3. Verify all environment variables are set correctly
4. Ensure the database migration was successful
5. Test with different Google accounts
6. Check Google Cloud Console for API quotas and errors

## Additional Resources

- [Google Identity Services Documentation](https://developers.google.com/identity)
- [OAuth 2.0 for Client-side Web Apps](https://developers.google.com/identity/oauth2/web/guides/overview)
- [Google Cloud Console](https://console.cloud.google.com/)
- [TheraP Track Documentation](README.md)