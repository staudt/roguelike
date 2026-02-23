import { TileMap, Tile, TileType, Rect } from '../types';
import { MapGeneratorConfig, MapGeneratorResult, StairsPlacement, Trap, TrapType } from './types';

// ── Cellular Automata Cave Generator ─────────────────────
// Used for Gnomish Mines-style organic caves.
// 1. Fill with random walls (~45% open)
// 2. Run automata rules: cell becomes wall if 5+ neighbors are walls
// 3. Flood-fill to find largest connected region
// 4. Identify "caverns" (open areas) as pseudo-rooms for spawning

const OPEN_CHANCE = 0.55;    // initial chance of a cell being open
const AUTOMATA_STEPS = 4;    // number of smoothing iterations
const WALL_THRESHOLD = 5;    // become wall if this many neighbors are walls
const BORDER = 1;            // solid border around the map

function createCaveMap(w: number, h: number): boolean[][] {
  const map: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < w; x++) {
      if (x < BORDER || x >= w - BORDER || y < BORDER || y >= h - BORDER) {
        row.push(false); // wall border
      } else {
        row.push(Math.random() < OPEN_CHANCE);
      }
    }
    map.push(row);
  }
  return map;
}

function countWallNeighbors(map: boolean[][], x: number, y: number, w: number, h: number): number {
  let count = 0;
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      if (dx === 0 && dy === 0) continue;
      const nx = x + dx;
      const ny = y + dy;
      if (nx < 0 || nx >= w || ny < 0 || ny >= h) {
        count++; // out of bounds counts as wall
      } else if (!map[ny]![nx]) {
        count++;
      }
    }
  }
  return count;
}

function automataStep(map: boolean[][], w: number, h: number): boolean[][] {
  const next: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    const row: boolean[] = [];
    for (let x = 0; x < w; x++) {
      if (x < BORDER || x >= w - BORDER || y < BORDER || y >= h - BORDER) {
        row.push(false);
      } else {
        const walls = countWallNeighbors(map, x, y, w, h);
        row.push(walls < WALL_THRESHOLD);
      }
    }
    next.push(row);
  }
  return next;
}

// Flood fill to find connected regions
function floodFill(map: boolean[][], w: number, h: number): { regions: number[][]; labels: number[][] } {
  const labels: number[][] = [];
  for (let y = 0; y < h; y++) {
    labels.push(new Array(w).fill(-1));
  }

  const regions: number[][] = []; // regions[label] = list of indices (y*w+x)
  let nextLabel = 0;

  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!map[y]![x] || labels[y]![x] !== -1) continue;

      const label = nextLabel++;
      const region: number[] = [];
      const queue: [number, number][] = [[x, y]];
      labels[y]![x] = label;

      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        region.push(cy * w + cx);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (!map[ny]![nx] || labels[ny]![nx] !== -1) continue;
          labels[ny]![nx] = label;
          queue.push([nx, ny]);
        }
      }

      regions.push(region);
    }
  }

  return { regions, labels };
}

// Find pseudo-rooms: cluster open tiles into rectangular bounding boxes
// We do this by sampling open areas and creating bounding rects
function findCaverns(map: boolean[][], w: number, h: number): Rect[] {
  const visited: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    visited.push(new Array(w).fill(false));
  }

  const caverns: Rect[] = [];
  const MIN_CAVERN = 16; // minimum open tiles to be a cavern

  for (let y = 2; y < h - 2; y += 4) {
    for (let x = 2; x < w - 2; x += 4) {
      if (!map[y]![x] || visited[y]![x]) continue;

      // BFS to find connected open area
      const tiles: [number, number][] = [];
      const queue: [number, number][] = [[x, y]];
      visited[y]![x] = true;

      while (queue.length > 0) {
        const [cx, cy] = queue.pop()!;
        tiles.push([cx, cy]);

        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
          const nx = cx + dx;
          const ny = cy + dy;
          if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
          if (!map[ny]![nx] || visited[ny]![nx]) continue;
          visited[ny]![nx] = true;
          queue.push([nx, ny]);
        }
      }

      if (tiles.length < MIN_CAVERN) continue;

      // Bounding rect
      let minX = w, maxX = 0, minY = h, maxY = 0;
      for (const [tx, ty] of tiles) {
        if (tx < minX) minX = tx;
        if (tx > maxX) maxX = tx;
        if (ty < minY) minY = ty;
        if (ty > maxY) maxY = ty;
      }

      // Shrink slightly for spawn safety
      const rx = minX + 1;
      const ry = minY + 1;
      const rw = Math.max(2, maxX - minX - 1);
      const rh = Math.max(2, maxY - minY - 1);
      caverns.push({ x: rx, y: ry, w: rw, h: rh });
    }
  }

  return caverns;
}

function placeCaveTraps(caveMap: boolean[][], rooms: Rect[], startRoom: Rect): Trap[] {
  const traps: Trap[] = [];
  // Caves get fewer traps — 20% chance per non-start room
  for (const room of rooms) {
    if (room === startRoom) continue;
    if (Math.random() > 0.2) continue;
    // Pick a random open tile in the room
    for (let attempt = 0; attempt < 10; attempt++) {
      const tx = room.x + Math.floor(Math.random() * room.w);
      const ty = room.y + Math.floor(Math.random() * room.h);
      if (caveMap[ty]?.[tx]) {
        // Weight: no arrow traps in caves (mines use pits and gas)
        const type = Math.random() < 0.6 ? TrapType.PIT : TrapType.SLEEP_GAS;
        traps.push({ tileX: tx, tileY: ty, type, revealed: false, triggered: false });
        break;
      }
    }
  }
  return traps;
}

export function generateCaves(config: MapGeneratorConfig): MapGeneratorResult {
  const { width, height } = config;

  // Generate and smooth
  let caveMap = createCaveMap(width, height);
  for (let i = 0; i < AUTOMATA_STEPS; i++) {
    caveMap = automataStep(caveMap, width, height);
  }

  // Keep only the largest connected region
  const { regions, labels } = floodFill(caveMap, width, height);
  if (regions.length > 1) {
    let largestIdx = 0;
    for (let i = 1; i < regions.length; i++) {
      if (regions[i]!.length > regions[largestIdx]!.length) {
        largestIdx = i;
      }
    }
    // Wall off smaller regions
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (caveMap[y]![x] && labels[y]![x] !== largestIdx) {
          caveMap[y]![x] = false;
        }
      }
    }
  }

  // Convert to TileMap — caves use FLOOR for open space (no CORRIDOR distinction)
  const tiles: TileMap = [];
  for (let y = 0; y < height; y++) {
    const row: Tile[] = [];
    for (let x = 0; x < width; x++) {
      row.push({
        type: caveMap[y]![x] ? TileType.FLOOR : TileType.WALL,
        visible: false,
        explored: false,
      });
    }
    tiles.push(row);
  }

  // Find caverns (pseudo-rooms for spawning)
  const rooms = findCaverns(caveMap, width, height);

  // If no caverns found, create a fallback room from any open area
  if (rooms.length === 0) {
    for (let y = 2; y < height - 2; y++) {
      for (let x = 2; x < width - 2; x++) {
        if (caveMap[y]![x]) {
          rooms.push({ x, y, w: 3, h: 3 });
          break;
        }
      }
      if (rooms.length > 0) break;
    }
  }

  // Pick a random start cavern, then place stairs in the farthest one
  const startRoom = rooms[Math.floor(Math.random() * rooms.length)]!;

  let stairsRoom = rooms[0]!;
  let maxDist = 0;
  const scx = startRoom.x + startRoom.w / 2;
  const scy = startRoom.y + startRoom.h / 2;
  for (const room of rooms) {
    if (room === startRoom) continue;
    const d = Math.abs(room.x + room.w / 2 - scx) + Math.abs(room.y + room.h / 2 - scy);
    if (d > maxDist) {
      maxDist = d;
      stairsRoom = room;
    }
  }

  // Place stairs — find a walkable tile in the stairs room
  let stairsX = Math.floor(stairsRoom.x + stairsRoom.w / 2);
  let stairsY = Math.floor(stairsRoom.y + stairsRoom.h / 2);
  // Ensure the chosen tile is actually open
  if (!caveMap[stairsY]?.[stairsX]) {
    // Search nearby for an open tile
    for (let dy = 0; dy <= 3; dy++) {
      for (let dx = 0; dx <= 3; dx++) {
        for (const offset of [[dx, dy], [-dx, dy], [dx, -dy], [-dx, -dy]]) {
          const nx = stairsX + offset[0]!;
          const ny = stairsY + offset[1]!;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height && caveMap[ny]![nx]) {
            stairsX = nx;
            stairsY = ny;
            dy = 4; dx = 4; // break outer loops
            break;
          }
        }
      }
    }
  }
  tiles[stairsY]![stairsX]!.type = TileType.STAIRS_DOWN;

  const stairs: StairsPlacement[] = [
    { room: stairsRoom, type: 'down' },
  ];

  const traps = placeCaveTraps(caveMap, rooms, startRoom);

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
