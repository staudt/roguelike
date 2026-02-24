import { DamageType } from '../types';
import { StatusEffectType } from '../status';

// ── Ability ─────────────────────────────────────────────
// Structured because abilities need typed fields for the
// combat system to execute them.

export interface Ability {
  name: string;
  cooldown: number;       // ms
  range: number;          // tiles
  type: string;           // 'ranged_projectile' | 'melee_slam' | 'drain_life' | etc.
  damage?: number;
  damageType?: DamageType;
  duration?: number;      // ms, for buffs/debuffs
}

// ── MonsterDef ──────────────────────────────────────────
// Minimal fixed fields + open-ended tags + numeric props bag.
// Adding new features = adding tags/props, never changing this interface.

export interface MonsterDef {
  id: string;
  name: string;
  color: string;

  // Core stats — every monster has these
  health: number;
  speed: number;
  damage: number;
  weight: number;
  vulnerabilities: Partial<Record<DamageType, number>>;

  // Open-ended tags — body, capabilities, AI, nature, size, rarity
  tags: string[];

  // Numeric properties bag — contactCooldown, detectionRange, etc.
  props: Record<string, number>;

  // Computed at registry load time
  difficulty?: number;

  // Special attacks / abilities
  abilities?: Ability[];

  // Status effect applied to PLAYER when player's melee attack connects.
  // By default only triggers if the monster survives the hit.
  // Set alwaysTriggers: true to also fire on the killing blow.
  onPlayerMeleeHit?: { type: StatusEffectType; chance: number; duration: number; magnitude?: number; alwaysTriggers?: boolean };

  // Status effect applied to PLAYER when this monster deals contact damage
  onPlayerContactHit?: { type: StatusEffectType; chance: number; duration: number; magnitude?: number };

  // Loot / equipment
  drops?: { itemId: string; chance: number }[];
  equipment?: { weapon?: string; armor?: string };
}
