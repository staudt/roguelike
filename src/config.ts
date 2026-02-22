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
export const DOG_SPEED = 180;
export const DOG_HEALTH = 40;
export const DOG_WEIGHT = 0.8;
export const DOG_BITE_DAMAGE = 7;
export const DOG_BITE_RANGE = 1.5;        // tiles — distance to initiate bite
export const DOG_BITE_COOLDOWN = 800;     // ms between bites
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
