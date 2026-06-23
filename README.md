# fakemon-server

Auth, validation, sprite pipeline, and database layer for **Fakemon Chaos**.

> **Repo ownership:** Uddissh
> **Companion repo:** `fakemon-showdown` (teammate) — Showdown engine fork + client

---

## Architecture Overview

```
Client (React) ──► Nginx ──► auth-server (this repo, :3001)
                         └──► Showdown battle server (fakemon-showdown repo)

auth-server ──► Supabase PostgreSQL (orbitron project)
            ──► Cloudinary CDN (sprite storage)
            ──► Discord OAuth2
            ──► Patreon Webhooks
```

The two services communicate via a **shared JWT secret**. The auth server issues JWTs at login. The Showdown server verifies them locally — no runtime dependency on this server during active battles.

---

## Prerequisites

- Node.js 20+
- Docker + Docker Compose
- A Supabase account (free tier — orbitron project)
- A Cloudinary account (free tier)
- A Discord application (OAuth2)
- A Patreon account (for webhook setup — Phase 1 proof-of-concept first)

---

## Local Setup

### 1. Clone and install

```bash
git clone https://github.com/Uddissh/fakemon-server.git
cd fakemon-server
npm install
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — fill in ALL values before proceeding
# Share the actual values with your teammate via Bitwarden
```

Key values to set immediately:
- `JWT_SHARED_SECRET` — generate with `openssl rand -base64 64`. **Same value must be in the fakemon-showdown `.env` too.**
- `DATABASE_URL` — from Supabase dashboard → Project Settings → Database → URI
- `DISCORD_CLIENT_ID` / `DISCORD_CLIENT_SECRET` — from Discord Developer Portal
- `CLOUDINARY_CLOUD_NAME` / `CLOUDINARY_API_KEY` / `CLOUDINARY_API_SECRET` — from Cloudinary dashboard

### 3. Run database migrations

```bash
npx drizzle-kit migrate
```

This creates all tables in your Supabase PostgreSQL instance. Verify in the Supabase dashboard → Table Editor.

### 4. Start the server

```bash
# Development (with hot reload)
npm run dev

# Production (Docker)
docker compose up --build
```

Server runs at `http://localhost:3001`. Health check: `GET /health`

---

## Project Structure

```
fakemon-server/
├── src/
│   ├── db/
│   │   └── schema.ts          ← Drizzle ORM schema (source of truth)
│   ├── validation/
│   │   ├── validateTeam.ts    ← Core hard-ban ruleset validation
│   │   └── __tests__/
│   │       └── validateTeam.test.ts
│   ├── routes/
│   │   ├── auth.ts            ← Discord OAuth2 + JWT issuance
│   │   ├── patreon.ts         ← Patreon webhook handler
│   │   ├── sprites.ts         ← Upload pipeline + moderation
│   │   ├── teams.ts           ← Team save + validateTeam() gate
│   │   └── admin.ts           ← Moderation queue (staff only)
│   ├── middleware/
│   │   ├── requireAuth.ts     ← JWT verification middleware
│   │   └── requireMod.ts      ← Moderator role gate
│   └── index.ts               ← Express app entry point
├── drizzle/
│   └── migrations/            ← Generated SQL migration files (commit these)
├── nginx/
│   └── conf.d/
│       └── fakemon.conf       ← Nginx reverse proxy config
├── drizzle.config.ts
├── docker-compose.yml
├── .env.example               ← Committed. Real .env is gitignored.
└── .github/
    └── workflows/
        └── deploy.yml         ← GitHub Actions auto-deploy to Oracle Cloud
```

---

## Database Migrations

**Never alter the schema directly in Supabase or via psql.**

Every change goes through Drizzle:

```bash
# 1. Edit src/db/schema.ts
# 2. Generate migration file
npx drizzle-kit generate

# 3. Review the generated SQL in drizzle/migrations/
# 4. Commit the migration file to git
git add drizzle/migrations/
git commit -m "migration: <description>"

# 5. Apply to the database
npx drizzle-kit migrate
```

Your teammate runs `npx drizzle-kit migrate` after pulling to stay in sync.

---

## Key API Routes

| Method | Route | Auth | Description |
|---|---|---|---|
| GET | `/health` | None | Health check |
| GET | `/auth/discord` | None | Initiate Discord OAuth2 flow |
| GET | `/auth/discord/callback` | None | Discord OAuth2 callback — issues JWT |
| POST | `/auth/refresh` | JWT | Refresh an expiring JWT |
| POST | `/patreon/webhook` | Patreon signature | Tier update webhook (idempotent) |
| POST | `/sprites/upload` | JWT + Tier 2 | Upload a custom sprite to Cloudinary |
| POST | `/sprites/:id/report` | JWT | Flag a sprite for moderation |
| POST | `/teams/validate` | JWT | Run validateTeam() + save team |
| GET | `/admin/queue` | JWT + Moderator | Moderation review queue |
| POST | `/admin/sprites/:id/approve` | JWT + Moderator | Approve a flagged sprite |
| POST | `/admin/sprites/:id/reject` | JWT + Moderator | Reject a flagged sprite |

---

## Hard-Ban Ruleset

Enforced in `src/validation/validateTeam.ts`. All rules:

| Rule | Enforcement point |
|---|---|
| BST ≤ 680 | `validateTeam()` |
| Individual stat 1–255 | Zod schema + `validateTeam()` |
| No Wonder Guard | `validateTeam()` (full ban, V1) |
| No Guard + OHKO moves | `validateTeam()` |
| Imposter HP cap (50%) | Showdown engine — teammate's responsibility |

Unit tests for every combination live in `src/validation/__tests__/validateTeam.test.ts`. Run them before every push to main.

---

## Secrets Checklist

Before going to production, confirm:

- [ ] `JWT_SHARED_SECRET` is identical in both this `.env` and `fakemon-showdown/.env`
- [ ] `SHOWDOWN_INTERNAL_SECRET` is set and identical in both repos
- [ ] Discord redirect URI in the Discord Developer Portal matches `DISCORD_REDIRECT_URI`
- [ ] Patreon webhook URL in the Patreon dashboard points to `https://api.fakemonchaos.com/patreon/webhook`
- [ ] No `.env` file committed to git (`git status` should not show it)
- [ ] GitHub Secrets are set: `ORACLE_HOST`, `ORACLE_USER`, `ORACLE_SSH_KEY`, `ORACLE_DEPLOY_DIR`

---

## Deployment

Push to `main` — GitHub Actions handles the rest.

Manual deploy (emergency only):
```bash
ssh ubuntu@ORACLE_HOST
cd /home/ubuntu/fakemon-server
git pull origin main
npx drizzle-kit migrate
docker compose up -d --build
```

---

## Week 1 Checklist (DevOps priority)

- [ ] Oracle Cloud Free Tier ARM instance claimed (US East / Frankfurt)
- [ ] SSH key added to Oracle instance, stored in GitHub Secrets
- [ ] `docker compose up --build` works locally with hello world Express endpoint
- [ ] GitHub Actions deploy workflow fires successfully on push to main
- [ ] Supabase orbitron project connected — `drizzle-kit migrate` runs clean
- [ ] Patreon webhook proof-of-concept: Discord login → user row → tier update → idempotency check
