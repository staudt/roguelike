import {
  GameState,
  TileType,
  TILE_SIZE,
  CAMERA_SCALE,
  DamageType,
  Direction,
  Entity,
} from './types';
import { Camera } from './camera';
import { PAL } from './palette';

const TILE_COLORS: Record<TileType, string> = {
  [TileType.WALL]: PAL.wall,
  [TileType.FLOOR]: PAL.floor,
  [TileType.CORRIDOR]: PAL.corridor,
  [TileType.DOOR]: PAL.door,
  [TileType.STAIRS_DOWN]: PAL.stairs,
};

const ATTACK_COLORS: Record<DamageType, string> = {
  [DamageType.SLASH]: PAL.slashAttack,
  [DamageType.THRUST]: PAL.thrustAttack,
  [DamageType.BLUNT]: PAL.bluntAttack,
};

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
): void {
  const { dungeon, player, enemies, attacks } = state;
  const { tiles } = dungeon;

  ctx.save();
  ctx.scale(CAMERA_SCALE, CAMERA_SCALE);

  // Clear
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, cam.width, cam.height);

  // Calculate visible tile range
  const startTX = Math.max(0, Math.floor(cam.x / TILE_SIZE));
  const startTY = Math.max(0, Math.floor(cam.y / TILE_SIZE));
  const endTX = Math.min(dungeon.width, Math.ceil((cam.x + cam.width) / TILE_SIZE) + 1);
  const endTY = Math.min(dungeon.height, Math.ceil((cam.y + cam.height) / TILE_SIZE) + 1);

  // Draw tiles
  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = tiles[ty]![tx]!;
      if (!tile.explored) continue;

      const screenX = tx * TILE_SIZE - cam.x;
      const screenY = ty * TILE_SIZE - cam.y;

      // Draw tile
      ctx.fillStyle = TILE_COLORS[tile.type];
      ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);

      // Wall top edge highlight for depth
      if (tile.type === TileType.WALL) {
        ctx.fillStyle = PAL.wallHighlight;
        ctx.fillRect(screenX, screenY, TILE_SIZE, 2);
      }

      // Stairs marker
      if (tile.type === TileType.STAIRS_DOWN) {
        ctx.fillStyle = PAL.bg;
        ctx.font = '20px monospace';
        ctx.textAlign = 'center';
        ctx.fillText('>', screenX + TILE_SIZE / 2, screenY + TILE_SIZE / 2 + 6);
      }

      // Fog overlay for explored but not visible
      if (!tile.visible) {
        ctx.fillStyle = PAL.fogOverlay;
        ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // Draw enemies (only if on visible tile)
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const etx = Math.floor((enemy.x + enemy.width / 2) / TILE_SIZE);
    const ety = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
    if (etx < 0 || ety < 0 || ety >= tiles.length || etx >= tiles[0]!.length) continue;
    if (!tiles[ety]![etx]!.visible) continue;

    drawEntity(ctx, enemy, cam);

    // Health bar above enemy
    const sx = enemy.x - cam.x;
    const sy = enemy.y - cam.y - 6;
    const barW = enemy.width;
    const barH = 3;
    const pct = enemy.health / enemy.maxHealth;
    ctx.fillStyle = PAL.healthBarBg;
    ctx.fillRect(sx, sy, barW, barH);
    ctx.fillStyle = pct > 0.5 ? PAL.healthBar : PAL.damageText;
    ctx.fillRect(sx, sy, barW * pct, barH);
  }

  // Draw player
  if (player.alive) {
    drawEntity(ctx, player, cam);

    // Direction indicator (small white dot showing facing)
    const pcx = player.x + player.width / 2 - cam.x;
    const pcy = player.y + player.height / 2 - cam.y;
    let ix = pcx;
    let iy = pcy;
    switch (player.facing) {
      case Direction.NORTH: iy -= player.height / 2 + 2; break;
      case Direction.SOUTH: iy += player.height / 2 + 2; break;
      case Direction.WEST: ix -= player.width / 2 + 2; break;
      case Direction.EAST: ix += player.width / 2 + 2; break;
    }
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(ix, iy, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  // Draw attacks (on top of all entities)
  for (const atk of attacks) {
    const sx = atk.x - cam.x;
    const sy = atk.y - cam.y;
    ctx.globalAlpha = Math.min(1, atk.timer / 50);
    ctx.fillStyle = ATTACK_COLORS[atk.damageType];
    ctx.fillRect(sx, sy, atk.width, atk.height);
    ctx.globalAlpha = 1;
  }

  // Draw floating damage numbers (topmost layer)
  for (const ft of state.floatingTexts) {
    const sx = ft.x - cam.x;
    const sy = ft.y - cam.y;
    const alpha = Math.min(1, ft.timer / (ft.maxTimer * 0.3));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, sx, sy);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

function drawEntity(ctx: CanvasRenderingContext2D, entity: Entity, cam: Camera): void {
  const sx = entity.x - cam.x;
  const sy = entity.y - cam.y;

  // Body
  ctx.fillStyle = entity.color;
  ctx.fillRect(sx, sy, entity.width, entity.height);

  // Simple border for depth
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 1;
  ctx.strokeRect(sx + 0.5, sy + 0.5, entity.width - 1, entity.height - 1);

  // Eyes (two small dots)
  ctx.fillStyle = '#ffffff';
  const eyeSize = 3;
  const eyeSpacing = 5;
  let ex1: number, ey1: number, ex2: number, ey2: number;

  switch (entity.facing) {
    case Direction.SOUTH:
      ex1 = sx + entity.width / 2 - eyeSpacing;
      ey1 = sy + entity.height / 2 + 2;
      ex2 = sx + entity.width / 2 + eyeSpacing - eyeSize;
      ey2 = ey1;
      break;
    case Direction.NORTH:
      ex1 = sx + entity.width / 2 - eyeSpacing;
      ey1 = sy + entity.height / 2 - 5;
      ex2 = sx + entity.width / 2 + eyeSpacing - eyeSize;
      ey2 = ey1;
      break;
    case Direction.WEST:
      ex1 = sx + entity.width / 2 - 6;
      ey1 = sy + entity.height / 2 - eyeSpacing;
      ex2 = ex1;
      ey2 = sy + entity.height / 2 + eyeSpacing - eyeSize;
      break;
    case Direction.EAST:
      ex1 = sx + entity.width / 2 + 3;
      ey1 = sy + entity.height / 2 - eyeSpacing;
      ex2 = ex1;
      ey2 = sy + entity.height / 2 + eyeSpacing - eyeSize;
      break;
  }
  ctx.fillRect(ex1, ey1, eyeSize, eyeSize);
  ctx.fillRect(ex2, ey2, eyeSize, eyeSize);
}
