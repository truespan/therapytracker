# Profile Picture Implementation Guide

This document describes the complete implementation of profile picture functionality for Partners and Organizations in the Therapy Tracker application.

## Overview

Partners (therapists) and Organizations can now upload, display, and manage their profile pictures/logos. The implementation uses local server storage with multer for file handling.

## Features Implemented

### 1. Backend Infrastructure

#### File Upload Configuration
- **Location**: `backend/src/middleware/upload.js`
- **Storage**: Local filesystem at `backend/uploads/profile-pictures/`
- **File Naming**: `{userType}-{userId}-{timestamp}.{ext}`
- **Allowed Formats**: JPEG, JPG, PNG, GIF, WebP
- **Max File Size**: 5MB
- **Validation**: File type and size validation

#### API Endpoints

**Upload Profile Picture**
```
POST /api/upload/profile-picture
Authorization: Bearer {token}
Content-Type: multipart/form-data

Body:
- profilePicture: File
- userType: "partner" | "organization"
- userId: string (Partner ID or Organization ID)

Response:
{
  "message": "Profile picture uploaded successfully",
  "photo_url": "/uploads/profile-pictures/partner-123-1234567890.jpg",
  "data": { ... updated record ... }
}
```

**Delete Profile Picture**
```
DELETE /api/upload/profile-picture
Authorization: Bearer {token}
Content-Type: application/json

Body:
{
  "userType": "partner" | "organization",
  "userId": "string"
}

Response:
{
  "message": "Profile picture deleted successfully",
  "data": { ... updated record ... }
}
```

#### Static File Serving
- **Location**: `backend/src/server.js`
- **Route**: `/uploads` serves files from `backend/uploads/`
- **Access**: Files are publicly accessible via URL

### 2. Database Schema

The database schema was already prepared with `photo_url` columns:

**Partners Table**
- `photo_url TEXT` - Stores the relative URL path to the profile picture

**Organizations Table**
- `photo_url TEXT` - Stores the relative URL path to the organization logo

### 3. Frontend Components

#### ImageUpload Component
- **Location**: `frontend/src/components/common/ImageUpload.jsx`
- **Purpose**: Reusable component for uploading profile pictures
- **Features**:
  - Circular image preview
  - Upload button with loading state
  - Delete button for existing images
  - File validation (type and size)
  - Error handling and display
  - Automatic database update on upload/delete

**Props:**
```javascript
{
  currentImageUrl: string,      // Current photo URL
  onUpload: (photoUrl) => {},   // Callback after successful upload
  onDelete: () => {},           // Callback after successful delete
  label: string,                // Display label
  userType: "partner" | "organization",
  userId: string,               // Partner or Organization ID
  disabled: boolean             // Disable during loading
}
```

#### Integration in Edit Modals

**EditPartnerModal** (`frontend/src/components/organization/EditPartnerModal.jsx`)
- Added ImageUpload component above the name field
- Shows partner's current profile picture
- Allows upload/delete during partner editing
- Updates formData state when picture changes

**EditOrganizationModal** (`frontend/src/components/admin/EditOrganizationModal.jsx`)
- Added ImageUpload component above organization name field
- Shows organization's current logo
- Allows upload/delete during organization editing
- Updates formData state when logo changes

### 4. Dashboard Display

#### Partner Dashboard
- **Location**: `frontend/src/components/dashboard/PartnerDashboard.jsx`
- **Display**: Profile picture shown next to "Welcome, {name}" heading
- **Fallback**: User icon displayed if no profile picture exists
- **Size**: 64x64 pixels (w-16 h-16)
- **Style**: Circular with border

#### Organization Dashboard
- **Location**: `frontend/src/components/dashboard/OrganizationDashboard.jsx`
- **Display**: Organization logo shown next to organization name
- **Fallback**: Building icon displayed if no logo exists
- **Size**: Responsive (48x48 on mobile, 56x56 on tablet, 64x64 on desktop)
- **Style**: Circular with border

## File Structure

```
backend/
├── src/
│   ├── controllers/
│   │   └── uploadController.js          # Upload logic
│   ├── middleware/
│   │   └── upload.js                     # Multer configuration
│   ├── routes/
│   │   └── index.js                      # Upload routes
│   └── server.js                         # Static file serving
├── uploads/
│   └── profile-pictures/                 # Uploaded images storage
│       ├── partner-1-1234567890.jpg
│       └── organization-2-1234567891.png

frontend/
└── src/
    └── components/
        ├── common/
        │   └── ImageUpload.jsx           # Reusable upload component
        ├── organization/
        │   └── EditPartnerModal.jsx      # Partner edit with upload
        ├── admin/
        │   └── EditOrganizationModal.jsx # Organization edit with upload
        └── dashboard/
            ├── PartnerDashboard.jsx       # Display partner picture
            └── OrganizationDashboard.jsx  # Display org logo
```

## Usage Instructions

### For Organizations (Adding Partner Profile Picture)

1. Navigate to Organization Dashboard
2. Click on a partner to view their details
3. Click "Edit" button to open EditPartnerModal
4. Click "Upload Picture" or "Change Picture" in the Profile Picture section
5. Select an image file (max 5MB, JPEG/PNG/GIF/WebP)
6. Image uploads automatically and updates the database
7. Click "Update Therapist" to save other changes
8. Profile picture appears in Partner's dashboard after they log in

### For Admin (Adding Organization Logo)

1. Navigate to Admin Dashboard
2. Click "Edit" on an organization
3. Click "Upload Picture" or "Change Picture" in the Organization Logo section
4. Select an image file (max 5MB, JPEG/PNG/GIF/WebP)
5. Image uploads automatically and updates the database
6. Click "Update Organization" to save other changes
7. Logo appears in Organization's dashboard

### For Partners (Viewing Their Profile Picture)

1. Log in as a Partner
2. Profile picture is displayed in the welcome section on the dashboard
3. Picture appears next to "Welcome, {name}"
4. If no picture exists, a user icon placeholder is shown

### For Organizations (Viewing Their Logo)

1. Log in as an Organization
2. Logo is displayed in the header section of the dashboard
3. Logo appears next to the organization name
4. If no logo exists, a building icon placeholder is shown

## Technical Details

### Image URL Format

Images are stored with relative URLs in the database:
```
/uploads/profile-pictures/partner-123-1234567890.jpg
```

When displaying, the component checks if the URL is absolute:
```javascript
const imageUrl = photo_url.startsWith('http')
  ? photo_url
  : `http://localhost:5000${photo_url}`;
```

### File Upload Flow

1. User selects image file
2. Frontend validates file type and size
3. FormData created with file and metadata (userType, userId)
4. POST request sent to `/api/upload/profile-picture`
5. Multer middleware processes the file upload
6. File saved to `uploads/profile-pictures/` with unique name
7. Database updated with photo_url
8. Response returns the new photo_url
9. Frontend updates preview and calls onUpload callback

### File Delete Flow

1. User clicks "Delete Picture"
2. Confirmation dialog shown
3. DELETE request sent with userType and userId
4. Backend retrieves current photo_url from database
5. File deleted from filesystem
6. Database updated to set photo_url = null
7. Frontend clears preview and calls onDelete callback

### Error Handling

**Backend:**
- Invalid file type: Returns 400 error
- File too large: Multer automatically rejects
- Missing parameters: Returns 400 error
- User not found: Returns 404 error and cleans up uploaded file
- Database error: Returns 500 error and cleans up uploaded file

**Frontend:**
- File validation errors shown in red text
- Upload errors displayed below the component
- Loading state prevents multiple simultaneous uploads
- Network errors caught and displayed to user

## Security Considerations

### Implemented
- ✅ Authentication required (Bearer token)
- ✅ File type validation (only images)
- ✅ File size limit (5MB)
- ✅ Unique filenames prevent overwrites
- ✅ Error handling cleans up failed uploads

### Additional Recommendations
- Consider adding rate limiting for uploads
- Implement virus scanning for uploaded files
- Add image optimization/compression
- Consider moving to cloud storage (S3, Cloudinary) for production
- Add CORS restrictions for upload endpoint
- Implement file cleanup job for orphaned files

## Dependencies

**Backend:**
- `multer` (^1.4.5-lts.1) - File upload handling

**Frontend:**
- No additional dependencies (uses native FormData API)

## Environment Configuration

No environment variables needed for local storage.

For production, you may want to configure:
```env
UPLOAD_PATH=/path/to/uploads
MAX_FILE_SIZE=5242880
ALLOWED_FILE_TYPES=jpeg,jpg,png,gif,webp
```

## Testing

### Manual Testing Steps

1. **Upload Flow**:
   - Test with valid image files (JPEG, PNG, GIF, WebP)
   - Test with oversized files (>5MB)
   - Test with invalid file types (PDF, TXT, etc.)
   - Verify file appears in uploads folder
   - Verify database updated correctly
   - Verify image displays in dashboard

2. **Delete Flow**:
   - Test deleting existing profile picture
   - Verify file removed from filesystem
   - Verify database updated to null
   - Verify fallback icon displays

3. **Edge Cases**:
   - Test with invalid userId
   - Test without authentication
   - Test network interruptions
   - Test browser refresh during upload

## Future Enhancements

- [ ] Image cropping before upload
- [ ] Drag-and-drop upload support
- [ ] Multiple image sizes/thumbnails
- [ ] Cloud storage integration (AWS S3, Cloudinary)
- [ ] Image optimization and compression
- [ ] Bulk upload for multiple partners
- [ ] Image gallery view
- [ ] Profile picture history/versioning

## Troubleshooting

### Issue: Images not displaying

**Possible causes:**
1. Backend server not running
2. Incorrect URL construction
3. File path mismatch
4. CORS issues

**Solution:**
- Check backend server is running on port 5000
- Verify uploads folder exists
- Check browser console for 404 errors
- Verify photo_url in database matches actual file

### Issue: Upload fails

**Possible causes:**
1. File too large
2. Invalid file type
3. Insufficient permissions on uploads folder
4. Authentication token expired

**Solution:**
- Check file size (<5MB)
- Verify file type is image
- Check folder permissions: `chmod 755 backend/uploads`
- Re-authenticate and try again

### Issue: Deleted files still showing

**Possible causes:**
1. Browser cache
2. Database not updated
3. File not actually deleted

**Solution:**
- Clear browser cache (Ctrl+Shift+R)
- Check database photo_url column
- Verify file removed from uploads folder

## API Response Examples

### Successful Upload
```json
{
  "message": "Profile picture uploaded successfully",
  "photo_url": "/uploads/profile-pictures/partner-1-1701234567890.jpg",
  "data": {
    "id": 1,
    "name": "Dr. John Smith",
    "email": "john@example.com",
    "photo_url": "/uploads/profile-pictures/partner-1-1701234567890.jpg",
    "is_active": true
  }
}
```

### Successful Delete
```json
{
  "message": "Profile picture deleted successfully",
  "data": {
    "id": 1,
    "name": "Dr. John Smith",
    "email": "john@example.com",
    "photo_url": null,
    "is_active": true
  }
}
```

### Error Response
```json
{
  "error": "Only image files are allowed (jpeg, jpg, png, gif, webp)"
}
```

## Maintenance

### Regular Tasks
- Monitor uploads folder size
- Clean up orphaned files (files with no database reference)
- Backup uploaded images
- Monitor upload errors in logs

### Database Queries

**Find partners without profile pictures:**
```sql
SELECT id, name, email FROM partners WHERE photo_url IS NULL;
```

**Find organizations without logos:**
```sql
SELECT id, name, email FROM organizations WHERE photo_url IS NULL;
```

**Find orphaned files:**
```bash
# List all files in uploads
ls backend/uploads/profile-pictures/

# Compare with database records
psql -d therapy_tracker -c "SELECT photo_url FROM partners UNION SELECT photo_url FROM organizations;"
```

## Conclusion

The profile picture feature is fully implemented and integrated into the application. Partners can see their profile pictures on their dashboard, and organizations can display their logos. The feature uses a simple, robust approach with local file storage and is ready for production use with minor adjustments for cloud storage if needed.
