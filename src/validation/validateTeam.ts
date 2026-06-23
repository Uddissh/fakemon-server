// ============================================================
// Fakemon Chaos — validateTeam()
// File:    src/validation/validateTeam.ts
// Repo:    fakemon-server (Uddissh)
// Version: 1.0 — June 2026
//
// THE GATEKEEPER. Nothing reaches the Showdown server without
// passing through this function first.
//
// Unit test every hard-ban combination in:
//   src/validation/__tests__/validateTeam.test.ts
// ============================================================

import { z } from "zod";

// ============================================================
// CONSTANTS — Chaos Budget Ruleset
// ============================================================

const MAX_BST = 680;
const MAX_STAT = 255;
const MIN_STAT = 1;
const MAX_MOVES = 4;
const MAX_NICKNAME_LENGTH = 12;

/** Tier 2 sprite slot limit. Tier 3+ is unlimited (Phase 2). */
const SPRITE_SLOTS_TIER_2 = 5;

/**
 * Hard-banned ability strings.
 * Wonder Guard: full ban for V1 (no restricted/conditional variant).
 * Decided and locked during scoping session — see PRD Section 6.
 */
const BANNED_ABILITIES = new Set(["Wonder Guard"]);

/**
 * Hard-banned move strings when paired with No Guard ability.
 * OHKO moves with 100% accuracy under No Guard are unplayable
 * and eliminate all strategic depth.
 */
const OHKO_MOVES = new Set([
  "Sheer Cold",
  "Fissure",
  "Guillotine",
  "Horn Drill",
]);

/**
 * Profanity list is loaded from a DB-editable config at runtime,
 * not hardcoded here. This stub is used when the DB list is
 * unavailable (e.g. during unit tests).
 */
const PROFANITY_STUB = new Set(["example_banned_word"]);

// ============================================================
// ZOD SCHEMAS
// Shared with the client (team builder form validation).
// Export these and import them in the client repo.
// ============================================================

export const StatBlockSchema = z.object({
  hp:  z.number().int().min(MIN_STAT).max(MAX_STAT),
  atk: z.number().int().min(MIN_STAT).max(MAX_STAT),
  def: z.number().int().min(MIN_STAT).max(MAX_STAT),
  spa: z.number().int().min(MIN_STAT).max(MAX_STAT),
  spd: z.number().int().min(MIN_STAT).max(MAX_STAT),
  spe: z.number().int().min(MIN_STAT).max(MAX_STAT),
});

export const FakemonSchema = z.object({
  /** Internal species name — used for Showdown pack string. */
  name: z.string().min(1).max(64),

  /**
   * Nickname displayed in battle UI.
   * Profanity check applied at validateTeam() call time
   * against the live DB profanity list.
   */
  nickname: z.string().min(1).max(MAX_NICKNAME_LENGTH),

  /** Exactly 2 types required. Both may be the same (e.g. ["Normal","Normal"]). */
  types: z.tuple([z.string().min(1), z.string().min(1)]),

  stats: StatBlockSchema,

  ability: z.string().min(1),

  /** Exactly 4 moves required. */
  moves: z.array(z.string().min(1)).length(MAX_MOVES),

  item: z.string().min(1),

  /**
   * Optional: UUID of a pre-approved sprite in the sprites table.
   * Null = use default template sprite for this typing.
   * Validated against the DB at call time (is_approved check).
   */
  sprite_id: z.string().uuid().nullable(),
});

export const TeamSubmissionSchema = z.object({
  player_discord_id: z.string().min(1),
  format: z.enum(["chaos", "total_chaos", "draft_mode"]),
  team: z.array(FakemonSchema).min(1).max(6),
});

export type StatBlock       = z.infer<typeof StatBlockSchema>;
export type FakemonInput    = z.infer<typeof FakemonSchema>;
export type TeamSubmission  = z.infer<typeof TeamSubmissionSchema>;

// ============================================================
// VALIDATION RESULT TYPE
// ============================================================

export type ValidationSuccess = {
  valid: true;
  /** Showdown-ready pack string. Pass directly to the battle server. */
  packedTeam: string;
};

export type ValidationFailure = {
  valid: false;
  /** Human-readable violation messages for display in the team builder UI. */
  violations: string[];
};

export type ValidationResult = ValidationSuccess | ValidationFailure;

// ============================================================
// SPRITE APPROVAL CONTEXT
// Passed in from the route handler — DB query happens upstream,
// not inside validateTeam(), to keep this function pure and
// synchronous for easy unit testing.
// ============================================================

export type SpriteContext = {
  /** Map of sprite_id → { is_approved, owner_discord_id } */
  sprites: Map<string, { is_approved: boolean; owner_discord_id: string }>;
  /** Discord ID of the submitting player */
  submitting_discord_id: string;
  /** Current tier of the submitting player */
  submitting_tier: number;
  /** How many sprite slots this player has already used */
  used_sprite_slots: number;
  /** Live profanity list from DB */
  profanity_list: Set<string>;
};

// ============================================================
// CORE VALIDATION FUNCTION
// ============================================================

/**
 * validateTeam()
 *
 * Validates a team submission against the Fakemon Chaos
 * Chaos Budget Ruleset. Returns either a Showdown-ready
 * pack string (valid) or an array of violation messages (invalid).
 *
 * This function is PURE — no async, no DB calls, no side effects.
 * All DB-dependent context (sprite approval, profanity list) is
 * resolved upstream and passed in via `context`.
 *
 * @param submission - Parsed team submission (already Zod-validated for shape)
 * @param context    - DB-resolved context for sprite and tier checks
 */
export function validateTeam(
  submission: TeamSubmission,
  context: SpriteContext
): ValidationResult {
  const violations: string[] = [];
  const spriteIdsUsed = new Set<string>();

  for (const [i, fakemon] of submission.team.entries()) {
    const label = `Fakemon ${i + 1} (${fakemon.nickname})`;

    // ────────────────────────────────────────────
    // 1. BST CAP
    // ────────────────────────────────────────────
    const bst = computeBST(fakemon.stats);
    if (bst > MAX_BST) {
      violations.push(
        `${label}: BST is ${bst} — exceeds the ${MAX_BST} cap by ${bst - MAX_BST} points.`
      );
    }

    // ────────────────────────────────────────────
    // 2. INDIVIDUAL STAT RANGES (redundant with Zod, but
    //    defended in depth at the server layer)
    // ────────────────────────────────────────────
    for (const [stat, value] of Object.entries(fakemon.stats) as [
      keyof StatBlock,
      number
    ][]) {
      if (value < MIN_STAT || value > MAX_STAT) {
        violations.push(
          `${label}: ${stat.toUpperCase()} stat (${value}) is outside the allowed range of ${MIN_STAT}–${MAX_STAT}.`
        );
      }
    }

    // ────────────────────────────────────────────
    // 3. WONDER GUARD — FULL BAN
    // Decided and locked: full ban for V1.
    // No restricted/conditional variant.
    // ────────────────────────────────────────────
    if (BANNED_ABILITIES.has(fakemon.ability)) {
      violations.push(
        `${label}: Ability "${fakemon.ability}" is banned in Fakemon Chaos.`
      );
    }

    // ────────────────────────────────────────────
    // 4. NO GUARD + OHKO MOVE COMBINATION
    // ────────────────────────────────────────────
    if (fakemon.ability === "No Guard") {
      for (const move of fakemon.moves) {
        if (OHKO_MOVES.has(move)) {
          violations.push(
            `${label}: The combination of "No Guard" + "${move}" is banned. ` +
            `No Guard + OHKO moves result in 100% accuracy instant knockouts.`
          );
        }
      }
    }

    // ────────────────────────────────────────────
    // 5. NICKNAME PROFANITY CHECK
    // ────────────────────────────────────────────
    const profanityList =
      context.profanity_list.size > 0
        ? context.profanity_list
        : PROFANITY_STUB;

    const nicknameLower = fakemon.nickname.toLowerCase();
    for (const word of profanityList) {
      if (nicknameLower.includes(word.toLowerCase())) {
        violations.push(
          `${label}: Nickname "${fakemon.nickname}" contains prohibited content.`
        );
        break;
      }
    }

    // ────────────────────────────────────────────
    // 6. SPRITE VALIDATION
    // ────────────────────────────────────────────
    if (fakemon.sprite_id !== null) {
      // 6a. Tier gate — only Tier 2+ can use custom sprites.
      if (context.submitting_tier < 2) {
        violations.push(
          `${label}: Custom sprites require Tier 2 (Chaos Casual) or above. ` +
          `Your current tier is ${context.submitting_tier}.`
        );
      } else {
        // 6b. Sprite must exist in the approved sprites map.
        const spriteRecord = context.sprites.get(fakemon.sprite_id);
        if (!spriteRecord) {
          violations.push(
            `${label}: Sprite ID "${fakemon.sprite_id}" was not found. ` +
            `It may have been deleted or never uploaded.`
          );
        } else {
          // 6c. Sprite must be approved.
          if (!spriteRecord.is_approved) {
            violations.push(
              `${label}: Sprite ID "${fakemon.sprite_id}" is pending moderation ` +
              `or has been rejected. Use a different sprite or wait for approval.`
            );
          }

          // 6d. Sprite must belong to the submitting player.
          if (spriteRecord.owner_discord_id !== context.submitting_discord_id) {
            violations.push(
              `${label}: Sprite ID "${fakemon.sprite_id}" does not belong to your account.`
            );
          }
        }

        // 6e. Track unique sprite IDs used across the team
        //     to count against the slot limit.
        if (fakemon.sprite_id) {
          spriteIdsUsed.add(fakemon.sprite_id);
        }
      }
    }
  }

  // ────────────────────────────────────────────
  // 7. TIER 2 SPRITE SLOT LIMIT (cross-Fakemon check)
  // Tier 2: 5 sprite slots total.
  // Each unique sprite_id in the team counts as 1 slot used
  // against the player's account-wide total.
  // ────────────────────────────────────────────
  if (context.submitting_tier === 2) {
    const totalSlotsAfterSubmission =
      context.used_sprite_slots + spriteIdsUsed.size;

    if (totalSlotsAfterSubmission > SPRITE_SLOTS_TIER_2) {
      violations.push(
        `Tier 2 accounts are limited to ${SPRITE_SLOTS_TIER_2} custom sprite slots. ` +
        `You are currently using ${context.used_sprite_slots} slot(s) and this team ` +
        `references ${spriteIdsUsed.size} new sprite(s), which would exceed your limit. ` +
        `Upgrade to Tier 3 for unlimited slots.`
      );
    }
  }

  // ────────────────────────────────────────────
  // RESULT
  // ────────────────────────────────────────────
  if (violations.length > 0) {
    return { valid: false, violations };
  }

  return {
    valid: true,
    packedTeam: packTeam(submission.team),
  };
}

// ============================================================
// HELPER: BST COMPUTATION
// ============================================================

function computeBST(stats: StatBlock): number {
  return stats.hp + stats.atk + stats.def + stats.spa + stats.spd + stats.spe;
}

// ============================================================
// HELPER: SHOWDOWN PACK STRING GENERATOR
// Converts the structured team JSON into the Showdown
// packed team string format expected by the battle server.
//
// Showdown pack format (pipe-delimited per Fakemon):
//   Nickname|Species|Item|Ability|Move1,Move2,Move3,Move4|
//   Nature|EVs (HP/Atk/Def/SpA/SpD/Spe)|Gender|
//   IVs|Shiny|Level||
//
// For Fakemon Chaos: we use a custom species slot (the Fakemon's
// internal `name`), EVs are derived from the stat spread to
// produce the desired stat values, and Nature is always Hardy
// (neutral — stat spread is the source of truth).
//
// NOTE: The Showdown fork's onValidateSet() hook bypasses
// standard species/move legality for Fakemon Chaos format.
// The pack string only needs to satisfy the engine's parser.
// ============================================================

function packTeam(team: FakemonInput[]): string {
  return team.map(packFakemon).join("]");
}

function packFakemon(fakemon: FakemonInput): string {
  // In Gen 9, a stat = floor(((2*base + IV + floor(EV/4)) * level / 100) + 5) * NatureMod
  // For HP: floor(((2*base + IV + floor(EV/4)) * level / 100) + 10 + level)
  // We want the final stat to match the custom base value exactly.
  // Strategy: set base = 1, IV = 31, derive EV to hit the target.
  // With Hardy nature (1.0x), level 100:
  //   non-HP stat = floor((2*base + 31 + floor(EV/4)) * 100/100 + 5)
  //               = 2*base + 31 + floor(EV/4) + 5
  // We set base = 50 (a neutral placeholder), then use EVs to dial in.
  // This is a simplification — the Showdown fork's custom format handler
  // may override stat computation entirely. If so, team_data JSON is
  // used directly and this pack string serves as a fallback/index key.
  //
  // For V1, output a pack string with placeholder EVs.
  // The teammate's engine hook reads the raw stat spread from
  // the structured team_data JSON stored in the DB.

  const nickname = fakemon.nickname;
  const species  = fakemon.name;
  const item     = fakemon.item;
  const ability  = fakemon.ability;
  const moves    = fakemon.moves.join(",");
  const nature   = "Hardy";

  // EVs encoded as: HP / Atk / Def / SpA / SpD / Spe
  // We pass the raw custom stat values here.
  // The Showdown fork's custom handler picks these up directly.
  const evs = [
    fakemon.stats.hp,
    fakemon.stats.atk,
    fakemon.stats.def,
    fakemon.stats.spa,
    fakemon.stats.spd,
    fakemon.stats.spe,
  ].join("/");

  const gender  = "";
  const ivs     = "31/31/31/31/31/31";
  const shiny   = "";
  const level   = "100";
  const types   = fakemon.types.join("/"); // passed as a custom field

  // Format: Nickname|Species|Item|Ability|Moves|Nature|EVs|Gender|IVs|Shiny|Level||CustomTypes
  return [
    nickname,
    species,
    item,
    ability,
    moves,
    nature,
    evs,
    gender,
    ivs,
    shiny,
    level,
    "",            // happiness (unused)
    types,         // custom extension field parsed by the fork
  ].join("|");
}
