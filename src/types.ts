// ── Tile Map ──────────────────────────────────────────────

export enum TileType {
  WALL,
  FLOOR,
  CORRIDOR,
  DOOR,
  STAIRS_DOWN,
}

export interface Tile {
  type: TileType;
  visible: boolean;
  explored: boolean;
}

export type TileMap = Tile[][];

// ── Direction ─────────────────────────────────────────────

export enum Direction {
  NORTH,
  SOUTH,
  EAST,
  WEST,
}

// ── Entities ──────────────────────────────────────────────

export interface Entity {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  vx: number;
  vy: number;
  knockbackVx: number;
  knockbackVy: number;
  weight: number;
  facing: Direction;
  health: number;
  maxHealth: number;
  color: string;
  alive: boolean;
  hitTimer: number;
}

// ── Combat ────────────────────────────────────────────────

export enum DamageType {
  SLASH,
  THRUST,
  BLUNT,
}

export interface Weapon {
  name: string;
  damageType: DamageType;
  baseDamage: number;
  durability: number;
  maxDurability: number;
  range: number;
  cooldown: number;
  attackDuration: number;
}

export interface Attack {
  x: number;
  y: number;
  width: number;
  height: number;
  damageType: DamageType;
  damage: number;
  sourceId: number;
  timer: number;
  hit: boolean;
}

export interface FloatingText {
  x: number;
  y: number;
  text: string;
  color: string;
  timer: number;
  maxTimer: number;
}

export interface EnemyDef {
  name: string;
  color: string;
  health: number;
  speed: number;
  damage: number;
  contactCooldown: number;
  vulnerabilities: Record<DamageType, number>;
  weight: number;
  ai: 'chase' | 'patrol';
}

export interface EnemyEntity extends Entity {
  def: EnemyDef;
  contactTimer: number;
  aiState: 'idle' | 'patrol' | 'chase';
  patrolTarget: { x: number; y: number } | null;
}

// ── Companion ────────────────────────────────────────────

export type DogAIState = 'follow' | 'attack' | 'explore' | 'flee';

export interface CompanionEntity extends Entity {
  aiState: DogAIState;
  targetEnemyId: number | null;
  attackCooldown: number;
  exploreTarget: { x: number; y: number } | null;
  returnTimer: number;
  lastHitTimer: number;
  regenAccum: number;
}

// ── Dungeon Generation ────────────────────────────────────

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface BSPNode {
  x: number;
  y: number;
  w: number;
  h: number;
  room?: Rect;
  left?: BSPNode;
  right?: BSPNode;
}

export interface DungeonResult {
  tiles: TileMap;
  rooms: Rect[];
  startRoom: Rect;
  stairsRoom: Rect;
  width: number;
  height: number;
}

// ── Game State ────────────────────────────────────────────

export interface GameState {
  dungeon: DungeonResult;
  player: Entity;
  dog: CompanionEntity | null;
  enemies: EnemyEntity[];
  attacks: Attack[];
  floatingTexts: FloatingText[];
  weapon: Weapon;
  messages: { text: string; timer: number }[];
  floor: number;
  gameOver: boolean;
}

// ── Constants (re-exported from config.ts) ───────────────

export {
  TILE_SIZE,
  MAP_WIDTH,
  MAP_HEIGHT,
  PLAYER_SPEED,
  FOV_RANGE,
  CAMERA_SCALE,
  KNOCKBACK_SPEED,
  KNOCKBACK_DECAY,
} from './config';
