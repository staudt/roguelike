import { DamageType } from '../types';

// ── Item Categories ─────────────────────────────────────

export type ItemCategory = 'weapon' | 'armor' | 'consumable';

// ── Base Item Definition ────────────────────────────────
// All items share these fields. Category-specific fields
// are on the subtypes below.

export interface ItemDef {
  id: string;
  name: string;
  category: ItemCategory;
  weight: number;          // affects carrying capacity (future)
  value: number;           // base shop value (future)
  description?: string;
}

// ── Weapon Definition ───────────────────────────────────

export interface WeaponDef extends ItemDef {
  category: 'weapon';
  damageType: DamageType;
  baseDamage: number;
  maxDurability: number;
  range: number;           // pixels — hitbox reach
  cooldown: number;        // ms between attacks
  attackDuration: number;  // ms — hitbox lifespan
  noiseRadius?: number;    // tiles — how far the sound carries (future sound system)
}

// ── Armor Definition ────────────────────────────────────

export interface ArmorDef extends ItemDef {
  category: 'armor';
  slot: 'body' | 'head' | 'hands' | 'feet';
  defense: number;         // flat damage reduction
  maxDurability: number;
}

// ── Consumable Definition ───────────────────────────────

export interface ConsumableDef extends ItemDef {
  category: 'consumable';
  effect: string;          // 'heal' | 'repair' | 'buff' | etc.
  magnitude: number;       // e.g., HP healed, damage buffed
}

// ── Item Instance ───────────────────────────────────────
// A specific item in the world or inventory.
// Mutable state (durability) lives here, not on the def.

export interface ItemInstance {
  instanceId: number;      // unique per instance
  defId: string;           // references ItemDef.id
  durability?: number;     // current durability (weapons/armor)
  quantity?: number;        // for stackable items (consumables)
}
