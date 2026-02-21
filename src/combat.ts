import {
  Attack,
  Entity,
  Weapon,
  Direction,
  DamageType,
  GameState,
  KNOCKBACK_SPEED,
} from './types';
import { isKeyPressed } from './input';
import {
  KNOCKBACK_BLUNT,
  KNOCKBACK_SLASH,
  KNOCKBACK_THRUST,
  KNOCKBACK_CONTACT,
} from './config';

// ── Narrative message templates ──

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function narrativeHit(enemy: string, superEffective: boolean, resisted: boolean): string {
  if (superEffective) {
    return pick([
      `Your weapon finds the ${enemy}'s weakness — a devastating blow!`,
      `The ${enemy} shrieks as your strike tears through it!`,
      `A perfect strike! The ${enemy} reels in agony.`,
      `You exploit the ${enemy}'s vulnerability with a brutal hit!`,
    ]);
  }
  if (resisted) {
    return pick([
      `Your weapon glances off the ${enemy} — barely a scratch.`,
      `The ${enemy} shrugs off your feeble strike.`,
      `A dull impact. The ${enemy} seems almost unharmed.`,
      `Your attack barely fazes the ${enemy}.`,
    ]);
  }
  return pick([
    `Your blade bites into the ${enemy}.`,
    `You land a solid blow on the ${enemy}.`,
    `The ${enemy} staggers from your strike.`,
    `Steel meets flesh — the ${enemy} stumbles back.`,
  ]);
}

function narrativeKill(enemy: string): string {
  return pick([
    `The ${enemy} crumbles to the ground, lifeless.`,
    `With a final groan, the ${enemy} collapses.`,
    `The ${enemy} falls — silence returns to the corridor.`,
    `The light fades from the ${enemy}'s eyes.`,
  ]);
}

function narrativePlayerHit(enemy: string): string {
  return pick([
    `The ${enemy}'s claws rake across you — pain flares white-hot!`,
    `You cry out as the ${enemy} catches you off-guard!`,
    `The ${enemy} lunges — its blow sends you reeling!`,
    `Agony. The ${enemy} strikes before you can react.`,
  ]);
}

const KNOCKBACK_TYPE_MULT: Record<DamageType, number> = {
  [DamageType.BLUNT]: KNOCKBACK_BLUNT,
  [DamageType.SLASH]: KNOCKBACK_SLASH,
  [DamageType.THRUST]: KNOCKBACK_THRUST,
};

let attackCooldown = 0;

export function resetCombatState(): void {
  attackCooldown = 0;
}

export function updateCombat(state: GameState, dt: number): void {
  const { player, weapon, attacks, enemies } = state;

  // Decrease cooldown
  attackCooldown = Math.max(0, attackCooldown - dt * 1000);

  // Player attack
  if ((isKeyPressed(' ') || isKeyPressed('j')) && attackCooldown <= 0 && player.alive) {
    const attack = createAttack(player, weapon);
    attacks.push(attack);
    attackCooldown = weapon.cooldown;

    // Degrade weapon
    if (weapon.durability > 0) {
      weapon.durability--;
    }
  }

  // Update attack timers & check hits
  for (let i = attacks.length - 1; i >= 0; i--) {
    const atk = attacks[i]!;
    atk.timer -= dt * 1000;

    if (atk.timer <= 0) {
      attacks.splice(i, 1);
      continue;
    }

    // Check hits against enemies (skip if already hit something)
    if (!atk.hit) {
      for (const enemy of enemies) {
        if (!enemy.alive) continue;
        if (atk.sourceId === enemy.id) continue;

        if (rectsOverlap(atk, enemy)) {
          const mult = enemy.def.vulnerabilities[atk.damageType];
          const dmg = Math.round(atk.damage * mult);
          enemy.health -= dmg;
          atk.hit = true;

          const superEffective = mult >= 2.0;
          const resisted = mult <= 0.5;
          const tag = superEffective ? ' (SUPER EFFECTIVE!)' : resisted ? ' (resisted)' : '';
          state.messages.push({
            text: `Hit ${enemy.def.name} for ${dmg} damage${tag}`,
            timer: 3000,
          });

          // Knockback
          const kbDx = (enemy.x + enemy.width / 2) - (player.x + player.width / 2);
          const kbDy = (enemy.y + enemy.height / 2) - (player.y + player.height / 2);
          const kbDist = Math.sqrt(kbDx * kbDx + kbDy * kbDy) || 1;
          const force = dmg * KNOCKBACK_TYPE_MULT[atk.damageType] / enemy.weight * KNOCKBACK_SPEED;
          enemy.knockbackVx = (kbDx / kbDist) * force;
          enemy.knockbackVy = (kbDy / kbDist) * force;

          // Floating damage number
          state.floatingTexts.push({
            x: enemy.x + enemy.width / 2,
            y: enemy.y,
            text: `-${dmg}`,
            color: superEffective ? '#ff2222' : resisted ? '#888899' : '#ffffff',
            timer: 800,
            maxTimer: 800,
          });

          if (enemy.health <= 0) {
            enemy.alive = false;
            state.messages.push({
              text: `${enemy.def.name} destroyed!`,
              timer: 3000,
            });
          }

          break;
        }
      }
    }
  }

  // Enemy contact damage
  for (const enemy of enemies) {
    if (!enemy.alive || !player.alive) continue;
    enemy.contactTimer = Math.max(0, enemy.contactTimer - dt * 1000);

    if (enemy.contactTimer <= 0 && rectsOverlap(player, enemy)) {
      player.health -= enemy.def.damage;
      enemy.contactTimer = enemy.def.contactCooldown;

      // Knockback player away from enemy
      const cDx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
      const cDy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
      const cDist = Math.sqrt(cDx * cDx + cDy * cDy) || 1;
      const cForce = enemy.def.damage * KNOCKBACK_CONTACT / player.weight * KNOCKBACK_SPEED;
      player.knockbackVx = (cDx / cDist) * cForce;
      player.knockbackVy = (cDy / cDist) * cForce;

      state.messages.push({
        text: `${enemy.def.name} hits you for ${enemy.def.damage} damage!`,
        timer: 3000,
      });

      // Floating damage on player
      state.floatingTexts.push({
        x: player.x + player.width / 2,
        y: player.y,
        text: `-${enemy.def.damage}`,
        color: '#ffffff',
        timer: 800,
        maxTimer: 800,
      });

      if (player.health <= 0) {
        player.health = 0;
        player.alive = false;
        state.gameOver = true;
        state.messages.push({ text: 'You have died. Game over.', timer: 10000 });
      }
    }
  }
}

function createAttack(source: Entity, weapon: Weapon): Attack {
  let x = source.x;
  let y = source.y;
  let w = 16;
  let h = 16;

  const durabilityMult = weapon.durability > 0 ? 1 : 0.5;

  switch (source.facing) {
    case Direction.NORTH:
      x = source.x + source.width / 2 - 8;
      y = source.y - weapon.range;
      w = 16;
      h = weapon.range;
      break;
    case Direction.SOUTH:
      x = source.x + source.width / 2 - 8;
      y = source.y + source.height;
      w = 16;
      h = weapon.range;
      break;
    case Direction.WEST:
      x = source.x - weapon.range;
      y = source.y + source.height / 2 - 8;
      w = weapon.range;
      h = 16;
      break;
    case Direction.EAST:
      x = source.x + source.width;
      y = source.y + source.height / 2 - 8;
      w = weapon.range;
      h = 16;
      break;
  }

  return {
    x,
    y,
    width: w,
    height: h,
    damageType: weapon.damageType,
    damage: Math.round(weapon.baseDamage * durabilityMult),
    sourceId: source.id,
    timer: weapon.attackDuration,
    hit: false,
  };
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
