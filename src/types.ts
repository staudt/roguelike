// ── Tile Map ──────────────────────────────────────────────

export enum TileType {
  WALL,
  FLOOR,
  CORRIDOR,
  DOOR,
  STAIRS_DOWN,
  STAIRS_UP,
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
  anim: AnimationState;
}

// ── Combat ────────────────────────────────────────────────

export enum DamageType {
  SLASH,
  THRUST,
  BLUNT,
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

export type { MonsterDef } from './monsters/defs';
export type { ItemInstance } from './items/defs';

import type { MonsterDef } from './monsters/defs';
import type { ItemInstance } from './items/defs';
import type { Inventory } from './inventory';
import type { Attributes } from './attributes';
import type { DungeonProgress } from './dungeon/progression';
import type { StairsPlacement } from './dungeon/types';
import type { AnimationState } from './animation';

export interface EnemyEntity extends Entity {
  def: MonsterDef;
  contactTimer: number;
  aiState: string;
  patrolTarget: { x: number; y: number } | null;
  level: number;
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
  level: number;
  xp: number;
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
  stairs: StairsPlacement[];
  width: number;
  height: number;
}

// ── Ground Items ─────────────────────────────────────────

export interface GroundItem {
  x: number;
  y: number;
  item: ItemInstance;
}

// ── Saved Floor (for persistence when moving between floors) ──

export interface SavedFloor {
  dungeon: DungeonResult;
  enemies: EnemyEntity[];
  groundItems: GroundItem[];
}

// ── Game State ────────────────────────────────────────────

export interface GameState {
  dungeon: DungeonResult;
  progress: DungeonProgress;
  player: Entity;
  playerRole: string;
  playerAttributes: Attributes;
  playerLastHitTimer: number;
  playerRegenAccum: number;
  playerXP: number;
  playerLevel: number;
  inventory: Inventory;
  dog: CompanionEntity | null;
  enemies: EnemyEntity[];
  attacks: Attack[];
  floatingTexts: FloatingText[];
  groundItems: GroundItem[];
  messages: { text: string; timer: number }[];
  floor: number;
  gameOver: boolean;
  floorCache: Record<string, SavedFloor>;
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
