# 🚀 START HERE — Deploy Fakemon Chaos to Vercel + Supabase

**Date:** June 23, 2026  
**Status:** Ready to Deploy  
**Time:** 10-15 minutes  

---

## ⚡ Quick Start (Choose Your Path)

### Option A: Automated Setup (Recommended) ⭐

Run the interactive wizard that does everything for you:

```bash
cd ~/Desktop/Fakemon
./quick-deploy.sh
```

This script will:
1. ✅ Check dependencies (Node.js, Vercel CLI)
2. ✅ Guide you through Supabase setup
3. ✅ Run database migrations
4. ✅ Deploy to Vercel
5. ✅ Verify everything works

**Just follow the prompts!**

---

### Option B: Manual Step-by-Step

Follow **DEPLOY_NOW.md** for detailed instructions:

```bash
# 1. Create Supabase project (3 min)
# 2. Get credentials (2 min)
# 3. Configure .env (2 min)
npm run db:setup

# 4. Run migrations (1 min)
npm run db:migrate

# 5. Verify (1 min)
npm run db:verify

# 6. Deploy to Vercel (2 min)
vercel --prod
```

---

## 📁 What You Have Now

### Repositories
- ✅ **fakemon-server**: https://github.com/Uddissh/fakemon-server
- ✅ **fakemon-showdown**: https://github.com/Uddissh/fakemon-showdown

### New Files Added Today
```
fakemon-server/
├── DEPLOY_NOW.md              ← Follow this first!
├── VERCEL_DEPLOY.md           ← Detailed Vercel guide
├── SETUP_GUIDE.md             ← Complete service setup
├── SETUP_COMPLETE.md          ← Summary of all setup tasks
├── vercel.json                ← Vercel configuration
├── quick-deploy.sh            ← One-command deployment
├── scripts/
│   ├── setup-supabase.js      ← Interactive Supabase wizard
│   ├── verify-migrations.js   ← Database verification
│   └── test-discord-auth.js   ← Discord OAuth2 test
└── src/validation/__tests__/
    └── validateTeam.test.ts   ← 24 unit tests
```

---

## 🎯 Your Action Plan Right Now

### Step 1: Open Supabase (3 minutes)

1. Go to **https://supabase.com**
2. Sign up / log in
3. Click **"New Project"**
4. Fill in:
   - Name: `fakemon-chaos`
   - Password: **Save this!**
   - Region: **US East** or **Frankfurt**
5. Wait 2-3 minutes

### Step 2: Run Setup Wizard (2 minutes)

```bash
cd ~/Desktop/Fakemon
npm run db:setup
```

Follow the prompts:
- Paste your **Project URL**
- Paste your **anon key**
- Enter your **database password**
- Say **Y** to run migrations
- Say **Y** to verify

### Step 3: Install Vercel CLI (1 minute)

```bash
npm install -g vercel
vercel login
```

### Step 4: Deploy to Vercel (2 minutes)

```bash
# First deployment
vercel

# Add environment variables in dashboard
# Then deploy to production
vercel --prod
```

### Step 5: Configure Discord OAuth2 (2 minutes)

1. Go to **https://discord.com/developers/applications**
2. Create new application: `Fakemon Chaos`
3. Add redirect URI: `https://fakemon-server.vercel.app/auth/discord/callback`
4. Copy Client ID and Secret
5. Add to Vercel environment variables

### Step 6: Test Everything (1 minute)

```bash
# Test health endpoint
curl https://fakemon-server.vercel.app/health

# Test Discord OAuth2 config
npm run auth:test

# Run unit tests
npm test
```

---

## 🔑 Required Environment Variables

Add these in **Vercel Dashboard → Settings → Environment Variables**:

| Variable | Where to Get | Example |
|---|---|---|
| `DATABASE_URL` | Supabase → Settings → Database | `postgresql://postgres...` |
| `SUPABASE_URL` | Supabase → Settings → API | `https://abc123.supabase.co` |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API | `eyJhbG...` (long key) |
| `JWT_SHARED_SECRET` | Generate locally | `openssl rand -base64 64` |
| `DISCORD_CLIENT_ID` | Discord Developer Portal | `123456789012345678` |
| `DISCORD_CLIENT_SECRET` | Discord Developer Portal | `aBcDeFgHiJkLmNoPqRsTuVwXyZ` |
| `DISCORD_REDIRECT_URI` | Your Vercel URL | `https://...vercel.app/auth/discord/callback` |
| `SESSION_SECRET` | Generate locally | Random 32+ chars |
| `CORS_ALLOWED_ORIGINS` | Your Vercel URL | `https://...vercel.app` |

---

## ✅ Verification Checklist

After deployment, verify:

- [ ] `npm run db:verify` shows all 9 tables
- [ ] `npm test` passes all 24 tests
- [ ] `curl https://your-app.vercel.app/health` returns `{"status":"ok"}`
- [ ] Discord OAuth2 URL generates correctly (`npm run auth:test`)
- [ ] Vercel dashboard shows no errors in deployment logs

---

## 🆘 If Something Goes Wrong

### Database Issues
```bash
# Check Supabase project is active (not paused)
# Verify DATABASE_URL is correct
npm run db:verify
```

### Deployment Failed
```bash
# Check logs
vercel logs

# Redeploy
vercel --prod
```

### Missing Environment Variables
```bash
# Use the interactive setup
npm run db:setup

# Or manually edit .env
code .env
```

---

## 📚 Documentation Reference

| Document | Use When |
|---|---|
| **DEPLOY_NOW.md** | First-time deployment (start here!) |
| **quick-deploy.sh** | Automated one-command deployment |
| **VERCEL_DEPLOY.md** | Detailed Vercel configuration |
| **SETUP_GUIDE.md** | Complete setup for all services |
| **SETUP_COMPLETE.md** | Summary of completed tasks |

---

## 🎉 After Successful Deployment

### What's Live
- ✅ Auth server on Vercel
- ✅ PostgreSQL database on Supabase
- ✅ All 9 tables created
- ✅ Ready for Discord OAuth2

### Next Steps
1. **Deploy battle server** (fakemon-showdown) to Railway/Render
2. **Share JWT_SECRET** between both deployments
3. **Test full auth flow**: Discord → JWT → Battle server
4. **Add Cloudinary** for sprite uploads (Phase 2)

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---|---|---|
| Vercel | Hobby | **$0/month** |
| Supabase | Free | **$0/month** |
| Discord OAuth2 | Free | **$0/month** |
| GitHub | Free | **$0/month** |
| **Total** | | **$0/month** 🚀 |

---

## 🚀 Ready to Deploy!

**Open your terminal and run:**

```bash
cd ~/Desktop/Fakemon
./quick-deploy.sh
```

**Or follow DEPLOY_NOW.md for step-by-step instructions.**

Good luck building Fakemon Chaos! 🎮⚡