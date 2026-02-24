const keys = new Set<string>();
let mouseX = 0;
let mouseY = 0;
const mouseButtonsDown = new Set<number>();
const mouseButtonsPressed = new Set<number>();

export function initInput(canvas: HTMLCanvasElement): void {
  window.addEventListener('keydown', (e) => {
    if (e.key === '`' || e.key === 'F1') e.preventDefault();
    keys.add(e.key.toLowerCase());
  });
  window.addEventListener('keyup', (e) => {
    keys.delete(e.key.toLowerCase());
  });
  // Clear keys on blur so held keys don't stick
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
    mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
  });

  canvas.addEventListener('mousedown', (e) => {
    mouseButtonsDown.add(e.button);
    mouseButtonsPressed.add(e.button);
    e.preventDefault();
  });

  canvas.addEventListener('mouseup', (e) => {
    mouseButtonsDown.delete(e.button);
  });

  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
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

export function getMousePos(): { x: number; y: number } {
  return { x: mouseX, y: mouseY };
}

export function isMouseButtonDown(button: number): boolean {
  return mouseButtonsDown.has(button);
}

export function isMouseButtonPressed(button: number): boolean {
  if (mouseButtonsPressed.has(button)) {
    mouseButtonsPressed.delete(button);
    return true;
  }
  return false;
}
