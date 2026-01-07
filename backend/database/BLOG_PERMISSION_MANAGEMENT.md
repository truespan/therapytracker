# Blog Permission Management for Organizations

## Overview
Organizations with `theraptrack_controlled = true` can grant and revoke blog posting permissions to their therapists from their dashboard.

## API Endpoints

### Get All Therapists with Blog Permission Status
```
GET /api/organizations/:id/therapists/blog-permissions
```
**Authorization:** Organization role, must be the organization owner

**Response:**
```json
{
  "success": true,
  "therapists": [
    {
      "id": 1,
      "name": "Dr. John Doe",
      "email": "john@example.com",
      "partner_id": "OR12345",
      "can_post_blogs": true,
      "created_at": "2025-01-01T00:00:00.000Z"
    }
  ]
}
```

### Grant Blog Permission to a Therapist
```
POST /api/organizations/:id/therapists/:partnerId/blog-permission/grant
```
**Authorization:** Organization role, must be the organization owner

**Response:**
```json
{
  "success": true,
  "message": "Blog posting permission granted successfully",
  "therapist": {
    "id": 1,
    "name": "Dr. John Doe",
    "email": "john@example.com",
    "can_post_blogs": true
  }
}
```

### Revoke Blog Permission from a Therapist
```
POST /api/organizations/:id/therapists/:partnerId/blog-permission/revoke
```
**Authorization:** Organization role, must be the organization owner

**Response:**
```json
{
  "success": true,
  "message": "Blog posting permission revoked successfully",
  "therapist": {
    "id": 1,
    "name": "Dr. John Doe",
    "email": "john@example.com",
    "can_post_blogs": false
  }
}
```

## Security Requirements

1. **Organization must be TheraPTrack Controlled:**
   - Only organizations with `theraptrack_controlled = true` can manage blog permissions
   - Returns `403 Forbidden` if organization is not TheraPTrack controlled

2. **Authorization:**
   - Only organization users can access these endpoints
   - Organization must own the therapists (verify `organization_id`)

3. **Therapist Validation:**
   - Therapist must exist
   - Therapist must belong to the organization
   - Prevents granting/revoking permission twice

## Frontend Integration

```javascript
import { organizationAPI } from '../services/api';

// Get all therapists with blog permission status
const response = await organizationAPI.getTherapistsBlogPermissions(organizationId);
const therapists = response.data.therapists;

// Grant blog permission
await organizationAPI.grantBlogPermission(organizationId, partnerId);

// Revoke blog permission
await organizationAPI.revokeBlogPermission(organizationId, partnerId);
```

## Error Responses

- `403 Forbidden` - Organization is not TheraPTrack controlled
- `403 Forbidden` - Unauthorized (not organization owner)
- `404 Not Found` - Organization or therapist not found
- `400 Bad Request` - Permission already granted/revoked
- `403 Forbidden` - Therapist does not belong to organization

## Usage Flow

1. Organization admin logs into dashboard
2. Navigates to therapist management section
3. Views list of therapists with their blog permission status
4. Can grant or revoke blog posting permission for each therapist
5. Changes take effect immediately

## Notes

- Only TheraPTrack controlled organizations can manage blog permissions
- Organizations can only manage permissions for their own therapists
- Permission changes are immediate and affect therapist's ability to post blogs
- Revoking permission does not delete existing blog posts, but prevents new posts











