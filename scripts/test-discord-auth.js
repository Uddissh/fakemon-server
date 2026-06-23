#!/usr/bin/env node
/**
 * Fakemon Chaos — Discord OAuth2 Test Script
 * File: scripts/test-discord-auth.js
 * 
 * Generates a Discord OAuth2 authorization URL for testing
 * and validates your environment configuration.
 * 
 * Usage: node scripts/test-discord-auth.js
 */

import dotenv from 'dotenv';

dotenv.config();

function testDiscordAuth() {
  console.log('🔐 Fakemon Chaos — Discord OAuth2 Configuration Test\n');
  console.log('='.repeat(60) + '\n');
  
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;
  const redirectUri = process.env.DISCORD_REDIRECT_URI;
  const apiUrl = process.env.API_BASE_URL || 'http://localhost:3001';
  
  // Validate required environment variables
  let hasErrors = false;
  
  console.log('📋 Environment Variables:\n');
  
  if (!clientId) {
    console.log('  ❌ DISCORD_CLIENT_ID - NOT SET');
    hasErrors = true;
  } else {
    console.log(`  ✅ DISCORD_CLIENT_ID: ${clientId.substring(0, 10)}...`);
  }
  
  if (!clientSecret) {
    console.log('  ❌ DISCORD_CLIENT_SECRET - NOT SET');
    hasErrors = true;
  } else {
    console.log(`  ✅ DISCORD_CLIENT_SECRET: [CONFIGURED]`);
  }
  
  if (!redirectUri) {
    console.log('  ❌ DISCORD_REDIRECT_URI - NOT SET');
    hasErrors = true;
  } else {
    console.log(`  ✅ DISCORD_REDIRECT_URI: ${redirectUri}`);
  }
  
  if (!process.env.JWT_SHARED_SECRET) {
    console.log('  ❌ JWT_SHARED_SECRET - NOT SET');
    hasErrors = true;
  } else {
    const secretLength = process.env.JWT_SHARED_SECRET.length;
    if (secretLength < 32) {
      console.log(`  ⚠️  JWT_SHARED_SECRET: Only ${secretLength} chars (minimum 32 recommended)`);
    } else {
      console.log(`  ✅ JWT_SHARED_SECRET: ${secretLength} characters (good)`);
    }
  }
  
  if (hasErrors) {
    console.log('\n❌ Missing required environment variables.');
    console.log('\n📝 Fix: Copy .env.example to .env and fill in all values.\n');
    process.exit(1);
  }
  
  // Generate OAuth2 URL
  console.log('\n🔗 OAuth2 Authorization URL:\n');
  
  const scopes = ['identify', 'email'];
  const authUrl = new URL('https://discord.com/api/oauth2/authorize');
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('scope', scopes.join(' '));
  
  console.log(`  ${authUrl.toString()}\n`);
  
  console.log('📝 Testing Instructions:\n');
  console.log('  1. Copy the URL above and paste it in your browser');
  console.log('  2. Authorize the application when prompted');
  console.log('  3. You should be redirected to your callback URL');
  console.log('  4. The callback should have a "code" query parameter\n');
  
  console.log('🎯 Expected Callback URL:\n');
  console.log(`  ${redirectUri}?code=<AUTHORIZATION_CODE>\n`);
  
  console.log('⚙️  Next Steps:\n');
  console.log('  • Implement the /auth/discord/callback route handler');
  console.log('  • Exchange the code for an access token');
  console.log('  • Fetch user info from Discord API');
  console.log('  • Create/update user in your database');
  console.log('  • Issue a JWT token to the client\n');
  
  console.log('🔒 Security Reminders:\n');
  console.log('  • Never commit .env file to git');
  console.log('  • Redirect URI must exactly match Discord app settings');
  console.log('  • Use HTTPS in production (required by Discord)');
  console.log('  • Store Discord tokens securely, never in localStorage\n');
  
  console.log('='.repeat(60));
  console.log('✅ Configuration test complete!\n');
}

testDiscordAuth();