import type {
  Facing,
  FloorType,
  RoomProfile,
  WindowType,
} from '../types';

const STORAGE_KEY = 'mold-forecast:room';

const FLOOR_TYPES: readonly FloorType[] = [
  'basement',
  'first',
  'middle',
  'top',
];
const FACINGS: readonly Facing[] = ['N', 'E', 'W', 'S', 'unknown'];
const WINDOW_TYPES: readonly WindowType[] = [
  'single',
  'double',
  'unknown',
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isRoomProfile(value: unknown): value is RoomProfile {
  if (!isRecord(value) || !isRecord(value.address)) {
    return false;
  }

  const addressIsValid =
    typeof value.address.label === 'string' &&
    value.address.label.trim().length > 0 &&
    isFiniteNumber(value.address.nx) &&
    isFiniteNumber(value.address.ny);
  const requiredSelectionsAreValid =
    FLOOR_TYPES.includes(value.floor as FloorType) &&
    FACINGS.includes(value.facing as Facing) &&
    WINDOW_TYPES.includes(value.window as WindowType);
  const indoorDryingIsValid =
    value.indoorDrying === undefined ||
    typeof value.indoorDrying === 'boolean';
  const occupantsAreValid =
    value.occupants === undefined ||
    (isFiniteNumber(value.occupants) &&
      Number.isInteger(value.occupants) &&
      value.occupants >= 1);
  const measuredIsValid =
    value.measured === undefined ||
    (isRecord(value.measured) &&
      isFiniteNumber(value.measured.tempC) &&
      isFiniteNumber(value.measured.humidity) &&
      value.measured.humidity >= 0 &&
      value.measured.humidity <= 100);

  return (
    addressIsValid &&
    requiredSelectionsAreValid &&
    indoorDryingIsValid &&
    occupantsAreValid &&
    measuredIsValid
  );
}

export function loadRoomProfile(): RoomProfile | null {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return null;
    }

    const parsed: unknown = JSON.parse(stored);
    if (!isRoomProfile(parsed)) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed;
  } catch {
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage can be unavailable in restricted browser contexts.
    }
    return null;
  }
}

export function saveRoomProfile(profile: RoomProfile): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
}
