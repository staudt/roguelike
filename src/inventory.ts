import { ItemInstance } from './items/defs';

// ── Equipment Slots ─────────────────────────────────────

export interface Equipment {
  weapon: ItemInstance | null;
  body: ItemInstance | null;
  head: ItemInstance | null;
  hands: ItemInstance | null;
  feet: ItemInstance | null;
}

// ── Inventory ───────────────────────────────────────────

export interface Inventory {
  items: ItemInstance[];
  maxSlots: number;
  equipped: Equipment;
}

// ── Helpers ─────────────────────────────────────────────

let nextInstanceId = 1;

export function resetInventoryIds(): void {
  nextInstanceId = 1;
}

export function createItemInstance(defId: string, durability?: number, quantity?: number): ItemInstance {
  return {
    instanceId: nextInstanceId++,
    defId,
    durability,
    quantity,
  };
}

export function createInventory(maxSlots: number = 20): Inventory {
  return {
    items: [],
    maxSlots,
    equipped: {
      weapon: null,
      body: null,
      head: null,
      hands: null,
      feet: null,
    },
  };
}

export function addItem(inv: Inventory, item: ItemInstance): boolean {
  if (inv.items.length >= inv.maxSlots) return false;
  inv.items.push(item);
  return true;
}

export function removeItem(inv: Inventory, instanceId: number): ItemInstance | null {
  const idx = inv.items.findIndex(i => i.instanceId === instanceId);
  if (idx === -1) return null;
  return inv.items.splice(idx, 1)[0]!;
}

export function equipWeapon(inv: Inventory, instanceId: number): ItemInstance | null {
  const item = removeItem(inv, instanceId);
  if (!item) return null;

  // Unequip current weapon back to inventory
  const prev = inv.equipped.weapon;
  if (prev) {
    inv.items.push(prev);
  }

  inv.equipped.weapon = item;
  return prev;
}

export function getEquippedWeapon(inv: Inventory): ItemInstance | null {
  return inv.equipped.weapon;
}
