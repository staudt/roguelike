import { TileMap, Tile, TileType, Rect } from '../types';
import { MapGeneratorConfig, MapGeneratorResult, StairsPlacement, Trap, TrapType } from './types';

// ── Cellular Automata Cave Generator ─────────────────────
// Used for Gnomish Mines-style organic caves.
// 1. Fill with random walls (~45% open)
// 2. Run automata rules: cell becomes wall if 5+ neighbors are walls
// 3. Flood-fill to find largest connected region
// 4. Identify "caverns" (open areas) as pseudo-rooms for spawning

const OPEN_CHANCE = 0.44;    // initial chance of a cell being open
const AUTOMATA_STEPS = 5;    // number of smoothing iterations
const WALL_THRESHOLD = 5;    // become wall if this many neighbors are walls (5 = standard, ensures navigable corridors)
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

// Find pseudo-rooms by dividing the map into a grid of cells.
// Each cell that contains enough open tiles becomes a cavern (pseudo-room)
// for enemy spawning and stair placement. Because the flood-fill step keeps
// only one connected region, a BFS-with-visited approach would consume the
// entire map on the first hit and return only 1 cavern; the grid approach
// gives us many well-distributed caverns regardless.
function findCaverns(map: boolean[][], w: number, h: number): Rect[] {
  const CELL = 10; // grid cell size in tiles
  const MIN_OPEN = 4; // cells with fewer open tiles are skipped
  const caverns: Rect[] = [];

  for (let gy = 0; gy * CELL < h - BORDER; gy++) {
    for (let gx = 0; gx * CELL < w - BORDER; gx++) {
      const x0 = Math.max(BORDER, gx * CELL);
      const y0 = Math.max(BORDER, gy * CELL);
      const x1 = Math.min(w - BORDER - 1, (gx + 1) * CELL - 1);
      const y1 = Math.min(h - BORDER - 1, (gy + 1) * CELL - 1);

      let openCount = 0;
      for (let y = y0; y <= y1; y++) {
        for (let x = x0; x <= x1; x++) {
          if (map[y]?.[x]) openCount++;
        }
      }

      if (openCount < MIN_OPEN) continue;
      caverns.push({ x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 });
    }
  }

  return caverns;
}

/**
 * Find the most navigable open tile inside a cavern rect (highest count of
 * open cardinal neighbors). Returns null if the cavern has no open tiles.
 */
function findBestOpenTile(
  caveMap: boolean[][],
  cavern: Rect,
  w: number,
  h: number,
): { x: number; y: number } | null {
  let best: { x: number; y: number } | null = null;
  let bestScore = -1;
  for (let y = cavern.y; y < cavern.y + cavern.h && y < h - BORDER; y++) {
    for (let x = cavern.x; x < cavern.x + cavern.w && x < w - BORDER; x++) {
      if (!caveMap[y]?.[x]) continue;
      let score = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as [number, number][]) {
        if (caveMap[y + dy]?.[x + dx]) score++;
      }
      if (score > bestScore) { bestScore = score; best = { x, y }; }
    }
  }
  return best;
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

  // Pick a random start cavern, then place stairs in the farthest one.
  // Use findBestOpenTile so that both spawn and stairs land on actual floor.
  let startCavern = rooms[Math.floor(Math.random() * rooms.length)]!;

  let stairsCavern = rooms[0]!;
  let maxDist = 0;
  const scx = startCavern.x + startCavern.w / 2;
  const scy = startCavern.y + startCavern.h / 2;
  for (const room of rooms) {
    if (room === startCavern) continue;
    const d = Math.abs(room.x + room.w / 2 - scx) + Math.abs(room.y + room.h / 2 - scy);
    if (d > maxDist) {
      maxDist = d;
      stairsCavern = room;
    }
  }

  // Find the best (most navigable) open tile in each cavern.
  // Redefine startRoom as a small rect centered on that tile so game.ts
  // computes the correct pixel spawn position from the rect center.
  const SPAWN_MARGIN = 3;
  const startTile = findBestOpenTile(caveMap, startCavern, width, height)
    ?? findBestOpenTile(caveMap, { x: BORDER, y: BORDER, w: width - BORDER * 2, h: height - BORDER * 2 }, width, height)!;
  const startRoom: Rect = {
    x: Math.max(BORDER, startTile.x - SPAWN_MARGIN),
    y: Math.max(BORDER, startTile.y - SPAWN_MARGIN),
    w: SPAWN_MARGIN * 2 + 1,
    h: SPAWN_MARGIN * 2 + 1,
  };

  // Find the best open tile for the stairs, then ensure it is far enough from
  // the spawn point. If the cave is tiny and all candidates are close, scan the
  // whole map for the tile farthest from startTile.
  const MIN_STAIR_SEP = 15; // minimum Manhattan tile distance between spawn and stairs
  let candidateTile = findBestOpenTile(caveMap, stairsCavern, width, height) ?? startTile;
  const sep = Math.abs(candidateTile.x - startTile.x) + Math.abs(candidateTile.y - startTile.y);
  if (sep < MIN_STAIR_SEP) {
    // Fall back to the open tile farthest from startTile across the whole map
    let bestFarTile = candidateTile;
    let bestFarDist = sep;
    for (let y = BORDER; y < height - BORDER; y++) {
      for (let x = BORDER; x < width - BORDER; x++) {
        if (!caveMap[y]?.[x]) continue;
        if (x === startTile.x && y === startTile.y) continue;
        const d = Math.abs(x - startTile.x) + Math.abs(y - startTile.y);
        if (d > bestFarDist) { bestFarDist = d; bestFarTile = { x, y }; }
      }
    }
    candidateTile = bestFarTile;
  }
  const stairsX = candidateTile.x;
  const stairsY = candidateTile.y;
  tiles[stairsY]![stairsX]!.type = TileType.STAIRS_DOWN;

  const stairsRoom: Rect = stairsCavern;

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
