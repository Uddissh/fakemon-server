// ============================================================
// Fakemon Chaos — validateTeam() Unit Tests
// File:    src/validation/__tests__/validateTeam.test.ts
// Repo:    fakemon-server (Uddissh)
//
// Comprehensive test coverage for ALL hard-ban combinations
// from PRD Section 6 and TRD Section 3.3.
//
// Run: npm test
// ============================================================

import { describe, it, expect, beforeEach } from 'vitest';
import { validateTeam, type TeamSubmission, type SpriteContext } from '../validateTeam';

// ============================================================
// TEST HELPERS
// ============================================================

function createValidFakemon(overrides: Partial<any> = {}) {
  return {
    name: 'Abomination',
    nickname: 'Monster',
    types: ['Fire', 'Ghost'] as ['Fire', 'Ghost'],
    stats: {
      hp: 80,
      atk: 150,
      def: 60,
      spa: 90,
      spd: 60,
      spe: 240,
    },
    ability: 'Speed Boost',
    moves: ['Flare Blitz', 'Shadow Ball', 'Protect', 'Swords Dance'],
    item: 'Choice Scarf',
    sprite_id: null,
    ...overrides,
  };
}

function createValidTeamSubmission(overrides: Partial<TeamSubmission> = {}): TeamSubmission {
  return {
    player_discord_id: '123456789012345678',
    format: 'chaos',
    team: [createValidFakemon()],
    ...overrides,
  };
}

function createValidSpriteContext(overrides: Partial<SpriteContext> = {}): SpriteContext {
  return {
    sprites: new Map(),
    submitting_discord_id: '123456789012345678',
    submitting_tier: 2,
    used_sprite_slots: 0,
    profanity_list: new Set(['badword', 'offensive']),
    ...overrides,
  };
}

// ============================================================
// TEST SUITES
// ============================================================

describe('validateTeam()', () => {
  describe('BST Validation (680 cap)', () => {
    it('accepts team at exactly 680 BST', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 100, atk: 120, def: 100, spa: 120, spd: 100, spe: 140 }, // Sum = 680
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
      if (result.valid) {
        expect(result.packedTeam).toBeDefined();
      }
    });

    it('accepts team below 680 BST (679)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 100, atk: 120, def: 100, spa: 120, spd: 100, spe: 139 }, // Sum = 679
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('rejects team exceeding 680 BST (681)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 100, atk: 120, def: 100, spa: 120, spd: 100, spe: 141 }, // Sum = 681
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0]).toContain('exceeds the 680 cap by 1 points');
      }
    });

    it('rejects team far exceeding 680 BST (700)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 120, atk: 120, def: 120, spa: 120, spd: 120, spe: 100 }, // Sum = 700
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('exceeds the 680 cap by 20 points');
      }
    });

    it('rejects multi-Fakemon team where total BST exceeds cap', () => {
      const team = createValidTeamSubmission({
        team: [
          createValidFakemon({ stats: { hp: 120, atk: 120, def: 120, spa: 120, spd: 120, spe: 100 } }), // 700
          createValidFakemon({ stats: { hp: 50, atk: 50, def: 50, spa: 50, spd: 50, spe: 50 } }), // 300
        ],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        // First Fakemon should fail
        expect(result.violations.some(v => v.includes('Fakemon 1'))).toBe(true);
      }
    });
  });

  describe('Individual Stat Range (1-255)', () => {
    it('accepts stats at minimum (1)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 },
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('accepts stats at maximum (255)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 255, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 }, // HP at max, others min
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('rejects stat below minimum (0)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 0, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations.some(v => v.includes('HP stat (0) is outside'))).toBe(true);
      }
    });

    it('rejects stat above maximum (256)', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          stats: { hp: 256, atk: 100, def: 100, spa: 100, spd: 100, spe: 100 },
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations.some(v => v.includes('HP stat (256) is outside'))).toBe(true);
      }
    });
  });

  describe('Wonder Guard Full Ban', () => {
    it('rejects any Fakemon with Wonder Guard', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          ability: 'Wonder Guard',
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations).toHaveLength(1);
        expect(result.violations[0]).toContain('Wonder Guard');
        expect(result.violations[0]).toContain('is banned');
      }
    });

    it('rejects multiple Fakemon with Wonder Guard', () => {
      const team = createValidTeamSubmission({
        team: [
          createValidFakemon({ name: 'WG1', ability: 'Wonder Guard' }),
          createValidFakemon({ name: 'WG2', ability: 'Wonder Guard' }),
        ],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations).toHaveLength(2);
        expect(result.violations[0]).toContain('WG1');
        expect(result.violations[1]).toContain('WG2');
      }
    });

    it('accepts Fakemon with other abilities', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          ability: 'Speed Boost',
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });
  });

  describe('No Guard + OHKO Move Combination', () => {
    const ohkoMoves = ['Sheer Cold', 'Fissure', 'Guillotine', 'Horn Drill'];

    it.each(ohkoMoves)('rejects No Guard + %s', (move) => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          ability: 'No Guard',
          moves: [move, 'Protect', 'Swords Dance', 'Recover'],
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('No Guard');
        expect(result.violations[0]).toContain(move);
      }
    });

    it('accepts No Guard with non-OHKO moves', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          ability: 'No Guard',
          moves: ['Dynamic Punch', 'Protect', 'Swords Dance', 'Recover'],
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('accepts OHKO moves without No Guard', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          ability: 'Speed Boost',
          moves: ['Sheer Cold', 'Protect', 'Swords Dance', 'Recover'],
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('rejects team with multiple No Guard + OHKO combinations', () => {
      const team = createValidTeamSubmission({
        team: [
          createValidFakemon({ name: 'NG1', ability: 'No Guard', moves: ['Sheer Cold', 'A', 'B', 'C'] }),
          createValidFakemon({ name: 'NG2', ability: 'No Guard', moves: ['Fissure', 'X', 'Y', 'Z'] }),
        ],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations).toHaveLength(2);
      }
    });
  });

  describe('Nickname Profanity Filter', () => {
    it('accepts clean nickname', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          nickname: 'CoolMonster',
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('rejects nickname containing profanity', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          nickname: 'BadWord',
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext({
        profanity_list: new Set(['badword', 'offensive']),
      }));
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('prohibited content');
      }
    });

    it('is case-insensitive for profanity', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({
          nickname: 'BADWORD123',
        })],
      });
      
      const result = validateTeam(team, createValidSpriteContext({
        profanity_list: new Set(['badword']),
      }));
      
      expect(result.valid).toBe(false);
    });
  });

  describe('Sprite Validation', () => {
    it('accepts team with no custom sprites', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({ sprite_id: null })],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('rejects Tier 1 user with custom sprite', () => {
      const team = createValidTeamSubmission({
        team: [createValidFakemon({ sprite_id: '550e8400-e29b-41d4-a716-446655440000' })],
      });
      
      const result = validateTeam(team, createValidSpriteContext({
        submitting_tier: 1,
      }));
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('Tier 2');
      }
    });

    it('accepts Tier 2 user with custom sprite', () => {
      const spriteId = '550e8400-e29b-41d4-a716-446655440000';
      const team = createValidTeamSubmission({
        team: [createValidFakemon({ sprite_id: spriteId })],
      });
      
      const context = createValidSpriteContext({
        submitting_tier: 2,
        sprites: new Map([[spriteId, { is_approved: true, owner_discord_id: '123456789012345678' }]]),
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(true);
    });

    it('rejects sprite that is not approved', () => {
      const spriteId = '550e8400-e29b-41d4-a716-446655440000';
      const team = createValidTeamSubmission({
        team: [createValidFakemon({ sprite_id: spriteId })],
      });
      
      const context = createValidSpriteContext({
        sprites: new Map([[spriteId, { is_approved: false, owner_discord_id: '123456789012345678' }]]),
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('pending moderation');
      }
    });

    it('rejects sprite that does not belong to user', () => {
      const spriteId = '550e8400-e29b-41d4-a716-446655440000';
      const team = createValidTeamSubmission({
        team: [createValidFakemon({ sprite_id: spriteId })],
      });
      
      const context = createValidSpriteContext({
        sprites: new Map([[spriteId, { is_approved: true, owner_discord_id: '999999999999999999' }]]),
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('does not belong to your account');
      }
    });

    it('rejects non-existent sprite ID', () => {
      const spriteId = '550e8400-e29b-41d4-a716-446655440000';
      const team = createValidTeamSubmission({
        team: [createValidFakemon({ sprite_id: spriteId })],
      });
      
      const context = createValidSpriteContext({
        sprites: new Map(), // Empty - sprite doesn't exist
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations[0]).toContain('was not found');
      }
    });

    it('rejects Tier 2 user exceeding 5 sprite slot limit', () => {
      const spriteIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
        '550e8400-e29b-41d4-a716-446655440005', // 6th sprite - over limit
      ];
      
      const team = createValidTeamSubmission({
        team: spriteIds.map(id => createValidFakemon({ sprite_id: id })),
      });
      
      const spritesMap = new Map(
        spriteIds.map(id => [id, { is_approved: true, owner_discord_id: '123456789012345678' }])
      );
      
      const context = createValidSpriteContext({
        submitting_tier: 2,
        used_sprite_slots: 0,
        sprites: spritesMap,
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations.some(v => v.includes('5 custom sprite slots'))).toBe(true);
      }
    });

    it('accepts Tier 2 user at exactly 5 sprite slots', () => {
      const spriteIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
        '550e8400-e29b-41d4-a716-446655440002',
        '550e8400-e29b-41d4-a716-446655440003',
        '550e8400-e29b-41d4-a716-446655440004',
      ];
      
      const team = createValidTeamSubmission({
        team: spriteIds.map(id => createValidFakemon({ sprite_id: id })),
      });
      
      const spritesMap = new Map(
        spriteIds.map(id => [id, { is_approved: true, owner_discord_id: '123456789012345678' }])
      );
      
      const context = createValidSpriteContext({
        submitting_tier: 2,
        used_sprite_slots: 0,
        sprites: spritesMap,
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(true);
    });

    it('rejects Tier 2 user when new team would exceed limit', () => {
      const spriteIds = [
        '550e8400-e29b-41d4-a716-446655440000',
        '550e8400-e29b-41d4-a716-446655440001',
      ];
      
      const team = createValidTeamSubmission({
        team: spriteIds.map(id => createValidFakemon({ sprite_id: id })),
      });
      
      const spritesMap = new Map(
        spriteIds.map(id => [id, { is_approved: true, owner_discord_id: '123456789012345678' }])
      );
      
      const context = createValidSpriteContext({
        submitting_tier: 2,
        used_sprite_slots: 4, // Already using 4, trying to add 2 more = 6 total
        sprites: spritesMap,
      });
      
      const result = validateTeam(team, context);
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.violations.some(v => v.includes('exceed your limit'))).toBe(true);
      }
    });
  });

  describe('Edge Cases and Comprehensive Tests', () => {
    it('accepts team with all valid Fakemon (6 member team)', () => {
      const team = createValidTeamSubmission({
        team: Array(6).fill(null).map((_, i) => 
          createValidFakemon({ 
            name: `Fakemon${i}`,
            nickname: `Mono${i}`,
          })
        ),
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(true);
    });

    it('rejects multiple violation types in single team', () => {
      const team = createValidTeamSubmission({
        team: [
          createValidFakemon({ 
            name: 'WG1', 
            ability: 'Wonder Guard',
            stats: { hp: 200, atk: 200, def: 200, spa: 200, spd: 200, spe: 200 } // 1200 BST
          }),
          createValidFakemon({ 
            name: 'NG1', 
            ability: 'No Guard',
            moves: ['Sheer Cold', 'A', 'B', 'C']
          }),
        ],
      });
      
      const result = validateTeam(team, createValidSpriteContext());
      
      expect(result.valid).toBe(false);
      if (!result.valid) {
        // Should have multiple violations
        expect(result.violations.length).toBeGreaterThanOrEqual(2);
        expect(result.violations.some(v => v.includes('Wonder Guard'))).toBe(true);
        expect(result.violations.some(v => v.includes('exceeds the 680 cap'))).toBe(true);
        expect(result.violations.some(v => v.includes('No Guard'))).toBe(true);
      }
    });

    it('handles empty team (should fail at Zod level, but validateTeam accepts 1-6)', () => {
      const team = createValidTeamSubmission({
        team: [],
      });
      
      // This would typically be caught by Zod schema validation first
      // but we test validateTeam's behavior anyway
      const result = validateTeam(team, createValidSpriteContext());
      
      // Empty team is acceptable at validateTeam level (Zod catches this)
      expect(result.valid).toBe(true);
    });
  });
});

describe('packTeam() helper', () => {
  it('generates valid Showdown pack string format', () => {
    const team = createValidTeamSubmission({
      team: [createValidFakemon({
        nickname: 'TestMon',
        name: 'Abomination',
        item: 'Choice Scarf',
        ability: 'Speed Boost',
        moves: ['Flare Blitz', 'Shadow Ball', 'Protect', 'Swords Dance'],
        types: ['Fire', 'Ghost'] as ['Fire', 'Ghost'],
        stats: { hp: 80, atk: 150, def: 60, spa: 90, spd: 60, spe: 240 },
      })],
    });
    
    // Note: packTeam is not exported, but packFakemon is internal
    // This test documents the expected format
    // In practice, you'd test the packedTeam string from validateTeam result
    
    const result = validateTeam(team, createValidSpriteContext());
    
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.packedTeam).toContain('TestMon');
      expect(result.packedTeam).toContain('Abomination');
      expect(result.packedTeam).toContain('Fire/Ghost');
    }
  });
});