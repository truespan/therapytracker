# How to Set query_resolver = true for Partners and Organizations

This guide explains how to set the `query_resolver` flag to `true` for Partners and Organizations (where `theraptrack_controlled = true`).

## What is query_resolver?

The `query_resolver` flag grants access to the support dashboard, allowing Partners or Organizations to resolve support queries. Only users with `query_resolver = true` can access the support dashboard (in addition to Admins).

## Methods to Set query_resolver

### Method 1: Using API Endpoints (Recommended)

#### For Partners

**Endpoint:** `PUT /api/partners/:id`

**Authorization:**
- Admin can update any partner
- Partner can only update themselves
- Organization can update their own partners (if they have permission)

**Example Request:**
```bash
curl -X PUT http://localhost:3001/api/partners/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "query_resolver": true
  }'
```

**JavaScript/TypeScript Example:**
```javascript
// Using the API service
await api.partners.update(partnerId, { query_resolver: true });

// Or using fetch
const response = await fetch(`/api/partners/${partnerId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ query_resolver: true })
});
```

#### For Organizations

**Option A: Regular Update Endpoint**
**Endpoint:** `PUT /api/organizations/:id`

**Authorization:**
- Admin can update any organization
- Organization can only update themselves

**Example Request:**
```bash
curl -X PUT http://localhost:3001/api/organizations/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "query_resolver": true
  }'
```

**Option B: Admin Update Endpoint (Recommended for Admins)**
**Endpoint:** `PUT /api/admin/organizations/:id`

**Authorization:** Admin only

**Example Request:**
```bash
curl -X PUT http://localhost:3001/api/admin/organizations/1 \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_ADMIN_TOKEN" \
  -d '{
    "query_resolver": true
  }'
```

**JavaScript/TypeScript Example:**
```javascript
// Using the API service
await api.admin.updateOrganization(organizationId, { query_resolver: true });

// Or using fetch
const response = await fetch(`/api/admin/organizations/${organizationId}`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${token}`
  },
  body: JSON.stringify({ query_resolver: true })
});
```

### Method 2: Direct SQL Update (For Bulk Operations)

If you need to set `query_resolver = true` for multiple records, you can use direct SQL:

#### For Partners in TheraPTrack Controlled Organizations

```sql
-- Set query_resolver = true for all partners in TheraPTrack controlled organizations
UPDATE partners
SET query_resolver = true
WHERE organization_id IN (
  SELECT id FROM organizations WHERE theraptrack_controlled = true
)
AND query_resolver = false;  -- Only update if currently false
```

#### For Specific Partner

```sql
UPDATE partners
SET query_resolver = true
WHERE id = 1;  -- Replace 1 with the partner ID
```

#### For Organizations with TheraPTrack Controlled = true

```sql
-- Set query_resolver = true for all TheraPTrack controlled organizations
UPDATE organizations
SET query_resolver = true
WHERE theraptrack_controlled = true
AND query_resolver = false;  -- Only update if currently false
```

#### For Specific Organization

```sql
UPDATE organizations
SET query_resolver = true
WHERE id = 1;  -- Replace 1 with the organization ID
```

### Method 3: Using Admin Dashboard (If Available)

If the admin dashboard has UI for managing organizations, you can:
1. Navigate to the organization/partner management section
2. Edit the specific organization/partner
3. Check the `query_resolver` checkbox (if available in the UI)
4. Save the changes

## Verification

After setting `query_resolver = true`, verify it was set correctly:

### Check Partner
```sql
SELECT id, name, email, query_resolver, organization_id
FROM partners
WHERE id = 1;  -- Replace with partner ID
```

### Check Organization
```sql
SELECT id, name, email, query_resolver, theraptrack_controlled
FROM organizations
WHERE id = 1;  -- Replace with organization ID
```

### Via API
```bash
# Get partner
curl -X GET http://localhost:3001/api/partners/1 \
  -H "Authorization: Bearer YOUR_TOKEN"

# Get organization
curl -X GET http://localhost:3001/api/organizations/1 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Important Notes

1. **Authorization**: **Only Admins can set `query_resolver = true`**. The system has been configured to restrict this setting to administrators only:
   - Partners cannot set `query_resolver` for themselves or others
   - Organizations cannot set `query_resolver` for themselves or others
   - Only administrators can set this flag via the update endpoints

2. **Organization Requirement**: For organizations, `query_resolver = true` can only be set for organizations where `theraptrack_controlled = true`. The system will reject attempts to set `query_resolver = true` for organizations that are not TheraPTrack controlled.

3. **Creation Restriction**: `query_resolver` cannot be set during partner or organization creation. It can only be set via update endpoints by administrators.

2. **TheraPTrack Controlled Organizations**: The user specifically asked about Organizations where `theraptrack_controlled = true`. You can filter for these using:
   ```sql
   SELECT id, name, email, theraptrack_controlled, query_resolver
   FROM organizations
   WHERE theraptrack_controlled = true;
   ```

3. **Support Dashboard Access**: Once `query_resolver = true` is set, the Partner or Organization will have access to:
   - Support dashboard routes
   - Support chat management
   - Query resolution capabilities

4. **Bulk Updates**: For bulk updates, use the SQL method or create a script that calls the API endpoints in a loop.

## Example: Bulk Update Script

Here's a Node.js script example for bulk updating:

```javascript
const db = require('./backend/src/config/database');

async function setQueryResolverForTheraPTrackOrgs() {
  try {
    // Set query_resolver for all TheraPTrack controlled organizations
    const result = await db.query(`
      UPDATE organizations
      SET query_resolver = true
      WHERE theraptrack_controlled = true
      AND query_resolver = false
      RETURNING id, name, email
    `);
    
    console.log(`Updated ${result.rows.length} organizations:`, result.rows);
    
    // Set query_resolver for all partners in TheraPTrack controlled organizations
    const partnerResult = await db.query(`
      UPDATE partners
      SET query_resolver = true
      WHERE organization_id IN (
        SELECT id FROM organizations WHERE theraptrack_controlled = true
      )
      AND query_resolver = false
      RETURNING id, name, email, organization_id
    `);
    
    console.log(`Updated ${partnerResult.rows.length} partners:`, partnerResult.rows);
  } catch (error) {
    console.error('Error updating query_resolver:', error);
  }
}

setQueryResolverForTheraPTrackOrgs();
```

