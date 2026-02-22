import { MonsterDef } from './monsters/defs';
import {
  hasTag,
  CAN_FLY,
  CAN_REGENERATE,
  CAN_USE_WEAPONS,
  AMORPHOUS,
  RARITY_COMMON,
  RARITY_UNCOMMON,
  RARITY_RARE,
  RARITY_UNIQUE,
} from './tags';

// ── Monster Difficulty ──────────────────────────────────
// Computed from stats so adding a strong monster automatically
// gives it high difficulty. No manual assignment needed.

export function computeDifficulty(def: MonsterDef): number {
  // Allow manual override for edge cases
  if (def.props.difficultyOverride != null) {
    return def.props.difficultyOverride;
  }

  let diff = 0;

  // Core combat stats — scaled so a basic zombie (~30HP, 8dmg, 60spd) lands around difficulty 3
  diff += def.health / 20;       // 30 HP → 1.5, 100 HP → 5
  diff += def.damage * 0.25;     // 8 dmg → 2, 20 dmg → 5
  diff += def.speed / 80;        // 60 spd → 0.75, 120 spd → 1.5
  diff += def.weight * 0.25;     // heavier = harder to knock around

  // Ability bonuses
  for (const ability of def.abilities ?? []) {
    diff += 2;
    if (ability.damage) diff += ability.damage * 0.3;
  }

  // Capability bonuses
  if (hasTag(def.tags, CAN_FLY)) diff += 2;
  if (hasTag(def.tags, CAN_REGENERATE)) diff += 2;
  if (hasTag(def.tags, CAN_USE_WEAPONS)) diff += 1;
  if (hasTag(def.tags, AMORPHOUS)) diff += 1;

  // Resistance bonus: being resistant to common damage types
  // Offset by vulnerabilities — a monster with both resists and weaknesses is less dangerous
  for (const mult of Object.values(def.vulnerabilities)) {
    if (mult < 1.0) diff += (1 - mult);       // 0.5 resist → +0.5
    else if (mult > 1.0) diff -= (mult - 1) * 0.25; // 2.0 weakness → -0.25
  }

  return Math.round(diff);
}

// ── XP Reward ───────────────────────────────────────────
// Quadratic scaling: harder monsters are disproportionately rewarding.

export function computeXPReward(difficulty: number): number {
  return 1 + difficulty * difficulty;
}

// ── Player Leveling ─────────────────────────────────────

// XP thresholds — cumulative XP needed to reach each level.
// Roughly doubles each level, matching NetHack's exponential curve.
// Index = level (level 1 = 0 XP needed).
const LEVEL_THRESHOLDS: number[] = [
  0,         // level 1 (start)
  20,        // level 2
  40,        // level 3
  80,        // level 4
  160,       // level 5
  320,       // level 6
  640,       // level 7
  1280,      // level 8
  2560,      // level 9
  5120,      // level 10
  10000,     // level 11
  20000,     // level 12
  40000,     // level 13
  80000,     // level 14
  160000,    // level 15
  320000,    // level 16
  640000,    // level 17
  1280000,   // level 18
  2560000,   // level 19
  5120000,   // level 20
];

export const MAX_LEVEL = LEVEL_THRESHOLDS.length;

export function getXPForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level > LEVEL_THRESHOLDS.length) return Infinity;
  return LEVEL_THRESHOLDS[level - 1]!;
}

export function getXPForNextLevel(level: number): number {
  return getXPForLevel(level + 1);
}

// Level-up bonuses

export interface LevelUpResult {
  newLevel: number;
  hpGain: number;
}

/**
 * Check if the player has enough XP to level up.
 * hpDie: max random HP per level (from role def, e.g. 10 for warrior)
 * conBonus: CON HP bonus per level (from attributes)
 */
export function checkLevelUp(xp: number, currentLevel: number, hpDie: number, conBonus: number): LevelUpResult | null {
  if (currentLevel >= MAX_LEVEL) return null;

  const nextThreshold = getXPForNextLevel(currentLevel);
  if (xp < nextThreshold) return null;

  const newLevel = currentLevel + 1;
  // Random HP roll: 1 to hpDie, plus CON bonus (minimum 1 HP per level)
  const roll = 1 + Math.floor(Math.random() * hpDie);
  const hpGain = Math.max(1, roll + conBonus);
  return { newLevel, hpGain };
}

// ── Monster / Pet Leveling ─────────────────────────────
// NetHack-style: monsters level up by killing. HP grows,
// species stats (damage, speed) stay fixed.

const MONSTER_XP_PER_LEVEL = 30; // XP threshold per level

export function monsterXPForKill(victimDifficulty: number): number {
  return 5 + victimDifficulty * 3;
}

export interface MonsterLevelUpResult {
  newLevel: number;
  hpGain: number;
}

export function checkMonsterLevelUp(xp: number, currentLevel: number, baseDifficulty: number): MonsterLevelUpResult | null {
  const cap = Math.max(5, Math.floor(baseDifficulty * 2.5));
  if (currentLevel >= cap) return null;

  const threshold = currentLevel * MONSTER_XP_PER_LEVEL;
  if (xp < threshold) return null;

  const newLevel = currentLevel + 1;
  // HP gain: 1 to (currentLevel + 1)
  const hpGain = 1 + Math.floor(Math.random() * (currentLevel + 1));
  return { newLevel, hpGain };
}

// ── Spawn Eligibility ───────────────────────────────────
// NetHack-style: floor dominates, player level is secondary.

export function getEligibleMonsters(
  allMonsters: MonsterDef[],
  floorLevel: number,
  playerLevel: number,
  branch: string,
): MonsterDef[] {
  const maxDifficulty = floorLevel + Math.floor(playerLevel / 2) + 3; // floor-dominant, generous early
  const minDifficulty = Math.max(0, Math.floor(floorLevel / 6));

  return allMonsters.filter(def => {
    const diff = def.difficulty ?? 0;

    // Difficulty range
    if (diff > maxDifficulty) return false;
    if (diff < minDifficulty) return false;

    // Floor range
    const floorMin = def.props.spawnFloorMin ?? 1;
    const floorMax = def.props.spawnFloorMax ?? Infinity;
    if (floorLevel < floorMin || floorLevel > floorMax) return false;

    // Branch filter — if monster has branch tags, must match
    const branchTags = def.tags.filter(t => t.startsWith('branch:'));
    if (branchTags.length > 0 && !hasTag(def.tags, `branch:${branch}`)) return false;

    return true;
  });
}

// ── Rarity-Weighted Selection ───────────────────────────

const RARITY_WEIGHTS: { tag: string; weight: number }[] = [
  { tag: RARITY_COMMON, weight: 4 },
  { tag: RARITY_UNCOMMON, weight: 2 },
  { tag: RARITY_RARE, weight: 1 },
  { tag: RARITY_UNIQUE, weight: 0 }, // uniques use special spawn rules
];

export function pickWeightedMonster(eligible: MonsterDef[]): MonsterDef | null {
  if (eligible.length === 0) return null;

  // Build weighted list
  const weighted: { def: MonsterDef; weight: number }[] = [];
  for (const def of eligible) {
    let w = 1; // default if no rarity tag
    for (const rw of RARITY_WEIGHTS) {
      if (hasTag(def.tags, rw.tag)) {
        w = rw.weight;
        break;
      }
    }
    if (w > 0) weighted.push({ def, weight: w });
  }

  if (weighted.length === 0) return null;

  const totalWeight = weighted.reduce((sum, e) => sum + e.weight, 0);
  let roll = Math.random() * totalWeight;

  for (const entry of weighted) {
    roll -= entry.weight;
    if (roll <= 0) return entry.def;
  }

  return weighted[weighted.length - 1]!.def;
}
