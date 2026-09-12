const RE = 6371.00877;
const GRID = 5.0;
const SLAT1 = 30.0;
const SLAT2 = 60.0;
const OLON = 126.0;
const OLAT = 38.0;
const XO = 43;
const YO = 136;

const DEG_TO_RAD = Math.PI / 180;
const RE_PER_GRID = RE / GRID;
const SLAT1_RAD = SLAT1 * DEG_TO_RAD;
const SLAT2_RAD = SLAT2 * DEG_TO_RAD;
const OLON_RAD = OLON * DEG_TO_RAD;
const OLAT_RAD = OLAT * DEG_TO_RAD;

const CONE =
  Math.log(Math.cos(SLAT1_RAD) / Math.cos(SLAT2_RAD)) /
  Math.log(
    Math.tan(Math.PI / 4 + SLAT2_RAD / 2) /
      Math.tan(Math.PI / 4 + SLAT1_RAD / 2),
  );
const SCALE_FACTOR =
  (Math.pow(Math.tan(Math.PI / 4 + SLAT1_RAD / 2), CONE) *
    Math.cos(SLAT1_RAD)) /
  CONE;
const ORIGIN_RADIUS =
  (RE_PER_GRID * SCALE_FACTOR) /
  Math.pow(Math.tan(Math.PI / 4 + OLAT_RAD / 2), CONE);

function assertCoordinates(lat: number, lon: number): void {
  if (!Number.isFinite(lat) || lat <= -90 || lat >= 90) {
    throw new RangeError('위도는 -90보다 크고 90보다 작아야 합니다.');
  }

  if (!Number.isFinite(lon) || lon < -180 || lon > 180) {
    throw new RangeError('경도는 -180 이상 180 이하여야 합니다.');
  }
}

export function latLonToGrid(
  lat: number,
  lon: number,
): { nx: number; ny: number } {
  assertCoordinates(lat, lon);

  const latRad = lat * DEG_TO_RAD;
  const radius =
    (RE_PER_GRID * SCALE_FACTOR) /
    Math.pow(Math.tan(Math.PI / 4 + latRad / 2), CONE);
  let theta = lon * DEG_TO_RAD - OLON_RAD;

  if (theta > Math.PI) {
    theta -= Math.PI * 2;
  } else if (theta < -Math.PI) {
    theta += Math.PI * 2;
  }
  theta *= CONE;

  return {
    nx: Math.floor(radius * Math.sin(theta) + XO + 0.5),
    ny: Math.floor(
      ORIGIN_RADIUS - radius * Math.cos(theta) + YO + 0.5,
    ),
  };
}
