import { createGameState, descendStairs, ascendStairs, debugTeleport } from './game';
import { initInput, isKeyPressed, getMousePos, isMouseButtonPressed } from './input';
import { addItem } from './inventory';
import { getItemDef } from './items';
import { createCamera, updateCamera, zoomCamera } from './camera';
import { updateEntities } from './entities';
import { updateCombat, resetCombatState } from './combat';
import { computeFOV } from './fov';
import { render, renderCrosshair } from './renderer';
import { renderHUD, updateMessages } from './hud';
import { ROLES } from './roles';
import { PAL } from './palette';
import { GameState, TileType, TILE_SIZE } from './types';
import { BRANCHES } from './dungeon/types';
import { StatusEffectType } from './status';
import { TileAtlas, loadNetHackAtlas } from './tiles/atlas';

// ── Canvas setup ──
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

// ── Init ──
initInput(canvas);
canvas.style.cursor = 'none';

let cam = createCamera(window.innerWidth, window.innerHeight);

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cam.width = canvas.width / cam.scale;
  cam.height = canvas.height / cam.scale;
}

window.addEventListener('resize', resize);
resize();

// ── Tile atlas (loaded async at startup) ──
let atlas: TileAtlas | null = null;

// ── Game mode ──
type GameMode = 'role_select' | 'playing';
let mode: GameMode = 'role_select';
let selectedRoleIndex = 0;
let state: GameState | null = null;

// ── Debug panel ──
let debugOpen = false;

// Each button is { branch, floor, x, y, w, h } — rebuilt each render frame
interface DebugBtn { branch: string; floor: number; x: number; y: number; w: number; h: number }
let debugBtns: DebugBtn[] = [];

function renderDebugPanel(): void {
  const PAD = 12;
  const BTN = 26;
  const GAP = 4;
  const COLS = 10;

  // Measure total height needed
  let totalH = PAD * 2 + 20; // header
  for (const b of BRANCHES) {
    const rows = Math.ceil(b.floors / COLS);
    totalH += 20 + rows * (BTN + GAP) + PAD;
  }

  const panelW = PAD * 2 + COLS * (BTN + GAP) - GAP;
  const px = 20;
  const py = 20;

  // Panel background
  ctx.fillStyle = 'rgba(10,10,20,0.92)';
  ctx.fillRect(px, py, panelW, totalH);
  ctx.strokeStyle = '#44ff88';
  ctx.lineWidth = 1;
  ctx.strokeRect(px + 0.5, py + 0.5, panelW - 1, totalH - 1);

  ctx.textAlign = 'left';
  let cy = py + PAD;

  // Header
  ctx.font = 'bold 13px monospace';
  ctx.fillStyle = '#44ff88';
  ctx.fillText('DEBUG TELEPORT', px + PAD, cy + 12);
  ctx.font = '11px monospace';
  ctx.fillStyle = '#888';
  ctx.fillText('` to close', px + panelW - PAD - 60, cy + 12);
  cy += 20 + GAP;

  debugBtns = [];

  for (const branch of BRANCHES) {
    // Branch label
    ctx.font = 'bold 11px monospace';
    ctx.fillStyle = '#cccccc';
    ctx.fillText(branch.name, px + PAD, cy + 10);
    cy += 18;

    for (let f = 1; f <= branch.floors; f++) {
      const col = (f - 1) % COLS;
      const row = Math.floor((f - 1) / COLS);
      const bx = px + PAD + col * (BTN + GAP);
      const by = cy + row * (BTN + GAP);

      const isActive = state?.progress.branch === branch.id && state?.progress.floor === f;

      ctx.fillStyle = isActive ? '#44ff88' : 'rgba(60,60,80,0.9)';
      ctx.fillRect(bx, by, BTN, BTN);
      ctx.strokeStyle = isActive ? '#44ff88' : '#555';
      ctx.lineWidth = 1;
      ctx.strokeRect(bx + 0.5, by + 0.5, BTN - 1, BTN - 1);

      ctx.font = '10px monospace';
      ctx.fillStyle = isActive ? '#000' : '#ccc';
      ctx.textAlign = 'center';
      ctx.fillText(String(f), bx + BTN / 2, by + BTN / 2 + 4);
      ctx.textAlign = 'left';

      debugBtns.push({ branch: branch.id, floor: f, x: bx, y: by, w: BTN, h: BTN });
    }

    const rows = Math.ceil(branch.floors / COLS);
    cy += rows * (BTN + GAP) + PAD;
  }
}

function handleDebugClick(mx: number, my: number): void {
  if (!state) return;
  for (const btn of debugBtns) {
    if (mx >= btn.x && mx <= btn.x + btn.w && my >= btn.y && my <= btn.y + btn.h) {
      resetCombatState();
      debugTeleport(state, btn.branch, btn.floor);
      cam.x = state.player.x + state.player.width / 2 - cam.width / 2;
      cam.y = state.player.y + state.player.height / 2 - cam.height / 2;
      return;
    }
  }
}

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

    // Press E to pick up item on current tile
    if (isKeyPressed('e')) {
      const idx = state.groundItems.findIndex(gi => {
        return Math.floor(gi.x / TILE_SIZE) === ptx &&
               Math.floor(gi.y / TILE_SIZE) === pty;
      });
      if (idx !== -1) {
        const gi = state.groundItems[idx]!;
        const def = getItemDef(gi.item.defId);
        const added = addItem(state.inventory, gi.item);
        if (added) {
          state.groundItems.splice(idx, 1);
          state.messages.push({ text: `You pick up the ${def.name}.`, timer: 4000 });
        } else {
          state.messages.push({ text: 'Your pack is full.', timer: 3000 });
        }
      }
    }
  }

  if (!state.gameOver) {
    // Update player aim angle from mouse position (screen → world-space angle)
    const mouse = getMousePos();
    const playerScreenX = (state.player.x + state.player.width / 2 - cam.x) * cam.scale;
    const playerScreenY = (state.player.y + state.player.height / 2 - cam.y) * cam.scale;
    state.player.aimAngle = Math.atan2(mouse.y - playerScreenY, mouse.x - playerScreenX);

    // Update
    updateEntities(state, dt);
    updateCombat(state, dt);
    const isBlind = state.playerStatusEffects.some(e => e.type === StatusEffectType.BLINDED);
    computeFOV(state.dungeon.tiles, state.player, isBlind);
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

  // Debug panel toggle (backtick — avoids browser shortcut conflicts)
  if (isKeyPressed('`')) debugOpen = !debugOpen;

  // Render
  render(ctx, state, cam, atlas);
  renderHUD(ctx, state, canvas.width, canvas.height);

  // Debug panel (drawn over HUD, under crosshair)
  if (debugOpen) {
    canvas.style.cursor = 'default';
    renderDebugPanel();
    if (isMouseButtonPressed(0)) {
      const mouse = getMousePos();
      handleDebugClick(mouse.x, mouse.y);
    }
  } else {
    canvas.style.cursor = 'none';
    // Crosshair drawn last so it's always on top
    if (state && !state.gameOver) {
      const mouse = getMousePos();
      renderCrosshair(ctx, mouse.x, mouse.y);
    }
  }

  requestAnimationFrame(gameLoop);
}

// ── Startup: load tile atlas then start the game loop ─────────────────────────
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
