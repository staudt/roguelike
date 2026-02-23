import { TileMap, Tile, TileType, BSPNode, Rect } from '../types';
import { MapGeneratorConfig, MapGeneratorResult, StairsPlacement, Trap, TrapType } from './types';

const MIN_LEAF = 8;
const MIN_ROOM = 4;
const ROOM_PADDING = 1;

function rand(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function createTileMap(w: number, h: number): TileMap {
  const tiles: TileMap = [];
  for (let y = 0; y < h; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < w; x++) {
      row.push({ type: TileType.WALL, visible: false, explored: false });
    }
    tiles.push(row);
  }
  return tiles;
}

function splitBSP(node: BSPNode): void {
  if (node.w < MIN_LEAF * 2 && node.h < MIN_LEAF * 2) return;

  let splitH: boolean;
  if (node.w < MIN_LEAF * 2) {
    splitH = true;
  } else if (node.h < MIN_LEAF * 2) {
    splitH = false;
  } else {
    splitH = node.h > node.w ? true : node.w > node.h ? false : Math.random() > 0.5;
  }

  if (splitH) {
    const split = rand(MIN_LEAF, node.h - MIN_LEAF);
    node.left = { x: node.x, y: node.y, w: node.w, h: split };
    node.right = { x: node.x, y: node.y + split, w: node.w, h: node.h - split };
  } else {
    const split = rand(MIN_LEAF, node.w - MIN_LEAF);
    node.left = { x: node.x, y: node.y, w: split, h: node.h };
    node.right = { x: node.x + split, y: node.y, w: node.w - split, h: node.h };
  }

  splitBSP(node.left);
  splitBSP(node.right);
}

function placeRooms(node: BSPNode): void {
  if (node.left) placeRooms(node.left);
  if (node.right) placeRooms(node.right);

  if (!node.left && !node.right) {
    const rw = rand(MIN_ROOM, node.w - ROOM_PADDING * 2);
    const rh = rand(MIN_ROOM, node.h - ROOM_PADDING * 2);
    const rx = node.x + rand(ROOM_PADDING, node.w - rw - ROOM_PADDING);
    const ry = node.y + rand(ROOM_PADDING, node.h - rh - ROOM_PADDING);
    node.room = { x: rx, y: ry, w: rw, h: rh };
  }
}

function getRoom(node: BSPNode): Rect | undefined {
  if (node.room) return node.room;
  if (node.left) {
    const r = getRoom(node.left);
    if (r) return r;
  }
  if (node.right) {
    const r = getRoom(node.right);
    if (r) return r;
  }
  return undefined;
}

function carveRoom(tiles: TileMap, room: Rect): void {
  for (let y = room.y; y < room.y + room.h; y++) {
    for (let x = room.x; x < room.x + room.w; x++) {
      if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0]!.length) {
        tiles[y]![x]!.type = TileType.FLOOR;
      }
    }
  }
}

function carveCorridor(tiles: TileMap, x1: number, y1: number, x2: number, y2: number): void {
  let x = x1;
  let y = y1;

  while (x !== x2) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0]!.length) {
      if (tiles[y]![x]!.type === TileType.WALL) {
        tiles[y]![x]!.type = TileType.CORRIDOR;
      }
    }
    x += x < x2 ? 1 : -1;
  }
  while (y !== y2) {
    if (y >= 0 && y < tiles.length && x >= 0 && x < tiles[0]!.length) {
      if (tiles[y]![x]!.type === TileType.WALL) {
        tiles[y]![x]!.type = TileType.CORRIDOR;
      }
    }
    y += y < y2 ? 1 : -1;
  }
}

function connectRooms(tiles: TileMap, node: BSPNode): void {
  if (node.left && node.right) {
    const roomA = getRoom(node.left);
    const roomB = getRoom(node.right);
    if (roomA && roomB) {
      const ax = Math.floor(roomA.x + roomA.w / 2);
      const ay = Math.floor(roomA.y + roomA.h / 2);
      const bx = Math.floor(roomB.x + roomB.w / 2);
      const by = Math.floor(roomB.y + roomB.h / 2);
      carveCorridor(tiles, ax, ay, bx, by);
    }
  }
  if (node.left) connectRooms(tiles, node.left);
  if (node.right) connectRooms(tiles, node.right);
}

function collectRooms(node: BSPNode, rooms: Rect[]): void {
  if (node.room) rooms.push(node.room);
  if (node.left) collectRooms(node.left, rooms);
  if (node.right) collectRooms(node.right, rooms);
}

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];
const DEAD_END_CHANCE = 0.25;
const DEAD_END_MIN = 2;
const DEAD_END_MAX = 6;
const MAX_DEAD_ENDS = 4;

function addDeadEnds(tiles: TileMap): void {
  const h = tiles.length;
  const w = tiles[0]!.length;

  const corridors: [number, number][] = [];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      if (tiles[y]![x]!.type === TileType.CORRIDOR) corridors.push([x, y]);
    }
  }

  for (let i = corridors.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [corridors[i], corridors[j]] = [corridors[j]!, corridors[i]!];
  }

  let placed = 0;
  for (const [cx, cy] of corridors) {
    if (placed >= MAX_DEAD_ENDS) break;
    if (Math.random() > DEAD_END_CHANCE) continue;

    const [ddx, ddy] = DIRS[Math.floor(Math.random() * DIRS.length)]!;
    const length = rand(DEAD_END_MIN, DEAD_END_MAX);

    let valid = true;
    for (let s = 1; s <= length; s++) {
      const nx = cx + ddx * s;
      const ny = cy + ddy * s;
      if (nx <= 0 || nx >= w - 1 || ny <= 0 || ny >= h - 1) { valid = false; break; }
      if (tiles[ny]![nx]!.type !== TileType.WALL) { valid = false; break; }
      for (const [cdx, cdy] of DIRS) {
        const ax = nx + cdx;
        const ay = ny + cdy;
        if (ax === nx - ddx && ay === ny - ddy) continue;
        if (ax < 0 || ax >= w || ay < 0 || ay >= h) continue;
        const adj = tiles[ay]![ax]!.type;
        if (adj === TileType.FLOOR || adj === TileType.CORRIDOR) { valid = false; break; }
      }
      if (!valid) break;
    }

    if (valid && length > 0) {
      for (let s = 1; s <= length; s++) {
        tiles[cy + ddy * s]![cx + ddx * s]!.type = TileType.CORRIDOR;
      }
      placed++;
    }
  }
}

function distBetweenRooms(a: Rect, b: Rect): number {
  const ax = a.x + a.w / 2;
  const ay = a.y + a.h / 2;
  const bx = b.x + b.w / 2;
  const by = b.y + b.h / 2;
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

// ── Trap placement ──────────────────────────────────────
// Weights by depth: pit traps dominate early, gas/arrow later.
function pickTrapType(floor: number): TrapType {
  let weights: [TrapType, number][];
  if (floor <= 4) {
    weights = [[TrapType.PIT, 5], [TrapType.ARROW, 3], [TrapType.SLEEP_GAS, 2]];
  } else if (floor <= 10) {
    weights = [[TrapType.PIT, 3], [TrapType.ARROW, 4], [TrapType.SLEEP_GAS, 3]];
  } else {
    weights = [[TrapType.PIT, 2], [TrapType.ARROW, 4], [TrapType.SLEEP_GAS, 4]];
  }
  const total = weights.reduce((s, [, w]) => s + w, 0);
  let r = Math.random() * total;
  for (const [type, w] of weights) {
    r -= w;
    if (r <= 0) return type;
  }
  return TrapType.PIT;
}

function placeBSPTraps(tiles: TileMap, rooms: Rect[], startRoom: Rect, floor: number): Trap[] {
  const traps: Trap[] = [];

  // ~20% chance of a single trap per non-start room (rooms only, no corridors)
  for (const room of rooms) {
    if (room === startRoom) continue;
    if (Math.random() > 0.20) continue;
    const tx = room.x + rand(1, room.w - 2);
    const ty = room.y + rand(1, room.h - 2);
    if (tiles[ty]?.[tx]?.type === TileType.FLOOR) {
      traps.push({ tileX: tx, tileY: ty, type: pickTrapType(floor), revealed: false, triggered: false });
    }
  }

  return traps;
}

// ── Mines entrance placement ──
// On main dungeon floors 2-5, randomly place a branch entrance to the mines
const MINES_ENTRANCE_FLOORS = [2, 3, 4, 5];
const MINES_ENTRANCE_CHANCE = 0.4; // 40% chance per eligible floor

function shouldPlaceMinesEntrance(floor: number, branch: string): boolean {
  if (branch !== 'main') return false;
  if (!MINES_ENTRANCE_FLOORS.includes(floor)) return false;
  return Math.random() < MINES_ENTRANCE_CHANCE;
}

export function generateBSP(config: MapGeneratorConfig): MapGeneratorResult {
  const { width, height, floor, branch } = config;
  const tiles = createTileMap(width, height);

  const root: BSPNode = { x: 0, y: 0, w: width, h: height };
  splitBSP(root);
  placeRooms(root);

  const rooms: Rect[] = [];
  collectRooms(root, rooms);
  for (const room of rooms) {
    carveRoom(tiles, room);
  }

  connectRooms(tiles, root);
  addDeadEnds(tiles);

  // Pick a random start room, then place stairs in farthest room
  const startRoom = rooms[Math.floor(Math.random() * rooms.length)]!;
  let stairsRoom = rooms[0]!;
  let maxDist = 0;
  for (const room of rooms) {
    if (room === startRoom) continue;
    const d = distBetweenRooms(startRoom, room);
    if (d > maxDist) {
      maxDist = d;
      stairsRoom = room;
    }
  }

  // Place stairs down
  const sx = Math.floor(stairsRoom.x + stairsRoom.w / 2);
  const sy = Math.floor(stairsRoom.y + stairsRoom.h / 2);
  tiles[sy]![sx]!.type = TileType.STAIRS_DOWN;

  const stairs: StairsPlacement[] = [
    { room: stairsRoom, type: 'down' },
  ];

  // Maybe place mines entrance in a different room
  if (shouldPlaceMinesEntrance(floor, branch) && rooms.length >= 3) {
    // Pick a room that's not the start or stairs room, preferring mid-distance
    const candidates = rooms.filter(r => r !== startRoom && r !== stairsRoom);
    if (candidates.length > 0) {
      const minesRoom = candidates[Math.floor(Math.random() * candidates.length)]!;
      const mx = Math.floor(minesRoom.x + minesRoom.w / 2);
      const my = Math.floor(minesRoom.y + minesRoom.h / 2);
      // Use STAIRS_DOWN tile — renderer will distinguish by context
      if (tiles[my]![mx]!.type === TileType.FLOOR) {
        tiles[my]![mx]!.type = TileType.STAIRS_DOWN;
        stairs.push({
          room: minesRoom,
          type: 'branch',
          targetBranch: 'mines',
          targetFloor: 1,
        });
      }
    }
  }

  const traps = placeBSPTraps(tiles, rooms, startRoom, floor);

  return {
    tiles,
    rooms,
    startRoom,
    stairs,
    traps,
    width,
    height,
  };
}
