<p align="center">
  <img src="public/pangicut-logo.png" alt="팡이컷 로고" width="180" />
</p>

# 곰팡이 예보

기상 데이터와 방 조건을 바탕으로 결로 위험도를 계산하고, 지금 환기해도 되는지 알려주는 모바일 우선 웹 애플리케이션입니다.

**배포 사이트:** [https://frontend-weld-tau-30.vercel.app/](https://frontend-weld-tau-30.vercel.app/)

## 주요 기능

- 서울 25개 자치구, 427개 행정동 검색 및 기상청 격자 좌표 변환
- 층수, 창문 방향, 창호 종류를 반영한 결로 위험도 계산
- 현재 위험 점수와 안전·주의·경고·위험 등급 표시
- 실외 이슬점과 절대습도를 이용한 환기 가능 여부 판정
- 72시간 위험도 면적 그래프와 환기 추천 시간대 제공
- 저장하지 않고 방 조건별 결과를 비교하는 미리보기
- 실제 기상청 API 실패 또는 3초 초과 시 목 데이터 자동 폴백
- `?demo=1`에서 장마철·한파·맑은 봄날 시나리오 전환

## 기술 스택

- React 18
- TypeScript
- Vite
- Tailwind CSS
- Vercel Serverless Functions
- SVG 기반 자체 차트

## 로컬 실행

```bash
npm install
npm run dev
```

개발 서버가 시작되면 터미널에 표시되는 주소로 접속합니다.

프로덕션 빌드 확인:

```bash
npm run build
npm run preview
```

## 환경변수

실제 기상청 단기예보 데이터를 사용하려면 Vercel 프로젝트에 다음 환경변수를 설정합니다.

```text
KMA_KEY=기상청_서비스키
```

서비스키는 코드나 커밋에 포함하지 않습니다. 환경변수가 없거나 API 요청이 실패하면 화면은 예시 데이터로 전환됩니다.

## 데이터 흐름

1. 사용자가 서울 행정동과 방 조건을 선택합니다.
2. 행정동 대표 위·경도를 기상청 Lambert Conformal Conic 격자 좌표로 변환합니다.
3. `/api/weather?nx=&ny=` 서버리스 함수가 기상청 초단기실황과 단기예보를 요청합니다.
4. `calculateRiskSeries`가 72시간 위험도와 환기 판정을 계산합니다.
5. 브라우저에는 방 정보만 `localStorage`에 저장합니다.

## 주요 디렉터리

```text
api/weather.js               기상청 API 프록시
src/components/              온보딩과 결과 화면 컴포넌트
src/data/seoulDongs.ts       서울 행정동 목록과 대표 좌표
src/data/mockScenarios.ts    결정론적 목 날씨 시나리오
src/data/weatherSource.ts    실제 API와 목 데이터 진입점
src/logic/grid.ts            위·경도에서 기상청 격자 변환
src/logic/risk.ts            결로 위험도와 환기 판정
src/storage/roomProfile.ts   방 정보 로컬 저장
```

상세 계산식과 화면 명세는 [`mold-forecast-frontend-spec.md`](mold-forecast-frontend-spec.md)에서 확인할 수 있습니다.
