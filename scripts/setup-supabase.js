#!/usr/bin/env node
/**
 * Fakemon Chaos — Supabase Setup Script
 * File: scripts/setup-supabase.js
 * 
 * Interactive script to help you set up Supabase
 * and run initial migrations.
 * 
 * Usage: node scripts/setup-supabase.js
 */

import readline from 'readline';
import { execSync } from 'child_process';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function question(query) {
  return new Promise((resolve) => {
    rl.question(query, (answer) => {
      resolve(answer);
    });
  });
}

function log(message, type = 'info') {
  const icons = {
    info: '📋',
    success: '✅',
    error: '❌',
    warning: '⚠️',
    step: '🔹',
  };
  
  console.log(`${icons[type] || icons.info} ${message}`);
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('🚀 Fakemon Chaos — Supabase Setup Wizard');
  console.log('='.repeat(60) + '\n');
  
  log('This wizard will help you set up Supabase for Fakemon Chaos.', 'info');
  console.log('');
  
  // Check if .env exists
  if (!fs.existsSync('.env')) {
    log('.env file not found. Creating from .env.example...', 'step');
    try {
      fs.copyFileSync('.env.example', '.env');
      log('Created .env file from template', 'success');
    } catch (error) {
      log('Failed to create .env file. Make sure .env.example exists.', 'error');
      process.exit(1);
    }
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Get Supabase credentials
  log('Step 1: Supabase Project Setup', 'step');
  console.log('\nBefore continuing, create a Supabase project:');
  console.log('1. Go to https://supabase.com');
  console.log('2. Click "New Project"');
  console.log('3. Choose a name (e.g., "fakemon-chaos")');
  console.log('4. Set a strong database password (save it!)');
  console.log('5. Choose region: US East or Frankfurt');
  console.log('6. Wait for project to finish creating (2-3 min)\n');
  
  const hasProject = await question('Have you created a Supabase project? (y/n): ');
  
  if (hasProject.toLowerCase() !== 'y') {
    console.log('\n👉 Please create the project first, then run this script again.\n');
    process.exit(0);
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Get Project URL
  log('Step 2: Get Your Supabase Credentials', 'step');
  console.log('\nIn your Supabase dashboard:');
  console.log('1. Go to Settings → API');
  console.log('2. Copy your Project URL and anon/public key\n');
  
  const projectUrl = await question('Project URL (https://[REF].supabase.co): ');
  const anonKey = await question('anon/public key (starts with eyJhb...): ');
  
  // Validate inputs
  if (!projectUrl.includes('supabase.co')) {
    log('Invalid Project URL. Should be: https://[ref].supabase.co', 'error');
    process.exit(1);
  }
  
  if (!anonKey.startsWith('eyJhb')) {
    log('Invalid anon key. Should start with eyJhb...', 'error');
    process.exit(1);
  }
  
  log('Credentials look valid!', 'success');
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Get Database Password
  log('Step 3: Database Password', 'step');
  console.log('\nEnter the database password you set when creating the project:');
  console.log('(This is NOT your Supabase account password)\n');
  
  const dbPassword = await question('Database Password: ');
  
  if (dbPassword.length < 8) {
    log('Password too short. Should be at least 8 characters.', 'error');
    process.exit(1);
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Extract project ref from URL
  const projectRef = projectUrl.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
  
  if (!projectRef) {
    log('Could not extract project ref from URL', 'error');
    process.exit(1);
  }
  
  // Construct DATABASE_URL
  const databaseUrl = `postgresql://postgres.${projectRef}:${encodeURIComponent(dbPassword)}@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true`;
  
  log('Step 4: Update .env File', 'step');
  console.log('\nUpdating your .env file with the following values:\n');
  console.log(`  SUPABASE_URL=${projectUrl}`);
  console.log(`  SUPABASE_ANON_KEY=${anonKey.substring(0, 20)}...`);
  console.log(`  DATABASE_URL=postgresql://postgres.${projectRef}:***@...`);
  console.log('');
  
  // Update .env file
  let envContent = fs.readFileSync('.env', 'utf8');
  
  // Update or add SUPABASE_URL
  if (envContent.includes('SUPABASE_URL=')) {
    envContent = envContent.replace(
      /^SUPABASE_URL=.*$/m,
      `SUPABASE_URL=${projectUrl}`
    );
  } else {
    envContent += `\nSUPABASE_URL=${projectUrl}`;
  }
  
  // Update or add SUPABASE_ANON_KEY
  if (envContent.includes('SUPABASE_ANON_KEY=')) {
    envContent = envContent.replace(
      /^SUPABASE_ANON_KEY=.*$/m,
      `SUPABASE_ANON_KEY=${anonKey}`
    );
  } else {
    envContent += `\nSUPABASE_ANON_KEY=${anonKey}`;
  }
  
  // Update or add DATABASE_URL
  if (envContent.includes('DATABASE_URL=')) {
    envContent = envContent.replace(
      /^DATABASE_URL=.*$/m,
      `DATABASE_URL=${databaseUrl}`
    );
  } else {
    envContent += `\nDATABASE_URL=${databaseUrl}`;
  }
  
  fs.writeFileSync('.env', envContent);
  log('.env file updated successfully', 'success');
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Run migrations
  log('Step 5: Run Database Migrations', 'step');
  console.log('\nThis will create all required tables in your Supabase database:\n');
  
  const runMigrations = await question('Run migrations now? (y/n): ');
  
  if (runMigrations.toLowerCase() === 'y') {
    try {
      console.log('\n🔧 Running migrations...\n');
      execSync('npx drizzle-kit migrate', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
      log('Migrations completed successfully!', 'success');
    } catch (error) {
      log('Migration failed. Check the error above.', 'error');
      console.log('\nTroubleshooting:');
      console.log('1. Ensure your Supabase project is active (not paused)');
      console.log('2. Verify DATABASE_URL is correct');
      console.log('3. Check if Drizzle is installed: npm install\n');
      process.exit(1);
    }
  } else {
    log('Skipping migrations. Run "npm run db:migrate" later.', 'warning');
  }
  
  console.log('\n' + '-'.repeat(60) + '\n');
  
  // Verify setup
  log('Step 6: Verify Setup', 'step');
  const verifyNow = await question('Verify database setup now? (y/n): ');
  
  if (verifyNow.toLowerCase() === 'y') {
    try {
      console.log('\n🔍 Verifying database...\n');
      execSync('node scripts/verify-migrations.js', { 
        stdio: 'inherit',
        env: { ...process.env }
      });
    } catch (error) {
      log('Verification failed. Run "npm run db:verify" after fixing issues.', 'error');
    }
  }
  
  console.log('\n' + '='.repeat(60));
  log('Supabase Setup Complete!', 'success');
  console.log('='.repeat(60) + '\n');
  
  console.log('Next steps:');
  console.log('1. Set up Discord OAuth2: npm run auth:test');
  console.log('2. Run tests: npm test');
  console.log('3. Deploy to Vercel: vercel --prod');
  console.log('');
  console.log('📚 For detailed instructions, see VERCEL_DEPLOY.md\n');
  
  rl.close();
}

main().catch((error) => {
  log(`Unexpected error: ${error.message}`, 'error');
  process.exit(1);
});