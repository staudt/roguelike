import { GameState, Entity, TileMap, KNOCKBACK_DECAY, TILE_SIZE } from './types';
import {
  ENTITY_OVERLAP_TOLERANCE,
  PLAYER_REGEN_MIN_INTERVAL,
  PLAYER_REGEN_MAX_INTERVAL,
  PLAYER_REGEN_AMOUNT,
  TRAP_DETECT_RADIUS,
  TRAP_DETECT_CHANCE_DIV,
  POISON_TICK_INTERVAL,
  PIT_ESCAPE_INTERVAL,
} from './config';
import { updatePlayer, canMoveTo } from './player';
import { updateEnemies } from './enemy';
import { updateDog } from './companion';
import { computeFlowField } from './pathfinding';
import { updateAnimation, triggerHitFlash } from './animation';
import { StatusEffectType } from './status';
import { Trap, TrapType } from './dungeon/types';
import { getSearchBonus } from './attributes';

export function updateEntities(state: GameState, dt: number): void {
  const { player, dog, enemies, dungeon } = state;

  // ── Tick status effects ─────────────────────────────────
  tickStatusEffects(state, dt);

  // ── Trap detection & triggering ─────────────────────────
  updateTraps(state);

  updatePlayer(player, dungeon.tiles, dt, state.playerStatusEffects);

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

// ── Status Effect Ticking ───────────────────────────────

function tickStatusEffects(state: GameState, dt: number): void {
  const { player } = state;
  const dtMs = dt * 1000;

  for (let i = state.playerStatusEffects.length - 1; i >= 0; i--) {
    const eff = state.playerStatusEffects[i]!;

    if (eff.type === StatusEffectType.IN_PIT) {
      // Escape check every PIT_ESCAPE_INTERVAL ms
      eff.pitEscapeTimer -= dtMs;
      if (eff.pitEscapeTimer <= 0) {
        eff.pitEscapeTimer = PIT_ESCAPE_INTERVAL;
        const dex = state.playerAttributes.dex;
        if (Math.random() < dex / 25) {
          state.playerStatusEffects.splice(i, 1);
          state.messages.push({ text: 'You climb out of the pit.', timer: 4000 });
        }
      }
      continue; // IN_PIT has no duration timer
    }

    eff.duration -= dtMs;

    if (eff.type === StatusEffectType.POISONED) {
      eff.tickTimer -= dtMs;
      if (eff.tickTimer <= 0) {
        eff.tickTimer = POISON_TICK_INTERVAL;
        const dmg = Math.max(1, eff.magnitude);
        player.health -= dmg;
        triggerHitFlash(player.anim);
        state.playerLastHitTimer = 5000; // reset regen delay
        state.playerRegenAccum = 0;
        state.floatingTexts.push({
          x: player.x + player.width / 2,
          y: player.y,
          text: `-${dmg}`,
          color: '#44ff44',
          timer: 800,
          maxTimer: 800,
        });
        if (player.health <= 0) {
          player.health = 0;
          player.alive = false;
          state.gameOver = true;
          state.messages.push({ text: 'The poison claims your life.', timer: 10000 });
        }
      }
    }

    if (eff.duration <= 0) {
      state.playerStatusEffects.splice(i, 1);
      const label = eff.type === StatusEffectType.PARALYZED ? 'You can move again.'
        : eff.type === StatusEffectType.POISONED ? 'The poison has run its course.'
        : eff.type === StatusEffectType.SLOWED ? 'You feel your speed return.'
        : eff.type === StatusEffectType.BLINDED ? 'Your vision slowly returns.'
        : '';
      if (label) state.messages.push({ text: label, timer: 4000 });
    }
  }
}

// ── Trap System ─────────────────────────────────────────

function updateTraps(state: GameState): void {
  const { player, dungeon } = state;
  const traps = dungeon.traps;
  if (!traps || traps.length === 0) return;

  const searchBonus = getSearchBonus(state.playerAttributes);
  const playerTileX = Math.floor((player.x + player.width / 2) / TILE_SIZE);
  const playerTileY = Math.floor((player.y + player.height / 2) / TILE_SIZE);

  for (const trap of traps) {
    if (trap.triggered) continue;

    // Detection: try to reveal traps within search radius
    if (!trap.revealed) {
      const dx = playerTileX - trap.tileX;
      const dy = playerTileY - trap.tileY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist <= TRAP_DETECT_RADIUS) {
        const detectChance = searchBonus / (searchBonus + TRAP_DETECT_CHANCE_DIV);
        // Scale by dt so detection accumulates naturally over time
        if (Math.random() < detectChance * 0.016) { // ~1% per frame at 60fps for search=1
          trap.revealed = true;
          state.messages.push({ text: 'You notice a trap!', timer: 4000 });
        }
      }
    }

    // Triggering: player walks over the trap
    if (playerTileX === trap.tileX && playerTileY === trap.tileY) {
      trap.triggered = true;
      trap.revealed = true;
      triggerTrap(state, trap);
    }
  }
}

function triggerTrap(state: GameState, trap: Trap): void {
  const { player } = state;

  switch (trap.type) {
    case TrapType.ARROW: {
      const dmg = 5 + Math.floor(Math.random() * 5); // 5-9
      player.health -= dmg;
      triggerHitFlash(player.anim);
      state.playerLastHitTimer = 5000;
      state.playerRegenAccum = 0;
      state.messages.push({ text: 'An arrow shoots out and hits you!', timer: 5000 });
      state.floatingTexts.push({
        x: player.x + player.width / 2,
        y: player.y,
        text: `-${dmg}`,
        color: '#ffffff',
        timer: 800,
        maxTimer: 800,
      });
      if (player.health <= 0) {
        player.health = 0;
        player.alive = false;
        state.gameOver = true;
        state.messages.push({ text: 'Darkness closes in... your tale ends here.', timer: 10000 });
      }
      break;
    }

    case TrapType.PIT: {
      const dmg = 3 + Math.floor(Math.random() * 4); // 3-6
      player.health -= dmg;
      triggerHitFlash(player.anim);
      state.playerLastHitTimer = 5000;
      state.playerRegenAccum = 0;
      state.messages.push({ text: 'You fall into a pit!', timer: 5000 });
      state.floatingTexts.push({
        x: player.x + player.width / 2,
        y: player.y,
        text: `-${dmg}`,
        color: '#ffffff',
        timer: 800,
        maxTimer: 800,
      });
      // Apply IN_PIT status (escape via DEX checks)
      if (!state.playerStatusEffects.some(e => e.type === StatusEffectType.IN_PIT)) {
        state.playerStatusEffects.push({
          type: StatusEffectType.IN_PIT,
          duration: 0,
          magnitude: 0,
          tickTimer: 0,
          pitEscapeTimer: PIT_ESCAPE_INTERVAL,
        });
      }
      if (player.health <= 0) {
        player.health = 0;
        player.alive = false;
        state.gameOver = true;
        state.messages.push({ text: 'Darkness closes in... your tale ends here.', timer: 10000 });
      }
      break;
    }

    case TrapType.SLEEP_GAS: {
      const duration = 3000 + Math.random() * 3000; // 3-6 seconds
      state.messages.push({ text: 'Sleeping gas fills the area! You fall asleep.', timer: 5000 });
      const existing = state.playerStatusEffects.find(e => e.type === StatusEffectType.PARALYZED);
      if (existing) {
        existing.duration = Math.max(existing.duration, duration);
      } else {
        state.playerStatusEffects.push({
          type: StatusEffectType.PARALYZED,
          duration,
          magnitude: 0,
          tickTimer: 0,
          pitEscapeTimer: 0,
        });
      }
      break;
    }
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
