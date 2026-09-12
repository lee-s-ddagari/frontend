import type {
  ForecastPoint,
  RiskLevel,
  RiskResult,
  RoomProfile,
  VentilationVerdict,
} from '../types';
import {
  AH_WINDOW_HOURS,
  GROUND_TEMP,
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
  indoorAbsoluteHumidity: number,
  outdoorAbsoluteHumidity: number,
  indoorDewPointC: number,
  wallTempC: number,
): VentilationVerdict {
  const outdoorDewPointC = dewPoint(outdoor.tempC, outdoor.humidity);

  if (outdoorDewPointC >= wallTempC - 0.5) {
    return 'harmful';
  }

  if (outdoorAbsoluteHumidity >= indoorAbsoluteHumidity - 0.5) {
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
  ahBaseline: number,
): RiskResult {
  let indoorTempC: number;
  let indoorHumidity: number;
  let indoorAbsoluteHumidity: number;

  if (profile.measured) {
    indoorTempC = profile.measured.tempC;
    indoorHumidity = profile.measured.humidity;
    indoorAbsoluteHumidity = absoluteHumidity(
      indoorTempC,
      indoorHumidity,
    );
  } else {
    indoorTempC = clamp(outdoor.tempC + 2, 18, 30);

    const moistureGain =
      MOISTURE_BASE +
      (profile.indoorDrying ? MOISTURE_DRYING : 0) +
      ((profile.occupants ?? 1) >= 2 ? MOISTURE_OCCUPANT : 0);
    indoorAbsoluteHumidity = ahBaseline + moistureGain;

    indoorHumidity = clamp(
      relativeHumidityFrom(indoorAbsoluteHumidity, indoorTempC),
      0,
      98,
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
  let wallTempC =
    indoorTempC -
    heatLossCoefficient * (indoorTempC - outdoor.tempC);

  if (profile.floor === 'basement') {
    wallTempC = Math.min(wallTempC, GROUND_TEMP + 2);
  }

  const dewPointC = dewPoint(indoorTempC, indoorHumidity);
  const outdoorAbsoluteHumidity = absoluteHumidity(
    outdoor.tempC,
    outdoor.humidity,
  );
  const marginC = wallTempC - dewPointC;
  const score = clamp(
    Math.round(100 - (marginC + 2) * 12.5),
    0,
    100,
  );

  return {
    time: outdoor.time,
    score,
    level: riskLevelFrom(score),
    indoorTempC,
    indoorHumidity,
    dewPointC,
    wallTempC,
    marginC,
    ahIndoor: indoorAbsoluteHumidity,
    ahOutdoor: outdoorAbsoluteHumidity,
    ventilation: ventilationVerdict(
      outdoor,
      indoorAbsoluteHumidity,
      outdoorAbsoluteHumidity,
      dewPointC,
      wallTempC,
    ),
  };
}

function calculateAhBaselines(hourly: ForecastPoint[]): number[] {
  const outdoorValues = hourly.map((point) =>
    absoluteHumidity(point.tempC, point.humidity),
  );
  let windowSum = 0;

  return outdoorValues.map((currentValue, index) => {
    const availableHours = Math.min(index, AH_WINDOW_HOURS);
    const baseline =
      availableHours === 0 ? currentValue : windowSum / availableHours;

    windowSum += currentValue;
    if (index >= AH_WINDOW_HOURS) {
      windowSum -= outdoorValues[index - AH_WINDOW_HOURS];
    }

    return baseline;
  });
}

export function calculateRiskSeries(
  hourly: ForecastPoint[],
  profile: RoomProfile,
): RiskResult[] {
  const ahBaselines = calculateAhBaselines(hourly);

  return hourly.map((point, index) =>
    calculateRisk(point, profile, ahBaselines[index]),
  );
}
