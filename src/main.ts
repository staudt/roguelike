import { createGameState } from './game';
import { initInput, isKeyPressed } from './input';
import { createCamera, updateCamera } from './camera';
import { CAMERA_SCALE } from './types';
import { updateEntities } from './entities';
import { updateCombat, resetCombatState } from './combat';
import { computeFOV } from './fov';
import { render } from './renderer';
import { renderHUD, updateMessages } from './hud';

// ── Canvas setup ──
const canvas = document.getElementById('game') as HTMLCanvasElement;
const ctx = canvas.getContext('2d')!;

function resize(): void {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  cam.width = canvas.width / CAMERA_SCALE;
  cam.height = canvas.height / CAMERA_SCALE;
}

// ── Init ──
initInput();

let state = createGameState();
const cam = createCamera(window.innerWidth, window.innerHeight);

window.addEventListener('resize', resize);
resize();

// Center camera on player immediately
cam.x = state.player.x + state.player.width / 2 - cam.width / 2;
cam.y = state.player.y + state.player.height / 2 - cam.height / 2;

// ── Game loop ──
let lastTime = performance.now();

function gameLoop(now: number): void {
  const rawDt = (now - lastTime) / 1000;
  const dt = Math.min(rawDt, 0.05); // Cap at 50ms
  lastTime = now;

  // Restart
  if (state.gameOver && isKeyPressed('r')) {
    resetCombatState();
    state = createGameState();
    cam.x = state.player.x + state.player.width / 2 - cam.width / 2;
    cam.y = state.player.y + state.player.height / 2 - cam.height / 2;
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

  // Render
  render(ctx, state, cam);
  renderHUD(ctx, state, canvas.width, canvas.height);

  requestAnimationFrame(gameLoop);
}

requestAnimationFrame(gameLoop);
