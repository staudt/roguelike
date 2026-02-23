import {
  GameState,
  TileType,
  TILE_SIZE,
  DamageType,
  Direction,
  Entity,
  EnemyEntity,
  CompanionEntity,
} from './types';
import { Camera } from './camera';
import { PAL } from './palette';
import { TileAtlas, drawTile } from './tiles/atlas';
import {
  MONSTER_TILE_NAMES,
  DOG_FORM_TILE_NAMES,
  PLAYER_ROLE_TILE_NAMES,
  WEAPON_TILE_NAMES,
  TERRAIN_TILE_NAMES,
  MINES_WALL_TILE_NAME,
  TRAP_TILE_NAMES,
} from './tiles/mapping';
import { StatusEffectType } from './status';
import { TrapType } from './dungeon/types';

// ── Biome palettes (fallback colored-rect rendering) ─────────────────────────

interface BiomePalette {
  wall: string;
  wallHighlight: string;
  floor: string;
  corridor: string;
  door: string;
  stairs: string;
  fogOverlay: string;
}

const MAIN_PALETTE: BiomePalette = {
  wall: PAL.wall,
  wallHighlight: PAL.wallHighlight,
  floor: PAL.floor,
  corridor: PAL.corridor,
  door: PAL.door,
  stairs: PAL.stairs,
  fogOverlay: PAL.fogOverlay,
};

const MINES_PALETTE: BiomePalette = {
  wall: PAL.minesWall,
  wallHighlight: PAL.minesWallHighlight,
  floor: PAL.minesFloor,
  corridor: PAL.minesFloor,
  door: PAL.door,
  stairs: PAL.stairs,
  fogOverlay: PAL.minesFogOverlay,
};

const BIOME_PALETTES: Record<string, BiomePalette> = {
  main: MAIN_PALETTE,
  mines: MINES_PALETTE,
};

function getBiomePalette(branch: string): BiomePalette {
  return BIOME_PALETTES[branch] ?? MAIN_PALETTE;
}

function getTileColor(tileType: TileType, biome: BiomePalette): string {
  switch (tileType) {
    case TileType.WALL:        return biome.wall;
    case TileType.FLOOR:       return biome.floor;
    case TileType.CORRIDOR:    return biome.corridor;
    case TileType.DOOR:        return biome.door;
    case TileType.STAIRS_DOWN: return biome.stairs;
    case TileType.STAIRS_UP:   return biome.stairs;
  }
}

const ATTACK_COLORS: Record<DamageType, string> = {
  [DamageType.SLASH]:  PAL.slashAttack,
  [DamageType.THRUST]: PAL.thrustAttack,
  [DamageType.BLUNT]:  PAL.bluntAttack,
};

// ── Main render ───────────────────────────────────────────────────────────────

export function render(
  ctx: CanvasRenderingContext2D,
  state: GameState,
  cam: Camera,
  atlas: TileAtlas | null = null,
): void {
  const { dungeon, progress, player, enemies, attacks } = state;
  const { tiles } = dungeon;
  const biome = getBiomePalette(progress.branch);

  ctx.save();
  ctx.scale(cam.scale, cam.scale);
  if (atlas) ctx.imageSmoothingEnabled = false;

  // Clear
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, cam.width, cam.height);

  // Tile range in view
  const startTX = Math.max(0, Math.floor(cam.x / TILE_SIZE));
  const startTY = Math.max(0, Math.floor(cam.y / TILE_SIZE));
  const endTX   = Math.min(dungeon.width,  Math.ceil((cam.x + cam.width)  / TILE_SIZE) + 1);
  const endTY   = Math.min(dungeon.height, Math.ceil((cam.y + cam.height) / TILE_SIZE) + 1);

  // ── Draw terrain ──
  for (let ty = startTY; ty < endTY; ty++) {
    for (let tx = startTX; tx < endTX; tx++) {
      const tile = tiles[ty]![tx]!;
      if (!tile.explored) continue;

      const sx = tx * TILE_SIZE - cam.x;
      const sy = ty * TILE_SIZE - cam.y;

      drawTerrainTile(ctx, atlas, tile.type, progress.branch, sx, sy, biome);

      // Fog overlay for explored-but-not-visible tiles
      if (!tile.visible) {
        ctx.fillStyle = biome.fogOverlay;
        ctx.fillRect(sx, sy, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  // ── Draw revealed traps ──
  if (dungeon.traps) {
    for (const trap of dungeon.traps) {
      if (!trap.revealed) continue;
      const tileData = tiles[trap.tileY]?.[trap.tileX];
      if (!tileData?.visible) continue;
      const tsx = trap.tileX * TILE_SIZE - cam.x;
      const tsy = trap.tileY * TILE_SIZE - cam.y;
      if (trap.triggered) {
        // Spent trap — faint darkened tile or X glyph fallback
        ctx.globalAlpha = 0.3;
        const drawn = atlas && drawTile(ctx, atlas, TRAP_TILE_NAMES[trap.type], tsx, tsy, TILE_SIZE, TILE_SIZE);
        if (!drawn) {
          ctx.font = `bold ${Math.floor(TILE_SIZE * 0.65)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillStyle = '#888888';
          ctx.fillText('x', tsx + TILE_SIZE / 2, tsy + TILE_SIZE / 2 + 6);
          ctx.textAlign = 'left';
        }
        ctx.globalAlpha = 1;
      } else {
        // Active revealed trap — try atlas tile, fall back to bright colored glyph
        const drawn = atlas && drawTile(ctx, atlas, TRAP_TILE_NAMES[trap.type], tsx, tsy, TILE_SIZE, TILE_SIZE);
        if (!drawn) {
          const trapColor = trap.type === TrapType.PIT ? '#cc8833'
            : trap.type === TrapType.ARROW ? '#ff5555'
            : '#bb55ff'; // SLEEP_GAS
          ctx.font = `bold ${Math.floor(TILE_SIZE * 0.75)}px monospace`;
          ctx.textAlign = 'center';
          ctx.fillStyle = trapColor;
          ctx.fillText('^', tsx + TILE_SIZE / 2, tsy + TILE_SIZE * 0.75);
          ctx.textAlign = 'left';
        }
      }
    }
  }

  // ── Draw enemies ──
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    const etx = Math.floor((enemy.x + enemy.width  / 2) / TILE_SIZE);
    const ety = Math.floor((enemy.y + enemy.height / 2) / TILE_SIZE);
    if (etx < 0 || ety < 0 || ety >= tiles.length || etx >= (tiles[0]?.length ?? 0)) continue;
    if (!tiles[ety]![etx]!.visible) continue;

    drawEnemyEntity(ctx, atlas, enemy, cam);

    const esx = enemy.x - cam.x;
    const esy = enemy.y - cam.y - 6;
    if (enemy.hostile) {
      const pct = enemy.health / enemy.maxHealth;
      ctx.fillStyle = PAL.healthBarBg;
      ctx.fillRect(esx, esy, enemy.width, 3);
      ctx.fillStyle = pct > 0.5 ? PAL.healthBar : PAL.damageText;
      ctx.fillRect(esx, esy, enemy.width * pct, 3);
    } else {
      ctx.fillStyle = PAL.peacefulIndicator;
      ctx.beginPath();
      ctx.arc(esx + enemy.width / 2, esy, 3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // ── Draw dog companion ──
  const { dog } = state;
  if (dog && dog.alive) {
    const dtx = Math.floor((dog.x + dog.width  / 2) / TILE_SIZE);
    const dty = Math.floor((dog.y + dog.height / 2) / TILE_SIZE);
    if (dtx >= 0 && dty >= 0 && dty < tiles.length && dtx < (tiles[0]?.length ?? 0) && tiles[dty]![dtx]!.visible) {
      drawDogEntity(ctx, atlas, dog, cam);

      const dsx = dog.x - cam.x;
      const dsy = dog.y - cam.y - 6;
      const dPct = dog.health / dog.maxHealth;
      ctx.fillStyle = PAL.healthBarBg;
      ctx.fillRect(dsx, dsy, dog.width, 3);
      ctx.fillStyle = dPct > 0.5 ? PAL.healthBar : PAL.damageText;
      ctx.fillRect(dsx, dsy, dog.width * dPct, 3);
    }
  }

  // ── Draw player ──
  if (player.alive) {
    const equippedWeaponId = state.inventory.equipped.weapon?.defId;
    const weaponTileName   = equippedWeaponId ? WEAPON_TILE_NAMES[equippedWeaponId] : undefined;
    drawPlayerEntity(ctx, atlas, player, state.playerRole, weaponTileName, cam);

    // Status effect overlays (drawn after the sprite so they appear on top)
    if (state.playerStatusEffects.length > 0) {
      const psx = player.x - cam.x;
      const psy = player.y - cam.y;
      const now = Date.now();
      for (const eff of state.playerStatusEffects) {
        let color: string;
        let pulse: number;
        if (eff.type === StatusEffectType.PARALYZED || eff.type === StatusEffectType.IN_PIT) {
          color = '#4488ff';
          pulse = 0.25 + Math.abs(Math.sin(now / 180)) * 0.3;
        } else if (eff.type === StatusEffectType.POISONED) {
          color = '#33cc44';
          pulse = 0.25 + Math.abs(Math.sin(now / 120)) * 0.3;
        } else if (eff.type === StatusEffectType.BLINDED) {
          color = '#ffdd44';
          pulse = 0.35 + Math.abs(Math.sin(now / 200)) * 0.25;
        } else { // SLOWED
          color = '#aaaaaa';
          pulse = 0.3;
        }
        ctx.globalAlpha = pulse;
        ctx.fillStyle = color;
        ctx.fillRect(psx, psy, player.width, player.height);
        ctx.globalAlpha = 1;
      }
    }
  }

  // ── Draw attacks ──
  for (const atk of attacks) {
    const asx = atk.x - cam.x;
    const asy = atk.y - cam.y;
    ctx.globalAlpha = Math.min(1, atk.timer / 50);
    ctx.fillStyle = ATTACK_COLORS[atk.damageType];
    ctx.fillRect(asx, asy, atk.width, atk.height);
    ctx.globalAlpha = 1;
  }

  // ── Floating damage numbers ──
  for (const ft of state.floatingTexts) {
    const ftx = ft.x - cam.x;
    const fty = ft.y - cam.y;
    const alpha = Math.min(1, ft.timer / (ft.maxTimer * 0.3));
    ctx.globalAlpha = alpha;
    ctx.fillStyle = ft.color;
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(ft.text, ftx, fty);
    ctx.globalAlpha = 1;
  }

  // ── Blindness vignette ──
  if (state.playerStatusEffects.some(e => e.type === StatusEffectType.BLINDED)) {
    const now = Date.now();
    const pulse = 0.30 + Math.abs(Math.sin(now / 300)) * 0.12;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = '#cc9900';
    ctx.fillRect(0, 0, cam.width, cam.height);
    ctx.globalAlpha = 1;
  }

  ctx.restore();
}

// ── Terrain ───────────────────────────────────────────────────────────────────

function drawTerrainTile(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas | null,
  tileType: TileType,
  branch: string,
  screenX: number,
  screenY: number,
  biome: BiomePalette,
): void {
  if (atlas) {
    let name = TERRAIN_TILE_NAMES[tileType];
    if (tileType === TileType.WALL && branch === 'mines') name = MINES_WALL_TILE_NAME;
    if (name && drawTile(ctx, atlas, name, screenX, screenY, TILE_SIZE, TILE_SIZE)) return;
  }

  // Fallback colored rect
  ctx.fillStyle = getTileColor(tileType, biome);
  ctx.fillRect(screenX, screenY, TILE_SIZE, TILE_SIZE);
  if (tileType === TileType.WALL) {
    ctx.fillStyle = biome.wallHighlight;
    ctx.fillRect(screenX, screenY, TILE_SIZE, 2);
  }
  // Stair glyphs in fallback mode
  if (tileType === TileType.STAIRS_DOWN || tileType === TileType.STAIRS_UP) {
    ctx.fillStyle = PAL.bg;
    ctx.font = '20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(
      tileType === TileType.STAIRS_DOWN ? '>' : '<',
      screenX + TILE_SIZE / 2,
      screenY + TILE_SIZE / 2 + 6,
    );
  }
}

// ── Sprite drawing with animation ─────────────────────────────────────────────

/**
 * Attempt to draw a named NetHack tile sprite for an entity, with all the
 * animation transforms (bounce, mirror, hit flash, weapon swing).
 * Falls back to the colored-rectangle renderer if the tile isn't in the atlas.
 */
function drawEntitySprite(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas | null,
  tileName: string | undefined,
  entity: Entity,
  cam: Camera,
  peaceful = false,
  weaponTileName?: string,
): void {
  const { anim } = entity;
  const sx  = entity.x - cam.x;
  const sy  = entity.y - cam.y;
  const cx  = sx + entity.width  / 2;
  const cy  = sy + entity.height / 2;

  ctx.save();

  // Squash/stretch bounce
  if (anim.bounceScaleY !== 0) {
    const scaleY  = 1 + anim.bounceScaleY;
    const scaleX  = 1 - anim.bounceScaleY * 0.5;
    const bottomY = sy + entity.height;
    ctx.translate(cx, bottomY);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-cx, -bottomY);
  }

  // Mirror when facing left
  if (!anim.facingRight) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  let usedSprite = false;

  if (atlas && tileName) {
    usedSprite = drawTile(ctx, atlas, tileName, sx, sy, entity.width, entity.height);
  }

  if (!usedSprite) {
    // Colored rectangle fallback
    ctx.fillStyle = entity.color;
    ctx.fillRect(sx, sy, entity.width, entity.height);

    ctx.strokeStyle = peaceful ? PAL.peacefulIndicator : 'rgba(0,0,0,0.3)';
    ctx.lineWidth   = peaceful ? 1.5 : 1;
    ctx.strokeRect(sx + 0.5, sy + 0.5, entity.width - 1, entity.height - 1);

    drawEyes(ctx, entity, sx, sy);
  }

  // Hit flash overlay
  if (anim.hitFlashTimer > 0) {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle   = '#ffffff';
    ctx.fillRect(sx, sy, entity.width, entity.height);
    ctx.globalAlpha = 1;
  }

  // Weapon overlay — tile sprite (always shown as held, swings on attack)
  // or colored-rect fallback (only shown when swinging)
  if (weaponTileName && atlas) {
    drawWeaponTileOverlay(ctx, atlas, weaponTileName, entity, sx, sy, cx, cy);
  } else if (anim.weaponSwinging) {
    drawWeaponSwing(ctx, entity, sx, sy, cx, cy);
  }

  ctx.restore();
}

function drawEnemyEntity(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas | null,
  enemy: EnemyEntity,
  cam: Camera,
): void {
  const tileName = MONSTER_TILE_NAMES[enemy.def.id];
  drawEntitySprite(ctx, atlas, tileName, enemy, cam, !enemy.hostile);
}

function drawDogEntity(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas | null,
  dog: CompanionEntity,
  cam: Camera,
): void {
  const tileName = DOG_FORM_TILE_NAMES[dog.form];
  drawEntitySprite(ctx, atlas, tileName, dog, cam);
}

function drawPlayerEntity(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas | null,
  player: Entity,
  roleId: string,
  weaponTileName: string | undefined,
  cam: Camera,
): void {
  const tileName = PLAYER_ROLE_TILE_NAMES[roleId];
  drawEntitySprite(ctx, atlas, tileName, player, cam, false, weaponTileName);
}

// ── Fallback helpers ──────────────────────────────────────────────────────────

function drawEyes(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  sx: number,
  sy: number,
): void {
  ctx.fillStyle = '#ffffff';
  const eyeSize    = 3;
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
    default: // EAST
      ex1 = sx + entity.width / 2 + 3;
      ey1 = sy + entity.height / 2 - eyeSpacing;
      ex2 = ex1;
      ey2 = sy + entity.height / 2 + eyeSpacing - eyeSize;
      break;
  }
  ctx.fillRect(ex1, ey1, eyeSize, eyeSize);
  ctx.fillRect(ex2, ey2, eyeSize, eyeSize);
}

/**
 * Draw the equipped weapon as a tile sprite extending from the player's edge.
 * Always visible (acts as facing indicator). Rotates through weaponAngle when swinging.
 * Works correctly with the horizontal mirror transform already applied for WEST facing.
 */
function drawWeaponTileOverlay(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  tileName: string,
  entity: Entity,
  sx: number,
  sy: number,
  cx: number,
  cy: number,
): void {
  const { anim } = entity;
  const weaponSize = 16; // draw weapon at 16×16 px
  const REST_ANGLE = -0.15; // slight upward tilt when held at rest

  let pivotX: number, pivotY: number, baseAngle: number;

  switch (entity.facing) {
    case Direction.EAST:
    case Direction.WEST:
      // Mirror transform already flips WEST to look correct; use right-edge pivot for both
      pivotX    = sx + entity.width - 2;
      pivotY    = cy;
      baseAngle = 0;
      break;
    case Direction.SOUTH:
      pivotX    = cx;
      pivotY    = sy + entity.height - 2;
      baseAngle = Math.PI / 2;
      break;
    default: // NORTH
      pivotX    = cx;
      pivotY    = sy + 2;
      baseAngle = -Math.PI / 2;
      break;
  }

  const angle = anim.weaponSwinging ? anim.weaponAngle : REST_ANGLE;

  ctx.save();
  ctx.imageSmoothingEnabled = false;
  ctx.translate(pivotX, pivotY);
  ctx.rotate(baseAngle + angle);
  // Tile extends rightward from pivot, centered vertically
  drawTile(ctx, atlas, tileName, 0, -weaponSize / 2, weaponSize, weaponSize);
  ctx.restore();
}

function drawWeaponSwing(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  sx: number,
  sy: number,
  cx: number,
  cy: number,
): void {
  const weaponLen = 14;
  const weaponW   = 4;
  let pivotX: number, pivotY: number, baseAngle: number;

  switch (entity.facing) {
    case Direction.EAST:
      pivotX = sx + entity.width - 2; pivotY = cy;           baseAngle = 0;           break;
    case Direction.WEST:
      pivotX = sx + 2;                pivotY = cy;           baseAngle = Math.PI;     break;
    case Direction.SOUTH:
      pivotX = cx;                    pivotY = sy + entity.height - 2; baseAngle = Math.PI / 2;  break;
    default: // NORTH
      pivotX = cx;                    pivotY = sy + 2;       baseAngle = -Math.PI / 2; break;
  }

  ctx.save();
  ctx.translate(pivotX, pivotY);
  ctx.rotate(baseAngle + entity.anim.weaponAngle);
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(0, -weaponW / 2, weaponLen, weaponW);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(weaponLen - 3, -weaponW / 2, 3, weaponW);
  ctx.restore();
}
