import { MonsterDef } from './defs';
import { DamageType } from '../types';
import { PAL } from '../palette';
import { StatusEffectType } from '../status';
import {
  BEAST, HAS_HEAD, HAS_LEGS, HAS_WINGS,
  SIZE_TINY, SIZE_SMALL, SIZE_MEDIUM,
  AI_CHASE, AI_PATROL,
  RARITY_COMMON, RARITY_UNCOMMON,
  MINDLESS, CAN_HEAR, CAN_FLY, KEEN_HEARING,
  PACK_SPAWN,
} from '../tags';

const TINY_BEAST = [BEAST, HAS_HEAD, HAS_LEGS, SIZE_TINY, MINDLESS, CAN_HEAR];
const SMALL_BEAST = [BEAST, HAS_HEAD, HAS_LEGS, SIZE_SMALL, MINDLESS, CAN_HEAR];
const MEDIUM_BEAST = [BEAST, HAS_HEAD, HAS_LEGS, SIZE_MEDIUM, MINDLESS, CAN_HEAR];

export const BEAST_MONSTERS: MonsterDef[] = [
  // ── Grid Bug ──────────────────────────────────────────
  // Tiny, very weak. NetHack classic.
  {
    id: 'grid_bug',
    name: 'grid bug',
    color: PAL.gridBug,
    health: 4,
    speed: 50,
    damage: 1,
    weight: 0.1,
    vulnerabilities: {},
    tags: [...TINY_BEAST, AI_CHASE, RARITY_COMMON],
    props: {
      contactCooldown: 600,
      spawnFloorMin: 1,
      spawnFloorMax: 3,
    },
  },

  // ── Newt ──────────────────────────────────────────────
  // Tiny, harmless. Good early XP.
  {
    id: 'newt',
    name: 'newt',
    color: PAL.newt,
    health: 3,
    speed: 40,
    damage: 1,
    weight: 0.1,
    vulnerabilities: {},
    tags: [...TINY_BEAST, AI_PATROL, RARITY_COMMON],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 1,
      spawnFloorMax: 3,
    },
  },

  // ── Jackal ────────────────────────────────────────────
  // Pack animal, fast but fragile.
  {
    id: 'jackal',
    name: 'jackal',
    color: PAL.jackal,
    health: 8,
    speed: 110,
    damage: 2,
    weight: 0.4,
    vulnerabilities: {},
    tags: [...SMALL_BEAST, AI_CHASE, RARITY_COMMON, PACK_SPAWN, KEEN_HEARING],
    props: {
      contactCooldown: 700,
      spawnFloorMin: 1,
      spawnFloorMax: 5,
      groupSizeMin: 2,
      groupSizeMax: 4,
    },
  },

  // ── Sewer Rat ─────────────────────────────────────────
  {
    id: 'sewer_rat',
    name: 'sewer rat',
    color: PAL.sewerRat,
    health: 6,
    speed: 90,
    damage: 2,
    weight: 0.3,
    vulnerabilities: {},
    tags: [...SMALL_BEAST, AI_CHASE, RARITY_COMMON, PACK_SPAWN],
    props: {
      contactCooldown: 600,
      spawnFloorMin: 1,
      spawnFloorMax: 5,
      groupSizeMin: 2,
      groupSizeMax: 4,
    },
  },

  // ── Giant Rat ─────────────────────────────────────────
  {
    id: 'giant_rat',
    name: 'giant rat',
    color: PAL.giantRat,
    health: 12,
    speed: 80,
    damage: 3,
    weight: 0.6,
    vulnerabilities: {},
    tags: [...SMALL_BEAST, AI_CHASE, RARITY_COMMON],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 2,
      spawnFloorMax: 7,
    },
  },

  // ── Bat ───────────────────────────────────────────────
  // Flying, erratic. Hard to hit.
  {
    id: 'bat',
    name: 'bat',
    color: PAL.bat,
    health: 6,
    speed: 130,
    damage: 2,
    weight: 0.2,
    vulnerabilities: {
      [DamageType.BLUNT]: 1.5,
    },
    tags: [BEAST, HAS_HEAD, HAS_WINGS, SIZE_TINY, MINDLESS, CAN_HEAR, KEEN_HEARING,
      CAN_FLY, AI_CHASE, RARITY_COMMON],
    props: {
      contactCooldown: 500,
      spawnFloorMin: 1,
      spawnFloorMax: 8,
    },
  },

  // ── Giant Bat ─────────────────────────────────────────
  {
    id: 'giant_bat',
    name: 'giant bat',
    color: PAL.giantBat,
    health: 14,
    speed: 120,
    damage: 4,
    weight: 0.5,
    vulnerabilities: {
      [DamageType.BLUNT]: 1.5,
    },
    tags: [BEAST, HAS_HEAD, HAS_WINGS, SIZE_SMALL, MINDLESS, CAN_HEAR, KEEN_HEARING,
      CAN_FLY, AI_CHASE, RARITY_UNCOMMON],
    props: {
      contactCooldown: 600,
      spawnFloorMin: 3,
      spawnFloorMax: 12,
    },
  },

  // ── Wolf ──────────────────────────────────────────────
  // Fast, strong pack hunter.
  {
    id: 'wolf',
    name: 'wolf',
    color: PAL.wolf,
    health: 18,
    speed: 120,
    damage: 5,
    weight: 0.8,
    vulnerabilities: {},
    tags: [...MEDIUM_BEAST, KEEN_HEARING, AI_CHASE, RARITY_UNCOMMON, PACK_SPAWN],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 3,
      spawnFloorMax: 10,
      groupSizeMin: 2,
      groupSizeMax: 3,
    },
  },

  // ── Cave Spider ───────────────────────────────────────
  // Ambush predator, waits in the dark.
  {
    id: 'cave_spider',
    name: 'cave spider',
    color: PAL.caveSpider,
    health: 8,
    speed: 100,
    damage: 4,
    weight: 0.3,
    vulnerabilities: {
      [DamageType.BLUNT]: 2.0,
    },
    tags: [BEAST, HAS_HEAD, HAS_LEGS, SIZE_SMALL, MINDLESS, AI_CHASE,
      RARITY_COMMON, 'branch:mines'],
    props: {
      contactCooldown: 600,
      spawnFloorMin: 1,
      spawnFloorMax: 8,
    },
  },

  // ── Snake ─────────────────────────────────────────────
  {
    id: 'snake',
    name: 'snake',
    color: PAL.snake,
    health: 8,
    speed: 90,
    damage: 3,
    weight: 0.3,
    vulnerabilities: {
      [DamageType.SLASH]: 1.5,
    },
    tags: [BEAST, HAS_HEAD, SIZE_SMALL, MINDLESS, CAN_HEAR, AI_PATROL, AI_CHASE, RARITY_COMMON],
    props: {
      contactCooldown: 700,
      spawnFloorMin: 2,
      spawnFloorMax: 8,
    },
  },

  // ── Pit Viper ─────────────────────────────────────────
  {
    id: 'pit_viper',
    name: 'pit viper',
    color: PAL.pitViper,
    health: 14,
    speed: 100,
    damage: 6,
    weight: 0.5,
    vulnerabilities: {
      [DamageType.SLASH]: 1.5,
    },
    tags: [BEAST, HAS_HEAD, SIZE_SMALL, MINDLESS, CAN_HEAR, AI_CHASE, RARITY_UNCOMMON],
    props: {
      contactCooldown: 600,
      spawnFloorMin: 4,
      spawnFloorMax: 12,
    },
    onPlayerContactHit: {
      type: StatusEffectType.POISONED,
      chance: 0.6,
      duration: 10000,
      magnitude: 2,
    },
  },
];
