// ============================================================
// Fakemon Chaos — Database Schema
// Tool:    Drizzle ORM (drizzle-kit generate → drizzle-kit migrate)
// Target:  Supabase PostgreSQL (orbitron project)
// Owner:   Uddissh (fakemon-server repo)
// Version: 1.0 — June 2026
//
// HARD RULE: Never ALTER the database directly via psql.
// Every schema change goes through a migration file.
// Run: drizzle-kit generate → commit file → drizzle-kit migrate
// ============================================================

import {
  pgTable,
  text,
  integer,
  boolean,
  timestamp,
  jsonb,
  uuid,
  pgEnum,
  serial,
  varchar,
  smallint,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ============================================================
// ENUMS
// ============================================================

/**
 * Patreon/Ko-fi subscription tier.
 * 0 = free/unsubscribed, 1–4 = paid tiers.
 * Tier 3 and Tier 4 are provisioned in the enum now but
 * not activated until Phase 2. Rows with tier 3/4 simply
 * receive no additional server-side privileges in V1.
 */
export const tierEnum = pgEnum("tier", ["0", "1", "2", "3", "4"]);

/**
 * Sprite moderation state machine:
 *   pending  → approved (24h no flags, or manual approval)
 *   pending  → rejected (3 flags within 72h, or manual rejection)
 *   approved → rejected (flag threshold hit post-approval)
 *   rejected → approved (manual override by moderator)
 */
export const spriteStatusEnum = pgEnum("sprite_status", [
  "pending",
  "approved",
  "rejected",
]);

/**
 * Battle format variants for V1.
 * draft_mode is reserved here for Phase 2 so the
 * battles table doesn't need a migration at launch.
 */
export const battleFormatEnum = pgEnum("battle_format", [
  "chaos",
  "total_chaos",
  "draft_mode",
]);

/**
 * Moderation action types — for the audit log.
 */
export const modActionEnum = pgEnum("mod_action", [
  "approve",
  "reject",
  "warn",
  "sprite_ban",
  "sprite_unban",
]);

// ============================================================
// TABLES
// ============================================================

// ------------------------------------------------------------
// users
// Source of truth for every registered account.
// Created on first successful Discord OAuth2 callback.
// ------------------------------------------------------------
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    // Discord identity — immutable after account creation.
    discord_id: varchar("discord_id", { length: 32 }).notNull().unique(),
    discord_username: varchar("discord_username", { length: 64 }).notNull(),
    discord_avatar: text("discord_avatar"), // CDN hash, nullable

    // Display name shown in battle UI and nickname colouring.
    // Defaults to discord_username; editable by Tier 1+.
    display_name: varchar("display_name", { length: 32 }).notNull(),

    // Hex colour for Tier 1+ name styling. Null = default white.
    name_color: varchar("name_color", { length: 7 }), // e.g. "#FF6B6B"

    // Current active Patreon/Ko-fi tier.
    // Updated by webhook; re-verified at JWT issuance.
    tier: tierEnum("tier").notNull().default("0"),

    // Patreon member ID stored for webhook correlation.
    // Null until first Patreon webhook event is received.
    patreon_member_id: text("patreon_member_id").unique(),

    // Moderation flags.
    is_moderator: boolean("is_moderator").notNull().default(false),
    is_banned: boolean("is_banned").notNull().default(false),
    sprite_upload_banned_until: timestamp("sprite_upload_banned_until", {
      withTimezone: true,
    }),

    // Viewer preferences.
    // show_custom_sprites: opt-in to rendering other players' custom sprites.
    show_custom_sprites: boolean("show_custom_sprites").notNull().default(false),

    // Account age gate for sprite upload (7 days minimum).
    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    discord_id_idx: uniqueIndex("users_discord_id_idx").on(table.discord_id),
    patreon_member_idx: index("users_patreon_member_idx").on(
      table.patreon_member_id
    ),
  })
);

// ------------------------------------------------------------
// tier_cache
// Stores raw Patreon webhook event IDs for idempotency.
// Before processing any webhook, check this table.
// If the event_id already exists, discard silently.
// ------------------------------------------------------------
export const tierCache = pgTable(
  "tier_cache",
  {
    id: serial("id").primaryKey(),

    // Patreon's unique event identifier from webhook headers.
    event_id: text("event_id").notNull().unique(),

    // The Discord user this event applies to (via patreon_member_id join).
    user_id: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // The tier applied by this event.
    tier_applied: tierEnum("tier_applied").notNull(),

    // Full raw webhook payload stored for debugging/replay.
    raw_payload: jsonb("raw_payload").notNull(),

    received_at: timestamp("received_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    event_id_idx: uniqueIndex("tier_cache_event_id_idx").on(table.event_id),
    user_id_idx: index("tier_cache_user_id_idx").on(table.user_id),
  })
);

// ------------------------------------------------------------
// sprites
// One row per uploaded custom sprite.
// A user may have multiple sprites up to their tier's slot limit.
// Tier 2: 5 slots. Tier 3+: unlimited (Phase 2).
// ------------------------------------------------------------
export const sprites = pgTable(
  "sprites",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    owner_id: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    // Cloudinary asset public_id — used to construct CDN URLs
    // and to call the Cloudinary Admin API if deletion is needed.
    cloudinary_public_id: text("cloudinary_public_id").notNull().unique(),

    // Full CDN URL served at render time.
    cdn_url: text("cdn_url").notNull(),

    // File metadata recorded at upload.
    file_format: varchar("file_format", { length: 8 }).notNull(), // "png" | "gif" | "webp"
    file_size_bytes: integer("file_size_bytes").notNull(), // must be ≤ 102400 (100KB)

    // Moderation state.
    status: spriteStatusEnum("status").notNull().default("pending"),

    // Count of unique reporter user IDs within the current 72h window.
    // Reset to 0 when status transitions to approved.
    flag_count: smallint("flag_count").notNull().default(0),

    // Timestamps.
    uploaded_at: timestamp("uploaded_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    approved_at: timestamp("approved_at", { withTimezone: true }),
    last_flagged_at: timestamp("last_flagged_at", { withTimezone: true }),
  },
  (table) => ({
    owner_idx: index("sprites_owner_idx").on(table.owner_id),
    status_idx: index("sprites_status_idx").on(table.status),
  })
);

// ------------------------------------------------------------
// sprite_reports
// One row per user-per-sprite report event.
// Used to enforce uniqueness (one flag per user per sprite)
// and to drive the 72h window reset logic.
// ------------------------------------------------------------
export const spriteReports = pgTable(
  "sprite_reports",
  {
    id: serial("id").primaryKey(),

    sprite_id: uuid("sprite_id")
      .notNull()
      .references(() => sprites.id, { onDelete: "cascade" }),

    reporter_id: uuid("reporter_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    reported_at: timestamp("reported_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    // One report per user per sprite — prevents duplicate flagging.
    unique_report: uniqueIndex("sprite_reports_unique_idx").on(
      table.sprite_id,
      table.reporter_id
    ),
  })
);

// ------------------------------------------------------------
// teams
// A saved Fakemon team belonging to a user.
// Validated against the hard-ban ruleset at save time.
// `packed` is the Showdown pack string for direct ingestion
// by the battle server; stored alongside the structured JSON
// for human-readable display in the team builder.
// ------------------------------------------------------------
export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    owner_id: uuid("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    name: varchar("name", { length: 64 }).notNull(),

    // Full structured team data as JSON — 6 Fakemon with
    // stats, types, ability, moves, item, sprite_id.
    // This is what the team builder reads and writes.
    team_data: jsonb("team_data").notNull(),
    /*
      Shape of each member in team_data array:
      {
        name:       string         // internal species name
        nickname:   string         // ≤12 chars, profanity-filtered
        types:      [string, string]
        stats:      { hp, atk, def, spa, spd, spe }  // sum ≤ 680, each 1–255
        ability:    string
        moves:      [string, string, string, string]
        item:       string
        sprite_id:  uuid | null    // null = default template sprite
      }
    */

    // Pre-computed Showdown pack string — generated by validateTeam()
    // on every successful save. The battle server uses this directly.
    packed_team: text("packed_team").notNull(),

    // Which format this team was built for (informs matchmaking queue).
    format: battleFormatEnum("format").notNull().default("chaos"),

    is_deleted: boolean("is_deleted").notNull().default(false),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    owner_idx: index("teams_owner_idx").on(table.owner_id),
    format_idx: index("teams_format_idx").on(table.format),
  })
);

// ------------------------------------------------------------
// battles
// One row per completed or in-progress battle.
// Created when two players are matched from the queue.
// ------------------------------------------------------------
export const battles = pgTable(
  "battles",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    format: battleFormatEnum("format").notNull(),

    player_one_id: uuid("player_one_id")
      .notNull()
      .references(() => users.id),
    player_two_id: uuid("player_two_id")
      .notNull()
      .references(() => users.id),

    // Team snapshots at battle start — foreign keys for record-keeping
    // but the actual teams are snapshotted into battle_data at start
    // so post-battle edits to a team don't mutate historical records.
    player_one_team_id: uuid("player_one_team_id").references(() => teams.id),
    player_two_team_id: uuid("player_two_team_id").references(() => teams.id),

    // Winner user ID. Null until battle concludes.
    winner_id: uuid("winner_id").references(() => users.id),

    // Full Showdown battle log stored for replay rendering.
    battle_log: text("battle_log"),

    // Shareable replay token (random slug, not the battle UUID).
    // Null until battle concludes and replay is generated.
    replay_token: varchar("replay_token", { length: 16 }).unique(),

    // Whether the replay is listed in a public index.
    // Default false (unlisted). Public index is Phase 2.
    replay_public: boolean("replay_public").notNull().default(false),

    started_at: timestamp("started_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    ended_at: timestamp("ended_at", { withTimezone: true }),

    // Replay TTL logic is enforced at the application layer, not in
    // the DB, to allow tier-based differentiation:
    // Free users: 90 days. Tier 2+: indefinite.
  },
  (table) => ({
    player_one_idx: index("battles_player_one_idx").on(table.player_one_id),
    player_two_idx: index("battles_player_two_idx").on(table.player_two_id),
    replay_token_idx: uniqueIndex("battles_replay_token_idx").on(
      table.replay_token
    ),
    format_idx: index("battles_format_idx").on(table.format),
  })
);

// ------------------------------------------------------------
// bazaar_listings
// Provisioned now for Phase 2 (Community Bazaar).
// NOT exposed via any API route in V1 — table exists in the
// schema so Phase 2 requires no migration to add it.
// ------------------------------------------------------------
export const bazaarListings = pgTable(
  "bazaar_listings",
  {
    id: uuid("id").primaryKey().defaultRandom(),

    author_id: uuid("author_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),

    team_id: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),

    display_name: varchar("display_name", { length: 64 }).notNull(),
    description: text("description"),

    format: battleFormatEnum("format").notNull(),

    // Rental stats — updated on each borrow.
    rental_count: integer("rental_count").notNull().default(0),

    // Win rate is computed at read time from battles table joins.
    // Not stored here to avoid stale denormalisation.

    is_active: boolean("is_active").notNull().default(true),

    created_at: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    author_idx: index("bazaar_author_idx").on(table.author_id),
    format_idx: index("bazaar_format_idx").on(table.format),
    active_idx: index("bazaar_active_idx").on(table.is_active),
  })
);

// ------------------------------------------------------------
// moderation_actions
// Audit log of every moderator action taken.
// Immutable — no updates or deletes on this table.
// Provides the evidence trail for repeat-offender enforcement.
// ------------------------------------------------------------
export const moderationActions = pgTable(
  "moderation_actions",
  {
    id: serial("id").primaryKey(),

    // The moderator who performed the action.
    moderator_id: uuid("moderator_id")
      .notNull()
      .references(() => users.id),

    // The user the action was taken against.
    target_user_id: uuid("target_user_id")
      .notNull()
      .references(() => users.id),

    // The sprite involved (nullable — some actions are user-level, not sprite-level).
    sprite_id: uuid("sprite_id").references(() => sprites.id),

    action: modActionEnum("action").notNull(),

    // Free-text reason for the action (required for reject, warn, ban).
    reason: text("reason"),

    acted_at: timestamp("acted_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    target_user_idx: index("mod_actions_target_user_idx").on(
      table.target_user_id
    ),
    moderator_idx: index("mod_actions_moderator_idx").on(table.moderator_id),
    acted_at_idx: index("mod_actions_acted_at_idx").on(table.acted_at),
  })
);

// ------------------------------------------------------------
// seasonal_modifiers
// Provisioned for Phase 2. Six modifier hooks are built into
// the Showdown engine during V1 development, each keyed to
// a row in this table. Only one row may have is_active = true
// at a time (enforced at the application layer on update).
// Flipping a modifier live is a single DB write — no deploy.
// ------------------------------------------------------------
export const seasonalModifiers = pgTable("seasonal_modifiers", {
  id: serial("id").primaryKey(),

  // Matches the engine hook registration key in the Showdown fork.
  engine_hook_key: varchar("engine_hook_key", { length: 64 })
    .notNull()
    .unique(),

  name: varchar("name", { length: 64 }).notNull(),
  description: text("description").notNull(),

  // Human-readable display text shown on the lobby and team builder.
  display_tagline: varchar("display_tagline", { length: 128 }).notNull(),

  is_active: boolean("is_active").notNull().default(false),

  activated_at: timestamp("activated_at", { withTimezone: true }),
  deactivated_at: timestamp("deactivated_at", { withTimezone: true }),
});

// ============================================================
// RELATIONS
// (Used by Drizzle's query builder for type-safe joins.)
// ============================================================

export const usersRelations = relations(users, ({ many }) => ({
  sprites: many(sprites),
  teams: many(teams),
  battlesAsPlayerOne: many(battles, { relationName: "playerOne" }),
  battlesAsPlayerTwo: many(battles, { relationName: "playerTwo" }),
  bazaarListings: many(bazaarListings),
  moderationActionsReceived: many(moderationActions, {
    relationName: "targetUser",
  }),
  tierCache: many(tierCache),
  spriteReports: many(spriteReports),
}));

export const spritesRelations = relations(sprites, ({ one, many }) => ({
  owner: one(users, { fields: [sprites.owner_id], references: [users.id] }),
  reports: many(spriteReports),
  moderationActions: many(moderationActions),
}));

export const spriteReportsRelations = relations(spriteReports, ({ one }) => ({
  sprite: one(sprites, {
    fields: [spriteReports.sprite_id],
    references: [sprites.id],
  }),
  reporter: one(users, {
    fields: [spriteReports.reporter_id],
    references: [users.id],
  }),
}));

export const teamsRelations = relations(teams, ({ one, many }) => ({
  owner: one(users, { fields: [teams.owner_id], references: [users.id] }),
  bazaarListings: many(bazaarListings),
}));

export const battlesRelations = relations(battles, ({ one }) => ({
  playerOne: one(users, {
    fields: [battles.player_one_id],
    references: [users.id],
    relationName: "playerOne",
  }),
  playerTwo: one(users, {
    fields: [battles.player_two_id],
    references: [users.id],
    relationName: "playerTwo",
  }),
  winner: one(users, {
    fields: [battles.winner_id],
    references: [users.id],
  }),
  playerOneTeam: one(teams, {
    fields: [battles.player_one_team_id],
    references: [teams.id],
  }),
  playerTwoTeam: one(teams, {
    fields: [battles.player_two_team_id],
    references: [teams.id],
  }),
}));

export const bazaarListingsRelations = relations(
  bazaarListings,
  ({ one }) => ({
    author: one(users, {
      fields: [bazaarListings.author_id],
      references: [users.id],
    }),
    team: one(teams, {
      fields: [bazaarListings.team_id],
      references: [teams.id],
    }),
  })
);

export const moderationActionsRelations = relations(
  moderationActions,
  ({ one }) => ({
    moderator: one(users, {
      fields: [moderationActions.moderator_id],
      references: [users.id],
    }),
    targetUser: one(users, {
      fields: [moderationActions.target_user_id],
      references: [users.id],
      relationName: "targetUser",
    }),
    sprite: one(sprites, {
      fields: [moderationActions.sprite_id],
      references: [sprites.id],
    }),
  })
);

export const tierCacheRelations = relations(tierCache, ({ one }) => ({
  user: one(users, { fields: [tierCache.user_id], references: [users.id] }),
}));

// ============================================================
// TYPE EXPORTS
// Infer TypeScript types from schema for use across the
// fakemon-server codebase without repeating type definitions.
// ============================================================

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Sprite = typeof sprites.$inferSelect;
export type NewSprite = typeof sprites.$inferInsert;

export type SpriteReport = typeof spriteReports.$inferSelect;
export type NewSpriteReport = typeof spriteReports.$inferInsert;

export type Team = typeof teams.$inferSelect;
export type NewTeam = typeof teams.$inferInsert;

export type Battle = typeof battles.$inferSelect;
export type NewBattle = typeof battles.$inferInsert;

export type BazaarListing = typeof bazaarListings.$inferSelect;
export type NewBazaarListing = typeof bazaarListings.$inferInsert;

export type ModerationAction = typeof moderationActions.$inferSelect;
export type NewModerationAction = typeof moderationActions.$inferInsert;

export type SeasonalModifier = typeof seasonalModifiers.$inferSelect;
export type TierCache = typeof tierCache.$inferSelect;
export type NewTierCache = typeof tierCache.$inferInsert;
