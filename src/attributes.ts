// ── Player Attributes ──────────────────────────────────
// NetHack-style: only the player has ability scores.
// Monsters use species-level stats from MonsterDef.

export interface Attributes {
  str: number;
  dex: number;
  con: number;
  // Future: int, wis, cha — added when magic/shops/NPCs exist
}

// ── Bonus Tables ─────────────────────────────────────
// 5 tiers, simplified from NetHack's ~25-tier tables.

// STR → melee damage bonus
function strDamageBonus(str: number): number {
  if (str <= 7) return -1;
  if (str <= 12) return 0;
  if (str <= 15) return 1;
  if (str <= 18) return 3;
  return 6;
}

// DEX → attack speed multiplier (affects cooldown)
// Returns a multiplier: <1 = faster attacks, >1 = slower
function dexSpeedMult(dex: number): number {
  if (dex <= 7) return 1.15;   // 15% slower
  if (dex <= 12) return 1.0;
  if (dex <= 15) return 0.92;  // 8% faster
  if (dex <= 18) return 0.85;  // 15% faster
  return 0.75;                 // 25% faster
}

// CON → HP gain per level
function conHPBonus(con: number): number {
  if (con <= 7) return -1;
  if (con <= 12) return 0;
  if (con <= 15) return 1;
  if (con <= 18) return 2;
  return 3;
}

// ── Public API ──────────────────────────────────────

export function getSTRDamageBonus(attrs: Attributes): number {
  return strDamageBonus(attrs.str);
}

export function getDEXSpeedMult(attrs: Attributes): number {
  return dexSpeedMult(attrs.dex);
}

export function getCONHPBonus(attrs: Attributes): number {
  return conHPBonus(attrs.con);
}
