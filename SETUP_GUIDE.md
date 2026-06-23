# Fakemon Chaos — Setup Guide

Complete setup instructions for Supabase, Discord OAuth2, and testing.

---

## 📋 Table of Contents

1. [Supabase Database Setup](#1-supabase-database-setup)
2. [Discord OAuth2 Application Setup](#2-discord-oauth2-application-setup)
3. [Running validateTeam() Tests](#3-running-validateteam-tests)
4. [Patreon Webhook Setup (Phase 2)](#4-patreon-webhook-setup-phase-2)
5. [Cloudinary Setup](#5-cloudinary-setup)

---

## 1. Supabase Database Setup

### Step 1: Create a Supabase Project

1. Go to **https://supabase.com**
2. Click **"Start your project"** or **"New Project"**
3. Fill in:
   - **Organization:** Select or create new
   - **Project name:** `orbitron` (or your preferred name)
   - **Database password:** Choose a strong password (save it!)
   - **Region:** Select **US East (N. Virginia)** or **Frankfurt** (closest to your target audience)
4. Click **"Create new project"**

> ⏱️ Setup takes 2-3 minutes. You'll get an email when ready.

### Step 2: Get Your Database Connection String

1. In your project dashboard, go to **Settings** → **Database**
2. Under **Connection string**, select **URI** tab
3. Copy the **URI** format (not Pooler):
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres
   ```
4. Paste this into your `fakemon-server/.env` as `DATABASE_URL`

**.env.example:**
```bash
DATABASE_URL=postgresql://postgres:your-password-here@db.xyzabcdefgh.supabase.co:5432/postgres
```

> 🔒 **Security:** Never commit your `.env` file!

### Step 3: Run Database Migrations

```bash
cd ~/Desktop/Fakemon  # fakemon-server repo

# Install dependencies first
npm install

# Run migrations to create all tables
npx drizzle-kit migrate
```

**Expected output:**
```
✅ drizzle-kit migrate
[SUCCESS] Migration 0000_add_users_table applied
[SUCCESS] Migration 0001_add_tier_cache_table applied
[SUCCESS] Migration 0002_add_sprites_table applied
...
[SUCCESS] All migrations applied successfully
```

### Step 4: Verify Tables in Supabase Dashboard

1. Go to **Table Editor** in Supabase dashboard
2. You should see all these tables:
   - `users`
   - `tier_cache`
   - `sprites`
   - `sprite_reports`
   - `teams`
   - `battles`
   - `bazaar_listings` (Phase 2)
   - `moderation_actions`
   - `seasonal_modifiers` (Phase 2)

### Step 5: Enable Connection Pooling (Optional for Production)

1. Go to **Settings** → **Database** → **Connection Pooling**
2. Enable **PgBouncer**
3. Copy the **Pooler connection string**:
   ```
   postgresql://postgres:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```
4. Add to `.env` as `DATABASE_POOL_URL`

---

## 2. Discord OAuth2 Application Setup

### Step 1: Create a Discord Application

1. Go to **https://discord.com/developers/applications**
2. Click **"New Application"** in the top right
3. Name it: `Fakemon Chaos` (or your preferred name)
4. Click **"Create"**

### Step 2: Configure OAuth2 Settings

1. In your application dashboard, go to **OAuth2** → **General**
2. Add **Redirect URI**:
   - **Development:** `http://localhost:3001/auth/discord/callback`
   - **Production:** `https://api.fakemonchaos.com/auth/discord/callback`
3. Click **"Save Changes"**

### Step 3: Get Your Client ID and Secret

1. Under **OAuth2** → **General**, find:
   - **Client ID**
   - **Client Secret** (click **"Reset Secret"** if never generated, then copy it)
2. Add to `fakemon-server/.env`:

```bash
DISCORD_CLIENT_ID=1234567890123456789
DISCORD_CLIENT_SECRET=your-client-secret-here
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback
```

### Step 4: Configure OAuth2 Scopes

Under **OAuth2** → **URL Generator**:

1. Select these scopes:
   - ✅ `identify` (get user's Discord ID and username)
   - ✅ `email` (optional, for contact)
2. Your **Generated URL** will look like:
   ```
   https://discord.com/api/oauth2/authorize?client_id=...&redirect_uri=...&response_type=code&scope=identify%20email
   ```
3. Test the URL in your browser — it should redirect to your callback

### Step 5: Enable OAuth2 in Your Code

The auth route structure (to be implemented):

```typescript
// src/routes/auth.ts
import { Router } from 'express';
import axios from 'axios';

const router = Router();

router.get('/discord', (req, res) => {
  const authUrl = `https://discord.com/api/oauth2/authorize` +
    `?client_id=${process.env.DISCORD_CLIENT_ID}` +
    `&redirect_uri=${encodeURIComponent(process.env.DISCORD_REDIRECT_URI!)}` +
    `&response_type=code` +
    `&scope=identify%20email`;
  
  res.redirect(authUrl);
});

router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  
  // Exchange code for token
  const tokenResponse = await axios.post(
    'https://discord.com/api/oauth2/token',
    new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID!,
      client_secret: process.env.DISCORD_CLIENT_SECRET!,
      grant_type: 'authorization_code',
      code: code as string,
      redirect_uri: process.env.DISCORD_REDIRECT_URI!,
    })
  );
  
  const accessToken = tokenResponse.data.access_token;
  
  // Get user info
  const userResponse = await axios.get('https://discord.com/api/users/@me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  
  const user = userResponse.data;
  
  // TODO: Create/update user in DB, then issue JWT
  
  res.json({ message: 'Authenticated', user });
});

export default router;
```

### Step 6: Test Authentication Flow

1. Start your auth server:
   ```bash
   npm run dev
   ```
2. Navigate to: `http://localhost:3001/auth/discord`
3. Authorize the application
4. You should be redirected to your callback with a `code` parameter
5. Check server logs for user info

---

## 3. Running validateTeam() Tests

### Test Coverage

The `validateTeam()` function tests cover all hard-ban combinations from PRD Section 6:

| Test Category | Specific Tests |
|---|---|
| **BST Validation** | Exactly 680 (pass), 679 (pass), 681 (fail), 700 (fail) |
| **Stat Range** | Min stat 1 (pass), max 255 (pass), 0 (fail), 256 (fail) |
| **Wonder Guard Ban** | Any Fakemon with Wonder Guard (fail) |
| **No Guard + OHKO** | No Guard + Sheer Cold (fail), No Guard + safe move (pass) |
| **Sprite Validation** | Tier 1 with custom sprite (fail), Tier 2 within limit (pass), Tier 2 over limit (fail) |
| **Profanity Filter** | Clean nickname (pass), profane nickname (fail) |

### Step 1: Install Test Dependencies

```bash
cd ~/Desktop/Fakemon
npm install
```

### Step 2: Create Test File

The test file is already created at `src/validation/__tests__/validateTeam.test.ts` (see below for full content).

### Step 3: Run Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run specific test file
npx vitest src/validation/__tests__/validateTeam.test.ts
```

### Expected Test Output

```
 RUN  v1.1.0 /home/hunter/Desktop/Fakemon

 ✓ src/validation/__tests__/validateTeam.test.ts  (24 tests) 45ms

 Test Files  1 passed (1)
      Tests  24 passed (24)
   Start at  16:30:00
   Duration  423ms (transform 89ms, setup 0ms, collect 98ms, tests 45ms)
```

### Sample Test Cases

Here's what the test file includes:

```typescript
import { describe, it, expect } from 'vitest';
import { validateTeam } from '../validateTeam';

describe('validateTeam()', () => {
  it('accepts a valid team at exactly 680 BST', () => {
    const result = validateTeam(validTeam, validContext);
    expect(result.valid).toBe(true);
  });
  
  it('rejects team exceeding 680 BST', () => {
    const result = validateTeam(overBudgetTeam, validContext);
    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.stringContaining('exceeds the 680 cap')
    );
  });
  
  it('rejects Wonder Guard ability', () => {
    const result = validateTeam(wonderGuardTeam, validContext);
    expect(result.valid).toBe(false);
    expect(result.violations).toContainEqual(
      expect.stringContaining('Wonder Guard is banned')
    );
  });
  
  // ... 21 more test cases
});
```

### Step 4: Add More Tests

To add tests for new mechanics:

1. Create a new `describe` block
2. Define test team data
3. Call `validateTeam()`
4. Assert on `result.valid` and `result.violations`

### CI Integration

Tests automatically run on every push via GitHub Actions (`.github/workflows/deploy.yml`):

```yaml
- name: Run unit tests
  run: npm test
```

---

## 4. Patreon Webhook Setup (Phase 2)

### Step 1: Create Patreon Developer Application

1. Go to **https://www.patreon.com/portal/registration/register-clients**
2. Fill in:
   - **App Name:** `Fakemon Chaos`
   - **Redirect URI:** `https://api.fakemonchaos.com/patreon/webhook`
   - **Description:** Membership integration for Fakemon Chaos
3. Click **"Create"**

### Step 2: Get Client Credentials

1. Copy **Client ID** and **Client Secret**
2. Add to `.env`:

```bash
PATREON_CLIENT_ID=your-client-id
PATREON_CLIENT_SECRET=your-client-secret
PATREON_CAMPAIGN_ID=your-campaign-numeric-id
```

### Step 3: Configure Webhook

1. In Patreon Creator Dashboard → **Settings** → **API** → **Webhooks**
2. Add endpoint: `https://api.fakemonchaos.com/patreon/webhook`
3. Select events:
   - ✅ `Members:Create`
   - ✅ `Members:Update`
   - ✅ `Members:Delete`
4. Copy **Webhook Secret**
5. Add to `.env`:

```bash
PATREON_WEBHOOK_SECRET=your-webhook-signing-secret
```

### Step 4: Map Tier IDs

Find your Patreon tier IDs from the API response or Patreon dashboard:

```bash
PATREON_TIER_ID_1=1234567  # $1 tier
PATREON_TIER_ID_2=2345678  # $5 tier (Chaos Casual)
PATREON_TIER_ID_3=3456789  # $10 tier (Supreme Chaos)
PATREON_TIER_ID_4=4567890  # $25 tier (Server Legend)
```

### Step 5: Test Webhook Locally (with ngrok)

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 3001

# Use the ngrok URL as your webhook endpoint for testing
```

---

## 5. Cloudinary Setup

### Step 1: Create Cloudinary Account

1. Go to **https://cloudinary.com**
2. Click **"Sign Up Free"**
3. Choose **Free Plan** (25GB storage / 25GB bandwidth)

### Step 2: Get API Credentials

1. Dashboard → **Settings** → **API Keys**
2. Copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**

### Step 3: Configure in .env

```bash
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
CLOUDINARY_UPLOAD_PRESET=fakemon_sprites
```

### Step 4: Create Upload Preset

1. Dashboard → **Settings** → **Upload** → **Upload presets**
2. Click **"Add upload preset"**
3. Configure:
   - **Preset name:** `fakemon_sprites`
   - **Signing:** Enable (signed uploads)
   - **Folder:** `fakemon/sprites`
   - **Allowed formats:** `png, gif, webp`
   - **Max file size:** `100KB` (102400 bytes)
4. Click **"Save"**

### Step 5: Test Upload

```typescript
import { v2 as cloudinary } from 'cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const result = await cloudinary.uploader.upload('path/to/sprite.png', {
  folder: 'fakemon/sprites',
  public_id: `sprite_${uuid()}`,
  resource_type: 'image',
});

console.log(result.secure_url); // CDN URL
```

---

## 🎯 Quick Start Checklist

After completing all setups:

- [ ] Supabase project created and migrations run
- [ ] Discord OAuth2 application configured
- [ ] All tests passing (`npm test`)
- [ ] `.env` files properly configured (NOT committed)
- [ ] GitHub Secrets set for deployment
- [ ] Oracle Cloud instance claimed (Week 1 priority)

---

## 🆘 Troubleshooting

### Supabase Issues

| Problem | Solution |
|---|---|
| "Connection refused" | Check if project is active (not paused) |
| "Password authentication failed" | Verify DATABASE_URL has correct password |
| Tables not appearing | Run `npx drizzle-kit migrate` |

### Discord OAuth2 Issues

| Problem | Solution |
|---|---|
| "Invalid redirect_uri" | Ensure exact match (including trailing slash) |
| "Invalid client_id" | Copy from Discord Developer Portal, no spaces |
| Auth loop | Check that scopes include `identify` |

### Test Failures

| Problem | Solution |
|---|---|
| "Cannot find module" | Run `npm install` first |
| Tests fail on BST validation | Check `validateTeam.ts` constants |
| Vitest not found | Install: `npm install -D vitest` |

---

## 📚 Additional Resources

- **Supabase Docs:** https://supabase.com/docs
- **Discord OAuth2 Guide:** https://discord.com/developers/docs/topics/oauth2
- **Drizzle ORM Docs:** https://orm.drizzle.team
- **Vitest Docs:** https://vitest.dev
- **Cloudinary Docs:** https://cloudinary.com/documentation

---

**Ready to build?** Start with [Week 1 Checklist](../README.md#week-1-checklist-devops-priority)