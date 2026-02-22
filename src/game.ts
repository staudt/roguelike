import {
  GameState,
  Entity,
  Direction,
  TileType,
  TILE_SIZE,
} from './types';
import { generateFloor, createDungeonProgress, advanceFloor, enterBranch, leaveBranch, getBranchDef } from './dungeon/index';
import type { StairsPlacement } from './dungeon/types';
import { spawnEnemies } from './enemy';
import { createDog } from './companion';
import { createInventory, createItemInstance } from './inventory';
import { getWeaponDef } from './items';
import { getRoleDef, RoleDef } from './roles';
import { createAnimationState } from './animation';

let nextId = 1;
export function getNextId(): number {
  return nextId++;
}

function createPlayer(spawnX: number, spawnY: number, role: RoleDef): Entity {
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
    weight: role.baseWeight,
    facing: Direction.SOUTH,
    health: role.baseHealth,
    maxHealth: role.baseHealth,
    color: role.color,
    alive: true,
    hitTimer: 0,
    anim: createAnimationState(),
  };
}

export function createGameState(roleId: string = 'warrior'): GameState {
  nextId = 1;
  const role = getRoleDef(roleId);
  const progress = createDungeonProgress();
  const dungeon = generateFloor(progress.branch, progress.floor);
  const start = dungeon.startRoom;
  const spawnX = (start.x + Math.floor(start.w / 2)) * TILE_SIZE + TILE_SIZE / 2 - 12;
  const spawnY = (start.y + Math.floor(start.h / 2)) * TILE_SIZE + TILE_SIZE / 2 - 12;

  const player = createPlayer(spawnX, spawnY, role);
  const dog = role.companion ? createDog(spawnX, spawnY) : null;

  // Create inventory with starting weapon equipped
  const startWeaponDef = getWeaponDef(role.startingWeapon);
  const inventory = createInventory();
  inventory.equipped.weapon = createItemInstance(
    startWeaponDef.id,
    startWeaponDef.maxDurability,
  );

  // Add any additional starting items
  for (const itemId of role.startingItems) {
    const def = getWeaponDef(itemId);
    inventory.items.push(createItemInstance(def.id, def.maxDurability));
  }

  const enemies = spawnEnemies(dungeon, player.id, progress.floor, 1, progress.branch, role.alignment);

  const messages: { text: string; timer: number; narrate?: boolean }[] = [
    { text: 'The stone steps crumble beneath your feet as you descend into darkness...', timer: 5000, narrate: true },
  ];
  if (dog) {
    messages.push({ text: 'Your dog follows close behind, nose to the cold stone.', timer: 6000, narrate: true });
  }

  return {
    dungeon,
    progress,
    player,
    playerRole: role.id,
    playerAlignment: role.alignment,
    playerAttributes: { ...role.baseAttributes },
    playerLastHitTimer: 0,
    playerRegenAccum: 0,
    playerXP: 0,
    playerLevel: 1,
    inventory,
    dog,
    enemies,
    attacks: [],
    floatingTexts: [],
    groundItems: [],
    messages,
    floor: progress.floor,
    gameOver: false,
    floorCache: {},
  };
}

// ── Floor Transitions ────────────────────────────────────

function floorKey(branch: string, floor: number): string {
  return `${branch}:${floor}`;
}

function saveCurrentFloor(state: GameState): void {
  const key = floorKey(state.progress.branch, state.progress.floor);
  state.floorCache[key] = {
    dungeon: state.dungeon,
    enemies: state.enemies,
    groundItems: state.groundItems,
  };
}

// Find a tile of a given type and position player there
function positionPlayerAtTile(state: GameState, tileType: TileType): void {
  const { tiles } = state.dungeon;
  for (let y = 0; y < tiles.length; y++) {
    for (let x = 0; x < tiles[y]!.length; x++) {
      if (tiles[y]![x]!.type === tileType) {
        state.player.x = x * TILE_SIZE + TILE_SIZE / 2 - 12;
        state.player.y = y * TILE_SIZE + TILE_SIZE / 2 - 12;
        if (state.dog && state.dog.alive) {
          state.dog.x = state.player.x + 20;
          state.dog.y = state.player.y + 20;
        }
        return;
      }
    }
  }
}

function loadOrGenerateFloor(state: GameState, spawnAtTile?: TileType): void {
  state.floor = state.progress.floor;
  const key = floorKey(state.progress.branch, state.progress.floor);
  const cached = state.floorCache[key];

  if (cached) {
    // Restore saved floor
    state.dungeon = cached.dungeon;
    state.enemies = cached.enemies;
    state.groundItems = cached.groundItems;
  } else {
    // Generate new floor
    const dungeon = generateFloor(state.progress.branch, state.progress.floor);
    state.dungeon = dungeon;
    state.enemies = spawnEnemies(dungeon, state.player.id, state.progress.floor, state.playerLevel, state.progress.branch, state.playerAlignment);
    state.groundItems = [];
  }

  // Position player
  if (spawnAtTile != null && cached) {
    // Returning to a cached floor — spawn at the specified stairs tile
    positionPlayerAtTile(state, spawnAtTile);
  } else {
    // New floor — spawn at start room
    const start = state.dungeon.startRoom;
    const spawnX = (start.x + Math.floor(start.w / 2)) * TILE_SIZE + TILE_SIZE / 2 - 12;
    const spawnY = (start.y + Math.floor(start.h / 2)) * TILE_SIZE + TILE_SIZE / 2 - 12;
    state.player.x = spawnX;
    state.player.y = spawnY;
    if (state.dog && state.dog.alive) {
      state.dog.x = spawnX + 20;
      state.dog.y = spawnY + 20;
    }
  }

  // Clear combat state (attacks are per-frame, don't persist)
  state.attacks = [];
  state.floatingTexts = [];
}

export function descendStairs(state: GameState, stairs: StairsPlacement): void {
  // Save current floor before leaving
  saveCurrentFloor(state);

  if (stairs.type === 'down') {
    advanceFloor(state.progress);
  } else if (stairs.type === 'branch' && stairs.targetBranch) {
    enterBranch(state.progress, stairs.targetBranch, stairs.targetFloor ?? 1);
  }

  const branchDef = getBranchDef(state.progress.branch);
  const maxFloors = branchDef.floors;

  // If past the last floor of a branch, return to previous branch
  if (state.progress.floor > maxFloors) {
    const returned = leaveBranch(state.progress);
    if (returned) {
      advanceFloor(state.progress);
    }
  }

  // When returning to a cached floor from above, appear at the down stairs.
  // When arriving at a new floor, generate fresh and place stairs up at spawn.
  const key = floorKey(state.progress.branch, state.progress.floor);
  const isCached = key in state.floorCache;

  loadOrGenerateFloor(state, TileType.STAIRS_UP);

  // On a new (uncached) floor, place stairs up at spawn so player can go back
  if (!isCached) {
    const ptx = Math.floor((state.player.x + state.player.width / 2) / TILE_SIZE);
    const pty = Math.floor((state.player.y + state.player.height / 2) / TILE_SIZE);
    const spawnTile = state.dungeon.tiles[pty]?.[ptx];
    if (spawnTile && spawnTile.type !== TileType.STAIRS_DOWN) {
      spawnTile.type = TileType.STAIRS_UP;
    }
  }

  // Narrative message
  const branchName = branchDef.name;
  if (stairs.type === 'branch') {
    state.messages.push({
      text: `You descend into the ${branchName}...`,
      timer: 5000,
      narrate: true,
    });
  } else {
    state.messages.push({
      text: `You descend to floor ${state.progress.floor}.`,
      timer: 4000,
      narrate: true,
    });
  }
}

export function ascendStairs(state: GameState): void {
  // Save current floor before leaving
  saveCurrentFloor(state);

  // Go back one floor
  if (state.progress.floor <= 1) {
    // At floor 1 of a sub-branch — leave the branch
    const returned = leaveBranch(state.progress);
    if (!returned) {
      // Floor 1 of main dungeon — can't go higher
      state.messages.push({
        text: 'The entrance has collapsed behind you. There is no going back.',
        timer: 4000,
        narrate: true,
      });
      return;
    }
  } else {
    state.progress.floor--;
  }

  // Return to the cached floor above, appearing at the down stairs
  loadOrGenerateFloor(state, TileType.STAIRS_DOWN);

  state.messages.push({
    text: `You ascend to floor ${state.progress.floor}.`,
    timer: 4000,
    narrate: true,
  });
}
