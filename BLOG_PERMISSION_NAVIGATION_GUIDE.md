# How to Navigate to Blog Permission Management

## For Organizations with TheraPTrack Controlled Status

Organizations with `theraptrack_controlled = true` can manage blog posting permissions for their therapists.

## Navigation Steps

1. **Login as Organization User**
   - Go to the login page
   - Enter your organization credentials
   - Click "Sign In"

2. **Access Organization Dashboard**
   - After login, you'll be redirected to the Organization Dashboard
   - The dashboard shows an overview of your organization

3. **Go to Settings**
   - Look for the **Settings** tab or button in the navigation
   - Click on **Settings** to open the Organization Settings page

4. **Find Blog Permission Management Section**
   - Scroll down in the Settings page
   - Look for the section titled **"Therapist Blog Permission Management"**
   - This section appears **only** if your organization has `theraptrack_controlled = true`
   - It appears right after the "Therapist Video Session Management" section

5. **Manage Blog Permissions**
   - You'll see a list of all therapists in your organization
   - Each therapist shows:
     - Name and Partner ID
     - Email address
     - Current permission status (Can Post Blogs / No Blog Access)
   - Use the **"Grant"** button to give blog posting permission
   - Use the **"Revoke"** button to remove blog posting permission

## Visual Guide

```
Organization Dashboard
  └── Settings Tab
      └── Organization Settings Page
          └── Scroll Down
              └── Therapist Video Session Management (if theraptrack_controlled)
                  └── Therapist Blog Permission Management (if theraptrack_controlled) ← HERE
```

## Features Available

- **View All Therapists**: See all therapists with their current blog permission status
- **Search**: Search therapists by name, email, or Partner ID
- **Grant Permission**: Click "Grant" to allow a therapist to post blogs
- **Revoke Permission**: Click "Revoke" to remove blog posting permission
- **Real-time Updates**: Changes take effect immediately
- **Status Indicators**: 
  - Green badge = "Can Post Blogs"
  - Gray badge = "No Blog Access"

## Important Notes

- Only organizations with `theraptrack_controlled = true` can see this section
- You can only manage permissions for therapists in your own organization
- Changes take effect immediately - therapists can start/stop posting blogs right away
- Revoking permission doesn't delete existing blog posts, only prevents new ones

## Troubleshooting

**Q: I don't see the "Therapist Blog Permission Management" section**
- A: Check if your organization has `theraptrack_controlled = true`. Only TheraPTrack controlled organizations can manage blog permissions.

**Q: The "Grant" button doesn't work**
- A: Make sure you're logged in as an organization user and the therapist belongs to your organization.

**Q: I see an error message**
- A: Check the error message - it will tell you what went wrong. Common issues:
  - Organization not TheraPTrack controlled
  - Therapist doesn't belong to your organization
  - Network/server error







