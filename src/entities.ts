import { GameState, Entity, TileMap, KNOCKBACK_DECAY } from './types';
import {
  ENTITY_OVERLAP_TOLERANCE,
  PLAYER_REGEN_MIN_INTERVAL,
  PLAYER_REGEN_MAX_INTERVAL,
  PLAYER_REGEN_AMOUNT,
} from './config';
import { updatePlayer, canMoveTo } from './player';
import { updateEnemies } from './enemy';
import { updateDog } from './companion';
import { computeFlowField } from './pathfinding';
import { updateAnimation } from './animation';

export function updateEntities(state: GameState, dt: number): void {
  const { player, dog, enemies, dungeon } = state;

  updatePlayer(player, dungeon.tiles, dt);

  // Player health regen: faster when near death, slower at high health
  state.playerLastHitTimer = Math.max(0, state.playerLastHitTimer - dt * 1000);
  if (state.playerLastHitTimer <= 0 && player.alive && player.health < player.maxHealth) {
    const healthPct = player.health / player.maxHealth;
    const interval = PLAYER_REGEN_MIN_INTERVAL + (PLAYER_REGEN_MAX_INTERVAL - PLAYER_REGEN_MIN_INTERVAL) * healthPct;
    state.playerRegenAccum += dt * 1000;
    if (state.playerRegenAccum >= interval) {
      state.playerRegenAccum -= interval;
      player.health = Math.min(player.maxHealth, player.health + PLAYER_REGEN_AMOUNT);
    }
  }

  // Compute flow field from player (shared BFS for all enemies)
  const flow = computeFlowField(
    dungeon.tiles,
    player.x + player.width / 2,
    player.y + player.height / 2,
  );

  updateEnemies(
    enemies,
    player.x + player.width / 2,
    player.y + player.height / 2,
    player.alive,
    dungeon.tiles,
    flow,
    dt,
    state,
  );

  // Update dog companion
  if (dog && dog.alive) {
    updateDog(dog, player, enemies, dungeon.tiles, state, dt);
  }

  // Apply knockback to all entities
  const allEntities: Entity[] = [player, ...enemies];
  if (dog && dog.alive) allEntities.push(dog);
  for (const e of allEntities) {
    if (!e.alive) continue;

    if (Math.abs(e.knockbackVx) > 0.5 || Math.abs(e.knockbackVy) > 0.5) {
      const kbX = e.x + e.knockbackVx * dt;
      const kbY = e.y + e.knockbackVy * dt;

      if (canMoveTo(e, kbX, e.y, dungeon.tiles)) e.x = kbX;
      else e.knockbackVx = 0;

      if (canMoveTo(e, e.x, kbY, dungeon.tiles)) e.y = kbY;
      else e.knockbackVy = 0;

      // Exponential decay
      const decay = Math.pow(KNOCKBACK_DECAY, dt);
      e.knockbackVx *= decay;
      e.knockbackVy *= decay;
    } else {
      e.knockbackVx = 0;
      e.knockbackVy = 0;
    }
  }

  // Resolve entity-entity collisions (allow ~10% overlap)
  resolveEntityCollisions(allEntities, dungeon.tiles);

  // Update animations for all entities
  for (const e of allEntities) {
    if (!e.alive) continue;
    updateAnimation(e.anim, e.vx, e.vy, e.facing, dt);
  }
}

function resolveEntityCollisions(entities: Entity[], tiles: TileMap): void {
  for (let i = 0; i < entities.length; i++) {
    for (let j = i + 1; j < entities.length; j++) {
      const a = entities[i]!;
      const b = entities[j]!;
      if (!a.alive || !b.alive) continue;

      const overlapX = Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x);
      const overlapY = Math.min(a.y + a.height, b.y + b.height) - Math.max(a.y, b.y);

      if (overlapX <= 0 || overlapY <= 0) continue;

      // Allowed overlap: 10% of the smaller entity's dimension
      const minDim = Math.min(a.width, a.height, b.width, b.height);
      const tolerance = minDim * ENTITY_OVERLAP_TOLERANCE;

      // Push along axis of minimum penetration
      if (overlapX < overlapY) {
        if (overlapX <= tolerance) continue;
        const push = overlapX - tolerance;
        const sign = (a.x + a.width / 2) < (b.x + b.width / 2) ? -1 : 1;
        const half = push / 2;
        if (canMoveTo(a, a.x + sign * half, a.y, tiles)) a.x += sign * half;
        if (canMoveTo(b, b.x - sign * half, b.y, tiles)) b.x -= sign * half;
      } else {
        if (overlapY <= tolerance) continue;
        const push = overlapY - tolerance;
        const sign = (a.y + a.height / 2) < (b.y + b.height / 2) ? -1 : 1;
        const half = push / 2;
        if (canMoveTo(a, a.x, a.y + sign * half, tiles)) a.y += sign * half;
        if (canMoveTo(b, b.x, b.y - sign * half, tiles)) b.y -= sign * half;
      }
    }
  }
}
