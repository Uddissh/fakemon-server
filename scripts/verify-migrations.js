#!/usr/bin/env node
/**
 * Fakemon Chaos — Supabase Migration Verifier
 * File: scripts/verify-migrations.js
 * 
 * Checks that all tables exist in your Supabase database
 * and validates the schema matches the Drizzle ORM definitions.
 * 
 * Usage: node scripts/verify-migrations.js
 */

import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const EXPECTED_TABLES = [
  'users',
  'tier_cache',
  'sprites',
  'sprite_reports',
  'teams',
  'battles',
  'bazaar_listings',
  'moderation_actions',
  'seasonal_modifiers',
];

const EXPECTED_ENUMS = [
  'tier',
  'sprite_status',
  'battle_format',
  'mod_action',
];

async function verifyMigrations() {
  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl) {
    console.error('❌ DATABASE_URL not set in .env file');
    console.log('\n📝 Copy .env.example to .env and fill in your Supabase connection string.');
    process.exit(1);
  }

  console.log('🔍 Connecting to Supabase database...\n');
  
  const client = new Client(databaseUrl);
  
  try {
    await client.connect();
    console.log('✅ Connected successfully\n');
    
    // Check tables
    console.log('📊 Checking tables...\n');
    
    const tableQuery = `
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
      ORDER BY table_name;
    `;
    
    const tableResult = await client.query(tableQuery);
    const existingTables = tableResult.rows.map(row => row.table_name);
    
    let allTablesExist = true;
    
    for (const expectedTable of EXPECTED_TABLES) {
      if (existingTables.includes(expectedTable)) {
        console.log(`  ✅ ${expectedTable}`);
      } else {
        console.log(`  ❌ ${expectedTable} - MISSING`);
        allTablesExist = false;
      }
    }
    
    // Check enums
    console.log('\n🔢 Checking enums...\n');
    
    const enumQuery = `
      SELECT t.typname as enum_name
      FROM pg_type t
      JOIN pg_enum e ON t.oid = e.enumtypid
      JOIN pg_namespace n ON t.typnamespace = n.oid
      WHERE n.nspname = 'public'
      GROUP BY t.typname
      ORDER BY t.typname;
    `;
    
    const enumResult = await client.query(enumQuery);
    const existingEnums = enumResult.rows.map(row => row.enum_name);
    
    let allEnumsExist = true;
    
    for (const expectedEnum of EXPECTED_ENUMS) {
      if (existingEnums.includes(expectedEnum)) {
        console.log(`  ✅ ${expectedEnum}`);
      } else {
        console.log(`  ❌ ${expectedEnum} - MISSING`);
        allEnumsExist = false;
      }
    }
    
    // Check users table columns
    console.log('\n📋 Verifying users table schema...\n');
    
    const columnsQuery = `
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'users'
      ORDER BY ordinal_position;
    `;
    
    const columnsResult = await client.query(columnsQuery);
    console.log('  users table columns:');
    columnsResult.rows.forEach(row => {
      const nullable = row.is_nullable === 'YES' ? 'NULL' : 'NOT NULL';
      console.log(`    - ${row.column_name}: ${row.data_type} (${nullable})`);
    });
    
    // Summary
    console.log('\n' + '='.repeat(50));
    console.log('📊 SUMMARY\n');
    
    if (allTablesExist && allEnumsExist) {
      console.log('✅ All tables and enums exist!');
      console.log('✅ Database migrations completed successfully.\n');
      process.exit(0);
    } else {
      console.log('❌ Some tables or enums are missing.\n');
      console.log('💡 Run migrations with: npx drizzle-kit migrate\n');
      process.exit(1);
    }
    
  } catch (error) {
    console.error('❌ Error connecting to database:', error.message);
    console.log('\n📝 Check your DATABASE_URL in .env file.');
    console.log('📝 Ensure your Supabase project is active (not paused).\n');
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyMigrations();