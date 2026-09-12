import type { ForecastPoint, WeatherData } from '../types';

export type MockScenarioKey = 'rainy' | 'winter' | 'mild';

export interface MockLocation {
  label: string;
  nx: number;
  ny: number;
  scenario: MockScenarioKey;
}

export const MOCK_LOCATIONS: readonly MockLocation[] = [
  {
    label: '서울 마포구 서교동',
    nx: 59,
    ny: 127,
    scenario: 'rainy',
  },
  {
    label: '서울 관악구 신림동',
    nx: 59,
    ny: 125,
    scenario: 'winter',
  },
  {
    label: '서울 성북구 안암동',
    nx: 60,
    ny: 128,
    scenario: 'mild',
  },
];

interface ScenarioDefinition {
  location: MockLocation;
  start: { year: number; month: number; day: number; hour: number };
  tempBase: number;
  tempAmplitude: number;
  tempRange: readonly [min: number, max: number];
  humidityBase: number;
  humidityAmplitude: number;
  humidityPhase: 1 | -1;
  humidityRange: readonly [min: number, max: number];
  precipitation: (hourIndex: number) => ForecastPoint['precipitationType'];
}

const FIXED_NOISE = [
  0.12, -0.35, 0.21, -0.08, 0.43, -0.24, 0.06, 0.31,
  -0.41, 0.18, -0.03, 0.37, -0.16, 0.27, -0.29, 0.09,
  0.48, -0.12, 0.24, -0.33, 0.04, 0.39, -0.19, 0.14,
] as const;

const TWO_PI = Math.PI * 2;

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function roundToOne(value: number): number {
  return Math.round(value * 10) / 10;
}

function formatLocalTime(
  start: ScenarioDefinition['start'],
  hourIndex: number,
): string {
  const date = new Date(
    Date.UTC(start.year, start.month - 1, start.day, start.hour + hourIndex),
  );
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hour = String(date.getUTCHours()).padStart(2, '0');

  return `${year}-${month}-${day}T${hour}:00:00+09:00`;
}

function generateHourly(definition: ScenarioDefinition): ForecastPoint[] {
  return Array.from({ length: 72 }, (_, hourIndex) => {
    const hourOfDay = (definition.start.hour + hourIndex) % 24;
    const daytimeWave = Math.sin(
      (TWO_PI * (hourOfDay - 9)) / 24,
    );
    const noise = FIXED_NOISE[hourIndex % FIXED_NOISE.length];

    return {
      time: formatLocalTime(definition.start, hourIndex),
      tempC: roundToOne(
        clamp(
          definition.tempBase +
            definition.tempAmplitude * daytimeWave +
            noise * 0.4,
          definition.tempRange[0],
          definition.tempRange[1],
        ),
      ),
      humidity: roundToOne(
        clamp(
          definition.humidityBase +
            definition.humidityPhase *
              definition.humidityAmplitude *
              daytimeWave +
            noise,
          definition.humidityRange[0],
          definition.humidityRange[1],
        ),
      ),
      precipitationType: definition.precipitation(hourIndex),
    };
  });
}

function createWeatherData(definition: ScenarioDefinition): WeatherData {
  const hourly = generateHourly(definition);
  const current = hourly[0];

  return {
    location: {
      label: definition.location.label,
      nx: definition.location.nx,
      ny: definition.location.ny,
    },
    observedAt: current.time,
    current: { ...current },
    hourly,
  };
}

const definitions: Record<MockScenarioKey, ScenarioDefinition> = {
  rainy: {
    location: MOCK_LOCATIONS[0],
    start: { year: 2026, month: 7, day: 15, hour: 0 },
    tempBase: 28.5,
    tempAmplitude: 2.5,
    tempRange: [26, 31],
    humidityBase: 77.5,
    humidityAmplitude: 22.5,
    humidityPhase: -1,
    humidityRange: [60, 95],
    precipitation: (hourIndex) =>
      hourIndex % 12 >= 8 ? 4 : 1,
  },
  winter: {
    location: MOCK_LOCATIONS[1],
    start: { year: 2026, month: 1, day: 15, hour: 0 },
    tempBase: -3,
    tempAmplitude: 4.7,
    tempRange: [-8, 2],
    humidityBase: 50,
    humidityAmplitude: 9.5,
    humidityPhase: -1,
    humidityRange: [40, 60],
    precipitation: () => 0,
  },
  mild: {
    location: MOCK_LOCATIONS[2],
    start: { year: 2026, month: 4, day: 15, hour: 0 },
    tempBase: 18,
    tempAmplitude: 2.7,
    tempRange: [15, 21],
    humidityBase: 47.5,
    humidityAmplitude: 6.5,
    humidityPhase: -1,
    humidityRange: [40, 55],
    precipitation: () => 0,
  },
};

export const mockScenarios: Record<MockScenarioKey, WeatherData> = {
  rainy: createWeatherData(definitions.rainy),
  winter: createWeatherData(definitions.winter),
  mild: createWeatherData(definitions.mild),
};
