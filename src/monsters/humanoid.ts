import { MonsterDef } from './defs';
import { PAL } from '../palette';
import {
  HUMANOID_TAGS,
  SENTIENT, CAN_HEAR, CAN_USE_WEAPONS,
  SIZE_SMALL, SIZE_LARGE,
  AI_CHASE, AI_PATROL, AI_FLEE_WHEN_HURT, AI_BERSERKER,
  ALIGN_LAWFUL, ALIGN_CHAOTIC,
  RARITY_COMMON, RARITY_UNCOMMON, RARITY_RARE,
  PACK_SPAWN,
  HAS_HEAD, HAS_HANDS, HAS_LEGS, HUMANOID, CAN_OPEN_DOORS,
} from '../tags';

const SMALL_HUMANOID = [HUMANOID, HAS_HEAD, HAS_HANDS, HAS_LEGS, CAN_OPEN_DOORS, SIZE_SMALL];

export const HUMANOID_MONSTERS: MonsterDef[] = [
  // ── Kobold ────────────────────────────────────────────
  // Weak, chaotic. Spawns in packs.
  {
    id: 'kobold',
    name: 'kobold',
    color: PAL.kobold,
    health: 8,
    speed: 90,
    damage: 3,
    weight: 0.4,
    vulnerabilities: {},
    tags: [...SMALL_HUMANOID, SENTIENT, CAN_HEAR, ALIGN_CHAOTIC,
      AI_CHASE, AI_FLEE_WHEN_HURT, RARITY_COMMON, PACK_SPAWN],
    props: {
      contactCooldown: 700,
      spawnFloorMin: 1,
      spawnFloorMax: 6,
      fleeThreshold: 0.25,
      groupSizeMin: 2,
      groupSizeMax: 4,
    },
  },

  // ── Large Kobold ──────────────────────────────────────
  {
    id: 'large_kobold',
    name: 'large kobold',
    color: PAL.largeKobold,
    health: 14,
    speed: 85,
    damage: 5,
    weight: 0.6,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, ALIGN_CHAOTIC,
      AI_CHASE, AI_FLEE_WHEN_HURT, RARITY_UNCOMMON],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 3,
      spawnFloorMax: 8,
      fleeThreshold: 0.2,
    },
  },

  // ── Gnome ─────────────────────────────────────────────
  // Lawful, sentient. Peaceful to lawful players.
  // Common in the Gnomish Mines.
  {
    id: 'gnome',
    name: 'gnome',
    color: PAL.gnome,
    health: 16,
    speed: 80,
    damage: 4,
    weight: 0.7,
    vulnerabilities: {},
    tags: [...SMALL_HUMANOID, SENTIENT, CAN_HEAR, CAN_USE_WEAPONS, ALIGN_LAWFUL,
      AI_PATROL, AI_CHASE, RARITY_COMMON, 'branch:mines'],
    props: {
      contactCooldown: 900,
      spawnFloorMin: 1,
      spawnFloorMax: 10,
    },
  },

  // ── Gnome Lord ────────────────────────────────────────
  {
    id: 'gnome_lord',
    name: 'gnome lord',
    color: PAL.gnomeLord,
    health: 28,
    speed: 85,
    damage: 7,
    weight: 0.9,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, CAN_USE_WEAPONS, ALIGN_LAWFUL,
      AI_PATROL, AI_CHASE, RARITY_UNCOMMON, 'branch:mines'],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 3,
      spawnFloorMax: 12,
    },
  },

  // ── Orc ───────────────────────────────────────────────
  // Chaotic, aggressive.
  {
    id: 'orc',
    name: 'orc',
    color: PAL.orc,
    health: 20,
    speed: 90,
    damage: 6,
    weight: 1.0,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, CAN_USE_WEAPONS, ALIGN_CHAOTIC,
      AI_CHASE, RARITY_COMMON, PACK_SPAWN],
    props: {
      contactCooldown: 900,
      spawnFloorMin: 4,
      spawnFloorMax: 12,
      groupSizeMin: 2,
      groupSizeMax: 3,
    },
  },

  // ── Hill Orc ──────────────────────────────────────────
  {
    id: 'hill_orc',
    name: 'hill orc',
    color: PAL.hillOrc,
    health: 30,
    speed: 85,
    damage: 8,
    weight: 1.2,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, CAN_USE_WEAPONS, ALIGN_CHAOTIC,
      AI_CHASE, RARITY_UNCOMMON],
    props: {
      contactCooldown: 1000,
      spawnFloorMin: 6,
      spawnFloorMax: 15,
    },
  },

  // ── Orc Captain ───────────────────────────────────────
  {
    id: 'orc_captain',
    name: 'Orc-captain',
    color: PAL.orcCaptain,
    health: 45,
    speed: 90,
    damage: 10,
    weight: 1.4,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, CAN_USE_WEAPONS, ALIGN_CHAOTIC,
      AI_CHASE, AI_BERSERKER, RARITY_RARE],
    props: {
      contactCooldown: 900,
      spawnFloorMin: 8,
      spawnFloorMax: 18,
      berserkerThreshold: 0.35,
    },
  },

  // ── Dwarf ─────────────────────────────────────────────
  // Lawful, sentient. Peaceful to lawful players.
  {
    id: 'dwarf',
    name: 'dwarf',
    color: PAL.dwarf,
    health: 25,
    speed: 75,
    damage: 7,
    weight: 1.1,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, CAN_USE_WEAPONS, ALIGN_LAWFUL,
      AI_PATROL, AI_CHASE, RARITY_UNCOMMON, 'branch:mines'],
    props: {
      contactCooldown: 1000,
      spawnFloorMin: 3,
      spawnFloorMax: 12,
    },
  },

  // ── Hobgoblin ─────────────────────────────────────────
  // Chaotic, medium strength.
  {
    id: 'hobgoblin',
    name: 'hobgoblin',
    color: PAL.hobgoblin,
    health: 18,
    speed: 95,
    damage: 5,
    weight: 0.9,
    vulnerabilities: {},
    tags: [...HUMANOID_TAGS, SENTIENT, CAN_HEAR, ALIGN_CHAOTIC,
      AI_CHASE, RARITY_COMMON],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 3,
      spawnFloorMax: 10,
    },
  },

  // ── Bugbear ───────────────────────────────────────────
  // Large, strong. Chaotic.
  {
    id: 'bugbear',
    name: 'bugbear',
    color: PAL.bugbear,
    health: 35,
    speed: 80,
    damage: 9,
    weight: 1.3,
    vulnerabilities: {},
    tags: [HUMANOID, HAS_HEAD, HAS_HANDS, HAS_LEGS, CAN_OPEN_DOORS, SIZE_LARGE,
      SENTIENT, CAN_HEAR, ALIGN_CHAOTIC,
      AI_CHASE, RARITY_UNCOMMON],
    props: {
      contactCooldown: 1000,
      spawnFloorMin: 5,
      spawnFloorMax: 14,
    },
  },
];
