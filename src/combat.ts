import {
  Attack,
  Entity,
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
  DOG_REGEN_DELAY,
  PLAYER_REGEN_DELAY,
} from './config';
import { computeXPReward, checkLevelUp, monsterXPForKill, checkMonsterLevelUp } from './progression';
import { WeaponDef } from './items/defs';
import { getWeaponDef } from './items';
import { getSTRDamageBonus, getDEXSpeedMult, getCONHPBonus } from './attributes';
import { getRoleDef } from './roles';
import { triggerHitFlash, triggerWeaponSwing } from './animation';

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

function narrativeDogBite(enemy: string): string {
  return pick([
    `Your dog lunges at the ${enemy}, jaws snapping!`,
    `A flash of teeth — your dog sinks a bite into the ${enemy}!`,
    `Your dog growls and clamps down on the ${enemy}!`,
    `With a snarl, your dog tears at the ${enemy}!`,
  ]);
}

function narrativeDogKill(enemy: string): string {
  return pick([
    `Your dog shakes the ${enemy} one last time — it goes still.`,
    `The ${enemy} crumples under your dog's relentless assault.`,
    `Your dog stands over the fallen ${enemy}, panting.`,
    `A final bite and the ${enemy} moves no more. Your dog looks up at you.`,
  ]);
}

function narrativeDogHit(enemy: string): string {
  return pick([
    `The ${enemy} strikes your dog — a pained yelp echoes through the chamber!`,
    `Your dog whimpers as the ${enemy}'s blow connects!`,
    `The ${enemy} catches your dog with a vicious strike!`,
    `A sharp cry — the ${enemy} has wounded your dog!`,
  ]);
}

function narrativeDogDeath(): string {
  return pick([
    `Your faithful companion falls... and does not rise again.`,
    `Your dog collapses with a final whimper. The silence that follows is deafening.`,
    `The dungeon claims another soul. Your dog lies still, eyes glazing over.`,
    `A mournful howl fades into the darkness. You are alone now.`,
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
  const { player, dog, inventory, attacks, enemies } = state;
  const weaponInstance = inventory.equipped.weapon;
  const weaponDef = weaponInstance ? getWeaponDef(weaponInstance.defId) : null;

  // Decrease cooldown
  attackCooldown = Math.max(0, attackCooldown - dt * 1000);

  // Player attack (STR adds damage, DEX speeds up cooldown)
  const strBonus = getSTRDamageBonus(state.playerAttributes);
  const dexMult = getDEXSpeedMult(state.playerAttributes);

  if ((isKeyPressed(' ') || isKeyPressed('j')) && attackCooldown <= 0 && player.alive && weaponDef && weaponInstance) {
    const durability = weaponInstance.durability ?? 0;
    const attack = createAttack(player, weaponDef, durability, strBonus);
    attacks.push(attack);
    attackCooldown = weaponDef.cooldown * dexMult;
    triggerWeaponSwing(player.anim);

    // Degrade weapon
    if (weaponInstance.durability != null && weaponInstance.durability > 0) {
      weaponInstance.durability--;
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
          // Attacking a peaceful creature makes it hostile
          const wasPeaceful = !enemy.hostile;
          if (wasPeaceful) {
            enemy.hostile = true;
          }

          const mult = enemy.def.vulnerabilities[atk.damageType] ?? 1.0;
          const dmg = Math.round(atk.damage * mult);
          enemy.health -= dmg;
          atk.hit = true;
          triggerHitFlash(enemy.anim);

          const superEffective = mult >= 2.0;
          const resisted = mult <= 0.5;
          const isDogAttack = dog && atk.sourceId === dog.id;

          if (isDogAttack) {
            state.messages.push({
              text: narrativeDogBite(enemy.def.name),
              timer: 4000,
            });
          } else {
            state.messages.push({
              text: narrativeHit(enemy.def.name, superEffective, resisted),
              timer: 4000,
            });
          }

          // Knockback away from attack source (player or dog)
          const source = isDogAttack ? dog : player;
          const kbDx = (enemy.x + enemy.width / 2) - (source.x + source.width / 2);
          const kbDy = (enemy.y + enemy.height / 2) - (source.y + source.height / 2);
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
              text: isDogAttack ? narrativeDogKill(enemy.def.name) : narrativeKill(enemy.def.name),
              timer: 5000,
              narrate: true,
            });

            if (wasPeaceful) {
              // No XP for killing peaceful creatures
              state.messages.push({
                text: `You feel guilty about killing the peaceful ${enemy.def.name}.`,
                timer: 5000,
                narrate: true,
              });
            } else {
              // Award XP (player always gets XP, even for dog kills)
              const xpGain = computeXPReward(enemy.def.difficulty ?? 0);
              state.playerXP += xpGain;

              state.floatingTexts.push({
                x: enemy.x + enemy.width / 2,
                y: enemy.y - 12,
                text: `+${xpGain} XP`,
                color: '#ffdd44',
                timer: 1200,
                maxTimer: 1200,
              });

              // Check player level-up (CON-based HP, role-based hpDie)
              const role = getRoleDef(state.playerRole);
              const conBonus = getCONHPBonus(state.playerAttributes);
              const levelUp = checkLevelUp(state.playerXP, state.playerLevel, role.hpDie, conBonus);
              if (levelUp) {
                state.playerLevel = levelUp.newLevel;
                player.maxHealth += levelUp.hpGain;
                player.health = player.maxHealth; // full heal on level-up
                state.messages.push({
                  text: `You feel stronger! Level ${levelUp.newLevel}! (+${levelUp.hpGain} HP)`,
                  timer: 6000,
                  narrate: true,
                });
              }

              // Dog XP and leveling (dog gains XP from its own kills)
              if (isDogAttack && dog) {
                const dogXP = monsterXPForKill(enemy.def.difficulty ?? 0);
                dog.xp += dogXP;
                const dogLevelUp = checkMonsterLevelUp(dog.xp, dog.level, 3);
                if (dogLevelUp) {
                  dog.level = dogLevelUp.newLevel;
                  dog.maxHealth += dogLevelUp.hpGain;
                  dog.health = Math.min(dog.health + dogLevelUp.hpGain, dog.maxHealth);
                  state.messages.push({
                    text: `Your dog grows stronger! Level ${dogLevelUp.newLevel}! (+${dogLevelUp.hpGain} HP)`,
                    timer: 5000,
                    narrate: true,
                  });
                }
              }
            }
          }

          break;
        }
      }
    }
  }

  // Enemy contact damage (hostile only)
  for (const enemy of enemies) {
    if (!enemy.alive || !player.alive || !enemy.hostile) continue;
    enemy.contactTimer = Math.max(0, enemy.contactTimer - dt * 1000);

    if (enemy.contactTimer <= 0 && rectsOverlap(player, enemy)) {
      player.health -= enemy.def.damage;
      triggerHitFlash(player.anim);
      state.playerLastHitTimer = PLAYER_REGEN_DELAY;
      state.playerRegenAccum = 0;
      enemy.contactTimer = enemy.def.props.contactCooldown ?? 1000;

      // Knockback player away from enemy
      const cDx = (player.x + player.width / 2) - (enemy.x + enemy.width / 2);
      const cDy = (player.y + player.height / 2) - (enemy.y + enemy.height / 2);
      const cDist = Math.sqrt(cDx * cDx + cDy * cDy) || 1;
      const cForce = enemy.def.damage * KNOCKBACK_CONTACT / player.weight * KNOCKBACK_SPEED;
      player.knockbackVx = (cDx / cDist) * cForce;
      player.knockbackVy = (cDy / cDist) * cForce;

      state.messages.push({
        text: narrativePlayerHit(enemy.def.name),
        timer: 4000,
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
        state.messages.push({ text: 'Darkness closes in... your tale ends here.', timer: 10000, narrate: true });
      }
    }
  }

  // Enemy contact damage against dog (hostile only)
  if (dog && dog.alive) {
    for (const enemy of enemies) {
      if (!enemy.alive || !enemy.hostile) continue;

      if (enemy.contactTimer <= 0 && rectsOverlap(dog, enemy)) {
        dog.health -= enemy.def.damage;
        triggerHitFlash(dog.anim);
        dog.lastHitTimer = DOG_REGEN_DELAY;
        dog.regenAccum = 0;
        enemy.contactTimer = enemy.def.props.contactCooldown ?? 1000;

        // Knockback dog away from enemy
        const cDx = (dog.x + dog.width / 2) - (enemy.x + enemy.width / 2);
        const cDy = (dog.y + dog.height / 2) - (enemy.y + enemy.height / 2);
        const cDist = Math.sqrt(cDx * cDx + cDy * cDy) || 1;
        const cForce = enemy.def.damage * KNOCKBACK_CONTACT / dog.weight * KNOCKBACK_SPEED;
        dog.knockbackVx = (cDx / cDist) * cForce;
        dog.knockbackVy = (cDy / cDist) * cForce;

        state.messages.push({
          text: narrativeDogHit(enemy.def.name),
          timer: 4000,
          narrate: true,
        });

        state.floatingTexts.push({
          x: dog.x + dog.width / 2,
          y: dog.y,
          text: `-${enemy.def.damage}`,
          color: '#c4854c',
          timer: 800,
          maxTimer: 800,
        });

        if (dog.health <= 0) {
          dog.health = 0;
          dog.alive = false;
          state.dog = null;
          state.messages.push({ text: narrativeDogDeath(), timer: 8000, narrate: true });
        }
      }
    }
  }
}

function createAttack(source: Entity, weaponDef: WeaponDef, durability: number, damageBonus: number = 0): Attack {
  let x = source.x;
  let y = source.y;
  let w = 16;
  let h = 16;

  const durabilityMult = durability > 0 ? 1 : 0.5;

  switch (source.facing) {
    case Direction.NORTH:
      x = source.x + source.width / 2 - 8;
      y = source.y - weaponDef.range;
      w = 16;
      h = weaponDef.range;
      break;
    case Direction.SOUTH:
      x = source.x + source.width / 2 - 8;
      y = source.y + source.height;
      w = 16;
      h = weaponDef.range;
      break;
    case Direction.WEST:
      x = source.x - weaponDef.range;
      y = source.y + source.height / 2 - 8;
      w = weaponDef.range;
      h = 16;
      break;
    case Direction.EAST:
      x = source.x + source.width;
      y = source.y + source.height / 2 - 8;
      w = weaponDef.range;
      h = 16;
      break;
  }

  return {
    x,
    y,
    width: w,
    height: h,
    damageType: weaponDef.damageType,
    damage: Math.max(1, Math.round((weaponDef.baseDamage + damageBonus) * durabilityMult)),
    sourceId: source.id,
    timer: weaponDef.attackDuration,
    hit: false,
  };
}

function rectsOverlap(
  a: { x: number; y: number; width: number; height: number },
  b: { x: number; y: number; width: number; height: number },
): boolean {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}
