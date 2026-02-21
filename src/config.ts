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
