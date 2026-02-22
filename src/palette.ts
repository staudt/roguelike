// Color palette inspired by the reference screenshot
// Dark purples/navy for environment, bright accents for entities

export const PAL = {
  // Environment
  bg: '#0a0a14',
  wall: '#1a1a2e',
  wallHighlight: '#252540',
  floor: '#2d2d5e',
  corridor: '#252550',
  door: '#8b6914',
  stairs: '#ffd700',
  fogOverlay: 'rgba(5, 5, 12, 0.7)',

  // Entities
  player: '#3ddc84',
  dog: '#c4854c',
  zombie: '#cc3333',
  skeleton: '#bbb4aa',

  // Combat
  slashAttack: '#ffee58',
  thrustAttack: '#64b5f6',
  bluntAttack: '#ff8a65',

  // Mines biome
  minesWall: '#3a2a1a',
  minesWallHighlight: '#4a3a2a',
  minesFloor: '#5a4a32',
  minesFogOverlay: 'rgba(10, 8, 4, 0.7)',

  // UI
  healthBar: '#4caf50',
  healthBarBg: '#661111',
  durabilityBar: '#42a5f5',
  durabilityBarBg: '#1a3050',
  hudBg: 'rgba(10, 10, 20, 0.75)',
  hudText: '#c8c8dc',
  hudTextBright: '#ffffff',
  messageText: '#aaaacc',
  narrativeText: '#d4c8a8',
  damageText: '#ff5555',
} as const;
