import { TileMap, TileType } from '../types';

export function isWalkable(tiles: TileMap, tileX: number, tileY: number): boolean {
  if (tileY < 0 || tileY >= tiles.length || tileX < 0 || tileX >= tiles[0]!.length) return false;
  const t = tiles[tileY]![tileX]!.type;
  return t !== TileType.WALL;
}
