# Blog System Implementation Guide

## Overview
The blog system allows therapists (partners) with special permissions to create, edit, and manage blog posts and news articles. Only therapists with the `can_post_blogs` permission flag can post blogs. Admin users cannot post blogs.

## Database Setup

### For New Installations
The schema.sql file has been updated to include:
- `can_post_blogs` column in the `partners` table
- `blogs` table with all necessary fields

### For Existing Installations
Run the migration file to add blog functionality:

```bash
psql -U postgres -d therapy_tracker -f backend/database/migrations/add_blog_system.sql
```

## Granting Blog Permission to a Therapist

To grant blog posting permission to a specific therapist, run this SQL command:

```sql
-- Grant permission by partner ID
UPDATE partners 
SET can_post_blogs = TRUE 
WHERE id = <partner_id>;

-- Or grant permission by email
UPDATE partners 
SET can_post_blogs = TRUE 
WHERE email = '<therapist_email>';
```

To revoke permission:

```sql
UPDATE partners 
SET can_post_blogs = FALSE 
WHERE id = <partner_id>;
```

## API Endpoints

### Public Endpoints (No Authentication Required)
- `GET /api/blogs` - Get all published blogs
- `GET /api/blogs/:id` - Get a specific blog by ID

### Protected Endpoints (Require Authentication + Blog Permission)
- `GET /api/blogs/my/blogs` - Get all blogs by the authenticated therapist
- `POST /api/blogs` - Create a new blog post
- `PUT /api/blogs/:id` - Update a blog post (only own blogs)
- `DELETE /api/blogs/:id` - Delete a blog post (only own blogs)

## Request/Response Examples

### Create Blog
```javascript
POST /api/blogs
Headers: { Authorization: "Bearer <token>" }
Body: {
  "title": "Understanding Therapy Progress",
  "excerpt": "A brief summary of the article",
  "content": "Full article content here...",
  "category": "Clinical",
  "featured_image_url": "https://example.com/image.jpg",
  "published": true
}
```

### Update Blog
```javascript
PUT /api/blogs/:id
Headers: { Authorization: "Bearer <token>" }
Body: {
  "title": "Updated Title",
  "content": "Updated content...",
  "published": false
}
```

## Frontend Integration

The blog API is available in `frontend/src/services/api.js`:

```javascript
import { blogAPI } from '../services/api';

// Get all published blogs
const blogs = await blogAPI.getAll();

// Get all blogs (including unpublished)
const allBlogs = await blogAPI.getAll(false);

// Get a specific blog
const blog = await blogAPI.getById(1);

// Get my blogs (authenticated therapist)
const myBlogs = await blogAPI.getMyBlogs();

// Create a blog
const newBlog = await blogAPI.create({
  title: "My Blog Post",
  content: "Content here...",
  published: true
});

// Update a blog
await blogAPI.update(1, {
  title: "Updated Title"
});

// Delete a blog
await blogAPI.delete(1);
```

## Permission Checking

The system automatically checks:
1. User is authenticated
2. User is a partner (therapist)
3. Partner has `can_post_blogs = TRUE` in the database
4. For update/delete operations, the blog belongs to the authenticated therapist

## Error Responses

- `401 Unauthorized` - User not authenticated
- `403 Forbidden` - User doesn't have blog permission or trying to edit/delete someone else's blog
- `404 Not Found` - Blog not found
- `400 Bad Request` - Invalid input data

## Notes

- Only therapists (partners) can have blog permissions
- Admin users cannot post blogs (by design)
- Each therapist can only edit/delete their own blogs
- Blogs can be published or saved as drafts
- Published blogs are visible to the public
- Unpublished blogs are only visible to the author








