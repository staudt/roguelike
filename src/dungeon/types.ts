import { TileMap, Rect } from '../types';

// ── Map Generator Types ─────────────────────────────────

export interface StairsPlacement {
  room: Rect;
  type: 'down' | 'branch';
  targetBranch?: string;   // e.g., 'mines' — only for branch entrances
  targetFloor?: number;    // floor to enter in target branch
}

export interface MapGeneratorConfig {
  width: number;
  height: number;
  floor: number;
  branch: string;
}

export interface MapGeneratorResult {
  tiles: TileMap;
  rooms: Rect[];
  startRoom: Rect;
  stairs: StairsPlacement[];
  width: number;
  height: number;
}

export type MapGenerator = (config: MapGeneratorConfig) => MapGeneratorResult;

// ── Branch Definitions ──────────────────────────────────

export interface BranchDef {
  id: string;
  name: string;
  generator: 'bsp' | 'caves';
  floors: number;
  tileWidth: number;
  tileHeight: number;
  monsterTags?: string[];   // prefer monsters with these tags
}

export const BRANCHES: BranchDef[] = [
  {
    id: 'main',
    name: 'Main Dungeon',
    generator: 'bsp',
    floors: 20,
    tileWidth: 50,
    tileHeight: 40,
  },
  {
    id: 'mines',
    name: 'Gnomish Mines',
    generator: 'caves',
    floors: 8,
    tileWidth: 60,
    tileHeight: 50,
  },
];

export function getBranchDef(id: string): BranchDef {
  const b = BRANCHES.find(b => b.id === id);
  if (!b) throw new Error(`Unknown branch: ${id}`);
  return b;
}
