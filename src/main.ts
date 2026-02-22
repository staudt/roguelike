import { createGameState, descendStairs, ascendStairs } from './game';
import { initInput, isKeyPressed } from './input';
import { createCamera, updateCamera, zoomCamera } from './camera';
import { updateEntities } from './entities';
import { updateCombat, resetCombatState } from './combat';
import { computeFOV } from './fov';
import { render } from './renderer';
import { renderHUD, updateMessages } from './hud';
import { ROLES } from './roles';
import { PAL } from './palette';
import { GameState, TileType, TILE_SIZE } from './types';

// ── Canvas setup ──
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// ── Init ──
initInput();

let cam = createCamera(window.innerWidth, window.innerHeight);

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cam.width = canvas.width / cam.scale;
  cam.height = canvas.height / cam.scale;
}

window.addEventListener('resize', resize);
resize();

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
  const gap = 16;
  const totalH = ROLES.length * cardH + (ROLES.length - 1) * gap;
  const startY = (h - totalH) / 2;

  for (let i = 0; i < ROLES.length; i++) {
    const role = ROLES[i]!;
    const y = startY + i * (cardH + gap);
    const x = (w - cardW) / 2;
    const selected = i === selectedRoleIndex;

    // Card background
    ctx.fillStyle = selected ? 'rgba(60, 60, 100, 0.8)' : 'rgba(20, 20, 40, 0.8)';
    ctx.fillRect(x, y, cardW, cardH);

    // Selection border
    if (selected) {
      ctx.strokeStyle = role.color;
      ctx.lineWidth = 2;
      ctx.strokeRect(x, y, cardW, cardH);
    }

    // Role color swatch
    ctx.fillStyle = role.color;
    ctx.fillRect(x + 12, y + 12, 20, 20);

    // Role name
    ctx.fillStyle = selected ? PAL.hudTextBright : PAL.hudText;
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(role.name, x + 42, y + 28);

    // Description
    ctx.fillStyle = PAL.hudText;
    ctx.font = '12px monospace';
    ctx.fillText(role.description, x + 12, y + 52);

    // Stats
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
  cam = createCamera(window.innerWidth, window.innerHeight);
  resize();
  cam.x = state.player.x + state.player.width / 2 - cam.width / 2;
  cam.y = state.player.y + state.player.height / 2 - cam.height / 2;
  mode = 'playing';
}

// ── Game loop ──
let lastTime = performance.now();

function gameLoop(now: number): void {
  const rawDt = (now - lastTime) / 1000;
  const dt = Math.min(rawDt, 0.05); // Cap at 50ms
  lastTime = now;

  if (mode === 'role_select') {
    updateRoleSelect();
    renderRoleSelect();
    requestAnimationFrame(gameLoop);
    return;
  }

  // Playing mode
  if (!state) {
    requestAnimationFrame(gameLoop);
    return;
  }

  // Restart → back to role select
  if (state.gameOver && isKeyPressed('r')) {
    mode = 'role_select';
    state = null;
    requestAnimationFrame(gameLoop);
    return;
  }

  // Stairs interaction
  if (!state.gameOver) {
    const ptx = Math.floor((state.player.x + state.player.width / 2) / TILE_SIZE);
    const pty = Math.floor((state.player.y + state.player.height / 2) / TILE_SIZE);
    const tile = state.dungeon.tiles[pty]?.[ptx];

    // Press > or . to descend
    if ((isKeyPressed('>') || isKeyPressed('.')) && tile && tile.type === TileType.STAIRS_DOWN) {
      const stairsEntry = state.dungeon.stairs.find(s => {
        const sx = Math.floor(s.room.x + s.room.w / 2);
        const sy = Math.floor(s.room.y + s.room.h / 2);
        return Math.abs(ptx - sx) <= s.room.w && Math.abs(pty - sy) <= s.room.h;
      }) ?? state.dungeon.stairs[0];

      if (stairsEntry) {
        resetCombatState();
        descendStairs(state, stairsEntry);
        cam.x = state.player.x + state.player.width / 2 - cam.width / 2;
        cam.y = state.player.y + state.player.height / 2 - cam.height / 2;
        requestAnimationFrame(gameLoop);
        return;
      }
    }

    // Press < or , to ascend
    if ((isKeyPressed('<') || isKeyPressed(',')) && tile && tile.type === TileType.STAIRS_UP) {
      resetCombatState();
      ascendStairs(state);
      cam.x = state.player.x + state.player.width / 2 - cam.width / 2;
      cam.y = state.player.y + state.player.height / 2 - cam.height / 2;
      requestAnimationFrame(gameLoop);
      return;
    }
  }

  if (!state.gameOver) {
    // Update
    updateEntities(state, dt);
    updateCombat(state, dt);
    computeFOV(state.dungeon.tiles, state.player);
    updateCamera(cam, state.player, state.dungeon.width, state.dungeon.height, dt);
  }

  updateMessages(state, dt);

  // Update floating texts (drift up + expire)
  for (let i = state.floatingTexts.length - 1; i >= 0; i--) {
    const ft = state.floatingTexts[i]!;
    ft.y -= 40 * dt;
    ft.timer -= dt * 1000;
    if (ft.timer <= 0) {
      state.floatingTexts.splice(i, 1);
    }
  }

  // Zoom controls
  if (isKeyPressed('=')) zoomCamera(cam, 1, canvas.width, canvas.height);
  if (isKeyPressed('-')) zoomCamera(cam, -1, canvas.width, canvas.height);

  // Render
  render(ctx, state, cam);
  renderHUD(ctx, state, canvas.width, canvas.height);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
