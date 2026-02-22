import { MapGeneratorResult } from './types';
import { getBranchDef } from './types';
import { generateBSP } from './bsp';
import { generateCaves } from './caves';

export { isWalkable } from './shared';
export { getBranchDef, BRANCHES } from './types';
export type { BranchDef, MapGeneratorResult, StairsPlacement } from './types';
export { createDungeonProgress, advanceFloor, enterBranch, leaveBranch } from './progression';
export type { DungeonProgress, ReturnPoint } from './progression';

export function generateFloor(branch: string, floor: number): MapGeneratorResult {
  const branchDef = getBranchDef(branch);

  const config = {
    width: branchDef.tileWidth,
    height: branchDef.tileHeight,
    floor,
    branch,
  };

  switch (branchDef.generator) {
    case 'bsp':
      return generateBSP(config);
    case 'caves':
      return generateCaves(config);
    default:
      return generateBSP(config);
  }
}
