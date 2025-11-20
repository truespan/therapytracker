/**
 * Script to populate Partner IDs for existing partners
 * Run this after adding the partner_id column to existing databases
 * 
 * Usage: node backend/database/scripts/populate_partner_ids.js
 */

const db = require('../../src/config/database');

async function generatePartnerId(organizationId, existingPartnerIds) {
  // Fetch organization name
  const orgQuery = 'SELECT name FROM organizations WHERE id = $1';
  const orgResult = await db.query(orgQuery, [organizationId]);
  
  if (!orgResult.rows[0]) {
    throw new Error(`Organization with ID ${organizationId} not found`);
  }
  
  const orgName = orgResult.rows[0].name;
  
  // Extract first two letters from organization name (uppercase)
  const prefix = orgName
    .replace(/[^a-zA-Z]/g, '') // Remove non-alphabetic characters
    .substring(0, 2)
    .toUpperCase()
    .padEnd(2, 'X'); // Pad with 'X' if less than 2 letters
  
  // Generate unique Partner ID with collision handling
  let partnerId;
  let isUnique = false;
  let attempts = 0;
  const maxAttempts = 100;
  
  while (!isUnique && attempts < maxAttempts) {
    // Generate 5 random digits
    const randomDigits = Math.floor(10000 + Math.random() * 90000).toString();
    partnerId = `${prefix}${randomDigits}`;
    
    // Check if this Partner ID already exists
    if (!existingPartnerIds.has(partnerId)) {
      isUnique = true;
      existingPartnerIds.add(partnerId);
    }
    
    attempts++;
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique Partner ID after multiple attempts');
  }
  
  return partnerId;
}

async function populatePartnerIds() {
  try {
    console.log('Starting Partner ID population...\n');
    
    // Get all partners without Partner IDs
    const partnersQuery = 'SELECT id, name, organization_id FROM partners WHERE partner_id IS NULL';
    const partnersResult = await db.query(partnersQuery);
    const partners = partnersResult.rows;
    
    if (partners.length === 0) {
      console.log('✓ No partners found without Partner IDs. All partners are up to date!');
      return;
    }
    
    console.log(`Found ${partners.length} partner(s) without Partner IDs.\n`);
    
    // Track existing Partner IDs to avoid duplicates
    const existingIdsQuery = 'SELECT partner_id FROM partners WHERE partner_id IS NOT NULL';
    const existingIdsResult = await db.query(existingIdsQuery);
    const existingPartnerIds = new Set(existingIdsResult.rows.map(row => row.partner_id));
    
    // Update each partner
    let successCount = 0;
    let errorCount = 0;
    
    for (const partner of partners) {
      try {
        // Generate Partner ID
        const partnerId = await generatePartnerId(partner.organization_id, existingPartnerIds);
        
        // Update partner record
        const updateQuery = 'UPDATE partners SET partner_id = $1 WHERE id = $2';
        await db.query(updateQuery, [partnerId, partner.id]);
        
        console.log(`✓ Partner "${partner.name}" (ID: ${partner.id}) -> Partner ID: ${partnerId}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to update partner "${partner.name}" (ID: ${partner.id}): ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total partners processed: ${partners.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    
    if (errorCount === 0) {
      console.log('\n✓ All partners now have Partner IDs!');
      console.log('\nNext steps:');
      console.log('1. Verify the Partner IDs in your database');
      console.log('2. Run: ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL;');
      console.log('3. Run: ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id);');
    } else {
      console.log('\n⚠ Some partners failed to update. Please review the errors above.');
    }
    
  } catch (error) {
    console.error('Error populating Partner IDs:', error);
    throw error;
  }
}

// Run the script
populatePartnerIds()
  .then(() => {
    console.log('\nScript completed.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed:', error);
    process.exit(1);
  });

