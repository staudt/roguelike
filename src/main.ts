import { createGameState, descendStairs, ascendStairs } from './game';
import { initInput, isKeyPressed, addMouseDX } from './input';
import { updateEntities } from './entities';
import { updateCombat, resetCombatState } from './combat';
import { computeFOV } from './fov';
import { updatePlayer } from './player';
import { renderFPS } from './raycaster';
import { renderHUD, updateMessages } from './hud';
import { ROLES } from './roles';
import { PAL } from './palette';
import { GameState, TileType, TILE_SIZE, Direction } from './types';
import { TileAtlas, loadNetHackAtlas } from './tiles/atlas';

// ── Canvas setup ──
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// ── Init ──
initInput();

function resize(): void {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// ── Tile atlas (loaded async at startup) ──
let atlas: TileAtlas | null = null;

// ── FPS camera ──
const MOUSE_SENSITIVITY = 0.0018; // radians per pixel

interface FPSCamera {
  angle: number;
}

let fpsCamera: FPSCamera = { angle: 0 };
let pointerLocked = false;
let showMinimap = true;

// Pointer lock
canvas.addEventListener('click', () => {
  if (!pointerLocked) canvas.requestPointerLock();
});

document.addEventListener('pointerlockchange', () => {
  pointerLocked = document.pointerLockElement === canvas;
});

document.addEventListener('mousemove', (e) => {
  if (pointerLocked) {
    fpsCamera.angle += e.movementX * MOUSE_SENSITIVITY;
    addMouseDX(e.movementX);
  }
});

// ── Direction → starting angle ──
function directionToAngle(facing: Direction): number {
  switch (facing) {
    case Direction.EAST:  return 0;
    case Direction.SOUTH: return Math.PI / 2;
    case Direction.WEST:  return Math.PI;
    case Direction.NORTH: return -Math.PI / 2;
  }
}

// ── Game mode ──
type GameMode = 'role_select' | 'playing';
let mode: GameMode = 'role_select';
let selectedRoleIndex = 0;
let state: GameState | null = null;

// ── Role selection screen ──
function renderRoleSelect(): void {
  const w = canvas.width;
  const h = canvas.height;

  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, w, h);

  // Title
  ctx.fillStyle = PAL.hudTextBright;
  ctx.font = 'bold 28px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Choose Your Role', w / 2, h * 0.18);

  ctx.font = '13px monospace';
  ctx.fillStyle = PAL.hudText;
  ctx.fillText('Use W/S or Up/Down to select, Space or Enter to confirm', w / 2, h * 0.24);

  // Role cards
  const cardW = 420;
  const cardH = 120;
  const gap   = 16;
  const totalH = ROLES.length * cardH + (ROLES.length - 1) * gap;
  const startY = (h - totalH) / 2;

  for (let i = 0; i < ROLES.length; i++) {
    const role     = ROLES[i]!;
    const y        = startY + i * (cardH + gap);
    const x        = (w - cardW) / 2;
    const selected = i === selectedRoleIndex;

    ctx.fillStyle = selected ? 'rgba(60, 60, 100, 0.8)' : 'rgba(20, 20, 40, 0.8)';
    ctx.fillRect(x, y, cardW, cardH);

    if (selected) {
      ctx.strokeStyle = role.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardW, cardH);
    }

    ctx.fillStyle = role.color;
    ctx.fillRect(x + 12, y + 12, 20, 20);

    ctx.fillStyle = selected ? PAL.hudTextBright : PAL.hudText;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(role.name, x + 42, y + 28);

    ctx.fillStyle = PAL.hudText;
    ctx.font = '12px monospace';
    ctx.fillText(role.description, x + 12, y + 52);

    const { str, dex, con } = role.baseAttributes;
    ctx.fillStyle = PAL.narrativeText;
    ctx.font = '11px monospace';
    ctx.fillText(`STR ${str}  DEX ${dex}  CON ${con}`, x + 12, y + 72);
    ctx.fillText(`HP ${role.baseHealth}  SPD ${role.baseSpeed}  Weapon: ${role.startingWeapon.replace('_', ' ')}`, x + 12, y + 88);
    if (role.companion) {
      ctx.fillStyle = PAL.dog;
      ctx.fillText(`Companion: ${role.companion}`, x + 12, y + 104);
    }
  }
}

function updateRoleSelect(): void {
  if (isKeyPressed('w') || isKeyPressed('arrowup')) {
    selectedRoleIndex = (selectedRoleIndex - 1 + ROLES.length) % ROLES.length;
  }
  if (isKeyPressed('s') || isKeyPressed('arrowdown')) {
    selectedRoleIndex = (selectedRoleIndex + 1) % ROLES.length;
  }
  if (isKeyPressed(' ') || isKeyPressed('enter')) {
    const role = ROLES[selectedRoleIndex]!;
    startGame(role.id);
  }
}

function startGame(roleId: string): void {
  resetCombatState();
  state = createGameState(roleId);
  // Initialize look angle from player's starting facing
  fpsCamera.angle = directionToAngle(state.player.facing);
  mode = 'playing';
}

// ── Game loop ──
let lastTime = performance.now();

function gameLoop(now: number): void {
  const rawDt = (now - lastTime) / 1000;
  const dt    = Math.min(rawDt, 0.05);
  lastTime    = now;

  if (mode === 'role_select') {
    updateRoleSelect();
    renderRoleSelect();
    requestAnimationFrame(gameLoop);
    return;
  }

  if (!state) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Restart → back to role select
  if (state.gameOver && isKeyPressed('r')) {
    mode  = 'role_select';
    state = null;
    requestAnimationFrame(gameLoop);
    return;
  }

  // Minimap toggle
  if (isKeyPressed('m')) showMinimap = !showMinimap;

  // Stairs interaction
  if (!state.gameOver) {
    const ptx  = Math.floor((state.player.x + state.player.width  / 2) / TILE_SIZE);
    const pty  = Math.floor((state.player.y + state.player.height / 2) / TILE_SIZE);
    const tile = state.dungeon.tiles[pty]?.[ptx];

    if ((isKeyPressed('>') || isKeyPressed('.')) && tile && tile.type === TileType.STAIRS_DOWN) {
      const stairsEntry = state.dungeon.stairs.find(s => {
        const sx = Math.floor(s.room.x + s.room.w / 2);
        const sy = Math.floor(s.room.y + s.room.h / 2);
        return Math.abs(ptx - sx) <= s.room.w && Math.abs(pty - sy) <= s.room.h;
      }) ?? state.dungeon.stairs[0];

      if (stairsEntry) {
        resetCombatState();
        descendStairs(state, stairsEntry);
        requestAnimationFrame(gameLoop);
        return;
      }
    }

    if ((isKeyPressed('<') || isKeyPressed(',')) && tile && tile.type === TileType.STAIRS_UP) {
      resetCombatState();
      ascendStairs(state);
      requestAnimationFrame(gameLoop);
      return;
    }
  }

  if (!state.gameOver) {
    // Player movement (angle-based)
    updatePlayer(state.player, state.dungeon.tiles, dt, fpsCamera.angle);
    updateEntities(state, dt);
    updateCombat(state, dt);
    computeFOV(state.dungeon.tiles, state.player);
  }

  updateMessages(state, dt);

  // Floating texts (drift up + expire)
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i]!;
    ft.y   -= 40 * dt;
    ft.timer -= dt * 1000;
    if (ft.timer <= 0) state.floatingTexts.splice(i, 1);
  }

  // ── Render ──
  renderFPS(ctx, state, fpsCamera.angle, atlas, showMinimap, pointerLocked);
  renderHUD(ctx, state, canvas.width, canvas.height);

  requestAnimationFrame(gameLoop);
}

// ── Startup ──────────────────────────────────────────────────────────────────
(async () => {
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.fillStyle = PAL.hudText;
  ctx.font = '16px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('Loading tiles\u2026', canvas.width / 2, canvas.height / 2);

  atlas = await loadNetHackAtlas();

  requestAnimationFrame(gameLoop);
})();
