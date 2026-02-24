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
  CORPSE_TILE_NAME,
  CATEGORY_TILE_NAMES,
} from './tiles/mapping';
import { getItemDef } from './items';
import { StatusEffectType } from './status';
import { TrapType } from './dungeon/types';
import { SIZE_SMALL, SIZE_MEDIUM, SIZE_LARGE, SIZE_HUGE } from './tags';

// ── Visual size by size tag ───────────────────────────────────────────────────
// Returns the visual pixel dimensions for a monster.
// Sprites are ground-anchored: the bottom of the visual rect aligns with the
// bottom of the gameplay hitbox, so taller monsters grow upward into wall tiles,
// giving a pseudo-3/4 view impression.

function sizeTagToVisual(tags: readonly string[]): { w: number; h: number } {
  if (tags.includes(SIZE_HUGE))   return { w: 54, h: 68 };
  if (tags.includes(SIZE_LARGE))  return { w: 40, h: 52 };
  if (tags.includes(SIZE_MEDIUM)) return { w: 28, h: 36 };
  if (tags.includes(SIZE_SMALL))  return { w: 20, h: 22 };
  /* SIZE_TINY or unknown */      return { w: 14, h: 14 };
}

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

  // ── Draw ground items ──
  for (const gi of state.groundItems) {
    const gx = gi.x - cam.x;
    const gy = gi.y - cam.y;
    // Cull items outside the viewport
    if (gx < -TILE_SIZE || gx > cam.width + TILE_SIZE || gy < -TILE_SIZE || gy > cam.height + TILE_SIZE) continue;
    // Only draw if the tile is visible
    const gtx = Math.floor(gi.x / TILE_SIZE);
    const gty = Math.floor(gi.y / TILE_SIZE);
    const gtile = tiles[gty]?.[gtx];
    if (!gtile?.visible) continue;

    const def = getItemDef(gi.item.defId);
    let tileName: string | undefined;
    if (def.category === 'corpse') {
      tileName = CORPSE_TILE_NAME;
    } else if (def.category === 'weapon') {
      tileName = WEAPON_TILE_NAMES[gi.item.defId];
    } else {
      tileName = CATEGORY_TILE_NAMES[def.category];
    }

    const drawn = atlas && tileName
      ? drawTile(ctx, atlas, tileName, gx - TILE_SIZE / 2, gy - TILE_SIZE / 2, TILE_SIZE, TILE_SIZE)
      : false;

    if (!drawn) {
      // Fallback: small colored square
      ctx.fillStyle = def.category === 'corpse' ? '#996644' : '#ccaa44';
      ctx.fillRect(gx - 6, gy - 6, 12, 12);
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

      // Dog status effect overlay
      if (dog.statusEffects.length > 0) {
        const dox = dog.x - cam.x;
        const doy = dog.y - cam.y;
        const now = Date.now();
        for (const eff of dog.statusEffects) {
          let color: string;
          let pulse: number;
          if (eff.type === StatusEffectType.PARALYZED || eff.type === StatusEffectType.IN_PIT) {
            color = '#4488ff';
            pulse = 0.25 + Math.abs(Math.sin(now / 180)) * 0.3;
          } else {
            color = '#33cc44';
            pulse = 0.25 + Math.abs(Math.sin(now / 120)) * 0.3;
          }
          ctx.globalAlpha = pulse;
          ctx.fillStyle = color;
          ctx.fillRect(dox, doy, dog.width, dog.height);
          ctx.globalAlpha = 1;
        }
      }

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
  visualW = entity.width,
  visualH = entity.height,
): void {
  const { anim } = entity;
  const sx = entity.x - cam.x;
  const sy = entity.y - cam.y;

  // Ground-anchored: bottom of visual sprite = bottom of gameplay hitbox.
  // Taller sprites grow upward, overlapping the wall tile above for a 3/4-view feel.
  const vsx = sx + (entity.width  - visualW) / 2;
  const vsy = sy +  entity.height - visualH;

  const cx = sx + entity.width / 2;  // horizontal center (= vsx + visualW/2)
  const cy = vsy + visualH / 2;      // visual vertical center

  ctx.save();

  // Squash/stretch bounce — anchored at entity bottom (ground level)
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

  // Peaceful glow — flat ellipse at feet, like a ground halo
  if (peaceful) {
    const pulse = 0.25 + Math.abs(Math.sin(Date.now() / 600)) * 0.25;
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PAL.peacefulIndicator;
    ctx.beginPath();
    ctx.ellipse(
      vsx + visualW / 2,  // center x
      vsy + visualH,      // at ground level (feet)
      visualW / 2 + 3,    // x radius — matches sprite width
      4,                  // y radius — flat disc
      0, 0, Math.PI * 2,
    );
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  let usedSprite = false;

  if (atlas && tileName) {
    usedSprite = drawTile(ctx, atlas, tileName, vsx, vsy, visualW, visualH);
  }

  if (!usedSprite) {
    // Colored rectangle fallback
    ctx.fillStyle = entity.color;
    ctx.fillRect(vsx, vsy, visualW, visualH);

    ctx.strokeStyle = peaceful ? PAL.peacefulIndicator : 'rgba(0,0,0,0.3)';
    ctx.lineWidth   = peaceful ? 1.5 : 1;
    ctx.strokeRect(vsx + 0.5, vsy + 0.5, visualW - 1, visualH - 1);

    drawEyes(ctx, entity, vsx, vsy, visualW, visualH);
  }

  // Hit flash overlay
  if (anim.hitFlashTimer > 0) {
    ctx.globalAlpha = 0.65;
    ctx.fillStyle   = '#ffffff';
    ctx.fillRect(vsx, vsy, visualW, visualH);
    ctx.globalAlpha = 1;
  }

  // Weapon overlay — tile sprite (always shown as held, swings on attack)
  // or colored-rect fallback (only shown when swinging)
  if (weaponTileName && atlas) {
    drawWeaponTileOverlay(ctx, atlas, weaponTileName, entity, vsx, vsy, cx, cy);
  } else if (anim.weaponSwinging) {
    drawWeaponSwing(ctx, entity, vsx, vsy, cx, cy);
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
  const { w, h } = sizeTagToVisual(enemy.def.tags);
  drawEntitySprite(ctx, atlas, tileName, enemy, cam, !enemy.hostile, undefined, w, h);
}

function drawDogEntity(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas | null,
  dog: CompanionEntity,
  cam: Camera,
): void {
  const tileName = DOG_FORM_TILE_NAMES[dog.form];
  drawEntitySprite(ctx, atlas, tileName, dog, cam, true);
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
  w: number,
  h: number,
): void {
  ctx.fillStyle = '#ffffff';
  const eyeSize    = Math.max(2, Math.round(w / 10));
  const eyeSpacing = Math.max(3, Math.round(w / 6));
  let ex1: number, ey1: number, ex2: number, ey2: number;
  const hcx = sx + w / 2;
  const hcy = sy + h / 2;

  switch (entity.facing) {
    case Direction.SOUTH:
      ex1 = hcx - eyeSpacing;
      ey1 = hcy + 2;
      ex2 = hcx + eyeSpacing - eyeSize;
      ey2 = ey1;
      break;
    case Direction.NORTH:
      ex1 = hcx - eyeSpacing;
      ey1 = hcy - 5;
      ex2 = hcx + eyeSpacing - eyeSize;
      ey2 = ey1;
      break;
    case Direction.WEST:
      ex1 = hcx - eyeSpacing - eyeSize;
      ey1 = hcy - eyeSpacing;
      ex2 = ex1;
      ey2 = hcy + eyeSpacing - eyeSize;
      break;
    default: // EAST
      ex1 = hcx + eyeSpacing - eyeSize;
      ey1 = hcy - eyeSpacing;
      ex2 = ex1;
      ey2 = hcy + eyeSpacing - eyeSize;
      break;
  }
  ctx.fillRect(ex1, ey1, eyeSize, eyeSize);
  ctx.fillRect(ex2, ey2, eyeSize, eyeSize);
}

/**
 * Draw the equipped weapon as a tile sprite pointing in the entity's aimAngle direction.
 * Always visible at rest; rotates through weaponAngle arc when swinging.
 * Undoes the horizontal mirror transform before applying the world-space aim angle.
 */
function drawWeaponTileOverlay(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  tileName: string,
  entity: Entity,
  _sx: number,
  _sy: number,
  cx: number,
  cy: number,
): void {
  const { anim } = entity;
  const weaponSize = 16;
  const REST_ANGLE = -0.15;
  const swingOffset = anim.weaponSwinging ? anim.weaponAngle : REST_ANGLE;

  ctx.save();
  ctx.imageSmoothingEnabled = false;

  // Undo the horizontal mirror applied for west-facing so aimAngle stays world-space
  if (!anim.facingRight) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  // Rotate around entity center in aim direction, then draw tile extending from edge
  ctx.translate(cx, cy);
  ctx.rotate(entity.aimAngle + swingOffset);
  drawTile(ctx, atlas, tileName, entity.width / 2 - 2, -weaponSize / 2, weaponSize, weaponSize);
  ctx.restore();
}

function drawWeaponSwing(
  ctx: CanvasRenderingContext2D,
  entity: Entity,
  _sx: number,
  _sy: number,
  cx: number,
  cy: number,
): void {
  const weaponLen = 14;
  const weaponW   = 4;
  const { anim } = entity;

  ctx.save();

  // Undo horizontal mirror so aimAngle stays world-space
  if (!anim.facingRight) {
    ctx.translate(cx, cy);
    ctx.scale(-1, 1);
    ctx.translate(-cx, -cy);
  }

  ctx.translate(cx, cy);
  ctx.rotate(entity.aimAngle + anim.weaponAngle);
  ctx.fillStyle = '#cccccc';
  ctx.fillRect(entity.width / 2 - 2, -weaponW / 2, weaponLen, weaponW);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(entity.width / 2 - 2 + weaponLen - 3, -weaponW / 2, 3, weaponW);
  ctx.restore();
}

// ── Crosshair ─────────────────────────────────────────────────────────────────

export function renderCrosshair(
  ctx: CanvasRenderingContext2D,
  mouseX: number,
  mouseY: number,
): void {
  const size = 10;
  const gap  = 3;

  ctx.save();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth   = 1.5;
  ctx.lineCap     = 'round';

  ctx.beginPath();
  ctx.moveTo(mouseX - size, mouseY); ctx.lineTo(mouseX - gap, mouseY);
  ctx.moveTo(mouseX + gap,  mouseY); ctx.lineTo(mouseX + size, mouseY);
  ctx.moveTo(mouseX, mouseY - size); ctx.lineTo(mouseX, mouseY - gap);
  ctx.moveTo(mouseX, mouseY + gap);  ctx.lineTo(mouseX, mouseY + size);
  ctx.stroke();

  ctx.restore();
}
