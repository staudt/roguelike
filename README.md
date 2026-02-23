# Roguelike Dungeon Crawler

A real-time action roguelike with procedurally generated dungeons, written in TypeScript and rendered on an HTML5 Canvas.

## Features

- Real-time movement and combat (not turn-based)
- Procedural dungeon generation (BSP rooms + cellular automata caves)
- Multiple dungeon branches (Main Dungeon, Gnomish Mines)
- 30+ monsters with distinct AI behaviors
- Weapon degradation, vulnerability system, and alignment mechanics
- Companion dog that levels up and evolves
- Field of view / fog of war
- NetHack tile sprites for all entities and terrain

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173](http://localhost:5173) in your browser.

## Controls

| Key | Action |
|-----|--------|
| W / S / ↑ / ↓ | Navigate role selection |
| Space / Enter | Confirm role |
| WASD / Arrow keys | Move |
| Space / J | Attack (in facing direction) |
| . or > | Descend stairs |
| , or < | Ascend stairs |
| = / - | Zoom in / out |
| R | Restart after death |

## Roles

| Role | Playstyle |
|------|-----------|
| **Warrior** | Strong and tough. Starts with a rusty sword. |
| **Ranger** | Quick and precise. Starts with a dog companion. |
| **Caveman** | Slow but devastating. Clubs everything into dust. |

## Build

```bash
npm run build
```

## Tech Stack

- [Vite](https://vitejs.dev/) + TypeScript
- HTML5 Canvas (no frameworks)
- 32×32 tile size, 2× scaled from 16×16 NetHack sprites

---

## Tile Credits

Tile graphics are taken from the [NetHack 3.7](https://github.com/NetHack/NetHack/tree/NetHack-3.7) open-source release, specifically the text-format tile definitions in `win/share/`:

- `monsters.txt` — monster sprites
- `objects.txt` — item and weapon sprites
- `other.txt` — terrain sprites (floor, walls, stairs, doors)

NetHack is © 1985–2024 by Stichting Mathematisch Centrum and the NetHack development team.
The tile artwork was contributed by the NetHack community and is distributed under the [NetHack General Public License (NGPL)](https://github.com/NetHack/NetHack/blob/NetHack-3.7/dat/license).
