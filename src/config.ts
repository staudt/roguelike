// ── Tunable Game Settings ────────────────────────────────
// Tweak these values to adjust gameplay feel.

// ── Map ──
export const TILE_SIZE = 32;
export const MAP_WIDTH = 50;
export const MAP_HEIGHT = 40;

// ── Camera ──
export const CAMERA_SCALE = 2;       // 1 = no zoom, 2 = 2× zoom
export const CAMERA_LERP_SPEED = 8;  // higher = snappier camera follow

// ── Player ──
export const PLAYER_SPEED = 160;     // pixels per second
export const PLAYER_WEIGHT = 1.0;
export const PLAYER_REGEN_DELAY = 5000;        // ms without damage before regen starts
export const PLAYER_REGEN_MIN_INTERVAL = 500;  // ms per tick when near death
export const PLAYER_REGEN_MAX_INTERVAL = 2500; // ms per tick at full-ish health
export const PLAYER_REGEN_AMOUNT = 1;          // HP per tick

// ── Field of View ──
export const FOV_RANGE = 8;          // radius in tiles

// ── Knockback ──
export const KNOCKBACK_SPEED = 8;    // pixels per unit of force
export const KNOCKBACK_DECAY = 0.0005; // exponential decay rate (~100ms half-life)
export const KNOCKBACK_BLUNT = 3.0;  // knockback multiplier for blunt attacks
export const KNOCKBACK_SLASH = 1.5;  // knockback multiplier for slash attacks
export const KNOCKBACK_THRUST = 0.8; // knockback multiplier for thrust attacks
export const KNOCKBACK_CONTACT = 4.0; // multiplier for enemy contact knockback

// ── Combat ──
export const ENTITY_OVERLAP_TOLERANCE = 0.1; // fraction of overlap allowed (0.1 = 10%)

// ── Dog Companion ──

export interface DogForm {
  id: string;
  name: string;         // display name: 'little dog', 'dog', 'large dog'
  minLevel: number;     // level at which this form is reached
  health: number;
  speed: number;
  weight: number;
  biteDamage: number;
  biteCooldown: number; // ms between bites
  size: number;         // width and height in pixels
  color: string;
}

export const DOG_FORMS: DogForm[] = [
  {
    id: 'little_dog',
    name: 'little dog',
    minLevel: 1,
    health: 30,
    speed: 170,
    weight: 0.6,
    biteDamage: 5,
    biteCooldown: 900,
    size: 20,
    color: '#b8935a',
  },
  {
    id: 'dog',
    name: 'dog',
    minLevel: 3,
    health: 45,
    speed: 180,
    weight: 0.8,
    biteDamage: 7,
    biteCooldown: 800,
    size: 24,
    color: '#c4854c',
  },
  {
    id: 'large_dog',
    name: 'large dog',
    minLevel: 7,
    health: 70,
    speed: 175,
    weight: 1.0,
    biteDamage: 11,
    biteCooldown: 700,
    size: 28,
    color: '#a06830',
  },
];

/** Get the appropriate dog form for a given level */
export function getDogForm(level: number): DogForm {
  // Walk backwards — pick the highest-tier form the dog qualifies for
  for (let i = DOG_FORMS.length - 1; i >= 0; i--) {
    const form = DOG_FORMS[i];
    if (form && level >= form.minLevel) return form;
  }
  return DOG_FORMS[0]!;
}

// Shared constants (don't change with evolution)
export const DOG_BITE_RANGE = 1.5;        // tiles — distance to initiate bite
export const DOG_BITE_ATK_DURATION = 150; // ms — attack hitbox lifespan
export const DOG_BITE_ATK_RANGE = 28;    // pixels — hitbox length
export const DOG_FOLLOW_DISTANCE = 3;    // tiles — how far before dog runs back
export const DOG_ATTACK_RANGE = 4;       // tiles — enemy detection range
export const DOG_EXPLORE_CHANCE = 0.003; // per-frame chance to explore when idle
export const DOG_EXPLORE_TIMEOUT = 3000; // ms before dog returns from exploring
export const DOG_FLEE_THRESHOLD = 0.35;  // flee when health drops below 35%
export const DOG_FLEE_RECOVER = 0.6;     // stop fleeing once health reaches 60%
export const DOG_FLEE_RANGE = 5;         // tiles — how far to run from enemies
export const DOG_REGEN_DELAY = 4000;     // ms without damage before regen starts
export const DOG_REGEN_INTERVAL = 800;   // ms between each +1 HP tick
export const DOG_REGEN_AMOUNT = 1;       // HP per tick
