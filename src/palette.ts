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

  // Entities — Player & Companion
  player: '#3ddc84',
  dog: '#c4854c',

  // Undead
  zombie: '#cc3333',
  skeleton: '#bbb4aa',
  ghoul: '#66aa66',
  wraith: '#6666aa',
  mummy: '#ccaa66',

  // Beasts
  gridBug: '#88ee55',
  newt: '#668844',
  jackal: '#aa8866',
  sewerRat: '#887766',
  giantRat: '#996655',
  bat: '#885544',
  giantBat: '#774433',
  wolf: '#998888',
  caveSpider: '#884422',
  snake: '#448844',
  pitViper: '#336633',

  // Kobolds
  kobold: '#ee6644',
  largeKobold: '#dd5533',

  // Gnomes (lawful — blue-ish)
  gnome: '#6688cc',
  gnomeLord: '#5577bb',

  // Orcs (chaotic — red-ish)
  orc: '#cc5544',
  hillOrc: '#bb3333',
  orcCaptain: '#aa2222',

  // Humanoids
  dwarf: '#8899bb',
  hobgoblin: '#cc7744',
  bugbear: '#997744',

  // Special
  floatingEye: '#44ccff',
  lichen: '#44aa44',
  acidBlob: '#88ff44',
  yellowLight: '#ffff44',

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
  peacefulIndicator: '#44ff88',
} as const;
