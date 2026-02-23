/**
 * Loads and combines the three NetHack tile text files into a single
 * OffscreenCanvas sprite atlas (tiles laid out in a grid, 20 columns wide).
 *
 * Source tiles are 16×16.  The atlas stores them at 16×16 and we scale 2×
 * at draw time so they match our 32×32 TILE_SIZE.
 *
 * Tile order in atlas:  monsters → objects → other
 * Name lookup always returns the first variant (male) of each monster.
 */

import { parseTileFile, ParsedTile } from './parser';

const ATLAS_COLS = 32;
const SRC_W = 16;
const SRC_H = 16;

export interface TileAtlas {
  /** The combined offscreen canvas. */
  canvas: OffscreenCanvas;
  /** name (lowercase) → global atlas tile index */
  byName: Map<string, number>;
  totalTiles: number;
}

async function fetchTileFile(url: string): Promise<ParsedTile[]> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
  return parseTileFile(await res.text());
}

export async function loadNetHackAtlas(): Promise<TileAtlas | null> {
  try {
    const [monsterTiles, objectTiles, otherTiles] = await Promise.all([
      fetchTileFile('/tiles/monsters.txt'),
      fetchTileFile('/tiles/objects.txt'),
      fetchTileFile('/tiles/other.txt'),
    ]);

    const allTiles = [...monsterTiles, ...objectTiles, ...otherTiles];
    const byName = new Map<string, number>();

    for (let i = 0; i < allTiles.length; i++) {
      const tile = allTiles[i]!;
      // Store only the first occurrence of each name (male variant comes first)
      if (!byName.has(tile.name)) {
        byName.set(tile.name, i);
      }
    }

    const rows = Math.ceil(allTiles.length / ATLAS_COLS);
    const canvas = new OffscreenCanvas(ATLAS_COLS * SRC_W, rows * SRC_H);
    const ctx = canvas.getContext('2d')!;

    for (let i = 0; i < allTiles.length; i++) {
      const tile = allTiles[i]!;
      const col = i % ATLAS_COLS;
      const row = Math.floor(i / ATLAS_COLS);
      const imgData = new ImageData(tile.pixels, SRC_W, SRC_H);
      ctx.putImageData(imgData, col * SRC_W, row * SRC_H);
    }

    console.log(`[tiles] Atlas built: ${allTiles.length} tiles, ${byName.size} unique names`);
    return { canvas, byName, totalTiles: allTiles.length };
  } catch (err) {
    console.warn('[tiles] Failed to load NetHack atlas, using fallback renderer:', err);
    return null;
  }
}

/**
 * Draw a tile by name at (destX, destY) scaled to destW×destH.
 * Returns true if the tile was found and drawn.
 */
export function drawTile(
  ctx: CanvasRenderingContext2D,
  atlas: TileAtlas,
  name: string,
  destX: number,
  destY: number,
  destW = 32,
  destH = 32,
): boolean {
  const idx = atlas.byName.get(name);
  if (idx === undefined) return false;

  const col = idx % ATLAS_COLS;
  const row = Math.floor(idx / ATLAS_COLS);

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    atlas.canvas,
    col * SRC_W, row * SRC_H, SRC_W, SRC_H,
    destX, destY, destW, destH,
  );
  return true;
}
