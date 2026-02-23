import { Entity, Direction, TILE_SIZE, PLAYER_SPEED, TileMap } from './types';
import { isKeyDown } from './input';
import { isWalkable } from './dungeon';

export function updatePlayer(player: Entity, tiles: TileMap, dt: number, angle: number): void {
  if (!player.alive) return;

  // Forward vector from look angle
  const fwdX = Math.cos(angle);
  const fwdY = Math.sin(angle);
  // Strafe vector (perpendicular, 90° clockwise)
  const strafeX = -fwdY;
  const strafeY =  fwdX;

  let dx = 0;
  let dy = 0;
  if (isKeyDown('w') || isKeyDown('arrowup'))    { dx += fwdX;    dy += fwdY; }
  if (isKeyDown('s') || isKeyDown('arrowdown'))  { dx -= fwdX;    dy -= fwdY; }
  if (isKeyDown('a') || isKeyDown('arrowleft'))  { dx += strafeX; dy += strafeY; }
  if (isKeyDown('d') || isKeyDown('arrowright')) { dx -= strafeX; dy -= strafeY; }

  // Normalize diagonal movement
  const len = Math.sqrt(dx * dx + dy * dy);
  if (len > 0) { dx /= len; dy /= len; }

  player.vx = dx * PLAYER_SPEED;
  player.vy = dy * PLAYER_SPEED;

  // Snap facing to nearest cardinal for combat hit detection
  if (Math.abs(fwdX) >= Math.abs(fwdY)) {
    player.facing = fwdX >= 0 ? Direction.EAST : Direction.WEST;
  } else {
    player.facing = fwdY >= 0 ? Direction.SOUTH : Direction.NORTH;
  }

  // Move with collision (resolve X and Y separately for wall sliding)
  const newX = player.x + player.vx * dt;
  const newY = player.y + player.vy * dt;

  if (canMoveTo(player, newX, player.y, tiles)) {
    player.x = newX;
  }
  if (canMoveTo(player, player.x, newY, tiles)) {
    player.y = newY;
  }
}

function canMoveTo(entity: Entity, x: number, y: number, tiles: TileMap): boolean {
  // Check all four corners of the entity's bounding box
  const margin = 2;
  const left   = x + margin;
  const right  = x + entity.width  - margin;
  const top    = y + margin;
  const bottom = y + entity.height - margin;

  const tl = isWalkable(tiles, Math.floor(left  / TILE_SIZE), Math.floor(top    / TILE_SIZE));
  const tr = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(top    / TILE_SIZE));
  const bl = isWalkable(tiles, Math.floor(left  / TILE_SIZE), Math.floor(bottom / TILE_SIZE));
  const br = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(bottom / TILE_SIZE));

  return tl && tr && bl && br;
}

export { canMoveTo };
