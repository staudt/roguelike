import { MonsterDef } from './defs';
import { DamageType } from '../types';
import { PAL } from '../palette';
import { StatusEffectType } from '../status';
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
  // Passive patrol creature. Harmless on contact, but if you strike it with
  // melee and it SURVIVES, its gaze immediately paralyzes you. The trick is to
  // one-shot it, use ranged attacks, or avoid it entirely.
  {
    id: 'floating_eye',
    name: 'floating eye',
    color: PAL.floatingEye,
    health: 22,
    speed: 20,
    damage: 0,
    weight: 0.1,
    vulnerabilities: {
      // Mildly resistant to all physical — forces multiple hits and more exposure to gaze
      [DamageType.SLASH]:  0.75,
      [DamageType.THRUST]: 0.75,
      [DamageType.BLUNT]:  0.75,
    },
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
    onPlayerMeleeHit: {
      type: StatusEffectType.PARALYZED,
      chance: 1.0,
      duration: 3000,
    },
    // Rare — eating eventually grants telepathy (future mechanic)
    drops: [{ itemId: 'corpse_floating_eye', chance: 0.05 }],
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
  // Fast-moving energy creature. Blinds on contact — its burst of light
  // overwhelms your vision for several seconds, leaving you stumbling in fog.
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
    // Striking a yellow light with melee always blinds — even the killing blow
    onPlayerMeleeHit: {
      type: StatusEffectType.BLINDED,
      chance: 1.0,
      duration: 6000,
      alwaysTriggers: true,
    },
    onPlayerContactHit: {
      type: StatusEffectType.BLINDED,
      chance: 0.8,
      duration: 6000,
    },
  },
];
