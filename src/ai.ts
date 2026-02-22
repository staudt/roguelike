import { EnemyEntity, TileMap, TILE_SIZE, GameState } from './types';
import { FlowField } from './pathfinding';
import { hasTag } from './tags';
import {
  AI_CHASE,
  AI_PATROL,
  AI_AMBUSH,
  AI_FLEE_WHEN_HURT,
  AI_BERSERKER,
} from './tags';
import { moveToward, moveAlongFlow } from './enemy';

// ── AI Context ──────────────────────────────────────────
// Passed to every AI layer each frame.

export interface AIContext {
  entity: EnemyEntity;
  playerX: number;
  playerY: number;
  playerAlive: boolean;
  tiles: TileMap;
  flow: FlowField;
  state: GameState;
  dt: number;
}

// ── AI Layer ────────────────────────────────────────────
// Returns true if it handled movement this frame, false to fall through.

type AILayer = (ctx: AIContext) => boolean;

interface AILayerDef {
  tag: string;
  priority: number;
  update: AILayer;
}

// ── Shared helpers ──────────────────────────────────────

function distToPlayer(ctx: AIContext): number {
  const dx = ctx.playerX - ctx.entity.x;
  const dy = ctx.playerY - ctx.entity.y;
  return Math.sqrt(dx * dx + dy * dy);
}

function detectionRange(ctx: AIContext): number {
  return (ctx.entity.def.props.detectionRange ?? 8) * TILE_SIZE;
}

function playerInRange(ctx: AIContext): boolean {
  return distToPlayer(ctx) < detectionRange(ctx) && ctx.playerAlive;
}

function chasePlayer(ctx: AIContext): void {
  const dist = distToPlayer(ctx);
  const closeRange = 1.5 * TILE_SIZE;

  if (dist < closeRange) {
    moveToward(ctx.entity, ctx.playerX, ctx.playerY, ctx.entity.def.speed, ctx.tiles, ctx.dt);
  } else {
    moveAlongFlow(ctx.entity, ctx.flow, ctx.entity.def.speed, ctx.tiles, ctx.dt);
  }
}

// ── Chase Layer ─────────────────────────────────────────
// Pure chase: move toward player when in range.

function chaseLayer(ctx: AIContext): boolean {
  if (!playerInRange(ctx)) return false;
  chasePlayer(ctx);
  return true;
}

// ── Patrol Layer ────────────────────────────────────────
// Wander randomly. If player gets close (5 tiles), switch to chase.
// Falls through to chase layer when chasing.

function patrolLayer(ctx: AIContext): boolean {
  const e = ctx.entity;
  const dist = distToPlayer(ctx);
  const switchRange = 5 * TILE_SIZE;

  // If player is close and in detection range, switch to chase and let chase layer handle
  if (dist < switchRange && playerInRange(ctx)) {
    e.aiState = 'chase';
    return false; // fall through — chase layer will handle movement
  }

  // If currently chasing (was triggered by proximity), keep chasing if in range
  if (e.aiState === 'chase' && playerInRange(ctx)) {
    return false; // fall through to chase layer
  }

  // Otherwise, patrol
  e.aiState = 'patrol';
  if (!e.patrolTarget || Math.random() < 0.01) {
    e.patrolTarget = {
      x: e.x + (Math.random() - 0.5) * 3 * TILE_SIZE,
      y: e.y + (Math.random() - 0.5) * 3 * TILE_SIZE,
    };
  }
  moveToward(e, e.patrolTarget.x, e.patrolTarget.y, e.def.speed * 0.5, ctx.tiles, ctx.dt);
  return true;
}

// ── Ambush Layer ────────────────────────────────────────
// Stay still until player is within 2 tiles, then let lower-priority
// layers (chase) take over.

function ambushLayer(ctx: AIContext): boolean {
  const dist = distToPlayer(ctx);
  const ambushRange = (ctx.entity.def.props.ambushRange ?? 2) * TILE_SIZE;

  if (dist > ambushRange || !ctx.playerAlive) {
    // Stay still — we handle the frame by doing nothing
    ctx.entity.vx = 0;
    ctx.entity.vy = 0;
    return true;
  }
  // Player is close — fall through to chase/other layers
  return false;
}

// ── Flee When Hurt Layer ────────────────────────────────
// When HP drops below threshold, run away from the player.

function fleeWhenHurtLayer(ctx: AIContext): boolean {
  const e = ctx.entity;
  const threshold = e.def.props.fleeThreshold ?? 0.3;
  const hpRatio = e.health / e.maxHealth;

  if (hpRatio > threshold) return false; // HP fine, pass

  // Run away from player
  const dx = e.x - ctx.playerX;
  const dy = e.y - ctx.playerY;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const fleeX = e.x + (dx / dist) * 5 * TILE_SIZE;
  const fleeY = e.y + (dy / dist) * 5 * TILE_SIZE;

  moveToward(e, fleeX, fleeY, e.def.speed * 1.2, ctx.tiles, ctx.dt);
  return true;
}

// ── Berserker Layer ─────────────────────────────────────
// When HP drops below threshold, chase at increased speed.

function berserkerLayer(ctx: AIContext): boolean {
  const e = ctx.entity;
  const threshold = e.def.props.berserkerThreshold ?? 0.4;
  const hpRatio = e.health / e.maxHealth;

  if (hpRatio > threshold || !ctx.playerAlive) return false;

  // Rage chase at boosted speed
  const dist = distToPlayer(ctx);
  const closeRange = 1.5 * TILE_SIZE;
  const rageSpeed = e.def.speed * 1.5;

  if (dist < closeRange) {
    moveToward(e, ctx.playerX, ctx.playerY, rageSpeed, ctx.tiles, ctx.dt);
  } else {
    moveAlongFlow(e, ctx.flow, rageSpeed, ctx.tiles, ctx.dt);
  }
  return true;
}

// ── Layer Registry ──────────────────────────────────────
// Priority-ordered: higher priority layers are checked first.
// Only layers for implemented behaviors are registered.

const AI_LAYERS: AILayerDef[] = [
  { tag: AI_FLEE_WHEN_HURT, priority: 100, update: fleeWhenHurtLayer },
  { tag: AI_BERSERKER,      priority: 80,  update: berserkerLayer },
  { tag: AI_AMBUSH,         priority: 60,  update: ambushLayer },
  { tag: AI_PATROL,         priority: 40,  update: patrolLayer },
  { tag: AI_CHASE,          priority: 30,  update: chaseLayer },
];

// Pre-sort by priority descending (done once)
AI_LAYERS.sort((a, b) => b.priority - a.priority);

// ── runAI ───────────────────────────────────────────────
// Filters to layers this monster has and runs them in priority order.

export function runAI(ctx: AIContext): void {
  const tags = ctx.entity.def.tags;

  for (const layer of AI_LAYERS) {
    if (!hasTag(tags, layer.tag)) continue;
    if (layer.update(ctx)) return;
  }
  // fallback: idle (no movement)
}
