import { Entity, Direction, TILE_SIZE, PLAYER_SPEED, TileMap } from './types';
import { isKeyDown } from './input';
import { isWalkable } from './dungeon';
import { StatusEffect, StatusEffectType } from './status';

export function updatePlayer(player: Entity, tiles: TileMap, dt: number, statusEffects?: StatusEffect[]): void {
  if (!player.alive) return;

  // Status effects that prevent movement
  if (statusEffects) {
    for (const eff of statusEffects) {
      if (eff.type === StatusEffectType.PARALYZED || eff.type === StatusEffectType.IN_PIT) {
        player.vx = 0;
        player.vy = 0;
        return;
      }
    }
  }

  // Slowed: reduce movement speed
  const slowed = statusEffects?.some(e => e.type === StatusEffectType.SLOWED) ?? false;
  const speedMult = slowed ? 0.4 : 1.0;

  // Read input → velocity
  let dx = 0;
  let dy = 0;
  if (isKeyDown('w') || isKeyDown('arrowup')) dy = -1;
  if (isKeyDown('s') || isKeyDown('arrowdown')) dy = 1;
  if (isKeyDown('a') || isKeyDown('arrowleft')) dx = -1;
  if (isKeyDown('d') || isKeyDown('arrowright')) dx = 1;

  // Normalize diagonal movement
  if (dx !== 0 && dy !== 0) {
    const inv = 1 / Math.SQRT2;
    dx *= inv;
    dy *= inv;
  }

  player.vx = dx * PLAYER_SPEED * speedMult;
  player.vy = dy * PLAYER_SPEED * speedMult;

  // Update facing direction
  if (dx > 0) player.facing = Direction.EAST;
  else if (dx < 0) player.facing = Direction.WEST;
  if (dy > 0) player.facing = Direction.SOUTH;
  else if (dy < 0) player.facing = Direction.NORTH;

  // Move with collision (resolve X and Y separately for wall sliding)
  const newX = player.x + player.vx * dt;
  const newY = player.y + player.vy * dt;

  // Check X movement
  if (canMoveTo(player, newX, player.y, tiles)) {
    player.x = newX;
  }
  // Check Y movement
  if (canMoveTo(player, player.x, newY, tiles)) {
    player.y = newY;
  }
}

function canMoveTo(entity: Entity, x: number, y: number, tiles: TileMap): boolean {
  // Check all four corners of the entity's bounding box
  const margin = 2;
  const left = x + margin;
  const right = x + entity.width - margin;
  const top = y + margin;
  const bottom = y + entity.height - margin;

  const tl = isWalkable(tiles, Math.floor(left / TILE_SIZE), Math.floor(top / TILE_SIZE));
  const tr = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(top / TILE_SIZE));
  const bl = isWalkable(tiles, Math.floor(left / TILE_SIZE), Math.floor(bottom / TILE_SIZE));
  const br = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(bottom / TILE_SIZE));

  return tl && tr && bl && br;
}

export { canMoveTo };
