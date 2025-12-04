# Profile Picture Fix Summary

## Problem

Profile pictures were not working in production (Render.com) because:

1. **Ephemeral Filesystem**: Render.com and most cloud platforms have ephemeral storage - files uploaded to the local filesystem are deleted when the server restarts or redeploys
2. **404 Errors**: URLs like `https://therapytracker-backend.onrender.com/uploads/profile-pictures/profile-xxxxx.jpg` returned 404 Not Found
3. **Root Cause**: The `uploads` directory doesn't persist between deployments on Render

## Solution

Implemented **Cloudinary** integration for persistent cloud storage of profile pictures.

## Changes Made

### 1. Backend Dependencies
- Installed `cloudinary` package
- Installed `multer-storage-cloudinary` package

### 2. New Files Created

#### `backend/src/config/cloudinary.js`
- Cloudinary configuration module
- Loads credentials from environment variables

#### `CLOUDINARY_SETUP.md`
- Complete setup guide for Cloudinary
- Step-by-step instructions for production deployment
- Troubleshooting tips

### 3. Modified Files

#### `backend/src/middleware/upload.js`
- **Smart Storage Selection**: Automatically uses Cloudinary in production, local storage in development
- **Cloudinary Storage**: Uploads to `therapy-tracker/profile-pictures` folder
- **Image Optimization**: Auto-resizes to max 500x500px
- **Backward Compatible**: Falls back to local storage if Cloudinary not configured

#### `backend/src/controllers/uploadController.js`
- **Upload Handler**: Now handles both Cloudinary URLs and local paths
- **Delete Handler**: Detects and deletes from Cloudinary or local filesystem
- **Cloudinary URL Detection**: Checks if URL contains `cloudinary.com`

#### `backend/.env.production.example`
- Added Cloudinary environment variables:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

## How to Deploy

### Step 1: Set up Cloudinary Account
1. Sign up at https://cloudinary.com (free tier)
2. Get credentials from dashboard

### Step 2: Configure Render.com
1. Go to Render dashboard
2. Select backend service
3. Add environment variables:
   ```
   CLOUDINARY_CLOUD_NAME = your_cloud_name
   CLOUDINARY_API_KEY = your_api_key
   CLOUDINARY_API_SECRET = your_api_secret
   ```
4. Save changes (triggers auto-redeploy)

### Step 3: Verify
1. Check server logs for: `Using Cloudinary storage for file uploads`
2. Upload a profile picture
3. Verify URL starts with `https://res.cloudinary.com/`
4. Image should load in browser

## How It Works

### Upload Flow

**Before (Broken in Production)**:
```
User uploads → Express multer → Local filesystem → Returns path
                                      ↓
                              Lost on server restart ❌
```

**After (Working in Production)**:
```
User uploads → Express multer → Cloudinary → Returns full URL
                                      ↓
                              Permanently stored ✅
```

### Storage Logic

```javascript
if (CLOUDINARY_CLOUD_NAME && CLOUDINARY_API_KEY && CLOUDINARY_API_SECRET) {
  // Use Cloudinary (Production)
  storage = new CloudinaryStorage({ ... });
} else {
  // Use local filesystem (Development)
  storage = multer.diskStorage({ ... });
}
```

### URL Handling

**Cloudinary URLs** (Production):
```
https://res.cloudinary.com/your-cloud/image/upload/v123/therapy-tracker/profile-pictures/profile-xxxxx.jpg
```

**Local Paths** (Development):
```
/uploads/profile-pictures/profile-xxxxx.jpg
→ Served by: http://localhost:5000/uploads/profile-pictures/profile-xxxxx.jpg
```

## Benefits

1. ✅ **Persistent Storage**: Images never lost
2. ✅ **CDN Delivery**: Fast global access
3. ✅ **Auto Optimization**: Images resized automatically
4. ✅ **Free Tier**: 25GB storage, 25GB bandwidth/month
5. ✅ **Backward Compatible**: Works in development without Cloudinary
6. ✅ **Easy Migration**: Just add env vars and redeploy

## Migration Notes

### Existing Users
- Old profile pictures with local paths won't work in production
- Users need to re-upload their profile pictures
- New uploads will use Cloudinary

### Database
- No database changes required
- `photo_url` column stores either:
  - Cloudinary URLs (production): `https://res.cloudinary.com/...`
  - Local paths (development): `/uploads/profile-pictures/...`

## Testing

### Local Development
Without Cloudinary configured:
```bash
# Upload works with local storage
POST /api/upload/profile-picture
→ Returns: { photo_url: "/uploads/profile-pictures/profile-xxxxx.jpg" }
```

With Cloudinary configured:
```bash
# Upload uses Cloudinary
POST /api/upload/profile-picture
→ Returns: { photo_url: "https://res.cloudinary.com/..." }
```

### Production
```bash
# Must have Cloudinary configured
POST /api/upload/profile-picture
→ Returns: { photo_url: "https://res.cloudinary.com/..." }
→ Image accessible at returned URL
```

## Troubleshooting

See `CLOUDINARY_SETUP.md` for detailed troubleshooting steps.

## Cost

**Free Tier** (sufficient for most applications):
- 25 GB storage
- 25 GB bandwidth/month
- Unlimited transformations
- 25 credits/month

Estimated usage for 500 users:
- Average profile pic: 100KB
- Storage: ~50MB
- Bandwidth (10 views/month): ~500MB
- Well within free tier ✅

## Alternative Storage Solutions

If you prefer not to use Cloudinary:
- AWS S3 (more control, complex setup)
- Google Cloud Storage
- Azure Blob Storage
- Uploadcare

The upload middleware can be adapted for any storage solution.
