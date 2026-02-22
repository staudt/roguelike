import { MonsterDef } from './defs';
import { DamageType } from '../types';
import { PAL } from '../palette';
import {
  UNDEAD_HUMANOID_TAGS,
  AI_CHASE,
  AI_PATROL,
  RARITY_COMMON,
  RARITY_UNCOMMON,
  RARITY_RARE,
  CAN_HEAR,
  CAN_FLY,
  DEAF,
  MINDLESS,
  ALWAYS_HOSTILE,
  SIZE_MEDIUM,
  PACK_SPAWN,
} from '../tags';

export const UNDEAD_MONSTERS: MonsterDef[] = [
  // ── Zombie ──────────────────────────────────────────────
  // Slow, mindless. Vulnerable to slash, resistant to blunt.
  {
    id: 'zombie',
    name: 'zombie',
    color: PAL.zombie,
    health: 30,
    speed: 60,
    damage: 8,
    weight: 1.5,
    vulnerabilities: {
      [DamageType.SLASH]: 2.0,
      [DamageType.BLUNT]: 0.5,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      MINDLESS, ALWAYS_HOSTILE,
      AI_CHASE,
      CAN_HEAR,
      RARITY_COMMON,
      PACK_SPAWN,
    ],
    props: {
      contactCooldown: 1000,
      spawnFloorMin: 1,
      spawnFloorMax: 8,
      groupSizeMin: 1,
      groupSizeMax: 3,
    },
  },

  // ── Skeleton ────────────────────────────────────────────
  // Fast, fragile. Vulnerable to blunt, resistant to slash.
  {
    id: 'skeleton',
    name: 'skeleton',
    color: PAL.skeleton,
    health: 10,
    speed: 100,
    damage: 5,
    weight: 0.7,
    vulnerabilities: {
      [DamageType.SLASH]: 0.5,
      [DamageType.BLUNT]: 2.0,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      MINDLESS, ALWAYS_HOSTILE,
      AI_PATROL, AI_CHASE,
      DEAF,
      RARITY_COMMON,
    ],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 1,
      spawnFloorMax: 12,
      groupSizeMin: 1,
      groupSizeMax: 2,
    },
  },

  // ── Ghoul ───────────────────────────────────────────────
  // Paralysing touch (not implemented yet as ability, but
  // fast and aggressive). Mindless undead, always hostile.
  {
    id: 'ghoul',
    name: 'ghoul',
    color: PAL.ghoul,
    health: 25,
    speed: 90,
    damage: 7,
    weight: 1.0,
    vulnerabilities: {
      [DamageType.SLASH]: 1.5,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      MINDLESS, ALWAYS_HOSTILE,
      AI_CHASE,
      CAN_HEAR,
      RARITY_UNCOMMON,
    ],
    props: {
      contactCooldown: 900,
      spawnFloorMin: 3,
      spawnFloorMax: 12,
    },
  },

  // ── Wraith ──────────────────────────────────────────────
  // Incorporeal, drains life. Resistant to slash and thrust.
  {
    id: 'wraith',
    name: 'wraith',
    color: PAL.wraith,
    health: 20,
    speed: 100,
    damage: 6,
    weight: 0.3,
    vulnerabilities: {
      [DamageType.SLASH]: 0.5,
      [DamageType.THRUST]: 0.5,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      MINDLESS, ALWAYS_HOSTILE,
      CAN_FLY,
      AI_CHASE,
      CAN_HEAR,
      RARITY_RARE,
    ],
    props: {
      contactCooldown: 1200,
      spawnFloorMin: 6,
      spawnFloorMax: 18,
    },
  },

  // ── Mummy ───────────────────────────────────────────────
  // Slow, tough. Vulnerable to slash (bandages), resistant to thrust.
  {
    id: 'mummy',
    name: 'mummy',
    color: PAL.mummy,
    health: 50,
    speed: 55,
    damage: 10,
    weight: 1.8,
    vulnerabilities: {
      [DamageType.SLASH]: 1.5,
      [DamageType.THRUST]: 0.5,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      MINDLESS, ALWAYS_HOSTILE,
      AI_CHASE,
      CAN_HEAR,
      SIZE_MEDIUM,
      RARITY_RARE,
    ],
    props: {
      contactCooldown: 1200,
      spawnFloorMin: 8,
      spawnFloorMax: 20,
    },
  },
];
