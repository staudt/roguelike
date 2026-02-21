import { TileMap, TileType, TILE_SIZE } from './types';

// Flow field: for each tile, stores the next tile to step toward the player.
// null means unreachable or the player's own tile.
export type FlowField = (readonly [number, number] | null)[][];

const DIRS: readonly (readonly [number, number])[] = [
  [0, -1],  // north
  [0, 1],   // south
  [-1, 0],  // west
  [1, 0],   // east
];

export function computeFlowField(
  tiles: TileMap,
  playerX: number,
  playerY: number,
): FlowField {
  const h = tiles.length;
  const w = tiles[0]!.length;

  const ptx = Math.floor(playerX / TILE_SIZE);
  const pty = Math.floor(playerY / TILE_SIZE);

  // Initialize flow field with nulls
  const flow: FlowField = [];
  for (let y = 0; y < h; y++) {
    const row: (readonly [number, number] | null)[] = [];
    for (let x = 0; x < w; x++) {
      row.push(null);
    }
    flow.push(row);
  }

  // BFS from player position
  const visited: boolean[][] = [];
  for (let y = 0; y < h; y++) {
    visited.push(new Array(w).fill(false));
  }

  const queue: [number, number][] = [[ptx, pty]];
  visited[pty]![ptx] = true;

  while (queue.length > 0) {
    const [cx, cy] = queue.shift()!;

    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;

      if (nx < 0 || nx >= w || ny < 0 || ny >= h) continue;
      if (visited[ny]![nx]) continue;

      const tileType = tiles[ny]![nx]!.type;
      if (tileType === TileType.WALL) continue;

      visited[ny]![nx] = true;
      // Point back toward the tile we came from (one step closer to player)
      flow[ny]![nx] = [cx, cy] as const;
      queue.push([nx, ny]);
    }
  }

  return flow;
}

// Get world-space target position for an entity to move toward.
// lookAhead follows the flow chain for multiple steps, producing diagonal
// vectors when the path curves instead of strictly cardinal movement.
export function getFlowTarget(
  flow: FlowField,
  entityX: number,
  entityY: number,
  entityW: number,
  entityH: number,
  lookAhead: number = 1,
): { x: number; y: number } | null {
  let cx = Math.floor((entityX + entityW / 2) / TILE_SIZE);
  let cy = Math.floor((entityY + entityH / 2) / TILE_SIZE);

  if (cy < 0 || cy >= flow.length || cx < 0 || cx >= flow[0]!.length) return null;

  let moved = false;
  for (let i = 0; i < lookAhead; i++) {
    const next = flow[cy]![cx];
    if (!next) break;
    cx = next[0];
    cy = next[1];
    moved = true;
  }

  if (!moved) return null;

  return {
    x: cx * TILE_SIZE + TILE_SIZE / 2,
    y: cy * TILE_SIZE + TILE_SIZE / 2,
  };
}
