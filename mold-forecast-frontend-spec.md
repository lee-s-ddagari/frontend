# 곰팡이 예보 — 프론트엔드 개발 스펙

## 0. 이 문서에 대하여

이 문서는 코딩 에이전트에게 전달하는 구현 명세다. 아래 규칙을 따른다.

- 명시된 것만 구현한다. 명시되지 않은 기능을 추론해서 추가하지 않는다.
- 이번 단계는 **프론트엔드 전용**이다. 서버, DB, 실제 API 호출은 만들지 않는다.
- 상수와 수식은 그대로 사용한다. 임의로 값을 바꾸거나 "더 정확한" 모델로 교체하지 않는다.
- 작업은 11절의 순서대로 진행하고, 각 단계가 끝날 때마다 빌드가 깨지지 않는 상태를 유지한다.

---

## 1. 제품 개요

기상 데이터와 사용자의 방 조건을 결합해 **결로 위험도**를 계산하고, **환기해도 되는 시점**을 알려주는 웹 서비스.

핵심 가치는 정보 제공이 아니라 타이밍 판정이다. "환기하세요"는 누구나 안다. 이 서비스는 **"지금 창문을 열면 오히려 습기가 들어온다"**를 판정한다. 이 판정은 실시간 기상 수치 없이는 불가능하다.

**대상 사용자**: 원룸·반지하 자취생

---

## 2. 이번 작업의 범위

### 구현한다
- 방 조건 입력 온보딩
- 현재 결로 위험도 표시
- 환기 가능 여부 판정
- 72시간 위험도 추이 그래프
- 환기 추천 시간대 목록
- 조건 비교 패널 (발표 시연용)
- 목 데이터 시나리오 전환 (발표 시연용)

### 구현하지 않는다
- 실제 기상청 API 호출 — 브라우저에서 직접 호출하면 CORS에 막히고 인증키가 노출된다. 프록시 서버가 필요하므로 다음 단계로 미룬다.
- 푸시 알림, 로그인, 회원 관리, 기록 누적
- 벌레·배관 기능

### 이번 단계의 설계 목표
모든 기상 데이터는 `src/data/weatherSource.ts`의 단일 함수를 통해서만 들어온다. 나중에 이 함수 내부만 실제 API 호출로 교체하면 화면 코드를 건드리지 않아도 되도록 한다. **이 경계를 지키는 것이 이번 작업에서 가장 중요하다.**

---

## 3. 기술 스택

| 항목 | 선택 |
|---|---|
| 빌드 | Vite |
| 언어 | TypeScript (strict) |
| 프레임워크 | React 18 |
| 스타일 | Tailwind CSS |
| 차트 | 직접 그린 SVG (차트 라이브러리 추가 금지) |
| 저장 | localStorage |
| 라우팅 | 없음. 단일 페이지 내 상태 전환 |

추가 의존성은 설치하지 않는다.

---

## 4. 디렉토리 구조

```
src/
  main.tsx
  App.tsx
  types.ts                 // 5절의 타입 정의
  data/
    weatherSource.ts       // 기상 데이터 진입점 (교체 지점)
    mockScenarios.ts       // 10절의 목 데이터
  logic/
    psychrometrics.ts      // 이슬점·절대습도 순수 함수
    risk.ts                // 위험도·환기 판정
    constants.ts           // 6절의 상수
  storage/
    roomProfile.ts         // localStorage 읽기/쓰기
  components/
    Onboarding.tsx
    RiskGauge.tsx
    VentilationCard.tsx
    RiskTimeline.tsx
    VentilationSlots.tsx
    ComparePanel.tsx
    DemoControls.tsx
```

---

## 5. 데이터 계약

`src/types.ts`에 아래를 그대로 정의한다. 이 타입은 실제 API 연동 후에도 변경하지 않는다.

```ts
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
```

`src/data/weatherSource.ts`는 아래 시그니처만 노출한다.

```ts
export async function fetchWeather(
  nx: number,
  ny: number
): Promise<WeatherData>;
```

이번 단계에서는 목 데이터를 반환하되, 300ms 지연을 넣어 비동기 흐름을 실제와 동일하게 만든다.

---

## 6. 계산 로직

`src/logic/` 아래에 **부수효과 없는 순수 함수**로 구현한다. React에 의존하지 않는다.

### 6.1 상수 (`constants.ts`)

```ts
export const MAGNUS_A = 17.62;
export const MAGNUS_B = 243.12;

/** 벽면 열손실 계수 보정값 */
export const K_BASE = 0.35;
export const K_FLOOR: Record<FloorType, number> = {
  basement: 0.15, top: 0.10, first: 0.05, middle: 0,
};
export const K_FACING: Record<Facing, number> = {
  N: 0.10, E: 0.05, W: 0.05, S: 0, unknown: 0.05,
};
export const K_WINDOW: Record<WindowType, number> = {
  single: 0.15, double: -0.05, unknown: 0,
};
export const K_MIN = 0.15;
export const K_MAX = 0.75;

/** 생활 수분 발생량 g/m³ */
export const MOISTURE_BASE = 2.0;
export const MOISTURE_DRYING = 3.0;
export const MOISTURE_OCCUPANT = 1.0;
```

### 6.2 습공기 계산 (`psychrometrics.ts`)

```ts
/** 포화수증기압 hPa */
saturationVaporPressure(tempC): number
  = 6.112 * exp((MAGNUS_A * tempC) / (MAGNUS_B + tempC))

/** 이슬점 ℃ (Magnus 근사식) */
dewPoint(tempC, humidity): number
  gamma = ln(humidity / 100) + (MAGNUS_A * tempC) / (MAGNUS_B + tempC)
  return (MAGNUS_B * gamma) / (MAGNUS_A - gamma)

/** 절대습도 g/m³ */
absoluteHumidity(tempC, humidity): number
  = 216.7 * (humidity / 100 * saturationVaporPressure(tempC)) / (273.15 + tempC)

/** 절대습도와 기온으로 상대습도 역산 % (0~100 클램프) */
relativeHumidityFrom(absHumidity, tempC): number
  = clamp(absHumidity * (273.15 + tempC) / (216.7 * saturationVaporPressure(tempC)) * 100, 0, 100)
```

### 6.3 위험도 판정 (`risk.ts`)

```
입력: ForecastPoint(외기), RoomProfile
출력: RiskResult
```

**1단계 — 실내 온습도**

`profile.measured`가 있으면 그 값을 그대로 쓰고 2단계로 간다. 없으면 추정한다.

```
indoorTempC = clamp(outdoor.tempC + 4, 20, 26)

moistureGain = MOISTURE_BASE
             + (indoorDrying ? MOISTURE_DRYING : 0)
             + ((occupants ?? 1) >= 2 ? MOISTURE_OCCUPANT : 0)

ahIndoor = absoluteHumidity(outdoor.tempC, outdoor.humidity) + moistureGain
indoorHumidity = relativeHumidityFrom(ahIndoor, indoorTempC)
```

**2단계 — 벽면 온도**

```
k = clamp(K_BASE + K_FLOOR[floor] + K_FACING[facing] + K_WINDOW[window], K_MIN, K_MAX)
wallTempC = indoorTempC - k * (indoorTempC - outdoor.tempC)
```

**3단계 — 위험도 점수**

```
dewPointC = dewPoint(indoorTempC, indoorHumidity)
marginC   = wallTempC - dewPointC        // 음수면 결로 발생
score     = clamp(round(100 - (marginC + 2) * 20), 0, 100)
```

등급 경계:

| score | level | 표시 문구 |
|---|---|---|
| 0–25 | safe | 안전 |
| 26–50 | caution | 주의 |
| 51–75 | warning | 경고 |
| 76–100 | danger | 위험 |

**4단계 — 환기 판정**

실외 공기의 이슬점이 벽면 온도보다 높으면, 창을 여는 순간 그 공기가 차가운 벽에 닿아 결로를 만든다.

```
dewOutdoor = dewPoint(outdoor.tempC, outdoor.humidity)

if (dewOutdoor >= wallTempC - 0.5)            → 'harmful'
else if (dewPointC - dewOutdoor >= 1.0)       → 'recommended'
else                                           → 'neutral'
```

강수 중(`precipitationType !== 0`)이면 `recommended`를 `neutral`로 낮춘다.

**5단계 — 환기 추천 시간대**

`hourly` 72개 전체에 대해 위험도를 계산한 뒤, `ventilation === 'recommended'`인 시점만 추려 `dewPointC - dewOutdoor`가 큰 순으로 정렬한다. 연속된 시각은 하나의 구간으로 병합하고 상위 3개 구간만 노출한다.

---

## 7. 화면 명세

### 7.1 온보딩

방 정보가 localStorage에 없을 때만 표시한다. 한 화면에 4개 질문을 세로로 배치하고, 전부 큰 탭 버튼으로 만든다. 텍스트 입력은 주소 하나뿐이다.

| 질문 | 선택지 |
|---|---|
| 어디 사세요 | 검색 입력 (이번 단계는 목 데이터 3곳 중 선택) |
| 몇 층인가요 | 반지하 / 1층 / 중간층 / 최상층 |
| 창문이 어느 쪽을 보나요 | 북 / 동 / 서 / 남 / 모르겠음 |
| 창문이 몇 겹인가요 | 한 겹 / 두 겹 / 모르겠음 |

모든 질문에 "모르겠음"이 있어야 하며, 미선택 상태로는 다음으로 넘어갈 수 없다. 완료 시 localStorage에 저장하고 메인으로 전환한다.

### 7.2 메인

세로 순서:

1. **위험도 게이지** — 화면에서 가장 큰 요소. 점수, 등급, 한 문장 설명.
   - 예: `78 / 위험 — 창가 벽에 물이 맺힐 수 있어요`
2. **환기 카드** — 지금 창문을 열어도 되는지 한 줄로.
   - recommended: `지금 환기하기 좋아요`
   - neutral: `환기해도 큰 차이는 없어요`
   - harmful: `지금 열면 습기가 들어옵니다`
   - 판정 근거를 작은 글씨로 병기: `바깥 이슬점 18.2℃ · 벽면 추정 16.4℃`
3. **72시간 추이 그래프** — 가로축 시간, 세로축 위험 점수. 등급 구간을 배경 밴드로 깔고 현재 시점에 세로선. 막대나 점이 아닌 면적 그래프로 그린다.
4. **환기 추천 시간대** — 최대 3개 구간. `내일 14시–16시` 형식.
5. **계산 근거 (접힘)** — 실내 추정 온습도, 이슬점, 벽면 온도, 여유값. 기본 접힘 상태.

### 7.3 조건 비교 패널

메인 하단의 `내 방 조건 바꿔보기` 버튼으로 여는 시트. 층수·방향·창호를 바꾸면 위험도가 **즉시** 다시 계산되어 게이지에 반영된다. 저장되지 않는 미리보기이며, 닫으면 원래 조건으로 돌아간다.

시연의 핵심 장면이므로 재계산에 지연이나 로딩 상태가 없어야 한다.

### 7.4 시연 컨트롤

URL에 `?demo=1`이 있을 때만 화면 우하단에 고정 노출한다. 목 시나리오 3개를 전환하는 버튼만 있으면 된다.

---

## 8. 상태와 저장

- 방 정보는 `localStorage`의 `mold-forecast:room` 키에 JSON으로 저장한다.
- 상태 관리 라이브러리를 쓰지 않는다. `App.tsx`의 `useState`와 props 전달로 충분하다.
- 위험도 계산은 `useMemo`로 감싼다. 조건 비교 패널 조작 시 재계산이 매 프레임 일어나지 않도록 한다.
- 저장된 값이 깨졌거나 스키마가 맞지 않으면 조용히 버리고 온보딩으로 보낸다.

---

## 9. 디자인 방향

주제가 결로와 습기이므로, 시각 언어를 **차가운 유리에 맺힌 물방울**에서 가져온다. 밝고 채도 높은 대시보드 톤으로 만들지 않는다.

### 토큰

```css
--surface:     #EEF2F3;  /* 김 서린 유리 */
--surface-alt: #E2E8EA;
--ink:         #1B2A33;  /* 젖은 창틀 */
--ink-muted:   #5A6B74;
--safe:        #2F7D8C;  /* 차가운 청록 */
--caution:     #B08A1E;
--warning:     #B8602A;
--danger:      #6E2F2F;  /* 곰팡이 얼룩 */
```

- 위험 등급 색은 게이지와 그래프에서만 쓴다. 버튼이나 카드 테두리에 재사용하지 않는다.
- 배경은 단색을 쓰되 위험도가 올라갈수록 아주 미세하게 차가워지는 정도만 허용한다. 그라데이션 장식은 넣지 않는다.

### 타이포그래피

- 본문·숫자 모두 Pretendard 한 패밀리. 위험도 점수만 압도적으로 크게 잡아 대비를 만든다.
- 대문자 변환, 자간 넓힌 라벨, 헤딩 위 작은 말머리 라벨을 쓰지 않는다.

### 원칙

- 화면에서 눈에 띄는 요소는 **위험도 게이지 하나뿐**이다. 나머지는 전부 조용하게 둔다.
- 카드마다 그림자를 넣지 않는다. 구분은 여백과 얇은 경계선으로 한다.
- 애니메이션은 조건 비교 시 게이지 숫자가 바뀌는 전환 하나만 둔다.
- 모든 수치에 단위를 붙인다. 추정값에는 `추정`을 병기한다.
- 모바일 우선. 최소 폭 360px에서 깨지지 않아야 한다.

### 문구

사용자가 조치할 수 있는 말로 쓴다. 시스템 용어를 그대로 노출하지 않는다.

- 쓰지 않음: `결로 위험 지수 78`, `이슬점 초과 상태입니다`
- 씀: `창가 벽에 물이 맺힐 수 있어요`, `지금 열면 습기가 들어옵니다`

---

## 10. 목 데이터

`mockScenarios.ts`에 시나리오 3개를 만든다. 각각 `WeatherData` 전체(72시간)를 포함한다.

| 키 | 상황 | 특징 |
|---|---|---|
| `rainy` | 장마철 | 기온 26~29℃, 습도 85~95%, 강수 있음. 환기 `harmful`이 나오는 구간이 있어야 한다 |
| `winter` | 한파 | 기온 -8~2℃, 습도 40~60%. 반지하·북향·단창 조합에서 `danger`가 나와야 한다 |
| `mild` | 맑은 봄날 | 기온 15~21℃, 습도 40~55%. 대부분 `safe`이고 환기 추천 구간이 넉넉해야 한다 |

수치는 하드코딩하지 말고 시나리오별 기준값에 시간대별 사인파와 소량의 고정 노이즈를 더해 생성한다. 난수는 쓰지 않는다. 시연 때마다 같은 그래프가 나와야 한다.

주소는 `서울 마포구 서교동`, `서울 관악구 신림동`, `서울 성북구 안암동` 3곳을 제공하고 각각 임의의 `nx`, `ny`를 부여한다.

---

## 11. 작업 순서

각 단계마다 빌드가 성공하는 상태로 커밋한다.

1. Vite + React + TS + Tailwind 프로젝트 초기화, 9절 토큰을 Tailwind 설정에 등록
2. `types.ts` 작성 (5절 그대로)
3. `psychrometrics.ts` 작성 + 검산: 20℃ 60%의 이슬점이 약 12.0℃로 나오는지 확인
4. `constants.ts`, `risk.ts` 작성
5. `mockScenarios.ts`와 `weatherSource.ts` 작성
6. `roomProfile.ts` (localStorage) + `Onboarding.tsx`
7. `RiskGauge.tsx` + `VentilationCard.tsx`로 메인 뼈대 완성
8. `RiskTimeline.tsx` (SVG 면적 그래프)
9. `VentilationSlots.tsx`
10. `ComparePanel.tsx`, `DemoControls.tsx`
11. 360px 반응형 점검, 키보드 포커스 표시 확인

---

## 12. 완료 기준

- 방 정보 입력 후 새로고침해도 온보딩이 다시 뜨지 않는다
- 세 시나리오 각각에서 게이지·환기 판정·그래프가 서로 다른 결과를 보여준다
- 조건 비교 패널에서 `최상층 / 남향 / 이중창` → `반지하 / 북향 / 단창`으로 바꾸면 등급이 눈에 띄게 악화된다
- `rainy` 시나리오에 환기 `harmful` 구간이 실제로 존재한다
- 360px 폭에서 가로 스크롤이 생기지 않는다
- 콘솔에 경고나 에러가 없다

---

## 13. 하지 말 것

- 실제 기상청 API 호출 코드를 넣지 않는다
- 차트·상태관리·UI 킷 라이브러리를 설치하지 않는다
- 6절의 상수와 수식을 바꾸지 않는다
- 추정값을 확정값처럼 표시하지 않는다
- 명세에 없는 화면이나 기능을 추가하지 않는다
