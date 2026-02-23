/**
 * Wolf3D-style first-person raycasting renderer.
 *
 * Coordinate conventions:
 *   - Player x/y are in pixel space (tile coords = x / TILE_SIZE)
 *   - angle 0 = facing EAST (+X), π/2 = facing SOUTH (+Y)
 *   - FOV: 66° horizontal
 */

import { GameState, TileType, TILE_SIZE } from './types';
import { TileAtlas } from './tiles/atlas';
import { PAL } from './palette';
import {
  MONSTER_TILE_NAMES,
  DOG_FORM_TILE_NAMES,
  TERRAIN_TILE_NAMES,
  MINES_WALL_TILE_NAME,
} from './tiles/mapping';

// ── Constants ─────────────────────────────────────────────────────────────────

const FOV        = Math.PI / 3;        // 60°  horizontal FOV
const HALF_FOV   = FOV / 2;
const PLANE_LEN  = Math.tan(HALF_FOV); // camera plane half-length
const MAX_STEPS  = 64;
const FOG_START  = 3;                  // tiles — fog starts here
const FOG_END    = 10;                 // tiles — fully black beyond this
const ATLAS_COLS = 32;
const SRC_SIZE   = 16;                 // NetHack tile source size in pixels

// Minimap dimensions
const MM_SIZE      = 120;  // px
const MM_TILE      = 4;    // px per tile on minimap
const MM_PADDING   = 12;   // px from canvas edge

// ── Biome colors ──────────────────────────────────────────────────────────────

interface BiomeColors {
  ceiling: string;
  floor: string;
  wall: string;    // fallback when atlas unavailable
  wallDark: string;
}

const BIOME_COLORS: Record<string, BiomeColors> = {
  main: {
    ceiling:  '#1a1a2e',
    floor:    '#0d0d18',
    wall:     PAL.wall,
    wallDark: '#2a2a3a',
  },
  mines: {
    ceiling:  '#1c150a',
    floor:    '#0e0a05',
    wall:     PAL.minesWall,
    wallDark: '#2e200d',
  },
};

function getBiomeColors(branch: string): BiomeColors {
  return BIOME_COLORS[branch] ?? BIOME_COLORS['main']!;
}

// ── Wall tile name lookup ─────────────────────────────────────────────────────

function getWallTileName(tileType: TileType, branch: string): string | undefined {
  if (tileType === TileType.WALL) {
    return branch === 'mines' ? MINES_WALL_TILE_NAME : TERRAIN_TILE_NAMES[TileType.WALL];
  }
  return TERRAIN_TILE_NAMES[tileType];
}

// ── Draw a single 1-pixel-wide column from the atlas ─────────────────────────

function drawAtlasColumn(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  tileName: string,
  texX: number,          // 0..15 column within the 16×16 tile
  screenX: number,
  wallTop: number,
  wallHeight: number,
): boolean {
  const idx = atlas.byName.get(tileName);
  if (idx === undefined) return false;

  const col = idx % ATLAS_COLS;
  const row = Math.floor(idx / ATLAS_COLS);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas.canvas,
    col * SRC_SIZE + texX, row * SRC_SIZE, 1, SRC_SIZE,
    screenX, wallTop, 1, wallHeight,
  );
  return true;
}

// ── Sprite projection helper ──────────────────────────────────────────────────

interface Sprite {
  worldX: number;  // center X in tile units (relative to player)
  worldY: number;  // center Y in tile units (relative to player)
  dist2: number;   // squared distance (for sorting)
  tileName: string | undefined;
  color: string;
  hitFlash: boolean;
}

// ── Main entry point ──────────────────────────────────────────────────────────

export function renderFPS(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  angle: number,
  atlas: TileAtlas | null,
  showMinimap: boolean,
  pointerLocked: boolean,
): void {
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const { dungeon, progress, player, enemies, dog } = state;
  const { tiles } = dungeon;
  const biome = getBiomeColors(progress.branch);

  // Player position in tile units (center of player entity)
  const px = (player.x + player.width  / 2) / TILE_SIZE;
  const py = (player.y + player.height / 2) / TILE_SIZE;

  // Camera direction and plane vectors
  const dirX   =  Math.cos(angle);
  const dirY   =  Math.sin(angle);
  const planeX = -dirY * PLANE_LEN;
  const planeY =  dirX * PLANE_LEN;

  // ── Ceiling ──
  ctx.fillStyle = biome.ceiling;
  ctx.fillRect(0, 0, W, H / 2);

  // ── Floor ──
  ctx.fillStyle = biome.floor;
  ctx.fillRect(0, H / 2, W, H / 2);

  // ── Raycasting ───────────────────────────────────────────────────────────
  const zBuffer = new Float32Array(W);

  ctx.imageSmoothingEnabled = false;

  for (let x = 0; x < W; x++) {
    // Camera x in [-1, 1]
    const cameraX = 2 * x / W - 1;
    const rayDirX = dirX + planeX * cameraX;
    const rayDirY = dirY + planeY * cameraX;

    // Current tile
    let mapX = Math.floor(px);
    let mapY = Math.floor(py);

    // Delta distances — avoid division by zero
    const deltaDistX = rayDirX === 0 ? 1e30 : Math.abs(1 / rayDirX);
    const deltaDistY = rayDirY === 0 ? 1e30 : Math.abs(1 / rayDirY);

    let stepX: number, stepY: number;
    let sideDistX: number, sideDistY: number;

    if (rayDirX < 0) {
      stepX = -1;
      sideDistX = (px - mapX) * deltaDistX;
    } else {
      stepX = 1;
      sideDistX = (mapX + 1 - px) * deltaDistX;
    }
    if (rayDirY < 0) {
      stepY = -1;
      sideDistY = (py - mapY) * deltaDistY;
    } else {
      stepY = 1;
      sideDistY = (mapY + 1 - py) * deltaDistY;
    }

    let hit = false;
    let side = 0;  // 0 = X-side, 1 = Y-side
    let hitType = TileType.WALL;

    for (let step = 0; step < MAX_STEPS && !hit; step++) {
      if (sideDistX < sideDistY) {
        sideDistX += deltaDistX;
        mapX += stepX;
        side = 0;
      } else {
        sideDistY += deltaDistY;
        mapY += stepY;
        side = 1;
      }
      const row = tiles[mapY];
      if (!row) { hit = true; break; }
      const tile = row[mapX];
      if (!tile) { hit = true; break; }
      if (
        tile.type === TileType.WALL ||
        tile.type === TileType.DOOR
      ) {
        hit = true;
        hitType = tile.type;
      }
    }

    // Perpendicular distance (avoids fish-eye)
    const perpDist = side === 0
      ? sideDistX - deltaDistX
      : sideDistY - deltaDistY;

    zBuffer[x] = perpDist;

    const wallH = Math.min(H * 2, Math.floor(H / Math.max(perpDist, 0.001)));
    const wallTop    = Math.floor((H - wallH) / 2);
    const wallBottom = wallTop + wallH;

    // ── Texture column ──
    // Exact wall hit position (0..1 within tile)
    let wallX: number;
    if (side === 0) {
      wallX = py + perpDist * rayDirY;
    } else {
      wallX = px + perpDist * rayDirX;
    }
    wallX -= Math.floor(wallX);
    // Mirror texture on certain sides so it looks correct
    if (side === 0 && rayDirX > 0) wallX = 1 - wallX;
    if (side === 1 && rayDirY < 0) wallX = 1 - wallX;

    const texX = Math.floor(wallX * SRC_SIZE) & (SRC_SIZE - 1);

    let drawn = false;
    if (atlas) {
      const tileName = getWallTileName(hitType, progress.branch);
      if (tileName) {
        drawn = drawAtlasColumn(ctx, atlas, tileName, texX, x, wallTop, wallH);
      }
    }
    if (!drawn) {
      // Fallback: solid biome color
      ctx.fillStyle = side === 1 ? biome.wallDark : biome.wall;
      ctx.fillRect(x, wallTop, 1, wallH);
    }

    // ── Y-side shading (Wolf3D classic) ──
    if (side === 1) {
      ctx.globalAlpha = 0.35;
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, wallTop, 1, wallH);
      ctx.globalAlpha = 1;
    }

    // ── Distance fog ──
    if (perpDist > FOG_START) {
      const fog = Math.min(1, (perpDist - FOG_START) / (FOG_END - FOG_START));
      ctx.globalAlpha = fog * 0.85;
      ctx.fillStyle = '#000000';
      ctx.fillRect(x, wallTop, 1, wallH);
      ctx.globalAlpha = 1;
    }

    // ── Wall bottom cap (fill floor gap caused by integer rounding) ──
    if (wallBottom < H) {
      // already covered by floor fillRect above
    }
  }

  // ── Sprite rendering ──────────────────────────────────────────────────────

  const sprites: Sprite[] = [];

  // Collect enemies
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const etx = Math.floor((enemy.x + enemy.width  / 2) / TILE_SIZE);
    const ety = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
    const tileRow = tiles[ety];
    if (!tileRow || !tileRow[etx]?.visible) continue;

    const sx = (enemy.x + enemy.width  / 2) / TILE_SIZE - px;
    const sy = (enemy.y + enemy.height / 2) / TILE_SIZE - py;
    sprites.push({
      worldX: sx,
      worldY: sy,
      dist2: sx * sx + sy * sy,
      tileName: MONSTER_TILE_NAMES[enemy.def.id],
      color: enemy.color,
      hitFlash: enemy.anim.hitFlashTimer > 0,
    });
  }

  // Collect dog
  if (dog && dog.alive) {
    const dtx = Math.floor((dog.x + dog.width  / 2) / TILE_SIZE);
    const dty = Math.floor((dog.y + dog.height / 2) / TILE_SIZE);
    const tileRow = tiles[dty];
    if (tileRow && tileRow[dtx]?.visible) {
      const sx = (dog.x + dog.width  / 2) / TILE_SIZE - px;
      const sy = (dog.y + dog.height / 2) / TILE_SIZE - py;
      sprites.push({
        worldX: sx,
        worldY: sy,
        dist2: sx * sx + sy * sy,
        tileName: DOG_FORM_TILE_NAMES[dog.form],
        color: dog.color,
        hitFlash: dog.anim.hitFlashTimer > 0,
      });
    }
  }

  // Sort far-to-near
  sprites.sort((a, b) => b.dist2 - a.dist2);

  // Inverse determinant of camera matrix
  const invDet = 1 / (planeX * dirY - dirX * planeY);

  for (const sprite of sprites) {
    // Transform sprite into camera space
    const transformX =  invDet * (dirY   * sprite.worldX - dirX   * sprite.worldY);
    const transformY =  invDet * (-planeY * sprite.worldX + planeX * sprite.worldY);

    if (transformY <= 0.1) continue; // behind or too close

    const spriteScreenX = Math.floor((W / 2) * (1 + transformX / transformY));

    const spriteH = Math.abs(Math.floor(H / transformY));
    const spriteW = spriteH; // square sprites

    const drawStartY = Math.max(0, Math.floor((H - spriteH) / 2));
    const drawEndY   = Math.min(H, Math.floor((H + spriteH) / 2));
    const drawStartX = Math.max(0, spriteScreenX - spriteW / 2);
    const drawEndX   = Math.min(W, spriteScreenX + spriteW / 2);

    // Draw sprite column by column (for zbuffer occlusion)
    ctx.imageSmoothingEnabled = false;

    const tileName = sprite.tileName;
    const atlasIdx = tileName && atlas ? atlas.byName.get(tileName) : undefined;
    const atlasCol = atlasIdx !== undefined ? atlasIdx % ATLAS_COLS : -1;
    const atlasRow = atlasIdx !== undefined ? Math.floor(atlasIdx / ATLAS_COLS) : -1;

    for (let sx = Math.floor(drawStartX); sx < Math.floor(drawEndX); sx++) {
      // Zbuffer check — only draw if sprite is closer than wall
      if (sx < 0 || sx >= W) continue;
      if (zBuffer[sx]! <= transformY) continue;

      const texX = Math.floor(((sx - (spriteScreenX - spriteW / 2)) / spriteW) * SRC_SIZE);

      if (atlasIdx !== undefined && atlas) {
        ctx.drawImage(
          atlas.canvas,
          atlasCol * SRC_SIZE + texX, atlasRow * SRC_SIZE, 1, SRC_SIZE,
          sx, drawStartY, 1, drawEndY - drawStartY,
        );
        // Hit flash
        if (sprite.hitFlash) {
          ctx.globalAlpha = 0.65;
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(sx, drawStartY, 1, drawEndY - drawStartY);
          ctx.globalAlpha = 1;
        }
      } else {
        // Fallback: colored rect column
        ctx.fillStyle = sprite.hitFlash ? '#ffffff' : sprite.color;
        ctx.fillRect(sx, drawStartY, 1, drawEndY - drawStartY);
      }
    }
  }

  // ── Crosshair ─────────────────────────────────────────────────────────────
  const cx = W / 2;
  const cy = H / 2;
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(cx - 8, cy); ctx.lineTo(cx + 8, cy);
  ctx.moveTo(cx, cy - 8); ctx.lineTo(cx, cy + 8);
  ctx.stroke();

  // ── Minimap ───────────────────────────────────────────────────────────────
  if (showMinimap) {
    drawMinimap(ctx, state, px, py, angle, W, H);
  }

  // ── Pointer-lock prompt ───────────────────────────────────────────────────
  if (!pointerLocked) {
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 18px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('Click to capture mouse', W / 2, H / 2 - 10);
    ctx.font = '13px monospace';
    ctx.fillStyle = '#aaaaaa';
    ctx.fillText('ESC to release', W / 2, H / 2 + 14);
  }
}

// ── Minimap ───────────────────────────────────────────────────────────────────

function drawMinimap(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  px: number,
  py: number,
  angle: number,
  canvasW: number,
  _canvasH: number,
): void {
  const { dungeon } = state;
  const { tiles } = dungeon;

  // How many tiles fit in the minimap box
  const visRadius = Math.floor(MM_SIZE / MM_TILE / 2);

  const originX = canvasW - MM_SIZE - MM_PADDING;
  const originY = MM_PADDING;

  // Background
  ctx.fillStyle = 'rgba(0,0,0,0.65)';
  ctx.fillRect(originX - 2, originY - 2, MM_SIZE + 4, MM_SIZE + 4);

  // Player tile
  const centerTX = Math.floor(px);
  const centerTY = Math.floor(py);

  for (let dy = -visRadius; dy <= visRadius; dy++) {
    for (let dx = -visRadius; dx <= visRadius; dx++) {
      const tx = centerTX + dx;
      const ty = centerTY + dy;

      if (tx < 0 || ty < 0 || ty >= dungeon.height || tx >= dungeon.width) continue;
      const tile = tiles[ty]?.[tx];
      if (!tile || !tile.explored) continue;

      const sx = originX + (dx + visRadius) * MM_TILE;
      const sy = originY + (dy + visRadius) * MM_TILE;

      if (!tile.visible) {
        ctx.fillStyle = 'rgba(80,80,80,0.5)';
      } else {
        switch (tile.type) {
          case TileType.WALL:        ctx.fillStyle = '#555566'; break;
          case TileType.FLOOR:       ctx.fillStyle = '#334'; break;
          case TileType.CORRIDOR:    ctx.fillStyle = '#224'; break;
          case TileType.DOOR:        ctx.fillStyle = '#885'; break;
          case TileType.STAIRS_DOWN:
          case TileType.STAIRS_UP:   ctx.fillStyle = '#aa8'; break;
          default:                   ctx.fillStyle = '#334'; break;
        }
      }
      ctx.fillRect(sx, sy, MM_TILE, MM_TILE);
    }
  }

  // Player dot
  const pdx = originX + visRadius * MM_TILE + (px - Math.floor(px)) * MM_TILE;
  const pdy = originY + visRadius * MM_TILE + (py - Math.floor(py)) * MM_TILE;
  ctx.fillStyle = '#ffff00';
  ctx.fillRect(pdx - 2, pdy - 2, 4, 4);

  // Direction arrow
  const arrowLen = 6;
  ctx.strokeStyle = '#ffff00';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pdx, pdy);
  ctx.lineTo(
    pdx + Math.cos(angle) * arrowLen,
    pdy + Math.sin(angle) * arrowLen,
  );
  ctx.stroke();

  // Border
  ctx.strokeStyle = 'rgba(255,255,255,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(originX - 2, originY - 2, MM_SIZE + 4, MM_SIZE + 4);

  // Label
  ctx.fillStyle = 'rgba(200,200,200,0.7)';
  ctx.font = '9px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('M: map', originX, originY + MM_SIZE + 14);
}
