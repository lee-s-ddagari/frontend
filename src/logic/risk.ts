import type {
  ForecastPoint,
  RiskLevel,
  RiskResult,
  RoomProfile,
  VentilationVerdict,
} from '../types';
import {
  K_BASE,
  K_FACING,
  K_FLOOR,
  K_MAX,
  K_MIN,
  K_WINDOW,
  MOISTURE_BASE,
  MOISTURE_DRYING,
  MOISTURE_OCCUPANT,
} from './constants';
import {
  absoluteHumidity,
  dewPoint,
  relativeHumidityFrom,
} from './psychrometrics';

const clamp = (value: number, min: number, max: number): number =>
  Math.min(Math.max(value, min), max);

function riskLevelFrom(score: number): RiskLevel {
  if (score <= 25) return 'safe';
  if (score <= 50) return 'caution';
  if (score <= 75) return 'warning';
  return 'danger';
}

function ventilationVerdict(
  outdoor: ForecastPoint,
  indoorDewPointC: number,
  wallTempC: number,
): VentilationVerdict {
  const outdoorDewPointC = dewPoint(outdoor.tempC, outdoor.humidity);

  if (outdoorDewPointC >= wallTempC - 0.5) {
    return 'harmful';
  }

  if (indoorDewPointC - outdoorDewPointC >= 1.0) {
    return outdoor.precipitationType === 0 ? 'recommended' : 'neutral';
  }

  return 'neutral';
}

export function calculateRisk(
  outdoor: ForecastPoint,
  profile: RoomProfile,
): RiskResult {
  let indoorTempC: number;
  let indoorHumidity: number;

  if (profile.measured) {
    indoorTempC = profile.measured.tempC;
    indoorHumidity = profile.measured.humidity;
  } else {
    indoorTempC = clamp(outdoor.tempC + 4, 20, 26);

    const moistureGain =
      MOISTURE_BASE +
      (profile.indoorDrying ? MOISTURE_DRYING : 0) +
      ((profile.occupants ?? 1) >= 2 ? MOISTURE_OCCUPANT : 0);
    const indoorAbsoluteHumidity =
      absoluteHumidity(outdoor.tempC, outdoor.humidity) + moistureGain;

    indoorHumidity = relativeHumidityFrom(
      indoorAbsoluteHumidity,
      indoorTempC,
    );
  }

  const heatLossCoefficient = clamp(
    K_BASE +
      K_FLOOR[profile.floor] +
      K_FACING[profile.facing] +
      K_WINDOW[profile.window],
    K_MIN,
    K_MAX,
  );
  const wallTempC =
    indoorTempC -
    heatLossCoefficient * (indoorTempC - outdoor.tempC);
  const dewPointC = dewPoint(indoorTempC, indoorHumidity);
  const marginC = wallTempC - dewPointC;
  const score = clamp(Math.round(100 - (marginC + 2) * 20), 0, 100);

  return {
    time: outdoor.time,
    score,
    level: riskLevelFrom(score),
    indoorTempC,
    indoorHumidity,
    dewPointC,
    wallTempC,
    marginC,
    ventilation: ventilationVerdict(outdoor, dewPointC, wallTempC),
  };
}
