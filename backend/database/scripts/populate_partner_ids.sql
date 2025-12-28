-- SQL Script to populate Partner IDs for existing partners
-- This script should be run after adding the partner_id column

-- Step 1: Check if column exists (informational)
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'partners' AND column_name = 'partner_id';

-- Step 2: If column doesn't exist, add it
-- Run this if the above query returns no results:
-- ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_id VARCHAR(7);
-- CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON partners(partner_id);

-- Step 3: View current partners without Partner IDs
SELECT 
    p.id,
    p.name,
    p.organization_id,
    o.name as organization_name,
    p.partner_id
FROM partners p
JOIN organizations o ON p.organization_id = o.id
WHERE p.partner_id IS NULL OR p.partner_id = '';

-- Step 4: Generate and update Partner IDs
-- Note: This needs to be done programmatically or manually for each partner
-- because SQL doesn't have a built-in way to generate unique random numbers

-- Example for manual update (replace XX12345 with actual generated IDs):
-- UPDATE partners SET partner_id = 'XX12345' WHERE id = 1;
-- UPDATE partners SET partner_id = 'XX67890' WHERE id = 2;

-- Step 5: After all partners have Partner IDs, add constraints
-- ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL;
-- ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id);

-- Step 6: Verify all partners have Partner IDs
SELECT 
    p.id,
    p.name,
    o.name as organization_name,
    p.partner_id,
    CASE 
        WHEN p.partner_id IS NULL THEN 'MISSING'
        WHEN p.partner_id = '' THEN 'EMPTY'
        ELSE 'OK'
    END as status
FROM partners p
JOIN organizations o ON p.organization_id = o.id
ORDER BY p.id;























































