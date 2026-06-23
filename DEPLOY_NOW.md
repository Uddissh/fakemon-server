# 🚀 Deploy Fakemon Chaos NOW — Step-by-Step Guide

**Time required:** 10-15 minutes  
**Difficulty:** Easy  
**Prerequisites:** Node.js installed, GitHub account

---

## 📋 Overview

This guide will help you:
1. ✅ Create a Supabase database (free)
2. ✅ Configure environment variables
3. ✅ Deploy to Vercel (free)
4. ✅ Verify everything works

---

## 🔹 Step 1: Create Supabase Project (3 minutes)

### 1.1 Go to Supabase
Open: **https://supabase.com**

### 1.2 Sign Up / Log In
- Use GitHub, Google, or email to sign up
- **Free tier includes:**
  - 500MB database
  - 50,000 monthly active users
  - Unlimited API requests

### 1.3 Create New Project
Click **"New Project"** and fill in:

| Field | Value |
|---|---|
| **Name** | `fakemon-chaos` |
| **Database Password** | `Choose a strong password` ⚠️ **SAVE THIS!** |
| **Region** | **US East (N. Virginia)** *(recommended for US/EU users)* |

### 1.4 Wait for Setup
- Click **"Create new project"**
- Wait 2-3 minutes for provisioning
- You'll get an email when ready

---

## 🔹 Step 2: Get Supabase Credentials (2 minutes)

### 2.1 Get API Keys
1. In Supabase dashboard, go to **Settings** (⚙️ icon)
2. Click **API**
3. Copy these values:
   - **Project URL**: `https://[PROJECT-REF].supabase.co`
   - **anon/public key**: Starts with `eyJhb...`

### 2.2 Get Database Connection String
1. Still in **Settings**, click **Database**
2. Under **Connection string**, select **URI** tab
3. Choose **Transaction** mode (pgbouncer)
4. Copy the connection string:
   ```
   postgresql://postgres.[PROJECT-REF]:***@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### 2.3 Get Service Role Key (Secret!)
1. Go back to **Settings** → **API**
2. Under **Project API keys**, find **service_role** key
3. Click **Reveal** and copy it
   - ⚠️ **This is a secret key!** Never commit to git

---

## 🔹 Step 3: Configure Your Project (2 minutes)

### 3.1 Navigate to Project Folder
```bash
cd ~/Desktop/Fakemon
```

### 3.2 Run the Setup Wizard (Recommended)
```bash
npm run db:setup
```

The wizard will:
- Create `.env` file if missing
- Ask for your Supabase credentials
- Run database migrations automatically
- Verify everything is set up correctly

**Follow the prompts:**
1. Enter your **Project URL**
2. Enter your **anon key**
3. Enter your **database password**
4. Choose **Y** to run migrations
5. Choose **Y** to verify setup

### 3.3 Alternative: Manual Configuration

If you prefer manual setup:

```bash
# Copy template
cp .env.example .env

# Edit .env with your favorite editor
nano .env
# or
code .env
```

Fill in these values:

```bash
# Supabase
DATABASE_URL=postgresql://postgres.[YOUR-REF]:[PASSWORD]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true
SUPABASE_URL=https://[YOUR-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbG... (your service_role key)

# JWT Secret (generate a random one)
JWT_SHARED_SECRET=<run: openssl rand -base64 64>

# Discord (get from https://discord.com/developers/applications)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=http://localhost:3001/auth/discord/callback

# Cloudinary (for sprite uploads - can skip for now)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Session
SESSION_SECRET=<random 32 char string>

# CORS
CORS_ALLOWED_ORIGINS=http://localhost:3001,http://localhost:5173
```

Generate JWT secret:
```bash
openssl rand -base64 64
```

---

## 🔹 Step 4: Run Database Migrations (1 minute)

```bash
cd ~/Desktop/Fakemon

# Install dependencies (if not already done)
npm install

# Run migrations
npx drizzle-kit migrate
```

**Expected output:**
```
✅ drizzle-kit migrate
[SUCCESS] Migration 0000_add_users_table applied
[SUCCESS] Migration 0001_add_tier_cache_table applied
...
[SUCCESS] All migrations applied successfully
```

### Verify Tables Created

```bash
npm run db:verify
```

**Expected output:**
```
✅ Connected successfully
✅ users
✅ tier_cache
✅ sprites
✅ sprite_reports
✅ teams
✅ battles
✅ bazaar_listings
✅ moderation_actions
✅ seasonal_modifiers
✅ All tables and enums exist!
```

---

## 🔹 Step 5: Install Vercel CLI (1 minute)

```bash
npm install -g vercel
```

Login to your Vercel account:
```bash
vercel login
```

Choose your preferred login method (GitHub recommended).

---

## 🔹 Step 6: Deploy to Vercel (2 minutes)

### 6.1 Initial Deployment

```bash
cd ~/Desktop/Fakemon

# Deploy (first time setup)
vercel
```

**Answer the prompts:**
```
Set up and deploy? [Y/n] → Y
Which scope do you want to deploy to? → Choose your account
Link to existing project? [y/N] → N
What's your project's name? → fakemon-server
In which directory is your code located? → ./
Want to override settings? [y/N] → N
```

### 6.2 Add Environment Variables to Vercel

1. Go to **https://vercel.com/dashboard**
2. Click on your `fakemon-server` project
3. Go to **Settings** → **Environment Variables**
4. Click **Add New** for each variable:

| Name | Value | Environment |
|---|---|---|
| `DATABASE_URL` | Your Supabase connection string | Production |
| `SUPABASE_URL` | `https://[REF].supabase.co` | Production |
| `SUPABASE_SERVICE_ROLE_KEY` | Your service role key | Production |
| `JWT_SHARED_SECRET` | Random 64+ char string | Production |
| `DISCORD_CLIENT_ID` | From Discord app | Production |
| `DISCORD_CLIENT_SECRET` | From Discord app | Production |
| `DISCORD_REDIRECT_URI` | `https://fakemon-server.vercel.app/auth/discord/callback` | Production |
| `CORS_ALLOWED_ORIGINS` | `https://fakemon-server.vercel.app` | Production |
| `SESSION_SECRET` | Random 32+ char string | Production |
| `LOG_LEVEL` | `info` | Production |

### 6.3 Redeploy with Environment Variables

```bash
vercel --prod
```

---

## 🔹 Step 7: Configure Discord OAuth2 (2 minutes)

### 7.1 Create Discord Application

1. Go to: **https://discord.com/developers/applications**
2. Click **"New Application"**
3. Name it: `Fakemon Chaos`
4. Click **"Create"**

### 7.2 Configure OAuth2

1. In your app dashboard, go to **OAuth2** → **General**
2. Under **Redirects**, click **Add Redirect**
3. Add your Vercel URL:
   ```
   https://fakemon-server.vercel.app/auth/discord/callback
   ```
4. Click **Save Changes**

### 7.3 Get Client Credentials

1. Under **OAuth2** → **General**:
   - Copy **Client ID**
   - Click **"Reset Secret"** → Copy **Client Secret**

2. Add these to Vercel environment variables (Settings → Environment Variables)

### 7.4 Test OAuth2 Flow

```bash
npm run auth:test
```

Copy the generated URL and test in your browser!

---

## 🔹 Step 8: Verify Deployment (1 minute)

### 8.1 Check Health Endpoint

```bash
# Replace with your actual Vercel URL
curl https://fakemon-server.vercel.app/health
```

**Expected response:**
```json
{
  "status": "ok",
  "timestamp": "2026-06-23T...",
  "uptime": 123.456
}
```

### 8.2 Check Vercel Logs

```bash
vercel logs
```

Look for:
```
[fakemon-auth-server] Listening on port 3001
[fakemon-auth-server] Environment: production
```

---

## ✅ You're Done!

Your Fakemon Chaos auth server is now:
- ✅ Running on Vercel (serverless)
- ✅ Connected to Supabase (PostgreSQL)
- ✅ Configured with Discord OAuth2
- ✅ Ready for battle server integration

---

## 🎯 Next Steps

### 1. Deploy Battle Server (fakemon-showdown)

Since Vercel doesn't support WebSockets, deploy the battle server elsewhere:

**Recommended options:**
- **Railway.app** (free tier, WebSocket support)
- **Render.com** (free tier)
- **Oracle Cloud** (free tier ARM instance)

### 2. Share JWT Secret

Make sure both repos have the **same** `JWT_SHARED_SECRET`:
- fakemon-server (Vercel env vars)
- fakemon-showdown (Railway/Render env vars)

### 3. Update CORS Origins

In Vercel env vars, add your battle server URL:
```
CORS_ALLOWED_ORIGINS=https://fakemon-server.vercel.app,https://fakemon-showdown.railway.app
```

### 4. Test Full Authentication Flow

1. User visits `https://fakemon-showdown.railway.app`
2. Clicks "Login with Discord"
3. Redirects to Discord OAuth2
4. Returns to fakemon-server with JWT
5. Connects to fakemon-showdown with JWT
6. Battle server verifies JWT locally

---

## 🆘 Troubleshooting

### Deployment Failed

**Check Vercel logs:**
```bash
vercel logs
```

**Common issues:**
- Missing environment variables → Add in Vercel dashboard
- Build errors → Run `npm run typecheck` locally
- Database connection failed → Verify DATABASE_URL

### Database Not Working

**Verify migrations ran:**
```bash
npm run db:verify
```

**If tables missing:**
```bash
npx drizzle-kit migrate
```

**If connection refused:**
- Check Supabase project is active (not paused)
- Verify DATABASE_URL is correct
- Ensure password is URL-encoded if contains special chars

### Discord OAuth2 Not Working

**Common issues:**
- Redirect URI mismatch → Must exactly match Vercel URL
- Missing scopes → Ensure `identify` and `email` are selected
- Invalid client credentials → Regenerate in Discord dashboard

---

## 📚 Documentation

- **VERCEL_DEPLOY.md** — Detailed Vercel deployment guide
- **SETUP_GUIDE.md** — Complete setup for all services
- **README.md** — Project overview

---

## 🎉 Congratulations!

You've successfully deployed Fakemon Chaos to production!

**Your stack:**
- Frontend: Vercel (serverless functions)
- Database: Supabase (PostgreSQL)
- Authentication: Discord OAuth2
- Battle Server: Coming next (Railway/Render)

**Total cost:** $0/month (Free tiers) 🚀