// ── Dungeon Progress Tracking ────────────────────────────
// Tracks which floor the player is on within which branch,
// and handles transitions between floors and branches.

export interface DungeonProgress {
  branch: string;        // current branch id ('main', 'mines', etc.)
  floor: number;         // current floor within the branch (1-based)
  // Track return points — when entering a branch, remember where to come back
  returnStack: ReturnPoint[];
}

export interface ReturnPoint {
  branch: string;
  floor: number;
}

export function createDungeonProgress(): DungeonProgress {
  return {
    branch: 'main',
    floor: 1,
    returnStack: [],
  };
}

export function advanceFloor(progress: DungeonProgress): void {
  progress.floor++;
}

export function enterBranch(progress: DungeonProgress, targetBranch: string, targetFloor: number): void {
  // Save return point
  progress.returnStack.push({
    branch: progress.branch,
    floor: progress.floor,
  });
  progress.branch = targetBranch;
  progress.floor = targetFloor;
}

export function leaveBranch(progress: DungeonProgress): boolean {
  const ret = progress.returnStack.pop();
  if (!ret) return false;
  progress.branch = ret.branch;
  progress.floor = ret.floor;
  return true;
}
