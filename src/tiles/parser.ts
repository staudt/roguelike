/**
 * Parses the NetHack text tile format (monsters.txt, objects.txt, other.txt)
 * into raw RGBA pixel data per tile (16×16).
 *
 * File format:
 *   <char> = (R, G, B)   ← palette entries
 *   # tile N (name[,variant])
 *   {
 *     <16 chars per row × 16 rows>
 *   }
 *
 * The '.' character is always the transparent/background pixel.
 */

export interface ParsedTile {
  /** e.g. "giant ant" */
  name: string;
  /** e.g. "male" | "female" | "" */
  variant: string;
  /** RGBA bytes, 16×16 = 1024 bytes */
  pixels: Uint8ClampedArray;
}

type RGB = [number, number, number];

function parsePalette(lines: string[]): Map<string, RGB> {
  const palette = new Map<string, RGB>();
  for (const line of lines) {
    // Match: X = (R, G, B)  or  X = (R,G,B)
    const m = line.match(/^(.) = \(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/);
    if (m) {
      palette.set(m[1]!, [parseInt(m[2]!), parseInt(m[3]!), parseInt(m[4]!)]);
    }
  }
  return palette;
}

export function parseTileFile(text: string): ParsedTile[] {
  const lines = text.split('\n');
  const palette = parsePalette(lines);
  const tiles: ParsedTile[] = [];

  let i = 0;

  // Advance to first tile header
  while (i < lines.length && !lines[i]!.startsWith('# tile ')) i++;

  while (i < lines.length) {
    const line = lines[i]!.trim();

    if (!line.startsWith('# tile ')) {
      i++;
      continue;
    }

    // Parse "# tile N (name)" or "# tile N (name,variant)"
    const headerMatch = line.match(/^# tile \d+ \(([^)]+)\)$/);
    let name = 'unknown';
    let variant = '';
    if (headerMatch) {
      const raw = headerMatch[1]!;
      const commaIdx = raw.lastIndexOf(',');
      if (commaIdx !== -1) {
        name = raw.slice(0, commaIdx).trim().toLowerCase();
        variant = raw.slice(commaIdx + 1).trim().toLowerCase();
      } else {
        name = raw.trim().toLowerCase();
      }
    }
    i++;

    // Skip to opening brace
    while (i < lines.length && lines[i]!.trim() !== '{') i++;
    i++; // skip '{'

    const pixels = new Uint8ClampedArray(16 * 16 * 4);
    let row = 0;

    while (i < lines.length && lines[i]!.trim() !== '}') {
      const rowLine = lines[i]!.trimStart(); // strip 2-space indentation
      for (let col = 0; col < 16; col++) {
        const ch = rowLine[col] ?? '.';
        const idx = (row * 16 + col) * 4;
        if (ch === '.') {
          // Transparent background
          pixels[idx]     = 0;
          pixels[idx + 1] = 0;
          pixels[idx + 2] = 0;
          pixels[idx + 3] = 0;
        } else {
          const rgb = palette.get(ch) ?? [255, 0, 255]; // magenta = missing color
          pixels[idx]     = rgb[0];
          pixels[idx + 1] = rgb[1];
          pixels[idx + 2] = rgb[2];
          pixels[idx + 3] = 255;
        }
      }
      row++;
      i++;
    }
    i++; // skip '}'

    tiles.push({ name, variant, pixels });
  }

  return tiles;
}
