import { Attributes } from './attributes';
import { ALIGN_LAWFUL, ALIGN_NEUTRAL, ALIGN_CHAOTIC } from './tags';

// ── Role Definition ────────────────────────────────────

export interface RoleDef {
  id: string;
  name: string;
  description: string;
  color: string;           // player entity color
  baseHealth: number;
  baseSpeed: number;       // pixels per second
  baseWeight: number;
  baseAttributes: Attributes;
  hpDie: number;           // max random HP per level (e.g., 10 = 1-10)
  startingWeapon: string;  // item def ID
  startingItems: string[]; // additional item def IDs
  alignment: string;       // ALIGN_LAWFUL | ALIGN_NEUTRAL | ALIGN_CHAOTIC
  companion?: string;      // companion type (e.g., 'dog') — undefined = no companion
}

// ── Role Definitions ───────────────────────────────────

export const ROLES: RoleDef[] = [
  {
    id: 'warrior',
    name: 'Warrior',
    description: 'Strong and tough. Hits hard, takes hits harder.',
    color: '#3ddc84',
    baseHealth: 120,
    baseSpeed: 150,
    baseWeight: 1.2,
    baseAttributes: { str: 16, dex: 10, con: 14 },
    hpDie: 10,
    startingWeapon: 'rusty_sword',
    startingItems: [],
    alignment: ALIGN_LAWFUL,
  },
  {
    id: 'ranger',
    name: 'Ranger',
    description: 'Quick and precise. Your dog follows you into the dark.',
    color: '#7bc67e',
    baseHealth: 80,
    baseSpeed: 170,
    baseWeight: 0.9,
    baseAttributes: { str: 12, dex: 15, con: 10 },
    hpDie: 6,
    startingWeapon: 'short_sword',
    startingItems: [],
    alignment: ALIGN_NEUTRAL,
    companion: 'dog',
  },
  {
    id: 'brute',
    name: 'Brute',
    description: 'Slow but devastating. Crushes bones with every swing.',
    color: '#d4a55a',
    baseHealth: 140,
    baseSpeed: 130,
    baseWeight: 1.5,
    baseAttributes: { str: 18, dex: 8, con: 16 },
    hpDie: 12,
    startingWeapon: 'wooden_club',
    startingItems: [],
    alignment: ALIGN_CHAOTIC,
  },
];

// ── Helpers ────────────────────────────────────────────

const BY_ID = new Map<string, RoleDef>();
for (const role of ROLES) {
  BY_ID.set(role.id, role);
}

export function getRoleDef(id: string): RoleDef {
  const def = BY_ID.get(id);
  if (!def) throw new Error(`Unknown role ID: ${id}`);
  return def;
}
