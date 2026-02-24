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
import { getWeaponDef, getAllWeapons } from './items';
import { isWalkable } from './dungeon/shared';
import { WeaponDef } from './items/defs';
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
    aimAngle: 0,
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
  const startCx = start.x + Math.floor(start.w / 2);
  const startCy = start.y + Math.floor(start.h / 2);
  const spawnX = startCx * TILE_SIZE + TILE_SIZE / 2 - 12;
  const spawnY = startCy * TILE_SIZE + TILE_SIZE / 2 - 12;
  // Stamp STAIRS_UP so returning from floor 2 can position the player correctly
  if (dungeon.tiles[startCy]?.[startCx]) dungeon.tiles[startCy]![startCx]!.type = TileType.STAIRS_UP;

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

  // Place starting items on the first floor
  const initialGroundItems: GameState['groundItems'] = [];
  const startRooms = dungeon.rooms.filter(r => r !== dungeon.startRoom);
  const weapons = getAllWeapons();
  const itemCount = 1 + Math.floor(Math.random() * 3);
  for (let i = 0; i < itemCount; i++) {
    const room = startRooms[Math.floor(Math.random() * startRooms.length)];
    if (!room) continue;
    for (let attempt = 0; attempt < 10; attempt++) {
      const tx = room.x + Math.floor(Math.random() * room.w);
      const ty = room.y + Math.floor(Math.random() * room.h);
      if (!isWalkable(dungeon.tiles, tx, ty)) continue;
      const def = weapons[Math.floor(Math.random() * weapons.length)] as WeaponDef;
      initialGroundItems.push({
        x: tx * TILE_SIZE + TILE_SIZE / 2,
        y: ty * TILE_SIZE + TILE_SIZE / 2,
        item: createItemInstance(def.id, def.maxDurability),
      });
      break;
    }
  }

  const messages: { text: string; timer: number }[] = [
    { text: 'The stone steps crumble beneath your feet as you descend into darkness...', timer: 5000 },
  ];
  if (dog) {
    messages.push({ text: 'Your dog follows close behind, nose to the cold stone.', timer: 6000 });
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
    playerStatusEffects: [],
    inventory,
    dog,
    enemies,
    attacks: [],
    floatingTexts: [],
    groundItems: initialGroundItems,
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

// Find a tile of a given type and position player there.
// Falls back to startRoom center if the tile type is not found on this floor.
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
  // Fallback: tile not found — use startRoom center so the player is never stuck
  const start = state.dungeon.startRoom;
  const cx = start.x + Math.floor(start.w / 2);
  const cy = start.y + Math.floor(start.h / 2);
  state.player.x = cx * TILE_SIZE + TILE_SIZE / 2 - 12;
  state.player.y = cy * TILE_SIZE + TILE_SIZE / 2 - 12;
  if (state.dog && state.dog.alive) {
    state.dog.x = state.player.x + 20;
    state.dog.y = state.player.y + 20;
  }
}

function placeFloorItems(state: GameState): void {
  const allRooms = state.dungeon.rooms;
  // Exclude the start room so items aren't placed right on top of the player
  const rooms = allRooms.filter(r => r !== state.dungeon.startRoom);
  if (rooms.length === 0) return;

  const weapons = getAllWeapons();
  const count = 1 + Math.floor(Math.random() * 3); // 1–3 items per new floor

  for (let i = 0; i < count; i++) {
    const room = rooms[Math.floor(Math.random() * rooms.length)]!;

    // Try up to 10 random positions within the room
    for (let attempt = 0; attempt < 10; attempt++) {
      const tx = room.x + Math.floor(Math.random() * room.w);
      const ty = room.y + Math.floor(Math.random() * room.h);
      if (!isWalkable(state.dungeon.tiles, tx, ty)) continue;

      const def = weapons[Math.floor(Math.random() * weapons.length)] as WeaponDef;
      state.groundItems.push({
        x: tx * TILE_SIZE + TILE_SIZE / 2,
        y: ty * TILE_SIZE + TILE_SIZE / 2,
        item: createItemInstance(def.id, def.maxDurability),
      });
      break;
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
    placeFloorItems(state);
  }

  // Position player
  if (spawnAtTile != null && cached) {
    // Returning to a cached floor — spawn at the specified stairs tile
    positionPlayerAtTile(state, spawnAtTile);
  } else {
    // New floor — spawn at start room center
    const start = state.dungeon.startRoom;
    const cx = start.x + Math.floor(start.w / 2);
    const cy = start.y + Math.floor(start.h / 2);
    state.player.x = cx * TILE_SIZE + TILE_SIZE / 2 - 12;
    state.player.y = cy * TILE_SIZE + TILE_SIZE / 2 - 12;
    if (state.dog && state.dog.alive) {
      state.dog.x = state.player.x + 20;
      state.dog.y = state.player.y + 20;
    }
    // Always stamp STAIRS_UP at spawn on fresh floors — even floor 1.
    // This ensures positionPlayerAtTile(STAIRS_UP) always succeeds when
    // the player returns to this floor from below.
    const spawnTile = state.dungeon.tiles[cy]?.[cx];
    if (spawnTile) spawnTile.type = TileType.STAIRS_UP;
  }

  // Clear combat state (attacks are per-frame, don't persist)
  state.attacks = [];
  state.floatingTexts = [];
  state.playerStatusEffects = [];
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

  // loadOrGenerateFloor places STAIRS_UP at spawn on fresh floors automatically.
  // For cached floors it positions the player at the existing STAIRS_UP.
  loadOrGenerateFloor(state, TileType.STAIRS_UP);

  // Narrative message
  const branchName = branchDef.name;
  if (stairs.type === 'branch') {
    state.messages.push({
      text: `You descend into the ${branchName}...`,
      timer: 5000,
    });
  } else {
    state.messages.push({
      text: `You descend to floor ${state.progress.floor}.`,
      timer: 4000,
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
  });
}

// ── Debug Teleport ───────────────────────────────────────
// Jump directly to any branch/floor, bypassing normal stair logic.
// For development use only.

export function debugTeleport(state: GameState, targetBranch: string, targetFloor: number): void {
  saveCurrentFloor(state);
  state.progress.branch = targetBranch;
  state.progress.floor = targetFloor;
  state.progress.returnStack = [];
  state.floor = targetFloor;
  loadOrGenerateFloor(state); // places STAIRS_UP at spawn on fresh floors
  state.attacks = [];
  state.messages.push({
    text: `[DEBUG] Teleported to ${targetBranch} floor ${targetFloor}.`,
    timer: 3000,
  });
}
