import { MonsterDef } from './defs';
import { DamageType } from '../types';
import { PAL } from '../palette';
import {
  UNDEAD_HUMANOID_TAGS,
  AI_CHASE,
  AI_PATROL,
  RARITY_COMMON,
  CAN_HEAR,
  DEAF,
} from '../tags';

export const UNDEAD_MONSTERS: MonsterDef[] = [
  {
    id: 'zombie',
    name: 'Zombie',
    color: PAL.zombie,
    health: 30,
    speed: 60,
    damage: 8,
    weight: 1.5,
    vulnerabilities: {
      [DamageType.SLASH]: 2.0,
      [DamageType.BLUNT]: 0.5,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      AI_CHASE,
      CAN_HEAR,
      RARITY_COMMON,
    ],
    props: {
      contactCooldown: 1000,
      spawnFloorMin: 1,
      spawnFloorMax: 8,
      groupSizeMin: 1,
      groupSizeMax: 3,
    },
  },
  {
    id: 'skeleton',
    name: 'Skeleton',
    color: PAL.skeleton,
    health: 10,
    speed: 100,
    damage: 5,
    weight: 0.7,
    vulnerabilities: {
      [DamageType.SLASH]: 0.5,
      [DamageType.BLUNT]: 2.0,
    },
    tags: [
      ...UNDEAD_HUMANOID_TAGS,
      AI_PATROL,
      AI_CHASE,
      DEAF,
      RARITY_COMMON,
    ],
    props: {
      contactCooldown: 800,
      spawnFloorMin: 1,
      spawnFloorMax: 12,
      groupSizeMin: 1,
      groupSizeMax: 2,
    },
  },
];
