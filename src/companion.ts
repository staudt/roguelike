import {
  CompanionEntity,
  Entity,
  EnemyEntity,
  Direction,
  DamageType,
  Attack,
  GameState,
  TileMap,
  TILE_SIZE,
} from './types';
import { getNextId } from './game';
import { PAL } from './palette';
import { moveToward } from './enemy';
import { createAnimationState, triggerWeaponSwing } from './animation';
import {
  DOG_SPEED,
  DOG_HEALTH,
  DOG_WEIGHT,
  DOG_BITE_DAMAGE,
  DOG_BITE_RANGE,
  DOG_BITE_COOLDOWN,
  DOG_BITE_ATK_DURATION,
  DOG_BITE_ATK_RANGE,
  DOG_FOLLOW_DISTANCE,
  DOG_ATTACK_RANGE,
  DOG_EXPLORE_CHANCE,
  DOG_EXPLORE_TIMEOUT,
  DOG_FLEE_THRESHOLD,
  DOG_FLEE_RECOVER,
  DOG_FLEE_RANGE,
  DOG_REGEN_INTERVAL,
  DOG_REGEN_AMOUNT,
} from './config';

// ── Spawn ────────────────────────────────────────────────

export function createDog(playerX: number, playerY: number): CompanionEntity {
  return {
    id: getNextId(),
    x: playerX + 30,
    y: playerY + 10,
    width: 24,
    height: 24,
    vx: 0,
    vy: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    weight: DOG_WEIGHT,
    facing: Direction.SOUTH,
    health: DOG_HEALTH,
    maxHealth: DOG_HEALTH,
    color: PAL.dog,
    alive: true,
    hitTimer: 0,
    anim: createAnimationState(),
    aiState: 'follow',
    targetEnemyId: null,
    attackCooldown: 0,
    exploreTarget: null,
    returnTimer: 0,
    lastHitTimer: 0,
    regenAccum: 0,
    level: 1,
    xp: 0,
  };
}

// ── AI Update ────────────────────────────────────────────

export function updateDog(
  dog: CompanionEntity,
  player: Entity,
  enemies: EnemyEntity[],
  tiles: TileMap,
  state: GameState,
  dt: number,
): void {
  if (!dog.alive) return;

  dog.attackCooldown = Math.max(0, dog.attackCooldown - dt * 1000);
  dog.lastHitTimer = Math.max(0, dog.lastHitTimer - dt * 1000);

  // Health regen: starts after a delay without damage, ticks slowly
  if (dog.lastHitTimer <= 0 && dog.health < dog.maxHealth) {
    dog.regenAccum += dt * 1000;
    if (dog.regenAccum >= DOG_REGEN_INTERVAL) {
      dog.regenAccum -= DOG_REGEN_INTERVAL;
      const oldHealth = dog.health;
      dog.health = Math.min(dog.maxHealth, dog.health + DOG_REGEN_AMOUNT);
      if (oldHealth <= dog.maxHealth * DOG_FLEE_THRESHOLD && dog.health > dog.maxHealth * DOG_FLEE_THRESHOLD) {
        state.messages.push({ text: 'Your dog steadies itself, wounds beginning to close.', timer: 4000 });
      }
    }
  }

  // Check if dog should flee (hurt badly)
  const healthPct = dog.health / dog.maxHealth;
  if (dog.aiState !== 'flee' && healthPct <= DOG_FLEE_THRESHOLD) {
    dog.aiState = 'flee';
    dog.targetEnemyId = null;
    state.messages.push({ text: 'Your dog yelps and backs away, limping from its wounds!', timer: 4000 });
  }

  const dogCX = dog.x + dog.width / 2;
  const dogCY = dog.y + dog.height / 2;
  const playerCX = player.x + player.width / 2;
  const playerCY = player.y + player.height / 2;
  const distToPlayer = Math.sqrt((dogCX - playerCX) ** 2 + (dogCY - playerCY) ** 2);

  switch (dog.aiState) {
    case 'follow':
      updateFollow(dog, player, enemies, tiles, distToPlayer, dt);
      break;
    case 'attack':
      updateAttack(dog, player, enemies, tiles, state, distToPlayer, dt);
      break;
    case 'explore':
      updateExplore(dog, player, tiles, distToPlayer, dt);
      break;
    case 'flee':
      updateFlee(dog, player, enemies, tiles, state, distToPlayer, dt);
      break;
  }
}

// ── Follow State ─────────────────────────────────────────

function updateFollow(
  dog: CompanionEntity,
  player: Entity,
  enemies: EnemyEntity[],
  tiles: TileMap,
  distToPlayer: number,
  dt: number,
): void {
  const followDist = DOG_FOLLOW_DISTANCE * TILE_SIZE;

  // Check for nearby enemies to attack
  const nearest = findNearestEnemy(dog, enemies, DOG_ATTACK_RANGE * TILE_SIZE);
  if (nearest) {
    dog.aiState = 'attack';
    dog.targetEnemyId = nearest.id;
    return;
  }

  if (distToPlayer > followDist) {
    // Run back toward player
    moveToward(dog, player.x + player.width / 2, player.y + player.height / 2, DOG_SPEED, tiles, dt);
  } else {
    // Gentle wander near player
    if (!dog.exploreTarget || Math.random() < 0.02) {
      dog.exploreTarget = {
        x: player.x + (Math.random() - 0.5) * 2 * TILE_SIZE,
        y: player.y + (Math.random() - 0.5) * 2 * TILE_SIZE,
      };
    }
    moveToward(dog, dog.exploreTarget.x, dog.exploreTarget.y, DOG_SPEED * 0.4, tiles, dt);

    // Random explore chance
    if (Math.random() < DOG_EXPLORE_CHANCE) {
      dog.aiState = 'explore';
      dog.returnTimer = DOG_EXPLORE_TIMEOUT;
      dog.exploreTarget = {
        x: dog.x + (Math.random() - 0.5) * 8 * TILE_SIZE,
        y: dog.y + (Math.random() - 0.5) * 8 * TILE_SIZE,
      };
    }
  }
}

// ── Attack State ─────────────────────────────────────────

function updateAttack(
  dog: CompanionEntity,
  player: Entity,
  enemies: EnemyEntity[],
  tiles: TileMap,
  state: GameState,
  _distToPlayer: number,
  dt: number,
): void {
  const target = enemies.find(e => e.id === dog.targetEnemyId && e.alive);

  // Target dead or too far from player — return to follow
  if (!target) {
    dog.aiState = 'follow';
    dog.targetEnemyId = null;
    return;
  }

  const targetCX = target.x + target.width / 2;
  const targetCY = target.y + target.height / 2;
  const playerCX = player.x + player.width / 2;
  const playerCY = player.y + player.height / 2;
  const enemyDistToPlayer = Math.sqrt((targetCX - playerCX) ** 2 + (targetCY - playerCY) ** 2);

  if (enemyDistToPlayer > 8 * TILE_SIZE) {
    dog.aiState = 'follow';
    dog.targetEnemyId = null;
    return;
  }

  const dogCX = dog.x + dog.width / 2;
  const dogCY = dog.y + dog.height / 2;
  const distToTarget = Math.sqrt((dogCX - targetCX) ** 2 + (dogCY - targetCY) ** 2);

  if (distToTarget < DOG_BITE_RANGE * TILE_SIZE && dog.attackCooldown <= 0) {
    // Create bite attack
    const attack = createBiteAttack(dog, target);
    state.attacks.push(attack);
    dog.attackCooldown = DOG_BITE_COOLDOWN;
    triggerWeaponSwing(dog.anim);
  } else {
    // Chase the enemy
    moveToward(dog, targetCX, targetCY, DOG_SPEED, tiles, dt);
  }
}

// ── Explore State ────────────────────────────────────────

function updateExplore(
  dog: CompanionEntity,
  _player: Entity,
  tiles: TileMap,
  distToPlayer: number,
  dt: number,
): void {
  dog.returnTimer -= dt * 1000;

  // Return if timeout or too far from player
  if (dog.returnTimer <= 0 || distToPlayer > 6 * TILE_SIZE) {
    dog.aiState = 'follow';
    dog.exploreTarget = null;
    return;
  }

  if (dog.exploreTarget) {
    moveToward(dog, dog.exploreTarget.x, dog.exploreTarget.y, DOG_SPEED * 0.7, tiles, dt);

    // If reached target, return
    const dx = dog.x - dog.exploreTarget.x;
    const dy = dog.y - dog.exploreTarget.y;
    if (Math.sqrt(dx * dx + dy * dy) < TILE_SIZE) {
      dog.aiState = 'follow';
      dog.exploreTarget = null;
    }
  }
}

// ── Flee State ───────────────────────────────────────────

function updateFlee(
  dog: CompanionEntity,
  player: Entity,
  enemies: EnemyEntity[],
  tiles: TileMap,
  state: GameState,
  distToPlayer: number,
  dt: number,
): void {
  // Recover enough to stop fleeing
  const healthPct = dog.health / dog.maxHealth;
  if (healthPct >= DOG_FLEE_RECOVER) {
    dog.aiState = 'follow';
    state.messages.push({ text: 'Your dog perks up, ready to fight again.', timer: 4000 });
    return;
  }

  // Run away from the nearest enemy
  const nearest = findNearestEnemy(dog, enemies, DOG_FLEE_RANGE * TILE_SIZE);
  if (nearest) {
    const dogCX = dog.x + dog.width / 2;
    const dogCY = dog.y + dog.height / 2;
    const eCX = nearest.x + nearest.width / 2;
    const eCY = nearest.y + nearest.height / 2;

    // Move in opposite direction from enemy, toward player
    const awayX = dogCX - eCX;
    const awayY = dogCY - eCY;
    const awayDist = Math.sqrt(awayX * awayX + awayY * awayY) || 1;

    // Blend: flee from enemy + gravitate toward player
    const toPlayerX = player.x + player.width / 2 - dogCX;
    const toPlayerY = player.y + player.height / 2 - dogCY;
    const toPlayerDist = Math.sqrt(toPlayerX * toPlayerX + toPlayerY * toPlayerY) || 1;

    const targetX = dogCX + (awayX / awayDist) * TILE_SIZE * 3 + (toPlayerX / toPlayerDist) * TILE_SIZE;
    const targetY = dogCY + (awayY / awayDist) * TILE_SIZE * 3 + (toPlayerY / toPlayerDist) * TILE_SIZE;

    moveToward(dog, targetX, targetY, DOG_SPEED * 1.1, tiles, dt);
  } else {
    // No enemies nearby — stay near player
    if (distToPlayer > DOG_FOLLOW_DISTANCE * TILE_SIZE) {
      moveToward(dog, player.x + player.width / 2, player.y + player.height / 2, DOG_SPEED, tiles, dt);
    }
  }
}

// ── Helpers ──────────────────────────────────────────────

function findNearestEnemy(
  dog: CompanionEntity,
  enemies: EnemyEntity[],
  maxRange: number,
): EnemyEntity | null {
  const dogCX = dog.x + dog.width / 2;
  const dogCY = dog.y + dog.height / 2;
  let nearest: EnemyEntity | null = null;
  let nearestDist = maxRange;

  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const dx = (enemy.x + enemy.width / 2) - dogCX;
    const dy = (enemy.y + enemy.height / 2) - dogCY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < nearestDist) {
      nearestDist = dist;
      nearest = enemy;
    }
  }

  return nearest;
}

function createBiteAttack(dog: CompanionEntity, target: Entity): Attack {
  // Face the target
  const dx = (target.x + target.width / 2) - (dog.x + dog.width / 2);
  const dy = (target.y + target.height / 2) - (dog.y + dog.height / 2);
  if (Math.abs(dx) > Math.abs(dy)) {
    dog.facing = dx > 0 ? Direction.EAST : Direction.WEST;
  } else {
    dog.facing = dy > 0 ? Direction.SOUTH : Direction.NORTH;
  }

  let x = dog.x;
  let y = dog.y;
  let w = 16;
  let h = 16;
  const range = DOG_BITE_ATK_RANGE;

  switch (dog.facing) {
    case Direction.NORTH:
      x = dog.x + dog.width / 2 - 8;
      y = dog.y - range;
      w = 16; h = range;
      break;
    case Direction.SOUTH:
      x = dog.x + dog.width / 2 - 8;
      y = dog.y + dog.height;
      w = 16; h = range;
      break;
    case Direction.WEST:
      x = dog.x - range;
      y = dog.y + dog.height / 2 - 8;
      w = range; h = 16;
      break;
    case Direction.EAST:
      x = dog.x + dog.width;
      y = dog.y + dog.height / 2 - 8;
      w = range; h = 16;
      break;
  }

  return {
    x,
    y,
    width: w,
    height: h,
    damageType: DamageType.BLUNT,
    damage: DOG_BITE_DAMAGE,
    sourceId: dog.id,
    timer: DOG_BITE_ATK_DURATION,
    hit: false,
  };
}
