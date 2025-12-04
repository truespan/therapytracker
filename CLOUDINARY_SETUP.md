# Cloudinary Setup Guide for Profile Pictures

## Why Cloudinary?

The application uses Cloudinary for storing profile pictures in production because:
- **Render.com has ephemeral storage** - uploaded files are lost on server restart/redeploy
- Cloudinary provides **permanent cloud storage** for images
- **Free tier** includes 25GB storage and 25GB bandwidth/month
- Automatic **image optimization** and transformations

## Setup Instructions

### 1. Create a Cloudinary Account

1. Go to [Cloudinary](https://cloudinary.com/)
2. Sign up for a free account
3. After signing in, go to the **Dashboard**

### 2. Get Your Credentials

From the Cloudinary Dashboard, you'll see:
- **Cloud Name**: Your unique cloud identifier
- **API Key**: Your API key
- **API Secret**: Click "Show" to reveal it

### 3. Configure Environment Variables

#### For Local Development (Optional)

Add these to your `.env` file in the `backend` folder:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

> **Note**: Local development will fall back to local storage if Cloudinary is not configured.

#### For Production (Render.com)

1. Go to your Render.com dashboard
2. Select your backend service
3. Go to **Environment** tab
4. Add these environment variables:

```
CLOUDINARY_CLOUD_NAME = your_cloud_name
CLOUDINARY_API_KEY = your_api_key
CLOUDINARY_API_SECRET = your_api_secret
```

5. Click **Save Changes**
6. Render will automatically redeploy with the new variables

## How It Works

### Storage Selection

The application automatically chooses storage based on configuration:

- **Cloudinary Configured**: Uses Cloudinary storage (production)
- **Cloudinary Not Configured**: Uses local filesystem storage (development)

### Upload Behavior

When a profile picture is uploaded:

1. **With Cloudinary**:
   - File is uploaded directly to Cloudinary
   - Returns a full URL: `https://res.cloudinary.com/your-cloud/image/upload/...`
   - Stored in folder: `therapy-tracker/profile-pictures`
   - Auto-resized to max 500x500px

2. **Without Cloudinary** (Local):
   - File is stored in `backend/uploads/profile-pictures/`
   - Returns a relative path: `/uploads/profile-pictures/filename.jpg`
   - Served by Express static middleware

### Frontend Usage

The frontend already handles both cases:
- If `photo_url` starts with `http`, it uses it directly (Cloudinary)
- If `photo_url` starts with `/`, it prepends `BASE_URL` (local storage)

## Migration from Local to Cloudinary

If you already have profile pictures in the database with local paths:

1. Set up Cloudinary credentials in Render.com
2. Redeploy the backend
3. Users will need to re-upload their profile pictures
4. Old local paths will be replaced with Cloudinary URLs

## Verification

After setting up Cloudinary:

1. Check server logs on Render.com - you should see:
   ```
   Using Cloudinary storage for file uploads
   ```

2. Upload a profile picture
3. Check the database - `photo_url` should be a Cloudinary URL:
   ```
   https://res.cloudinary.com/your-cloud/image/upload/v1234567890/therapy-tracker/profile-pictures/profile-xxxxx.jpg
   ```

4. The image should be accessible directly in browser

## Troubleshooting

### Images not loading

1. **Check Cloudinary credentials**:
   - Verify all three environment variables are set in Render.com
   - Make sure there are no extra spaces or quotes

2. **Check Cloudinary dashboard**:
   - Login to Cloudinary
   - Go to Media Library
   - Look for `therapy-tracker/profile-pictures` folder
   - Verify images are being uploaded

3. **Check server logs**:
   - Look for "Using Cloudinary storage" message
   - Check for any Cloudinary error messages

### Upload fails

1. **File size**: Maximum 5MB per file
2. **File type**: Only jpg, jpeg, png, gif, webp allowed
3. **Cloudinary quota**: Check if you've exceeded free tier limits

## Cost Considerations

**Cloudinary Free Tier** (generous for most applications):
- 25 GB storage
- 25 GB bandwidth/month
- 25 credits/month for transformations
- Unlimited image transformations

For the therapy tracker application with hundreds of users, this should be more than sufficient.

## Alternative Solutions

If you prefer not to use Cloudinary:

1. **AWS S3**: More complex setup, but more control
2. **Google Cloud Storage**: Similar to S3
3. **Azure Blob Storage**: Good if already using Azure
4. **Uploadcare**: Similar to Cloudinary with free tier

The code can be adapted for any of these by modifying the `upload.js` middleware.
