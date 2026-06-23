# Vercel Deployment Guide — Fakemon Chaos

Quick deployment to Vercel with Supabase backend.

---

## 🚀 Quick Deploy (5 minutes)

### Step 1: Create Supabase Project

1. Go to **https://supabase.com**
2. Click **"New Project"**
3. Fill in:
   - **Name:** `fakemon-chaos`
   - **Database Password:** `Choose a strong password` (save it!)
   - **Region:** **US East (N. Virginia)** or **Frankfurt** (closest to your users)
4. Click **"Create new project"**

⏱️ Wait 2-3 minutes for setup to complete.

### Step 2: Get Your Supabase Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy these values:
   - **Project URL:** `https://[PROJECT-REF].supabase.co`
   - **anon/public key:** `eyJhb...` (starts with eyJhb)
   - **service_role key:** `eyJhb...` (longer key, keep secret!)

3. Go to **Settings** → **Database**
4. Under **Connection string**, select **URI** tab
5. Copy the **Transaction mode** connection string:
   ```
   postgresql://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true
   ```

### Step 3: Install Vercel CLI

```bash
# Install Vercel globally
npm install -g vercel

# Login to your Vercel account
vercel login
```

### Step 4: Configure Environment Variables

Create a `.env.local` file in your fakemon-server directory:

```bash
cd ~/Desktop/Fakemon
cat > .env.local << 'EOF'
# Supabase Database
DATABASE_URL=postgresql://postgres.[PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true

# Supabase API (for server-side operations)
SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# JWT (generate a random secret)
JWT_SHARED_SECRET=replace-with-openssl-rand-base64-64-output
JWT_EXPIRY_SECONDS=3600

# Discord OAuth2 (create app at https://discord.com/developers/applications)
DISCORD_CLIENT_ID=your-client-id
DISCORD_CLIENT_SECRET=your-client-secret
DISCORD_REDIRECT_URI=https://fakemon-server.vercel.app/auth/discord/callback

# Cloudinary (for sprite uploads)
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Session
SESSION_SECRET=random-32-char-string

# CORS
CORS_ALLOWED_ORIGINS=https://fakemon-showdown.vercel.app

# Logging
LOG_LEVEL=info
EOF
```

> ⚠️ **Replace all bracketed values** with your actual credentials!

### Step 5: Generate JWT Secret

```bash
# Generate a secure random secret (64+ characters)
openssl rand -base64 64
```

Copy the output and paste it as `JWT_SHARED_SECRET` in your `.env.local`.

### Step 6: Run Database Migrations

```bash
cd ~/Desktop/Fakemon

# Install dependencies if not already done
npm install

# Run migrations to create tables in Supabase
npx drizzle-kit migrate
```

Expected output:
```
✅ drizzle-kit migrate
[SUCCESS] All migrations applied successfully
```

### Step 7: Verify Database Setup

```bash
# Run the verification script
npm run db:verify
```

Expected output:
```
✅ Connected successfully
✅ All tables and enums exist!
✅ Database migrations completed successfully.
```

### Step 8: Deploy to Vercel

```bash
cd ~/Desktop/Fakemon

# Deploy (first time)
vercel

# Follow the prompts:
# - Set up and deploy? Y
# - Which scope? (your account)
# - Link to existing project? N
# - Project name? fakemon-server
# - Directory? ./
# - Override settings? N

# Deploy with production env vars
vercel --prod
```

### Step 9: Add Environment Variables to Vercel

1. Go to your Vercel dashboard: **https://vercel.com/dashboard**
2. Click on your `fakemon-server` project
3. Go to **Settings** → **Environment Variables**
4. Add all variables from your `.env.local` file:
   - `DATABASE_URL`
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `JWT_SHARED_SECRET`
   - `DISCORD_CLIENT_ID`
   - `DISCORD_CLIENT_SECRET`
   - `DISCORD_REDIRECT_URI`
   - `CLOUDINARY_CLOUD_NAME`
   - `CLOUDINARY_API_KEY`
   - `CLOUDINARY_API_SECRET`
   - `SESSION_SECRET`
   - `CORS_ALLOWED_ORIGINS`
   - `LOG_LEVEL`

5. Redeploy after adding variables:
   ```bash
   vercel --prod
   ```

### Step 10: Update Discord Redirect URI

1. Go to **https://discord.com/developers/applications**
2. Select your application
3. Go to **OAuth2** → **General**
4. Add redirect URI: `https://fakemon-server.vercel.app/auth/discord/callback`
5. Click **Save Changes**

### Step 11: Test Your Deployment

```bash
# Get your Vercel URL
vercel ls

# Test health endpoint
curl https://fakemon-server.vercel.app/health

# Expected response:
# {"status":"ok","timestamp":"2026-06-23T...","uptime":...}
```

---

## 🔧 Troubleshooting

### Vercel Deployment Fails

**Error: Build failed**
```bash
# Check build logs
vercel logs

# Common issues:
# 1. Missing dependencies → Run: npm install
# 2. TypeScript errors → Run: npm run typecheck
# 3. Missing env vars → Add to .env.local and Vercel dashboard
```

### Database Connection Issues

**Error: Connection refused**
- Check if Supabase project is active (not paused)
- Verify `DATABASE_URL` is correct (copy from Supabase dashboard)
- Ensure password doesn't contain special characters without encoding

**Error: Table does not exist**
```bash
# Re-run migrations
npx drizzle-kit migrate

# Verify tables
npm run db:verify
```

### Discord OAuth2 Not Working

**Error: Invalid redirect_uri**
- Ensure exact match between:
  - Vercel deployment URL
  - `DISCORD_REDIRECT_URI` in .env
  - Redirect URI in Discord Developer Portal

**Error: Invalid client_id**
- Copy from Discord Developer Portal (no spaces)
- Ensure `DISCORD_CLIENT_ID` is set in Vercel environment variables

---

## 📊 Vercel Dashboard Setup

### Recommended Vercel Settings

1. **Build & Development Settings**
   - Framework Preset: `Other`
   - Build Command: `npm run build` (optional, Vercel auto-detects)
   - Output Directory: `dist` (if using build)
   - Install Command: `npm install`

2. **Environment Variables**
   - Add all variables from `.env.local`
   - Mark sensitive ones as **Sensitive** (hidden from logs)

3. **Deploy Hooks** (optional)
   - Create webhook for automatic deploys on git push

---

## 🔄 Continuous Deployment

Vercel automatically deploys on push to `main`:

```bash
# Make changes
git add .
git commit -m "Your changes"
git push origin main

# Vercel will automatically deploy
# Check progress at: https://vercel.com/dashboard
```

---

## 📝 Notes

### Limitations

- **Vercel Serverless Functions:** Max 10 seconds execution time (Hobby plan)
- **Database Connections:** Use Supabase pooler (pgbouncer) to avoid connection limits
- **WebSocket:** Vercel doesn't support WebSockets → Use fakemon-showdown on a different platform (Railway, Render, or Oracle Cloud)

### Production Recommendations

1. **Use a Custom Domain**
   ```bash
   vercel domain add fakemonchaos.com
   ```

2. **Enable Vercel Analytics** (optional)
   - Dashboard → Analytics → Enable

3. **Set Up Alerts**
   - Dashboard → Settings → Notifications

4. **Upgrade to Pro Plan** if you need:
   - Longer function duration (60s)
   - More team members
   - Priority support

---

## 🎯 Next Steps

After deploying fakemon-server to Vercel:

1. **Deploy fakemon-showdown** to a platform that supports WebSockets:
   - Railway.app (recommended)
   - Render.com
   - Oracle Cloud (free tier)

2. **Share JWT_SECRET** between both deployments

3. **Test the full flow:**
   - Discord login → JWT issuance → Battle server connection

---

## 📚 Resources

- **Vercel Docs:** https://vercel.com/docs
- **Supabase Docs:** https://supabase.com/docs
- **Drizzle ORM on Vercel:** https://orm.drizzle.team/docs/get-started-postgresql

---

**Deploy complete!** 🚀

Your Fakemon Chaos auth server is now live on Vercel with Supabase backend!