// ── Tag System ──────────────────────────────────────────
// Open-ended string tags for monster traits, capabilities,
// AI behaviors, and spawn context. Adding a new tag is just
// adding a constant here — no interface changes needed.

// ── Body / Anatomy ──────────────────────────────────────
export const HAS_HEAD = 'has_head';
export const HAS_HANDS = 'has_hands';
export const HAS_LEGS = 'has_legs';
export const HAS_WINGS = 'has_wings';
export const HAS_TAIL = 'has_tail';

// ── Nature / Type ───────────────────────────────────────
export const UNDEAD = 'undead';
export const BEAST = 'beast';
export const HUMANOID = 'humanoid';
export const DEMON = 'demon';
export const CONSTRUCT = 'construct';
export const AMORPHOUS = 'amorphous';

// ── Capabilities ────────────────────────────────────────
export const CAN_OPEN_DOORS = 'can_open_doors';
export const CAN_PICK_UP = 'can_pick_up';
export const CAN_USE_WEAPONS = 'can_use_weapons';
export const CAN_SWIM = 'can_swim';
export const CAN_FLY = 'can_fly';
export const CAN_BURROW = 'can_burrow';
export const CAN_REGENERATE = 'can_regenerate';

// ── Senses ─────────────────────────────────────────────
export const CAN_HEAR = 'can_hear';
export const KEEN_HEARING = 'keen_hearing';    // 1.5x hearing range
export const DEAF = 'deaf';                    // explicit no-hearing

// ── Size ────────────────────────────────────────────────
export const SIZE_TINY = 'size:tiny';
export const SIZE_SMALL = 'size:small';
export const SIZE_MEDIUM = 'size:medium';
export const SIZE_LARGE = 'size:large';
export const SIZE_HUGE = 'size:huge';

// ── AI Behaviors (composable — a monster can have multiple) ──
export const AI_CHASE = 'ai:chase';
export const AI_PATROL = 'ai:patrol';
export const AI_AMBUSH = 'ai:ambush';
export const AI_COWARDLY = 'ai:cowardly';
export const AI_RANGED_KITE = 'ai:ranged_kite';
export const AI_FLEE_WHEN_HURT = 'ai:flee_when_hurt';
export const AI_PACK = 'ai:pack';
export const AI_GUARD = 'ai:guard';
export const AI_BERSERKER = 'ai:berserker';
export const AI_SUMMONER = 'ai:summoner';

// ── Alignment ──────────────────────────────────────────
export const ALIGN_LAWFUL = 'align:lawful';
export const ALIGN_NEUTRAL = 'align:neutral';
export const ALIGN_CHAOTIC = 'align:chaotic';

// ── Disposition (default stance toward player) ─────────
// Overridden at runtime by alignment/race checks for sentient monsters
export const DISPOSITION_HOSTILE = 'disposition:hostile';
export const DISPOSITION_INDIFFERENT = 'disposition:indifferent';
export const DISPOSITION_FRIENDLY = 'disposition:friendly';

// ── Sentience (only sentient monsters care about alignment/race) ──
export const SENTIENT = 'sentient';
export const MINDLESS = 'mindless';

// ── Spawn Context ───────────────────────────────────────
export const RARITY_COMMON = 'rarity:common';
export const RARITY_UNCOMMON = 'rarity:uncommon';
export const RARITY_RARE = 'rarity:rare';
export const RARITY_UNIQUE = 'rarity:unique';
export const BOSS = 'boss';
export const PACK_SPAWN = 'pack_spawn';
export const NOCTURNAL = 'nocturnal';

// ── Tag Presets ─────────────────────────────────────────
// Spread into tag arrays for convenience:
//   tags: [...HUMANOID_TAGS, AI_CHASE, RARITY_COMMON]

export const HUMANOID_TAGS = [HUMANOID, HAS_HEAD, HAS_HANDS, HAS_LEGS, CAN_OPEN_DOORS, SIZE_MEDIUM];
export const BEAST_TAGS = [BEAST, HAS_HEAD, HAS_LEGS, SIZE_MEDIUM];
export const UNDEAD_HUMANOID_TAGS = [...HUMANOID_TAGS, UNDEAD];

// ── Helpers ─────────────────────────────────────────────

export function hasTag(tags: readonly string[], tag: string): boolean {
  return tags.includes(tag);
}

export function hasTags(tags: readonly string[], ...required: string[]): boolean {
  return required.every(t => tags.includes(t));
}
