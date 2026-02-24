import { ItemDef } from './defs';

// One entry per monster that can plausibly leave a body.
// Amorphous/energy monsters (acid blob, yellow light, lichen) leave nothing.
// IDs follow the pattern: corpse_<monsterDefId>

export const CORPSES: ItemDef[] = [
  // ── Undead ─────────────────────────────────────────────
  { id: 'corpse_zombie',    name: 'zombie corpse',    category: 'corpse', weight: 1500, value: 0 },
  { id: 'corpse_skeleton',  name: 'skeleton corpse',  category: 'corpse', weight: 400,  value: 0 },
  { id: 'corpse_ghoul',     name: 'ghoul corpse',     category: 'corpse', weight: 1000, value: 0 },
  { id: 'corpse_mummy',     name: 'mummy corpse',     category: 'corpse', weight: 1800, value: 0 },

  // ── Special ─────────────────────────────────────────────
  // Floating eye: very rare — eating one eventually grants telepathy
  { id: 'corpse_floating_eye', name: 'floating eye corpse', category: 'corpse', weight: 30, value: 0 },

  // ── Beasts ─────────────────────────────────────────────
  { id: 'corpse_newt',       name: 'newt corpse',       category: 'corpse', weight: 100,  value: 0 },
  { id: 'corpse_jackal',     name: 'jackal corpse',     category: 'corpse', weight: 400,  value: 0 },
  { id: 'corpse_sewer_rat',  name: 'sewer rat corpse',  category: 'corpse', weight: 300,  value: 0 },
  { id: 'corpse_giant_rat',  name: 'giant rat corpse',  category: 'corpse', weight: 600,  value: 0 },
  { id: 'corpse_giant_bat',  name: 'giant bat corpse',  category: 'corpse', weight: 500,  value: 0 },
  { id: 'corpse_wolf',       name: 'wolf corpse',       category: 'corpse', weight: 800,  value: 0 },
  { id: 'corpse_cave_spider',name: 'cave spider corpse',category: 'corpse', weight: 300,  value: 0 },
  { id: 'corpse_snake',      name: 'snake corpse',      category: 'corpse', weight: 300,  value: 0 },
  { id: 'corpse_pit_viper',  name: 'pit viper corpse',  category: 'corpse', weight: 500,  value: 0 },

  // ── Humanoids ───────────────────────────────────────────
  { id: 'corpse_kobold',      name: 'kobold corpse',      category: 'corpse', weight: 400,  value: 0 },
  { id: 'corpse_large_kobold',name: 'large kobold corpse',category: 'corpse', weight: 600,  value: 0 },
  { id: 'corpse_gnome',       name: 'gnome corpse',       category: 'corpse', weight: 700,  value: 0 },
  { id: 'corpse_gnome_lord',  name: 'gnome lord corpse',  category: 'corpse', weight: 900,  value: 0 },
  { id: 'corpse_orc',         name: 'orc corpse',         category: 'corpse', weight: 1000, value: 0 },
  { id: 'corpse_hill_orc',    name: 'hill orc corpse',    category: 'corpse', weight: 1200, value: 0 },
  { id: 'corpse_orc_captain', name: 'Orc-captain corpse', category: 'corpse', weight: 1400, value: 0 },
  { id: 'corpse_dwarf',       name: 'dwarf corpse',       category: 'corpse', weight: 1100, value: 0 },
  { id: 'corpse_hobgoblin',   name: 'hobgoblin corpse',   category: 'corpse', weight: 900,  value: 0 },
  { id: 'corpse_bugbear',     name: 'bugbear corpse',     category: 'corpse', weight: 1300, value: 0 },
];
