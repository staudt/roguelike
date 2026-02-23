const keys = new Set<string>();
let _mouseDX = 0;

export function initInput(): void {
  window.addEventListener('keydown', (e) => {
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });
  // Clear keys on blur so held keys don't stick
  window.addEventListener('blur', () => {
    keys.clear();
  });
}

export function isKeyDown(key: string): boolean {
  return keys.has(key);
}

export function isKeyPressed(key: string): boolean {
  if (keys.has(key)) {
    keys.delete(key);
    return true;
  }
  return false;
}

/** Accumulate mouse horizontal delta (called from main.ts on mousemove). */
export function addMouseDX(dx: number): void {
  _mouseDX += dx;
}

/** Consume and reset the accumulated mouse delta for this frame. */
export function consumeMouseDX(): number {
  const v = _mouseDX;
  _mouseDX = 0;
  return v;
}
