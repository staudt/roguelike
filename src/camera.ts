import { Entity, TILE_SIZE, CAMERA_SCALE } from './types';
import { CAMERA_LERP_SPEED } from './config';

export interface Camera {
  x: number;
  y: number;
  width: number;
  height: number;
}

export function createCamera(canvasW: number, canvasH: number): Camera {
  return { x: 0, y: 0, width: canvasW / CAMERA_SCALE, height: canvasH / CAMERA_SCALE };
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
