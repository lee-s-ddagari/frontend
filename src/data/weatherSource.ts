import {
  MOCK_LOCATIONS,
  mockScenarios,
  type MockLocation,
  type MockScenarioData,
  type MockScenarioKey,
} from './mockScenarios';
import type { WeatherData } from '../types';

function createWeatherData(
  weather: MockScenarioData,
  location: MockLocation,
): WeatherData {
  return {
    location: {
      label: location.label,
      nx: location.nx,
      ny: location.ny,
    },
    observedAt: weather.observedAt,
    current: { ...weather.current },
    hourly: weather.hourly.map((point) => ({ ...point })),
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

  const location = MOCK_LOCATIONS.find(
    (candidate) => candidate.nx === nx && candidate.ny === ny,
  );

  if (!location) {
    throw new Error('지원하지 않는 목 데이터 위치입니다.');
  }

  return createWeatherData(mockScenarios[scenario ?? 'rainy'], location);
}
