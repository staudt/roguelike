# Roguelike Dungeon Crawler

Real-time action roguelike with random dungeon generation. TypeScript + Canvas.

## Quick Start
```
npm install
npm run dev
```

## Controls
- **W/S or Up/Down** — Select role (on role selection screen)
- **Space / Enter** — Confirm role selection
- **WASD / Arrow keys** — Move (in game)
- **Space / J** — Attack (in facing direction)
- **. or >** — Descend stairs (when standing on down stairs)
- **, or <** — Ascend stairs (when standing on up stairs)
- **R** — Restart (after death, returns to role selection)

## Tech Stack
- Vite + TypeScript
- HTML5 Canvas (no frameworks)
- 32x32 tile size, colored rectangles for sprites

## Architecture

### Source Files (`src/`)
| File | Purpose |
|------|---------|
| `main.ts` | Entry point, role selection screen, game loop |
| `game.ts` | Game state factory (`createGameState(roleId)`), entity ID generator |
| `attributes.ts` | `Attributes` interface, STR/DEX/CON bonus tables |
| `roles.ts` | `RoleDef` interface, role definitions (Warrior, Ranger, Brute) |
| `types.ts` | All interfaces, enums, constants |
| `palette.ts` | Color constants |
| `dungeon.ts` | Re-exports from `dungeon/` for backwards compat |
| `dungeon/types.ts` | Map generator types, `BranchDef`, branch registry |
| `dungeon/bsp.ts` | BSP dungeon generator (rooms + corridors + dead ends) |
| `dungeon/caves.ts` | Cellular automata cave generator (Gnomish Mines) |
| `dungeon/progression.ts` | `DungeonProgress` tracking, branch enter/leave |
| `dungeon/index.ts` | `generateFloor(branch, floor)` dispatcher |
| `dungeon/shared.ts` | Shared utilities (`isWalkable`) |
| `animation.ts` | `AnimationState`, `createAnimationState()`, `updateAnimation()`, hit flash & weapon swing triggers |
| `renderer.ts` | Canvas tile/entity/attack rendering (bounce, mirror, hit flash, weapon overlay) |
| `camera.ts` | Viewport following player with lerp |
| `input.ts` | Keyboard state tracking |
| `player.ts` | Player movement + wall collision |
| `tags.ts` | Open-ended tag constants, presets, helpers (`hasTag()`) |
| `monsters/defs.ts` | `MonsterDef` interface (tags + props bag) |
| `monsters/undead.ts` | Undead monsters (zombie, skeleton, ghoul, wraith, mummy) |
| `monsters/beasts.ts` | Beast monsters (grid bug, newt, jackal, rats, bats, wolf, spider, snakes) |
| `monsters/humanoid.ts` | Humanoid monsters (kobolds, gnomes, orcs, dwarf, hobgoblin, bugbear) |
| `monsters/special.ts` | Special monsters (floating eye, lichen, acid blob, yellow light) |
| `monsters/index.ts` | Monster registry (`getMonsterDef()`, `getMonstersForFloor()`) |
| `ai.ts` | Composable AI layer system (`runAI()`, chase/patrol/ambush/flee/berserker layers) |
| `progression.ts` | Difficulty, XP, level thresholds, spawn eligibility, monster/pet leveling |
| `enemy.ts` | Monster spawning (from registry, rarity-weighted), movement helpers |
| `entities.ts` | Update orchestration for all entities |
| `items/defs.ts` | `ItemDef`, `WeaponDef`, `ArmorDef`, `ConsumableDef`, `ItemInstance` interfaces |
| `items/weapons.ts` | Weapon definitions (rusty_sword, wooden_club, iron_spear, short_sword, war_hammer) |
| `items/index.ts` | Item registry (`getItemDef()`, `getWeaponDef()`, `getAllItems()`) |
| `inventory.ts` | `Inventory` interface, equipment slots, add/remove/equip helpers |
| `combat.ts` | Attack creation, hit detection, damage calc (reads weapon from inventory) |
| `fov.ts` | 360-degree raycasting field of view |
| `hud.ts` | HUD overlay (health, weapon from inventory, XP, messages) |

### Dungeon Generation & Branches
Pluggable map generators dispatched by `generateFloor(branch, floor)`:
- **BSP** (`dungeon/bsp.ts`): Main dungeon — recursively split map, place rooms in leaves, connect with L-shaped corridors, add dead-end branches. 50x40 tiles. Stairs placed in room farthest from start. May place mines entrance on floors 2-5
- **Caves** (`dungeon/caves.ts`): Gnomish Mines — cellular automata (55% open, 4 smoothing steps), flood-fill to keep largest region, find cavern pseudo-rooms for spawning. 60x50 tiles
- **Branches**: `main` (20 floors, BSP), `mines` (8 floors, caves). `DungeonProgress` tracks current branch/floor with a return stack for nested branches
- **Floor transitions**: Player stands on stairs and presses `.` or `>` to descend. Branch entrances lead to other dungeon types with different biome palettes
- **Biome rendering**: Per-branch tile color palettes (purple/navy for main, earthy browns for mines)

### Combat System
- **Damage types**: SLASH, THRUST, BLUNT
- Enemies have per-type vulnerability multipliers (e.g., Zombie: SLASH x2.0, BLUNT x0.5)
- Weapons degrade with use (durability). Broken weapons deal half damage.
- Attacks create directional hitboxes (150ms duration, 400ms cooldown)

### Monster System
Monsters are defined as data in `src/monsters/` using an open-ended tag system. `MonsterDef` has minimal fixed fields (health, speed, damage, weight, vulnerabilities) plus:
- **`tags: string[]`** — body parts, capabilities, AI behaviors, nature, size, rarity (e.g., `HAS_HANDS`, `AI_CHASE`, `UNDEAD`, `SIZE_MEDIUM`)
- **`props: Record<string, number>`** — numeric properties (contactCooldown, detectionRange, spawnFloorMin, etc.)
- Tag constants live in `src/tags.ts` with presets like `HUMANOID_TAGS`, `UNDEAD_HUMANOID_TAGS`
- Adding a new capability or behavior = adding one constant, never changing the interface

**Monster Categories** (31 total):
- **Undead** (5): zombie, skeleton, ghoul, wraith, mummy — MINDLESS, ALWAYS_HOSTILE
- **Beasts** (11): grid bug, newt, jackal, sewer rat, giant rat, bat, giant bat, wolf, cave spider, snake, pit viper — MINDLESS, always hostile
- **Humanoids** (11): kobold, large kobold, gnome, gnome lord, orc, hill orc, Orc-captain, dwarf, hobgoblin, bugbear — SENTIENT, alignment-aware (lawful gnomes/dwarves peaceful to lawful players, chaotic orcs/kobolds peaceful to chaotic players)
- **Special** (4): floating eye, lichen, acid blob, yellow light — MINDLESS/AMORPHOUS, always hostile

### Player Roles & Attributes
- **Role selection** at game start: Warrior (STR 16, high HP, d10 HP/level), Ranger (DEX 15, companion dog, d6 HP/level), Brute (STR 18, slow but devastating, d12 HP/level)
- **Attributes** (player-only, NetHack-style): STR (melee damage bonus), DEX (attack speed multiplier), CON (HP per level bonus). Future: INT, WIS, CHA
- **STR bonus**: -1 to +6 damage per hit depending on score tier
- **DEX bonus**: 0.75x to 1.15x attack cooldown multiplier
- **CON bonus**: -1 to +3 HP per level-up

### Progression System
- **Monster difficulty**: Auto-computed from stats (HP, speed, damage, weight, abilities, resistances, capability tags). Optional `props.difficultyOverride`
- **XP reward**: `1 + difficulty²` — quadratic scaling rewards harder monsters disproportionately
- **Player leveling**: NetHack doubling XP curve (20, 40, 80, 160...). HP per level = random roll (1 to hpDie from role) + CON bonus (minimum 1). Full heal on level-up
- **Monster/pet leveling**: Monsters and the dog level up by killing. HP grows, species stats (damage, speed) stay fixed. Dog XP = `5 + difficulty * 3` per kill
- **Spawn eligibility**: NetHack-style formula — `difficulty ≤ floor + playerLevel/2 + 3`, `difficulty ≥ floor / 6`. Floor dominates, player level is secondary. Rarity-weighted selection (common 4x, uncommon 2x, rare 1x)
- **Alignment system**: Sentient monsters with matching alignment to player spawn peaceful (cyan indicator). Attacking a peaceful creature makes it hostile. No XP for killing peacefuls. Roles define player alignment: Warrior=lawful, Ranger=neutral, Brute=chaotic
- **Sound tags** (future): `CAN_HEAR`, `KEEN_HEARING`, `DEAF` — prepared in tags.ts. `WeaponDef.noiseRadius` set on all weapons

### Inventory & Equipment
- **Item definitions** (`items/defs.ts`): Template data — `WeaponDef`, `ArmorDef`, `ConsumableDef` extend `ItemDef`
- **Item instances** (`ItemInstance`): Runtime state per item — `instanceId`, `defId`, mutable `durability`/`quantity`
- **Item registry** (`items/index.ts`): All defs registered at load time, lookup by ID
- **Inventory** (`inventory.ts`): Player carries items (`items[]`, `maxSlots: 20`) with equipment slots (`weapon`, `body`, `head`, `hands`, `feet`)
- **Combat reads from inventory**: `state.inventory.equipped.weapon` → look up `WeaponDef` → create attack
- Weapons: `rusty_sword` (SLASH), `wooden_club` (BLUNT), `iron_spear` (THRUST), `short_sword` (SLASH), `war_hammer` (BLUNT)

### Animation System
Per-entity `AnimationState` stored on `Entity.anim`, updated every frame by `updateAnimation()`:
- **Bounce walk**: Sin-wave vertical offset while moving, smoothly settles when stopped
- **Horizontal mirroring**: Entities flip via `ctx.scale(-1,1)` based on east/west facing
- **Hit flash**: White overlay for 120ms when taking damage (`triggerHitFlash()`)
- **Weapon swing**: Small rectangle rotates through a 0.6-radian arc over 150ms on attack (`triggerWeaponSwing()`)

### Key Design Principles
- **Permadeath** — no saves, death is final
- **Real-time** — not turn-based, movement and combat are continuous
- **Weapon degradation** — Fallout-inspired, weapons break with use
- **Vulnerability system** — right weapon for right enemy matters
- **Animated sprites** — colored rectangles with eyes, bounce walk, horizontal mirroring, hit flash, weapon swing overlay
- **Iterative development** — build foundation, expand incrementally

## Next Steps
- Pet evolution at level thresholds (puppy → dog → large dog)
- Loot drops on the ground and item pickup
- Weapon repair mechanic
- Sound propagation system (local BFS + global floor-wide)
- Alignment penalties (killing peacefuls shifts alignment toward chaotic)
- Minimap
