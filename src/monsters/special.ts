import { MonsterDef } from './defs';
import { DamageType } from '../types';
import { PAL } from '../palette';
import {
  AMORPHOUS,
  MINDLESS, ALWAYS_HOSTILE,
  AI_PATROL, AI_CHASE,
  CAN_HEAR,
  DEAF,
  SIZE_TINY, SIZE_SMALL,
  RARITY_COMMON, RARITY_UNCOMMON,
} from '../tags';

export const SPECIAL_MONSTERS: MonsterDef[] = [
  // ── Floating Eye ────────────────────────────────────────
  // Passive until attacked. Paralyzes on contact (gaze).
  // Very low damage, but stun makes it dangerous near other monsters.
  {
    id: 'floating_eye',
    name: 'floating eye',
    color: PAL.floatingEye,
    health: 10,
    speed: 20,
    damage: 0,
    weight: 0.1,
    vulnerabilities: {},
    tags: [
      AMORPHOUS, MINDLESS, ALWAYS_HOSTILE,
      SIZE_SMALL,
      AI_PATROL,
      DEAF,
      RARITY_UNCOMMON,
    ],
    props: {
      contactCooldown: 2000,
      spawnFloorMin: 1,
      spawnFloorMax: 10,
    },
  },

  // ── Lichen ──────────────────────────────────────────────
  // Stationary plant-like fungus. Very slow, very weak.
  // Basically a free kill for early-game XP.
  {
    id: 'lichen',
    name: 'lichen',
    color: PAL.lichen,
    health: 12,
    speed: 5,
    damage: 2,
    weight: 0.2,
    vulnerabilities: {
      [DamageType.SLASH]: 1.5,
    },
    tags: [
      AMORPHOUS, MINDLESS, ALWAYS_HOSTILE,
      SIZE_SMALL,
      AI_PATROL,
      DEAF,
      RARITY_COMMON,
    ],
    props: {
      contactCooldown: 1500,
      spawnFloorMin: 1,
      spawnFloorMax: 6,
    },
  },

  // ── Acid Blob ───────────────────────────────────────────
  // Damages equipment on contact (not yet implemented).
  // Resistant to everything except blunt.
  {
    id: 'acid_blob',
    name: 'acid blob',
    color: PAL.acidBlob,
    health: 18,
    speed: 30,
    damage: 4,
    weight: 0.5,
    vulnerabilities: {
      [DamageType.SLASH]: 0.5,
      [DamageType.THRUST]: 0.5,
      [DamageType.BLUNT]: 1.5,
    },
    tags: [
      AMORPHOUS, MINDLESS, ALWAYS_HOSTILE,
      SIZE_SMALL,
      AI_CHASE,
      CAN_HEAR,
      RARITY_UNCOMMON,
    ],
    props: {
      contactCooldown: 1000,
      spawnFloorMin: 4,
      spawnFloorMax: 14,
    },
  },

  // ── Yellow Light ────────────────────────────────────────
  // Fast-moving energy creature. Explodes on death (not yet implemented).
  // Very fragile, erratic movement.
  {
    id: 'yellow_light',
    name: 'yellow light',
    color: PAL.yellowLight,
    health: 5,
    speed: 140,
    damage: 3,
    weight: 0.05,
    vulnerabilities: {},
    tags: [
      AMORPHOUS, MINDLESS, ALWAYS_HOSTILE,
      SIZE_TINY,
      AI_PATROL,
      DEAF,
      RARITY_UNCOMMON,
    ],
    props: {
      contactCooldown: 600,
      spawnFloorMin: 2,
      spawnFloorMax: 10,
    },
  },
];
