// ── Status Effects ───────────────────────────────────────
// Defined separately from types.ts to avoid circular imports
// (MonsterDef references these, and types.ts re-exports MonsterDef).

export enum StatusEffectType {
  PARALYZED = 'paralyzed',  // Can't move; fixed duration
  POISONED  = 'poisoned',   // Damage over time; fixed duration
  SLOWED    = 'slowed',     // Reduced movement speed; fixed duration
  IN_PIT    = 'in_pit',     // Stuck in pit; escape via DEX check each second
  BLINDED   = 'blinded',    // No FOV; explored map still visible; fixed duration
}

export interface StatusEffect {
  type:           StatusEffectType;
  duration:       number;  // ms remaining (for PARALYZED, POISONED, SLOWED)
  magnitude:      number;  // damage per tick (POISONED); unused otherwise
  tickTimer:      number;  // ms until next poison tick
  pitEscapeTimer: number;  // ms until next DEX escape roll (IN_PIT only)
}
