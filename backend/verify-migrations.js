#!/usr/bin/env node

/**
 * Migration Verification Script (Option 3)
 * 
 * This script verifies if all migration files have been applied to a PostgreSQL database.
 * It compares migration files in the migrations directory with records in the migrations table.
 * 
 * Usage:
 *   node verify-migrations.js [environment]
 *   
 *   Where environment is one of: local, production, or a custom database URL
 * 
 * Examples:
 *   node verify-migrations.js local
 *   node verify-migrations.js production
 *   node verify-migrations.js postgres://user:pass@host:5432/dbname
 */

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

// Configuration
const MIGRATIONS_DIR = path.join(__dirname, 'database', 'migrations');
const ENV_FILES = {
  local: path.join(__dirname, '.env'),
  production: path.join(__dirname, '.env.production')
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function logHeader(message) {
  console.log('\n' + '='.repeat(60));
  log(message, 'bright');
  console.log('='.repeat(60));
}

function logSubHeader(message) {
  console.log('\n' + '-'.repeat(50));
  log(message, 'cyan');
  console.log('-'.repeat(50));
}

// Load environment variables from .env file
function loadEnv(envPath) {
  if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    let loadedCount = 0;
    envContent.split('\n').forEach(line => {
      // Skip comments and empty lines
      if (line.trim() && !line.trim().startsWith('#')) {
        // Split on first '=' only to handle values with '=' in them
        const eqIndex = line.indexOf('=');
        if (eqIndex > 0) {
          const key = line.substring(0, eqIndex).trim();
          const value = line.substring(eqIndex + 1).trim().replace(/^['"]|['"]$/g, '');
          process.env[key] = value;
          loadedCount++;
        }
      }
    });
    log(`✓ Loaded ${loadedCount} variables from: ${envPath}`, 'green');
    
    // Debug: Show if DATABASE_URL was loaded
    if (process.env.DATABASE_URL) {
      log(`✓ DATABASE_URL is set: ${process.env.DATABASE_URL.substring(0, 30)}...`, 'green');
    }
  } else {
    log(`⚠ Warning: Environment file not found: ${envPath}`, 'yellow');
  }
}

// Get database URL based on environment
function getDatabaseUrl(env) {
  if (env.startsWith('postgres://')) {
    return env; // Direct connection string
  }

  // Load appropriate .env file first
  const envFile = ENV_FILES[env];
  if (envFile) {
    loadEnv(envFile);
  }

  // Check for DATABASE_URL first (highest priority)
  if (process.env.DATABASE_URL) {
    log(`✓ Using DATABASE_URL from environment`, 'green');
    return process.env.DATABASE_URL;
  }

  // Check for individual connection parameters
  const host = process.env.DB_HOST || 'localhost';
  const port = process.env.DB_PORT || 5432;
  const database = process.env.DB_NAME || 'therapy_tracker';
  const user = process.env.DB_USER || 'postgres';
  const password = process.env.DB_PASSWORD;

  if (!password) {
    throw new Error(`Database password not found for environment: ${env}. Please set DATABASE_URL or DB_PASSWORD in your .env file.`);
  }

  return `postgres://${user}:${password}@${host}:${port}/${database}`;
}

// Get all migration files from the migrations directory
function getMigrationFiles() {
  if (!fs.existsSync(MIGRATIONS_DIR)) {
    throw new Error(`Migrations directory not found: ${MIGRATIONS_DIR}`);
  }

  const files = fs.readdirSync(MIGRATIONS_DIR)
    .filter(file => {
      // Only include SQL files that look like migrations
      return file.endsWith('.sql') && 
             !file.includes('README') && 
             !file.includes('EXECUTION') &&
             !file.includes('PRODUCTION') &&
             !file.startsWith('01_create_all_tables.sql'); // Skip the all-in-one file
    })
    .sort();

  log(`Found ${files.length} migration files in: ${MIGRATIONS_DIR}`, 'blue');
  
  // Group files by category for better display
  const categories = {
    'add_': 'Feature Additions',
    'fix_': 'Fixes',
    'update_': 'Updates',
    'remove_': 'Removals',
    'change_': 'Changes',
    'migrate_': 'Migrations',
    'backfill_': 'Data Backfills',
    'seed_': 'Data Seeds',
    'create_': 'Table Creations',
    'replace_': 'Replacements',
    'rollback_': 'Rollbacks'
  };

  const grouped = {};
  files.forEach(file => {
    let category = 'Other';
    for (const [prefix, catName] of Object.entries(categories)) {
      if (file.startsWith(prefix)) {
        category = catName;
        break;
      }
    }
    if (!grouped[category]) grouped[category] = [];
    grouped[category].push(file);
  });

  // Display grouped files
  for (const [category, fileList] of Object.entries(grouped)) {
    if (fileList.length > 0) {
      logSubHeader(`${category} (${fileList.length})`);
      fileList.forEach(file => log(`  • ${file}`, 'reset'));
    }
  }

  return files;
}

// Check if migrations table exists and get applied migrations
async function getAppliedMigrations(pool) {
  try {
    // Check if migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_schema = 'public'
        AND table_name = 'migrations'
      );
    `);

    const tableExists = tableCheck.rows[0].exists;

    if (!tableExists) {
      log('⚠️  Migrations table does not exist', 'yellow');
      log('   This project may not use formal migration tracking.', 'cyan');
      log('   Will verify database state by checking actual schema.', 'cyan');
      return { exists: false, migrations: [] };
    }

    // Get applied migrations
    const result = await pool.query(`
      SELECT name, applied_at, checksum
      FROM migrations
      ORDER BY applied_at, name
    `);

    const migrations = result.rows;
    log(`✓ Found ${migrations.length} applied migrations`, 'green');

    if (migrations.length > 0) {
      logSubHeader('Applied Migrations');
      migrations.forEach(m => {
        const date = new Date(m.applied_at).toLocaleString();
        log(`  • ${m.name} (${date})`, 'reset');
      });
    }

    return { exists: true, migrations };
  } catch (error) {
    log(`❌ Error checking migrations table: ${error.message}`, 'red');
    return { exists: false, migrations: [] };
  }
}

// Verify schema by checking for key tables and columns
async function verifySchema(pool) {
  logHeader('SCHEMA VERIFICATION');
  
  const criticalTables = [
    'users', 'partners', 'organizations', 'auth_credentials',
    'questionnaires', 'therapy_sessions', 'appointments'
  ];

  const criticalColumns = [
    { table: 'partners', column: 'partner_id' },
    { table: 'partners', column: 'email_verified' },
    { table: 'questionnaires', column: 'color_coding_scheme' },
    { table: 'therapy_sessions', column: 'session_title' }
  ];

  logSubHeader('Checking Critical Tables');
  const tablesExist = [];
  
  for (const table of criticalTables) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = $1
        );
      `, [table]);
      
      const exists = result.rows[0].exists;
      tablesExist.push(exists);
      
      if (exists) {
        log(`  ✓ ${table}`, 'green');
      } else {
        log(`  ✗ ${table}`, 'red');
      }
    } catch (error) {
      log(`  ✗ ${table} (error: ${error.message})`, 'red');
      tablesExist.push(false);
    }
  }

  logSubHeader('Checking Critical Columns');
  const columnsExist = [];
  
  for (const { table, column } of criticalColumns) {
    try {
      const result = await pool.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.columns 
          WHERE table_schema = 'public' 
          AND table_name = $1 
          AND column_name = $2
        );
      `, [table, column]);
      
      const exists = result.rows[0].exists;
      columnsExist.push(exists);
      
      if (exists) {
        log(`  ✓ ${table}.${column}`, 'green');
      } else {
        log(`  ✗ ${table}.${column}`, 'red');
      }
    } catch (error) {
      log(`  ✗ ${table}.${column} (error: ${error.message})`, 'red');
      columnsExist.push(false);
    }
  }

  const schemaScore = {
    tables: tablesExist.filter(Boolean).length,
    totalTables: tablesExist.length,
    columns: columnsExist.filter(Boolean).length,
    totalColumns: columnsExist.length
  };

  return schemaScore;
}

// Main verification function
async function verifyMigrations(databaseUrl) {
  const pool = new Pool({ 
    connectionString: databaseUrl,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    // Test connection
    await pool.query('SELECT NOW()');
    log('✓ Database connection successful', 'green');

    logHeader('MIGRATION FILES ANALYSIS');
    const migrationFiles = getMigrationFiles();

    logHeader('APPLIED MIGRATIONS CHECK');
    const { exists: tableExists, migrations: appliedMigrations } = await getAppliedMigrations(pool);

    // Compare files vs applied migrations
    logHeader('MIGRATION COMPARISON');
    
    const appliedNames = appliedMigrations.map(m => m.name);
    const missingMigrations = migrationFiles.filter(file => !appliedNames.includes(file));
    const extraMigrations = appliedMigrations.filter(m => !migrationFiles.includes(m.name));

    // Summary
    logSubHeader('Summary');
    log(`Total migration files: ${migrationFiles.length}`, 'blue');
    log(`Applied migrations: ${appliedMigrations.length}`, 'blue');
    log(`Missing migrations: ${missingMigrations.length}`, missingMigrations.length > 0 ? 'red' : 'green');
    log(`Extra migrations (not in files): ${extraMigrations.length}`, extraMigrations.length > 0 ? 'yellow' : 'green');

    // Show missing migrations
    if (missingMigrations.length > 0) {
      logSubHeader('❌ MISSING MIGRATIONS - NEED TO APPLY');
      missingMigrations.forEach(file => {
        log(`  • ${file}`, 'red');
      });
    } else {
      log('\n✅ All migration files have been applied!', 'green');
    }

    // Show extra migrations
    if (extraMigrations.length > 0) {
      logSubHeader('⚠️  EXTRA MIGRATIONS (in database but not in files)');
      extraMigrations.forEach(m => {
        const date = new Date(m.applied_at).toLocaleString();
        log(`  • ${m.name} (applied: ${date})`, 'yellow');
      });
    }

    // Verify schema completeness
    const schemaScore = await verifySchema(pool);

    // Final assessment
    logHeader('FINAL ASSESSMENT');
    
    const allMigrationsApplied = missingMigrations.length === 0;
    const schemaComplete = schemaScore.tables === schemaScore.totalTables && 
                          schemaScore.columns === schemaScore.totalColumns;

    if (allMigrationsApplied && schemaComplete) {
      log('🎉 DATABASE IS FULLY UP TO DATE!', 'green');
      log(`   • All ${migrationFiles.length} migrations applied`, 'green');
      log(`   • All ${schemaScore.totalTables} critical tables exist`, 'green');
      log(`   • All ${schemaScore.totalColumns} critical columns exist`, 'green');
    } else if (allMigrationsApplied && !schemaComplete) {
      log('⚠️  ALL MIGRATIONS APPLIED BUT SCHEMA INCOMPLETE', 'yellow');
      log(`   • Tables: ${schemaScore.tables}/${schemaScore.totalTables}`, 'yellow');
      log(`   • Columns: ${schemaScore.columns}/${schemaScore.totalColumns}`, 'yellow');
      log('   This might indicate migration issues or manual schema changes.', 'yellow');
    } else {
      log('❌ DATABASE IS NOT UP TO DATE', 'red');
      log(`   • Missing ${missingMigrations.length} migrations`, 'red');
      log(`   • Schema completeness: ${schemaScore.tables}/${schemaScore.totalTables} tables`, 'red');
    }

    // Provide next steps
    if (missingMigrations.length > 0) {
      logSubHeader('NEXT STEPS');
      log('To apply missing migrations, run:', 'cyan');
      missingMigrations.forEach(file => {
        log(`  psql -U postgres -d your_db -f backend/database/migrations/${file}`, 'cyan');
      });
    }

    return {
      success: allMigrationsApplied && schemaComplete,
      missingMigrations,
      extraMigrations,
      schemaScore,
      tableExists
    };

  } catch (error) {
    log(`❌ Database error: ${error.message}`, 'red');
    throw error;
  } finally {
    await pool.end();
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const env = args[0] || 'local';

  try {
    logHeader(`VERIFYING MIGRATIONS FOR: ${env.toUpperCase()}`);
    
    const databaseUrl = getDatabaseUrl(env);
    log(`Database: ${databaseUrl.replace(/:\/\/.*:.*@/, '://***:***@')}`, 'blue');
    
    const result = await verifyMigrations(databaseUrl);
    
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    log(`\n❌ Fatal error: ${error.message}`, 'red');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { verifyMigrations, getMigrationFiles };
