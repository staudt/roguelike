import {
  GameState,
  Entity,
  Weapon,
  DamageType,
  Direction,
  TILE_SIZE,
} from './types';
import { generateDungeon } from './dungeon';
import { spawnEnemies } from './enemy';
import { createDog } from './companion';
import { PAL } from './palette';
import { PLAYER_WEIGHT } from './config';

let nextId = 1;
export function getNextId(): number {
  return nextId++;
}

function createStartWeapon(): Weapon {
  return {
    name: 'Rusty Sword',
    damageType: DamageType.SLASH,
    baseDamage: 10,
    durability: 50,
    maxDurability: 50,
    range: 36,
    cooldown: 400,
    attackDuration: 150,
  };
}

function createPlayer(spawnX: number, spawnY: number): Entity {
  return {
    id: getNextId(),
    x: spawnX,
    y: spawnY,
    width: 24,
    height: 24,
    vx: 0,
    vy: 0,
    knockbackVx: 0,
    knockbackVy: 0,
    weight: PLAYER_WEIGHT,
    facing: Direction.SOUTH,
    health: 100,
    maxHealth: 100,
    color: PAL.player,
    alive: true,
    hitTimer: 0,
  };
}

export function createGameState(): GameState {
  nextId = 1;
  const dungeon = generateDungeon();
  const start = dungeon.startRoom;
  const spawnX = (start.x + Math.floor(start.w / 2)) * TILE_SIZE + TILE_SIZE / 2 - 12;
  const spawnY = (start.y + Math.floor(start.h / 2)) * TILE_SIZE + TILE_SIZE / 2 - 12;

  const player = createPlayer(spawnX, spawnY);
  const dog = createDog(spawnX, spawnY);
  const enemies = spawnEnemies(dungeon, player.id);

  return {
    dungeon,
    player,
    dog,
    enemies,
    attacks: [],
    floatingTexts: [],
    weapon: createStartWeapon(),
    messages: [
      { text: 'The stone steps crumble beneath your feet as you descend into darkness...', timer: 5000 },
      { text: 'Your dog follows close behind, nose to the cold stone.', timer: 6000 },
    ],
    floor: 1,
    gameOver: false,
  };
}
