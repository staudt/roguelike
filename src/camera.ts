import { Entity, TILE_SIZE, CAMERA_SCALE } from './types';
import { CAMERA_LERP_SPEED } from './config';

const ZOOM_MIN = 1;
const ZOOM_MAX = 4;
const ZOOM_STEP = 0.5;

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
}

export function createCamera(canvasW: number, canvasH: number): Camera {
  return { x: 0, y: 0, width: canvasW / CAMERA_SCALE, height: canvasH / CAMERA_SCALE, scale: CAMERA_SCALE };
}

export function zoomCamera(cam: Camera, direction: 1 | -1, canvasW: number, canvasH: number): void {
  cam.scale = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, cam.scale + direction * ZOOM_STEP));
  cam.width = canvasW / cam.scale;
  cam.height = canvasH / cam.scale;
}

export function updateCamera(
  cam: Camera,
  target: Entity,
  mapW: number,
  mapH: number,
  dt: number,
): void {
  const targetX = target.x + target.width / 2 - cam.width / 2;
  const targetY = target.y + target.height / 2 - cam.height / 2;

  const t = Math.min(1, CAMERA_LERP_SPEED * dt);
  cam.x += (targetX - cam.x) * t;
  cam.y += (targetY - cam.y) * t;

  // Clamp to map bounds
  const maxX = mapW * TILE_SIZE - cam.width;
  const maxY = mapH * TILE_SIZE - cam.height;
  cam.x = Math.max(0, Math.min(cam.x, maxX));
  cam.y = Math.max(0, Math.min(cam.y, maxY));
}
