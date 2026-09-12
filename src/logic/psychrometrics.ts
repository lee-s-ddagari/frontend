import { MAGNUS_A, MAGNUS_B } from './constants';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

/** 포화수증기압 hPa */
export function saturationVaporPressure(tempC: number): number {
  return 6.112 * Math.exp((MAGNUS_A * tempC) / (MAGNUS_B + tempC));
}

/** 이슬점 ℃ (Magnus 근사식) */
export function dewPoint(tempC: number, humidity: number): number {
  const gamma =
    Math.log(humidity / 100) +
    (MAGNUS_A * tempC) / (MAGNUS_B + tempC);

  return (MAGNUS_B * gamma) / (MAGNUS_A - gamma);
}

/** 절대습도 g/m³ */
export function absoluteHumidity(tempC: number, humidity: number): number {
  return (
    (216.7 *
      ((humidity / 100) * saturationVaporPressure(tempC))) /
    (273.15 + tempC)
  );
}

/** 절대습도와 기온으로 상대습도 역산 % (0~100 클램프) */
export function relativeHumidityFrom(
  absHumidity: number,
  tempC: number,
): number {
  const humidity =
    (absHumidity * (273.15 + tempC)) /
    (216.7 * saturationVaporPressure(tempC)) *
    100;

  return clamp(humidity, 0, 100);
}
