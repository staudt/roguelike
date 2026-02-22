import { Direction } from './types';

// ── Animation State ──────────────────────────────────────
// Lightweight per-entity animation data.
// Updated every frame by updateAnimation().

export interface AnimationState {
  bouncePhase: number;       // sin wave phase, advances while moving
  bounceScaleY: number;      // 0..1 scale factor for squash/stretch (0 = no effect)
  hitFlashTimer: number;     // ms remaining of white flash
  weaponAngle: number;       // current weapon rotation (radians)
  weaponSwinging: boolean;
  weaponSwingTimer: number;  // ms remaining of swing animation
  facingRight: boolean;      // for horizontal mirror rendering
}

export function createAnimationState(): AnimationState {
  return {
    bouncePhase: 0,
    bounceScaleY: 0,
    hitFlashTimer: 0,
    weaponAngle: 0,
    weaponSwinging: false,
    weaponSwingTimer: 0,
    facingRight: true,
  };
}

const BOUNCE_SPEED = 12;        // phase advance per second while moving
const BOUNCE_AMPLITUDE = 0.08;  // max squash/stretch factor (8% of height)
const BOUNCE_DECAY = 15;        // how fast bounce settles when stopped
const HIT_FLASH_DURATION = 120; // ms of white flash on hit
const WEAPON_SWING_DURATION = 150; // ms for a full weapon swing arc
const WEAPON_SWING_ARC = Math.PI * 0.6; // total swing angle (radians)

export { HIT_FLASH_DURATION };

export function updateAnimation(
  anim: AnimationState,
  vx: number,
  vy: number,
  facing: Direction,
  dt: number,
): void {
  const isMoving = Math.abs(vx) > 5 || Math.abs(vy) > 5;

  // Bounce — squash/stretch while moving, settles to zero when stopped
  if (isMoving) {
    anim.bouncePhase += BOUNCE_SPEED * dt;
    anim.bounceScaleY = Math.sin(anim.bouncePhase) * BOUNCE_AMPLITUDE;
  } else {
    // Smoothly settle to zero
    anim.bounceScaleY *= Math.max(0, 1 - BOUNCE_DECAY * dt);
    if (Math.abs(anim.bounceScaleY) < 0.001) anim.bounceScaleY = 0;
  }

  // Facing direction → mirror flag
  if (facing === Direction.EAST) anim.facingRight = true;
  else if (facing === Direction.WEST) anim.facingRight = false;

  // Hit flash timer countdown
  if (anim.hitFlashTimer > 0) {
    anim.hitFlashTimer = Math.max(0, anim.hitFlashTimer - dt * 1000);
  }

  // Weapon swing animation
  if (anim.weaponSwinging) {
    anim.weaponSwingTimer = Math.max(0, anim.weaponSwingTimer - dt * 1000);
    // Swing from -arc/2 to +arc/2 over the duration
    const progress = 1 - anim.weaponSwingTimer / WEAPON_SWING_DURATION;
    anim.weaponAngle = -WEAPON_SWING_ARC / 2 + WEAPON_SWING_ARC * progress;
    if (anim.weaponSwingTimer <= 0) {
      anim.weaponSwinging = false;
      anim.weaponAngle = 0;
    }
  }
}

export function triggerHitFlash(anim: AnimationState): void {
  anim.hitFlashTimer = HIT_FLASH_DURATION;
}

export function triggerWeaponSwing(anim: AnimationState): void {
  anim.weaponSwinging = true;
  anim.weaponSwingTimer = WEAPON_SWING_DURATION;
  anim.weaponAngle = -WEAPON_SWING_ARC / 2;
}
