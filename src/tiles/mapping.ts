/**
 * Maps our game entities and tile types to NetHack tile names.
 * Names must match exactly (lowercase) what appears in the tile file comments.
 */

import { TileType } from '../types';

// ── Monster defs ID → NetHack tile name ──────────────────────────────────────

export const MONSTER_TILE_NAMES: Record<string, string> = {
  // Beasts
  grid_bug:   'grid bug',
  newt:       'newt',
  jackal:     'jackal',
  sewer_rat:  'sewer rat',
  giant_rat:  'giant rat',
  bat:        'bat',
  giant_bat:  'giant bat',
  wolf:       'wolf',
  cave_spider:'cave spider',
  snake:      'snake',
  pit_viper:  'pit viper',

  // Undead
  zombie:   'human zombie',
  skeleton: 'skeleton',
  ghoul:    'ghoul',
  wraith:   'wraith',
  mummy:    'human mummy',

  // Humanoids
  kobold:      'kobold',
  large_kobold:'large kobold',
  gnome:       'gnome',
  gnome_lord:  'gnome leader',   // NetHack calls it "gnome leader"
  orc:         'orc',
  hill_orc:    'hill orc',
  orc_captain: 'orc-captain',
  dwarf:       'dwarf',
  hobgoblin:   'hobgoblin',
  bugbear:     'bugbear',

  // Special
  floating_eye: 'floating eye',
  lichen:       'lichen',
  acid_blob:    'acid blob',
  yellow_light: 'yellow light',
};

// ── Dog companion form → NetHack tile name ────────────────────────────────────

export const DOG_FORM_TILE_NAMES: Record<string, string> = {
  little_dog: 'little dog',
  dog:        'dog',
  large_dog:  'large dog',
};

// ── Player role → NetHack tile name ──────────────────────────────────────────

export const PLAYER_ROLE_TILE_NAMES: Record<string, string> = {
  warrior: 'warrior',
  ranger:  'ranger',
  caveman: 'cave dweller',
};

// ── Equipped weapon → NetHack tile name (from objects.txt) ───────────────────

export const WEAPON_TILE_NAMES: Record<string, string> = {
  rusty_sword:  'short sword',     // closest match
  short_sword:  'short sword',
  wooden_club:  'club',
  iron_spear:   'spear',
  war_hammer:   'war hammer',
};

// ── Terrain types → NetHack tile name (from other.txt) ───────────────────────

export const TERRAIN_TILE_NAMES: Partial<Record<TileType, string>> = {
  [TileType.FLOOR]:       'floor of a room',
  [TileType.WALL]:        'stone',
  [TileType.CORRIDOR]:    'corridor',
  [TileType.DOOR]:        'horizontal open door',
  [TileType.STAIRS_DOWN]: 'staircase down',
  [TileType.STAIRS_UP]:   'staircase up',
};

// Mine-biome wall uses the gehennom/mines wall variant
export const MINES_WALL_TILE_NAME = 'mines walls vertical';

// ── Trap type → NetHack tile name (from other.txt) ────────────────────────────

import { TrapType } from '../dungeon/types';

export const TRAP_TILE_NAMES: Record<TrapType, string> = {
  [TrapType.ARROW]:     'arrow trap',
  [TrapType.PIT]:       'pit',
  [TrapType.SLEEP_GAS]: 'sleeping gas trap',
};
