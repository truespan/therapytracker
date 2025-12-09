/**
 * Standalone script to populate Partner IDs for existing partners
 * This script can be run independently without starting the backend server
 * 
 * Usage: node populate_partner_ids_standalone.js
 */

const { Pool } = require('pg');
require('dotenv').config({ path: './backend/.env' });

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function generatePartnerId(organizationId, existingPartnerIds) {
  // Fetch organization name
  const orgQuery = 'SELECT name FROM organizations WHERE id = $1';
  const orgResult = await pool.query(orgQuery, [organizationId]);
  
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

async function checkColumnExists() {
  try {
    const query = `
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'partners' AND column_name = 'partner_id'
    `;
    const result = await pool.query(query);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking column:', error.message);
    return false;
  }
}

async function addPartnerIdColumn() {
  try {
    console.log('Adding partner_id column to partners table...');
    
    // Add column
    await pool.query('ALTER TABLE partners ADD COLUMN IF NOT EXISTS partner_id VARCHAR(7)');
    console.log('✓ Column added successfully');
    
    // Add index
    await pool.query('CREATE INDEX IF NOT EXISTS idx_partners_partner_id ON partners(partner_id)');
    console.log('✓ Index created successfully');
    
    return true;
  } catch (error) {
    console.error('Error adding column:', error.message);
    return false;
  }
}

async function populatePartnerIds() {
  try {
    console.log('\n=== Partner ID Population Script ===\n');
    
    // Check if column exists
    const columnExists = await checkColumnExists();
    
    if (!columnExists) {
      console.log('⚠ partner_id column does not exist.');
      const added = await addPartnerIdColumn();
      if (!added) {
        throw new Error('Failed to add partner_id column');
      }
      console.log('');
    } else {
      console.log('✓ partner_id column exists\n');
    }
    
    // Get all partners
    const partnersQuery = 'SELECT id, name, organization_id, partner_id FROM partners';
    const partnersResult = await pool.query(partnersQuery);
    const allPartners = partnersResult.rows;
    const partnersWithoutId = allPartners.filter(p => !p.partner_id);
    
    console.log(`Total partners in database: ${allPartners.length}`);
    console.log(`Partners with Partner IDs: ${allPartners.length - partnersWithoutId.length}`);
    console.log(`Partners without Partner IDs: ${partnersWithoutId.length}\n`);
    
    if (partnersWithoutId.length === 0) {
      console.log('✓ All partners already have Partner IDs!');
      
      // Display existing Partner IDs
      console.log('\n=== Existing Partner IDs ===');
      for (const partner of allPartners) {
        console.log(`Partner: ${partner.name} (ID: ${partner.id}) -> Partner ID: ${partner.partner_id}`);
      }
      
      await pool.end();
      return;
    }
    
    console.log('Generating Partner IDs...\n');
    
    // Track existing Partner IDs to avoid duplicates
    const existingPartnerIds = new Set(
      allPartners.filter(p => p.partner_id).map(p => p.partner_id)
    );
    
    // Update each partner
    let successCount = 0;
    let errorCount = 0;
    
    for (const partner of partnersWithoutId) {
      try {
        // Generate Partner ID
        const partnerId = await generatePartnerId(partner.organization_id, existingPartnerIds);
        
        // Update partner record
        const updateQuery = 'UPDATE partners SET partner_id = $1 WHERE id = $2';
        await pool.query(updateQuery, [partnerId, partner.id]);
        
        console.log(`✓ Partner "${partner.name}" (ID: ${partner.id}) -> Partner ID: ${partnerId}`);
        successCount++;
      } catch (error) {
        console.error(`✗ Failed to update partner "${partner.name}" (ID: ${partner.id}): ${error.message}`);
        errorCount++;
      }
    }
    
    console.log('\n=== Summary ===');
    console.log(`Total partners processed: ${partnersWithoutId.length}`);
    console.log(`Successfully updated: ${successCount}`);
    console.log(`Failed: ${errorCount}`);
    
    if (errorCount === 0 && successCount > 0) {
      console.log('\n✓ All partners now have Partner IDs!');
      
      // Add constraints
      console.log('\nAdding database constraints...');
      try {
        await pool.query('ALTER TABLE partners ALTER COLUMN partner_id SET NOT NULL');
        console.log('✓ NOT NULL constraint added');
        
        await pool.query('ALTER TABLE partners ADD CONSTRAINT partners_partner_id_unique UNIQUE (partner_id)');
        console.log('✓ UNIQUE constraint added');
      } catch (error) {
        console.log('⚠ Note: Some constraints may already exist');
      }
      
      // Display all Partner IDs
      console.log('\n=== All Partner IDs ===');
      const finalResult = await pool.query('SELECT id, name, partner_id FROM partners ORDER BY id');
      for (const partner of finalResult.rows) {
        console.log(`Partner: ${partner.name} (ID: ${partner.id}) -> Partner ID: ${partner.partner_id}`);
      }
    } else if (errorCount > 0) {
      console.log('\n⚠ Some partners failed to update. Please review the errors above.');
    }
    
    await pool.end();
    
  } catch (error) {
    console.error('\nError:', error.message);
    console.error('\nPlease check:');
    console.error('1. Database connection settings in backend/.env');
    console.error('2. PostgreSQL server is running');
    console.error('3. Database exists and is accessible');
    await pool.end();
    throw error;
  }
}

// Run the script
populatePartnerIds()
  .then(() => {
    console.log('\n✓ Script completed successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n✗ Script failed');
    process.exit(1);
  });



































