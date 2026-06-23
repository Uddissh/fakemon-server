# Fakemon Chaos — Product Requirements Document

**Version:** 2.0 (Post-Scoping)
**Date:** June 20, 2026
**Status:** Locked for V1 Soft Launch
**Team:** 2 developers (Uddissh — backend/auth/infra/DB; Teammate — Showdown engine fork + client)
**Target Soft Launch:** August 20, 2026 (8 weeks)

---

## 1. Product Overview

Fakemon Chaos is a browser-based Pokémon-style battle simulator forked from Pokémon Showdown. It breaks standard competitive rulesets to allow full team-building freedom — any stats (within a 680 BST cap), any typing, any ability, any move — while using hidden-information battle formats to keep matches psychologically tense rather than purely solved by theorycraft.

Monetization runs through Discord OAuth2 login tied to a Patreon subscription, decoupled from the platform's own checkout to reduce direct commercial exposure on Pokémon-adjacent IP.

---

## 2. Scope Decision: V1 Soft Launch vs. Post-Launch

Given a 2-month build window with a 2-person team, scope was cut aggressively to ship a real, playable product rather than several half-built features.

### Ships at V1 Soft Launch (Aug 20, 2026)
- Chaos Mode and Total Chaos Mode battles
- Team Builder with 680 BST slider
- Hard-ban ruleset enforcement (Wonder Guard full ban, No Guard + OHKO ban, Imposter HP cap)
- Discord OAuth2 login (JWT-based)
- Patreon integration — **Tier 1 and Tier 2 only**
- Custom sprite upload pipeline (Cloudinary, blur opt-in, crowd + staff moderation)
- Basic open matchmaking queue
- Replay sharing (unlisted by default)

### Deferred to Phase 2 (Post-Launch)
- Rogue-Like Draft Mode
- Community Bazaar (team rentals)
- Patreon Tier 3 (entry effects) and Tier 4 (custom CSS arenas)
- Seasonal meta modifiers (engine hooks pre-built in V1, activation deferred)
- Public replay index

> **⚠️ Open scope note requiring team confirmation:** Draft Mode was originally selected as the default first-time-user onboarding flow to avoid dropping new players into an empty team builder. Under the 2-month cut, Draft Mode itself is deferred to Phase 2. For V1, new-user onboarding must instead use a guided tooltip walkthrough of the Team Builder, or a small set of pre-built starter teams a new player can battle with immediately. **Confirm this substitution with your teammate before Week 1 ends** — it affects frontend scope.

---

## 3. Goals & Success Metrics

| Priority | Goal | Success Metric |
|---|---|---|
| P0 | Ship Chaos Mode + Total Chaos Mode with enforced hard-ban ruleset | Zero exploit reports across 4 alpha testers over 50+ battles each |
| P0 | JWT-based Discord auth live, verified locally by Showdown server | Auth works with zero auth-server dependency during live battles |
| P0 | Patreon Tier 1 + 2 webhook integration live and idempotent | Duplicate webhook events produce zero duplicate tier grants |
| P1 | Sprite upload + moderation pipeline live | Zero unmoderated NSFW asset visible to non-opted-in users |
| P1 | Soft public launch | 100+ registered users in first 14 days post-launch |
| P2 | Infrastructure stable on Oracle Cloud Free Tier | 99% uptime across soft launch period |

---

## 4. Target Users

**Persona A — The Competitive Burnout.** Ex-VGC/Smogon player fatigued by a solved meta. Wants depth without 1,000 memorized sets. Adopts quickly if Chaos Mode feels balanced rather than coin-flip random.

**Persona B — The Meme Architect.** Content creator / Discord poster. Primary draw is custom sprite uploads and clippable chaos moments. Most likely Tier 2 subscriber.

**Persona C — The Casual Drafter.** Pokémon fan with no competitive background, drawn in by short-form video clips. High drop-off risk if forced into the BST slider before understanding the game. *(Note: this persona's primary onboarding path — Draft Mode — is the deferred feature flagged above. Until Draft Mode ships, this persona is secondary for V1.)*

---

## 5. Functional Requirements — V1 Soft Launch

### 5.1 Team Builder
- **REQ-TB-01:** Six BST sliders (HP/Atk/Def/SpA/SpD/Spe), hard-capped at 680 total points distributed. Individual stat range 1–255.
- **REQ-TB-02:** Dual-type selector, full official type pool, any combination permitted.
- **REQ-TB-03:** Full official ability pool, with hard-ban validation (see Section 6).
- **REQ-TB-04:** Full move pool, any generation, 4-move limit per Fakemon.
- **REQ-TB-05:** Standard item pool plus a single "Chaos Item" slot per team with a tradeoff mechanic (defined in a separate Chaos Item registry, TBD pre-launch).
- **REQ-TB-06:** Default sprite assigned by typing/template. Tier 2+ subscribers may upload a custom sprite (see Section 5.4).
- **REQ-TB-07:** Free-text nickname field, 12-character max, profanity-filtered.

### 5.2 Battle Engine
- **REQ-BE-01 (Chaos Mode):** Opponent typing visible on switch-in. Ability, moves, item, and stat spread hidden until triggered in battle.
- **REQ-BE-02 (Total Chaos Mode):** No information given on switch-in. Typing inferred only via observed damage multipliers.
- **REQ-BE-03:** Standard Gen 9 battle mechanics apply (priority, status, weather, terrain) except where overridden by the hard-ban ruleset.
- **REQ-BE-04:** Six seasonal meta modifiers are built as toggleable engine hooks during V1 development, but activation is deferred to Phase 2. Build now, don't activate yet — this avoids a recurring monthly engineering burden post-launch.

### 5.3 Authentication
- **REQ-AUTH-01:** Discord OAuth2 is the sole login method.
- **REQ-AUTH-02:** On successful login, the auth server issues a short-lived signed JWT. The client passes this JWT when connecting to the Showdown battle server.
- **REQ-AUTH-03:** The Showdown server verifies the JWT signature locally using a shared secret — it does **not** call the auth server at battle-join time. This removes the auth server as a runtime dependency for live battles.
- **REQ-AUTH-04:** Patreon webhook updates the user's tier in the database. The Showdown server reads tier from the JWT claims, refreshed on each new login/token issuance.

### 5.4 Custom Sprite Upload Pipeline
- **REQ-SPR-01:** File size hard cap 100KB. Accepted formats: PNG, GIF (animated), WebP.
- **REQ-SPR-02:** Upload flow: client-side size check → server-side re-validation → Cloudinary ingest → CDN URL stored in DB.
- **REQ-SPR-03:** New sprites default to `is_approved: false`. Auto-approved after 24 hours with zero flags, or after manual staff/moderator approval.
- **REQ-SPR-04:** Custom sprites render only if the viewing player has opted in (blur toggle off). Default for all new accounts is opted-out (blurred).
- **REQ-SPR-05:** Slot limits — Tier 2: 5 sprite slots. (Tier 3 unlimited slots is Phase 2, gated behind Tier 3 launch.)

### 5.5 Content Moderation
- **REQ-MOD-01:** Blur overlay on by default for all custom sprites until explicit opt-in.
- **REQ-MOD-02:** 3 independent user flags within 72 hours auto-revert `is_approved` to `false`.
- **REQ-MOD-03:** Moderation queue UI ships **before** sprite upload goes live. Staffed by 2 volunteer moderators recruited from the alpha tester group, in addition to the 2 core developers. 48-hour review SLA.
- **REQ-MOD-04:** Profanity filter on all free-text fields (nicknames, team names).
- **REQ-MOD-05:** Repeat offenders (2+ asset removals) lose sprite upload privileges for 30 days; third offense is a permanent feature ban.
- **REQ-MOD-06:** Sprite upload unlocks only after account age ≥ 7 days, to reduce throwaway-account abuse.

### 5.6 Monetization (Patreon)
- **REQ-MON-01:** Tier 1 ($1/mo) — custom hex chat name color, unique badge.
- **REQ-MON-02:** Tier 2 ($5/mo) — custom sprite uploads (5 slots), animated/glowing nickname in battle.
- **REQ-MON-03:** Patreon webhook events are idempotent — each webhook payload's unique event ID is stored; duplicate event IDs are ignored.
- **REQ-MON-04:** Tier 3 and Tier 4 are explicitly out of scope for V1 and tracked for Phase 2.

### 5.7 Replay System
- **REQ-REP-01:** All battles generate a shareable replay URL, unlisted by default.
- **REQ-REP-02:** Replays persist 90 days for free users, indefinitely for Tier 2+.
- **REQ-REP-03:** Public replay index is deferred to Phase 2.

---

## 6. Chaos Budget Ruleset (Hard Constraints)

| Banned Interaction | Resolution | Status |
|---|---|---|
| No Guard + OHKO moves (Sheer Cold, Fissure, Guillotine, Horn Drill) | Hard validation block | Locked |
| Wonder Guard | **Full ban** for V1 — no restricted/conditional variant | Locked |
| Imposter vs. high-HP custom walls | HP copy capped at 50% of target's custom base HP | Locked |
| BST > 680 | Hard validation block via `validateTeam()` | Locked |
| Single stat > 255 | UI slider ceiling + server-side validation | Locked |

---

## 7. Out of Scope for V1

- Mobile-native app
- Doubles / multi-battle formats
- Voice chat
- Paid team rentals
- AI/bot opponents
- Clan/guild systems
- In-app tournament bracket management
- Rogue-Like Draft Mode *(deferred — see Section 2 scope note)*
- Community Bazaar
- Patreon Tier 3/4
- Active seasonal modifiers (hooks built, not activated)

---

## 8. Non-Functional Requirements

- **NFR-PERF-01:** Battle action round-trip < 300ms under normal load. Drives the decision to host the battle server in a US/EU datacenter rather than India (see TRD Section 4).
- **NFR-PERF-02:** 99% uptime during the soft launch period, excluding scheduled maintenance.
- **NFR-SEC-01:** JWTs and Discord tokens never stored in client `localStorage`.
- **NFR-SEC-02:** User data deletable on request (Discord ID, tier, sprite URLs).
- **NFR-A11Y-01:** Battle log readable as plain text; no game-critical info conveyed by color alone.

---

## 9. Open Risks

| # | Risk | Severity | Action |
|---|---|---|---|
| 1 | IP/legal exposure from Pokémon-adjacent commercial activity | Critical | Consult IP attorney before any wider public scaling beyond soft launch |
| 2 | Patreon webhook reliability (delays, drops, duplicates) | Medium | Idempotency via event ID (REQ-MON-03); 24h grace period on tier cache |
| 3 | Two-person team moderation bandwidth during beta | Medium | 2 volunteer moderators recruited from alpha group |
| 4 | Draft Mode onboarding gap (see Section 2 scope note) | Medium | Confirm substitute onboarding flow with teammate this week |
| 5 | Oracle Cloud Free Tier ARM instance availability | Low | Retry-claim script for US East/Frankfurt; Hetzner CX21 fallback ready |

---

## 10. Changelog

- **v2.0 (June 20, 2026):** Scope cut to 2-month soft launch following team scoping session. Draft Mode, Bazaar, Tier 3/4, and active seasonal modifiers deferred to Phase 2. JWT auth model locked. Wonder Guard full ban locked. Hosting decision: Oracle Cloud Free Tier primary, Hetzner CX21 fallback.
- **v1.0 (June 2026):** Initial PRD drafted from original project blueprint.
