import {
  MOCK_LOCATIONS,
  mockScenarios,
  type MockScenarioData,
  type MockScenarioKey,
} from './mockScenarios';
import type { ForecastPoint, WeatherData } from '../types';

interface WeatherOffsets {
  tempC: number;
  humidity: number;
}

interface WeatherVariant {
  scenario: MockScenarioKey;
  offsets: WeatherOffsets;
}

const NO_OFFSETS: WeatherOffsets = { tempC: 0, humidity: 0 };
const API_TIMEOUT_MS = 3000;

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function defaultVariant(nx: number, ny: number): WeatherVariant {
  if (nx === 59 && ny === 127) {
    return { scenario: 'rainy', offsets: NO_OFFSETS };
  }

  if (nx === 60 && ny === 128) {
    return {
      scenario: 'mild',
      offsets: { tempC: 2, humidity: 12 },
    };
  }

  return { scenario: 'mild', offsets: NO_OFFSETS };
}

function applyOffsets(
  point: ForecastPoint,
  offsets: WeatherOffsets,
): ForecastPoint {
  return {
    ...point,
    tempC: roundToOne(point.tempC + offsets.tempC),
    humidity: roundToOne(
      Math.min(Math.max(point.humidity + offsets.humidity, 0), 100),
    ),
  };
}

function createWeatherData(
  weather: MockScenarioData,
  location: WeatherData['location'],
  offsets: WeatherOffsets,
  source: WeatherData['source'],
): WeatherData {
  return {
    location: {
      label: location.label,
      nx: location.nx,
      ny: location.ny,
    },
    source,
    observedAt: weather.observedAt,
    current: applyOffsets(weather.current, offsets),
    hourly: weather.hourly.map((point) => applyOffsets(point, offsets)),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isForecastPoint(value: unknown): value is ForecastPoint {
  if (!isRecord(value)) {
    return false;
  }

  const precipitation = value.precipitationType;
  return (
    typeof value.time === 'string' &&
    typeof value.tempC === 'number' &&
    Number.isFinite(value.tempC) &&
    typeof value.humidity === 'number' &&
    Number.isFinite(value.humidity) &&
    typeof precipitation === 'number' &&
    Number.isInteger(precipitation) &&
    precipitation >= 0 &&
    precipitation <= 4
  );
}

function isWeatherData(value: unknown): value is WeatherData {
  return (
    isRecord(value) &&
    isRecord(value.location) &&
    typeof value.location.label === 'string' &&
    typeof value.location.nx === 'number' &&
    typeof value.location.ny === 'number' &&
    typeof value.observedAt === 'string' &&
    isForecastPoint(value.current) &&
    Array.isArray(value.hourly) &&
    value.hourly.length > 0 &&
    value.hourly.every(isForecastPoint)
  );
}

function locationFor(nx: number, ny: number): WeatherData['location'] {
  const knownLocation = MOCK_LOCATIONS.find(
    (candidate) => candidate.nx === nx && candidate.ny === ny,
  );

  return knownLocation
    ? {
        label: knownLocation.label,
        nx: knownLocation.nx,
        ny: knownLocation.ny,
      }
    : { label: `좌표 ${nx}/${ny}`, nx, ny };
}

async function fetchApiWeather(
  nx: number,
  ny: number,
  location: WeatherData['location'],
): Promise<WeatherData> {
  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    API_TIMEOUT_MS,
  );

  try {
    const query = new URLSearchParams({
      nx: String(nx),
      ny: String(ny),
    });
    const response = await fetch(`/api/weather?${query}`, {
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new Error(`날씨 API 응답 오류: ${response.status}`);
    }

    const data: unknown = await response.json();
    if (!isWeatherData(data)) {
      throw new Error('날씨 API 응답 형식이 올바르지 않습니다.');
    }

    return {
      ...data,
      location: { ...location },
      current: { ...data.current },
      hourly: data.hourly.map((point) => ({ ...point })),
      source: 'api',
    };
  } finally {
    globalThis.clearTimeout(timeoutId);
  }
}

export async function fetchWeather(
  nx: number,
  ny: number,
  scenario?: MockScenarioKey,
): Promise<WeatherData> {
  const location = locationFor(nx, ny);

  if (scenario !== undefined) {
    return createWeatherData(
      mockScenarios[scenario],
      location,
      NO_OFFSETS,
      'demo',
    );
  }

  try {
    return await fetchApiWeather(nx, ny, location);
  } catch {
    const variant = defaultVariant(nx, ny);

    return createWeatherData(
      mockScenarios[variant.scenario],
      location,
      variant.offsets,
      'fallback',
    );
  }
}
