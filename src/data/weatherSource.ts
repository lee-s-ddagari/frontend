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
): WeatherData {
  return {
    location: {
      label: location.label,
      nx: location.nx,
      ny: location.ny,
    },
    observedAt: weather.observedAt,
    current: applyOffsets(weather.current, offsets),
    hourly: weather.hourly.map((point) => applyOffsets(point, offsets)),
  };
}

export async function fetchWeather(
  nx: number,
  ny: number,
  scenario?: MockScenarioKey,
): Promise<WeatherData> {
  if (scenario === undefined) {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, 300);
    });
  }

  const knownLocation = MOCK_LOCATIONS.find(
    (candidate) => candidate.nx === nx && candidate.ny === ny,
  );
  const location: WeatherData['location'] = knownLocation
    ? {
        label: knownLocation.label,
        nx: knownLocation.nx,
        ny: knownLocation.ny,
      }
    : { label: `좌표 ${nx}/${ny}`, nx, ny };
  const variant =
    scenario === undefined
      ? defaultVariant(nx, ny)
      : { scenario, offsets: NO_OFFSETS };

  return createWeatherData(
    mockScenarios[variant.scenario],
    location,
    variant.offsets,
  );
}
