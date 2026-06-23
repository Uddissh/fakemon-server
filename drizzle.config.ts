// ============================================================
// Fakemon Chaos — Drizzle ORM Config
// File:  drizzle.config.ts
// Repo:  fakemon-server (Uddissh)
//
// Usage:
//   Generate migration: npx drizzle-kit generate
//   Apply migration:    npx drizzle-kit migrate
//   Inspect schema:     npx drizzle-kit studio
//
// HARD RULE: Never ALTER the Supabase schema directly via
// the Supabase dashboard SQL editor or psql.
// Every change goes through a migration file committed to git.
// ============================================================

import { defineConfig } from "drizzle-kit";
import * as dotenv from "dotenv";

dotenv.config();

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL is not set. Copy .env.example to .env and fill in your Supabase connection string."
  );
}

export default defineConfig({
  // Path to your schema file.
  schema: "./src/db/schema.ts",

  // Directory where generated migration SQL files will be stored.
  // Commit every file in this directory to git.
  out: "./drizzle/migrations",

  dialect: "postgresql",

  dbCredentials: {
    // Use the direct connection string (not the pooler) for migrations.
    // The pooler URL (DATABASE_POOL_URL) is used by the running app server.
    url: process.env.DATABASE_URL,
  },

  // Print every SQL statement executed during migration.
  verbose: true,

  // Prompt for confirmation before destructive operations
  // (e.g. dropping a column). Never skip this in production.
  strict: true,
});
