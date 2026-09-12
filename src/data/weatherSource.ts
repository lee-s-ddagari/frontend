import { MOCK_LOCATIONS, mockScenarios } from './mockScenarios';
import type { WeatherData } from '../types';

function copyWeatherData(weather: WeatherData): WeatherData {
  return {
    location: { ...weather.location },
    observedAt: weather.observedAt,
    current: { ...weather.current },
    hourly: weather.hourly.map((point) => ({ ...point })),
  };
}

export async function fetchWeather(
  nx: number,
  ny: number,
): Promise<WeatherData> {
  await new Promise<void>((resolve) => {
    setTimeout(resolve, 300);
  });

  const location = MOCK_LOCATIONS.find(
    (candidate) => candidate.nx === nx && candidate.ny === ny,
  );

  if (!location) {
    throw new Error('지원하지 않는 목 데이터 위치입니다.');
  }

  return copyWeatherData(mockScenarios[location.scenario]);
}
