/** 기상청 초단기실황/단기예보의 한 시점 */
export interface ForecastPoint {
  /** ISO 8601, 로컬 시각 */
  time: string;
  /** 기온 ℃ (기상청 T1H / TMP) */
  tempC: number;
  /** 상대습도 % (기상청 REH) */
  humidity: number;
  /** 강수형태 (기상청 PTY): 0 없음, 1 비, 2 비/눈, 3 눈, 4 소나기 */
  precipitationType: 0 | 1 | 2 | 3 | 4;
}

export interface WeatherData {
  location: { label: string; nx: number; ny: number };
  /** 관측 기준 시각 */
  observedAt: string;
  current: ForecastPoint;
  /** 현재 시각부터 1시간 간격 72개 */
  hourly: ForecastPoint[];
}

export type FloorType = 'basement' | 'first' | 'middle' | 'top';
export type Facing = 'N' | 'E' | 'W' | 'S' | 'unknown';
export type WindowType = 'single' | 'double' | 'unknown';

export interface RoomProfile {
  address: { label: string; nx: number; ny: number };
  floor: FloorType;
  facing: Facing;
  window: WindowType;
  /** 선택 입력 */
  indoorDrying?: boolean;
  occupants?: number;
  /** 온습도계 실측값. 있으면 추정 대신 사용 */
  measured?: { tempC: number; humidity: number };
}

export type RiskLevel = 'safe' | 'caution' | 'warning' | 'danger';
export type VentilationVerdict = 'recommended' | 'neutral' | 'harmful';

export interface RiskResult {
  time: string;
  /** 0~100, 높을수록 위험 */
  score: number;
  level: RiskLevel;
  indoorTempC: number;
  indoorHumidity: number;
  /** 실내 공기의 이슬점 */
  dewPointC: number;
  /** 추정 벽면 온도 */
  wallTempC: number;
  /** wallTempC - dewPointC. 음수면 결로 발생 */
  marginC: number;
  ventilation: VentilationVerdict;
}
