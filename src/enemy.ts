import {
  Entity,
  EnemyEntity,
  GameState,
  Direction,
  DungeonResult,
  TILE_SIZE,
  TileMap,
} from './types';
import { getNextId } from './game';
import { canMoveTo } from './player';
import { FlowField, getFlowTarget } from './pathfinding';
import { isWalkable } from './dungeon';
import { getMonstersForFloor } from './monsters/index';
import { pickWeightedMonster, isMonsterHostile } from './progression';
import { hasTag, AI_CHASE } from './tags';
import { runAI, AIContext } from './ai';
import { createAnimationState } from './animation';

export function spawnEnemies(dungeon: DungeonResult, _playerId: number, floor: number, playerLevel: number = 1, branch: string = 'main', playerAlignment: string = 'align:neutral'): EnemyEntity[] {
  const enemies: EnemyEntity[] = [];
  const eligible = getMonstersForFloor(floor, branch, playerLevel);

  if (eligible.length === 0) return enemies;

  for (const room of dungeon.rooms) {
    // Don't spawn in starting room
    if (room === dungeon.startRoom) continue;

    // 1-3 enemies per room
    const count = 1 + Math.floor(Math.random() * 3);
    for (let i = 0; i < count; i++) {
      const def = pickWeightedMonster(eligible);
      if (!def) continue;

      const ex = (room.x + 1 + Math.floor(Math.random() * (room.w - 2))) * TILE_SIZE + 4;
      const ey = (room.y + 1 + Math.floor(Math.random() * (room.h - 2))) * TILE_SIZE + 4;

      enemies.push({
        id: getNextId(),
        x: ex,
        y: ey,
        width: 24,
        height: 24,
        vx: 0,
        vy: 0,
        knockbackVx: 0,
        knockbackVy: 0,
        weight: def.weight,
        facing: Direction.SOUTH,
        health: def.health,
        maxHealth: def.health,
        color: def.color,
        alive: true,
        hitTimer: 0,
        anim: createAnimationState(),
        def,
        contactTimer: 0,
        aiState: hasTag(def.tags, AI_CHASE) ? 'chase' : 'patrol',
        patrolTarget: null,
        level: 1,
        hostile: isMonsterHostile(def, playerAlignment),
      });
    }
  }

  return enemies;
}

export function updateEnemies(
  enemies: EnemyEntity[],
  playerX: number,
  playerY: number,
  playerAlive: boolean,
  tiles: TileMap,
  flow: FlowField,
  dt: number,
  state: GameState,
): void {
  for (const e of enemies) {
    if (!e.alive) continue;

    const ctx: AIContext = {
      entity: e,
      playerX,
      playerY,
      playerAlive,
      tiles,
      flow,
      state,
      dt,
    };

    runAI(ctx);
  }
}

// Flow-field movement: follows the BFS flow field toward the player.
// Allows diagonal movement — corner assist handles wall clipping.
export function moveAlongFlow(
  entity: EnemyEntity,
  flow: FlowField,
  speed: number,
  tiles: TileMap,
  dt: number,
): void {
  const target = getFlowTarget(flow, entity.x, entity.y, entity.width, entity.height, 3);
  if (!target) return;

  const ecx = entity.x + entity.width / 2;
  const ecy = entity.y + entity.height / 2;
  const dx = target.x - ecx;
  const dy = target.y - ecy;

  const dist = Math.sqrt(dx * dx + dy * dy);
  let vx = 0;
  let vy = 0;

  if (dist > 0.5) {
    vx = (dx / dist) * speed;
    vy = (dy / dist) * speed;
  }

  // Update facing
  if (vx > 0) entity.facing = Direction.EAST;
  else if (vx < 0) entity.facing = Direction.WEST;
  else if (vy > 0) entity.facing = Direction.SOUTH;
  else if (vy < 0) entity.facing = Direction.NORTH;

  entity.vx = vx;
  entity.vy = vy;

  moveWithCornerAssist(entity, vx, vy, speed, tiles, dt);
}

// Corner-assist movement: when blocked on one axis, detect which corner of
// the bounding box is clipping a wall and nudge perpendicular to clear it.
// This prevents enemies from getting stuck at L-shaped corridor corners.
export function moveWithCornerAssist(
  entity: Entity,
  vx: number,
  vy: number,
  speed: number,
  tiles: TileMap,
  dt: number,
): void {
  const margin = 2;

  // --- X axis ---
  if (vx !== 0) {
    const newX = entity.x + vx * dt;
    if (canMoveTo(entity, newX, entity.y, tiles)) {
      entity.x = newX;
    } else {
      // Check which leading-edge corners are blocked at the proposed X
      const left   = newX + margin;
      const right  = newX + entity.width - margin;
      const top    = entity.y + margin;
      const bottom = entity.y + entity.height - margin;

      const tl = isWalkable(tiles, Math.floor(left / TILE_SIZE), Math.floor(top / TILE_SIZE));
      const tr = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(top / TILE_SIZE));
      const bl = isWalkable(tiles, Math.floor(left / TILE_SIZE), Math.floor(bottom / TILE_SIZE));
      const br = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(bottom / TILE_SIZE));

      const leadTop    = vx > 0 ? tr : tl;
      const leadBottom = vx > 0 ? br : bl;

      if (!leadTop && leadBottom) {
        // Top corner blocked → nudge down
        const nudgeY = entity.y + speed * dt;
        if (canMoveTo(entity, entity.x, nudgeY, tiles)) entity.y = nudgeY;
      } else if (leadTop && !leadBottom) {
        // Bottom corner blocked → nudge up
        const nudgeY = entity.y - speed * dt;
        if (canMoveTo(entity, entity.x, nudgeY, tiles)) entity.y = nudgeY;
      }
    }
  }

  // --- Y axis (uses potentially nudged entity.y from X step) ---
  if (vy !== 0) {
    const newY = entity.y + vy * dt;
    if (canMoveTo(entity, entity.x, newY, tiles)) {
      entity.y = newY;
    } else {
      const left   = entity.x + margin;
      const right  = entity.x + entity.width - margin;
      const top    = newY + margin;
      const bottom = newY + entity.height - margin;

      const tl = isWalkable(tiles, Math.floor(left / TILE_SIZE), Math.floor(top / TILE_SIZE));
      const tr = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(top / TILE_SIZE));
      const bl = isWalkable(tiles, Math.floor(left / TILE_SIZE), Math.floor(bottom / TILE_SIZE));
      const br = isWalkable(tiles, Math.floor(right / TILE_SIZE), Math.floor(bottom / TILE_SIZE));

      const leadLeft  = vy > 0 ? bl : tl;
      const leadRight = vy > 0 ? br : tr;

      if (!leadLeft && leadRight) {
        // Left corner blocked → nudge right
        const nudgeX = entity.x + speed * dt;
        if (canMoveTo(entity, nudgeX, entity.y, tiles)) entity.x = nudgeX;
      } else if (leadLeft && !leadRight) {
        // Right corner blocked → nudge left
        const nudgeX = entity.x - speed * dt;
        if (canMoveTo(entity, nudgeX, entity.y, tiles)) entity.x = nudgeX;
      }
    }
  }
}

// Direct movement toward a target (for close-range chase and patrol).
// Uses diagonal movement — only used in open spaces where clipping isn't an issue.
export function moveToward(
  entity: Entity,
  targetX: number,
  targetY: number,
  speed: number,
  tiles: TileMap,
  dt: number,
): void {
  const dx = targetX - entity.x;
  const dy = targetY - entity.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < 2) return;

  const nx = dx / dist;
  const ny = dy / dist;

  entity.vx = nx * speed;
  entity.vy = ny * speed;

  if (Math.abs(dx) > Math.abs(dy)) {
    entity.facing = dx > 0 ? Direction.EAST : Direction.WEST;
  } else {
    entity.facing = dy > 0 ? Direction.SOUTH : Direction.NORTH;
  }

  moveWithCornerAssist(entity, entity.vx, entity.vy, speed, tiles, dt);
}
