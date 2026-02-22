import { ItemDef, WeaponDef } from './defs';
import { WEAPONS } from './weapons';

// ── All item definitions ────────────────────────────────
const ALL_ITEMS: ItemDef[] = [
  ...WEAPONS,
];

// ── Registry (built at module load time) ────────────────
const BY_ID = new Map<string, ItemDef>();

for (const def of ALL_ITEMS) {
  if (BY_ID.has(def.id)) {
    throw new Error(`Duplicate item ID: ${def.id}`);
  }
  BY_ID.set(def.id, def);
}

export function getItemDef(id: string): ItemDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown item ID: ${id}`);
  return def;
}

export function getWeaponDef(id: string): WeaponDef {
  const def = getItemDef(id);
  if (def.category !== 'weapon') throw new Error(`Item ${id} is not a weapon`);
  return def as WeaponDef;
}

export function getAllItems(): ItemDef[] {
  return ALL_ITEMS;
}

export function getItemsByCategory(category: string): ItemDef[] {
  return ALL_ITEMS.filter(d => d.category === category);
}
