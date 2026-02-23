import { TileMap, TileType, Entity, TILE_SIZE, FOV_RANGE } from './types';

const CORRIDOR_FOV_RANGE = 1; // tiles of vision when inside a corridor

export function computeFOV(tiles: TileMap, player: Entity, isBlind: boolean = false): void {
  const h = tiles.length;
  const w = tiles[0]!.length;

  // Reset visibility
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      tiles[y]![x]!.visible = false;
    }
  }

  const cx = Math.floor((player.x + player.width / 2) / TILE_SIZE);
  const cy = Math.floor((player.y + player.height / 2) / TILE_SIZE);

  // Blind: only the player's own tile is visible; rest of explored map shows as fog
  if (isBlind) {
    if (cy >= 0 && cy < h && cx >= 0 && cx < w) {
      tiles[cy]![cx]!.visible = true;
      tiles[cy]![cx]!.explored = true;
    }
    return;
  }

  const playerInCorridor =
    cy >= 0 && cy < h && cx >= 0 && cx < w &&
    tiles[cy]![cx]!.type === TileType.CORRIDOR;

  // Cast 360 rays for room visibility.
  // Rays pass through corridor tiles (without illuminating them) so rooms
  // beyond corridors are still visible.
  const numRays = 360;
  for (let i = 0; i < numRays; i++) {
    const angle = (i * Math.PI * 2) / numRays;
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let rx = cx + 0.5;
    let ry = cy + 0.5;
    let passingThroughCorridor = playerInCorridor;

    for (let step = 0; step < FOV_RANGE; step++) {
      const tx = Math.floor(rx);
      const ty = Math.floor(ry);

      if (tx < 0 || tx >= w || ty < 0 || ty >= h) break;

      const tile = tiles[ty]![tx]!;

      // Corridors: illuminate the first corridor tile the ray enters,
      // then pass through the rest silently
      if (tile.type === TileType.CORRIDOR) {
        if (!passingThroughCorridor) {
          tile.visible = true;
          tile.explored = true;
        }
        passingThroughCorridor = true;
        rx += dx;
        ry += dy;
        continue;
      }

      // Walls: only visible if not on the corridor side
      if (tile.type === TileType.WALL) {
        if (!passingThroughCorridor) {
          tile.visible = true;
          tile.explored = true;
        }
        break;
      }

      // FLOOR / STAIRS — we're in a room, light normally
      passingThroughCorridor = false;
      tile.visible = true;
      tile.explored = true;

      rx += dx;
      ry += dy;
    }
  }

  // Corridor-local vision: nearby corridor tiles only
  if (playerInCorridor) {
    for (let dy = -CORRIDOR_FOV_RANGE; dy <= CORRIDOR_FOV_RANGE; dy++) {
      for (let dx = -CORRIDOR_FOV_RANGE; dx <= CORRIDOR_FOV_RANGE; dx++) {
        const tx = cx + dx;
        const ty = cy + dy;
        if (tx < 0 || tx >= w || ty < 0 || ty >= h) continue;
        const tile = tiles[ty]![tx]!;
        if (tile.type !== TileType.WALL) {
          tile.visible = true;
          tile.explored = true;
        }
      }
    }
  }
}
