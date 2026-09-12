import type { Facing, FloorType, WindowType } from '../types';

export const MAGNUS_A = 17.62;
export const MAGNUS_B = 243.12;

/** 벽면 열손실 계수 보정값 */
export const K_BASE = 0.35;
export const K_FLOOR: Record<FloorType, number> = {
  basement: 0.15,
  top: 0.1,
  first: 0.05,
  middle: 0,
};
export const K_FACING: Record<Facing, number> = {
  N: 0.1,
  E: 0.05,
  W: 0.05,
  S: 0,
  unknown: 0.05,
};
export const K_WINDOW: Record<WindowType, number> = {
  single: 0.15,
  double: -0.05,
  unknown: 0,
};
export const K_MIN = 0.15;
export const K_MAX = 0.75;

/** 생활 수분 발생량 g/m³ */
export const MOISTURE_BASE = 4.0;
export const MOISTURE_DRYING = 4.0;
export const MOISTURE_OCCUPANT = 1.5;

/** 지중온도 ℃ */
export const GROUND_TEMP = 16;
