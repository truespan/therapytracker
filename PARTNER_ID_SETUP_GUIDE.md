# Partner ID Setup Guide - Manual Steps

Since you cannot see Partner IDs in your partners table, this means the `partner_id` column either doesn't exist yet or existing partners don't have IDs assigned. Follow these steps:

## Option 1: Using the Backend API (Recommended)

### Step 1: Start the Backend Server
```bash
cd backend
npm start
```

### Step 2: Create an API Endpoint to Populate Partner IDs

Add this temporary endpoint to `backend/src/routes/index.js`:

```javascript
// Temporary endpoint to populate Partner IDs
router.post('/api/admin/populate-partner-ids', async (req, res) => {
  try {
    const Partner = require('../models/Partner');
    const db = require('../config/database');
    
    // Get all partners
    const result = await db.query('SELECT id, name, organization_id, partner_id FROM partners');
    const partners = result.rows;
    const partnersWithoutId = partners.filter(p => !p.partner_id);
    
    if (partnersWithoutId.length === 0) {
      return res.json({ 
        message: 'All partners already have Partner IDs',
        partners: partners.map(p => ({ id: p.id, name: p.name, partner_id: p.partner_id }))
      });
    }
    
    // Track existing IDs
    const existingIds = new Set(partners.filter(p => p.partner_id).map(p => p.partner_id));
    const updated = [];
    
    // Generate IDs for partners without them
    for (const partner of partnersWithoutId) {
      const partnerId = await Partner.generatePartnerId(partner.organization_id);
      await db.query('UPDATE partners SET partner_id = $1 WHERE id = $2', [partnerId, partner.id]);
      updated.push({ id: partner.id, name: partner.name, partner_id: partnerId });
    }
    
    res.json({
      message: 'Partner IDs generated successfully',
      updated,
      total: partners.length,
      updatedCount: updated.length
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

### Step 3: Call the Endpoint

Use Postman, curl, or your browser:

```bash
curl -X POST http://localhost:5000/api/admin/populate-partner-ids
```

Or open your browser and use the console:
```javascript
fetch('http://localhost:5000/api/admin/populate-partner-ids', { method: 'POST' })
  .then(r => r.json())
  .then(console.log);
```

---

## Option 2: Using Database Client (pgAdmin, DBeaver, etc.)

### Step 1: Add the Column (if it doesn't exist)

```sql
-- Check if column exists
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'partners' AND column_name = 'partner_id';

-- If it doesn't exist, add it:
ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_id VARCHAR(7);
CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON partners(partner_id);
```

### Step 2: Check Current Partners

```sql
SELECT 
    p.id,
    p.name,
    o.name as organization_name,
    p.partner_id,
    SUBSTRING(REGEXP_REPLACE(o.name, '[^a-zA-Z]', '', 'g'), 1, 2) as org_prefix
FROM partners p
JOIN organizations o ON p.organization_id = o.id
ORDER BY p.id;
```

### Step 3: Manually Generate Partner IDs

For each partner, create a Partner ID using this format:
- First 2 letters of organization name (uppercase)
- 5 random digits

Example SQL to update partners:

```sql
-- Replace XX12345 with actual generated IDs
-- Make sure each ID is unique!

UPDATE partners SET partner_id = 'WE12345' WHERE id = 1;  -- Example for "Wellness Center"
UPDATE partners SET partner_id = 'WE67890' WHERE id = 2;
UPDATE partners SET partner_id = 'HC45678' WHERE id = 3;  -- Example for "Health Clinic"
```

### Step 4: Add Constraints (after all partners have IDs)

```sql
-- Make sure all partners have Partner IDs first!
SELECT COUNT(*) FROM partners WHERE partner_id IS NULL;

-- If the above returns 0, add constraints:
ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL;
ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id);
```

---

## Option 3: Fix Database Connection and Run Script

### Step 1: Check Database Configuration

Make sure `backend/.env` has the correct database connection string:

```env
DATABASE_URL=postgresql://username:password@localhost:5432/therapy_tracker
```

Replace:
- `username` with your PostgreSQL username
- `password` with your PostgreSQL password
- `localhost` with your database host
- `5432` with your PostgreSQL port
- `therapy_tracker` with your database name

### Step 2: Run the Population Script

```bash
cd backend
node populate_partner_ids_standalone.js
```

---

## Verification

After completing any of the above options, verify Partner IDs:

```sql
SELECT id, name, partner_id 
FROM partners 
ORDER BY id;
```

All partners should now have Partner IDs in the format: `XX12345`

---

## Quick Test

### Test Partner Signup
1. Sign up a new partner
2. Check if they automatically get a Partner ID
3. Log in as that partner and verify Partner ID shows on dashboard

### Test User Signup with Partner ID
1. Copy a Partner ID from a partner's dashboard
2. Sign up as a new user (patient)
3. Enter the Partner ID
4. Verify the user is automatically linked to that partner

---

## Troubleshooting

### "partner_id column does not exist"
Run the ALTER TABLE command from Option 2, Step 1

### "Database connection error"
Check your `backend/.env` file and ensure PostgreSQL is running

### "Partner ID not showing on dashboard"
1. Make sure the partner has a partner_id in the database
2. Clear browser cache and refresh
3. Log out and log back in

### "Invalid Partner ID during user signup"
1. Verify the Partner ID exists in the database
2. Make sure it's exactly 7 characters (2 letters + 5 digits)
3. Check for typos (Partner IDs are case-insensitive but stored as uppercase)

---

## Need Help?

If you're still having issues:

1. Check what's in your database:
   ```sql
   SELECT * FROM partners;
   ```

2. Share the output and I can help generate the correct UPDATE statements

3. Or use Option 1 (API endpoint) which is the easiest method




































