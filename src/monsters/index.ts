import { MonsterDef } from './defs';
import { UNDEAD_MONSTERS } from './undead';
import { BEAST_MONSTERS } from './beasts';
import { HUMANOID_MONSTERS } from './humanoid';
import { SPECIAL_MONSTERS } from './special';
import { computeDifficulty, getEligibleMonsters } from '../progression';

// ── All monster definitions ─────────────────────────────
const ALL_MONSTERS: MonsterDef[] = [
  ...UNDEAD_MONSTERS,
  ...BEAST_MONSTERS,
  ...HUMANOID_MONSTERS,
  ...SPECIAL_MONSTERS,
];

// ── Registry (built at module load time) ────────────────
const BY_ID = new Map<string, MonsterDef>();

for (const def of ALL_MONSTERS) {
  if (BY_ID.has(def.id)) {
    throw new Error(`Duplicate monster ID: ${def.id}`);
  }
  // Compute and cache difficulty
  def.difficulty = computeDifficulty(def);
  BY_ID.set(def.id, def);
}

export function getMonsterDef(id: string): MonsterDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown monster ID: ${id}`);
  return def;
}

export function getAllMonsters(): MonsterDef[] {
  return ALL_MONSTERS;
}

export function getMonstersForFloor(floor: number, branch: string, playerLevel: number = 1): MonsterDef[] {
  return getEligibleMonsters(ALL_MONSTERS, floor, playerLevel, branch);
}
