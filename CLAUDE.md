# Roguelike Dungeon Crawler

Real-time action roguelike with random dungeon generation. TypeScript + Canvas.

## Quick Start
```
npm install
npm run dev
```

## Controls
- **WASD / Arrow keys** — Move
- **Space / J** — Attack (in facing direction)
- **R** — Restart (after death)

## Tech Stack
- Vite + TypeScript
- HTML5 Canvas (no frameworks)
- 32x32 tile size, colored rectangles for sprites

## Architecture

### Source Files (`src/`)
| File | Purpose |
|------|---------|
| `main.ts` | Entry point, game loop (requestAnimationFrame + delta time) |
| `game.ts` | Game state factory, entity ID generator |
| `types.ts` | All interfaces, enums, constants |
| `palette.ts` | Color constants |
| `dungeon.ts` | BSP dungeon generation (rooms + corridors) |
| `renderer.ts` | Canvas tile/entity/attack rendering |
| `camera.ts` | Viewport following player with lerp |
| `input.ts` | Keyboard state tracking |
| `player.ts` | Player movement + wall collision |
| `enemy.ts` | Enemy definitions, spawning, AI (chase/patrol) |
| `entities.ts` | Update orchestration for all entities |
| `combat.ts` | Attack creation, hit detection, damage calc |
| `fov.ts` | 360-degree raycasting field of view |
| `hud.ts` | HUD overlay (health, weapon, messages) |

### Dungeon Generation
BSP (Binary Space Partition): recursively split map, place rooms in leaves, connect with L-shaped corridors. Map is 50x40 tiles. Stairs placed in room farthest from start.

### Combat System
- **Damage types**: SLASH, THRUST, BLUNT
- Enemies have per-type vulnerability multipliers (e.g., Zombie: SLASH x2.0, BLUNT x0.5)
- Weapons degrade with use (durability). Broken weapons deal half damage.
- Attacks create directional hitboxes (150ms duration, 400ms cooldown)

### Enemy Types
| Type | HP | Speed | Weak to | Resistant to | AI |
|------|-----|-------|---------|-------------|-----|
| Zombie | 30 | 60 | SLASH x2 | BLUNT x0.5 | Chase |
| Skeleton | 20 | 100 | BLUNT x2 | SLASH x0.5 | Patrol then Chase |

### Key Design Principles
- **Permadeath** — no saves, death is final
- **Real-time** — not turn-based, movement and combat are continuous
- **Weapon degradation** — Fallout-inspired, weapons break with use
- **Vulnerability system** — right weapon for right enemy matters
- **Minimalist sprites** — colored rectangles with eyes, extend later
- **Iterative development** — build foundation, expand incrementally

## Next Steps
- Loot drops and inventory system
- More enemy types (armored, ranged, boss)
- More weapon types (spear/thrust, mace/blunt)
- Weapon repair mechanic
- Floor progression (stairs to next floor, harder enemies)
- Sound effects
- Minimap
- Better sprite art
