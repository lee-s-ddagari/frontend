import { useId } from 'react';
import type { RiskResult } from '../types';

const CHART_WIDTH = 840;
const CHART_HEIGHT = 300;
const PLOT_LEFT = 44;
const PLOT_RIGHT = 16;
const PLOT_TOP = 28;
const PLOT_BOTTOM = 244;
const PLOT_WIDTH = CHART_WIDTH - PLOT_LEFT - PLOT_RIGHT;
const PLOT_HEIGHT = PLOT_BOTTOM - PLOT_TOP;

const COLORS = {
  surface: '#EEF2F3',
  ink: '#1B2A33',
  inkMuted: '#5A6B74',
  safe: '#2F7D8C',
  caution: '#B08A1E',
  warning: '#B8602A',
  danger: '#6E2F2F',
} as const;

const BANDS = [
  { min: 75, max: 100, color: COLORS.danger },
  { min: 50, max: 75, color: COLORS.warning },
  { min: 25, max: 50, color: COLORS.caution },
  { min: 0, max: 25, color: COLORS.safe },
] as const;

interface RiskTimelineProps {
  results: RiskResult[];
}

function scoreToY(score: number): number {
  const boundedScore = Math.min(Math.max(score, 0), 100);
  return PLOT_TOP + ((100 - boundedScore) / 100) * PLOT_HEIGHT;
}

function pointToX(index: number, count: number): number {
  if (count <= 1) {
    return PLOT_LEFT;
  }

  return PLOT_LEFT + (index / (count - 1)) * PLOT_WIDTH;
}

function getHour(time: string): number {
  return Number(time.slice(11, 13));
}

function getDateKey(time: string): string {
  return time.slice(0, 10);
}

export default function RiskTimeline({ results }: RiskTimelineProps) {
  const id = useId().replace(/:/g, '');

  if (results.length === 0) {
    return null;
  }

  const points = results.map((result, index) => ({
    x: pointToX(index, results.length),
    y: scoreToY(result.score),
  }));
  const linePath = points
    .map((point, index) =>
      `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(1)} ${point.y.toFixed(1)}`,
    )
    .join(' ');
  const lastPoint = points[points.length - 1];
  const areaPath = `${linePath} L ${lastPoint.x.toFixed(1)} ${PLOT_BOTTOM} L ${PLOT_LEFT} ${PLOT_BOTTOM} Z`;
  const timeTicks = results
    .map((result, index) => ({ index, hour: getHour(result.time) }))
    .filter(({ index, hour }) => index === 0 || hour % 6 === 0);

  const dateGroups = results.reduce<
    Array<{ key: string; start: number; end: number }>
  >((groups, result, index) => {
    const key = getDateKey(result.time);
    const current = groups[groups.length - 1];

    if (current?.key === key) {
      current.end = index;
    } else {
      groups.push({ key, start: index, end: index });
    }

    return groups;
  }, []);

  return (
    <section
      className="border-t border-ink/20 py-8"
      aria-labelledby="timeline-heading"
    >
      <h2 id="timeline-heading" className="text-lg font-semibold text-ink">
        72시간 위험도 추이
      </h2>

      <div
        className="mt-5 w-full max-w-full overflow-x-auto pb-2"
        aria-label="72시간 위험도 그래프"
        tabIndex={0}
      >
        <svg
          className="h-auto min-w-[720px] w-full"
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
          role="img"
          aria-labelledby={`${id}-title ${id}-description`}
        >
          <title id={`${id}-title`}>72시간 결로 위험 점수 추이</title>
          <desc id={`${id}-description`}>
            현재부터 72시간 동안의 위험 점수를 0점부터 100점까지 면적
            그래프로 표시합니다.
          </desc>

          <defs>
            {BANDS.map((band) => {
              const y = scoreToY(band.max);
              const height = scoreToY(band.min) - y;

              return (
                <clipPath id={`${id}-band-${band.min}`} key={band.min}>
                  <rect
                    x={PLOT_LEFT}
                    y={y}
                    width={PLOT_WIDTH}
                    height={height}
                  />
                </clipPath>
              );
            })}
          </defs>

          <rect
            x={PLOT_LEFT}
            y={PLOT_TOP}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            fill={COLORS.surface}
          />

          {BANDS.map((band) => {
            const y = scoreToY(band.max);
            const height = scoreToY(band.min) - y;

            return (
              <rect
                key={band.min}
                x={PLOT_LEFT}
                y={y}
                width={PLOT_WIDTH}
                height={height}
                fill={band.color}
                fillOpacity="0.1"
              />
            );
          })}

          {[100, 75, 50, 25, 0].map((score) => {
            const y = scoreToY(score);

            return (
              <g key={score}>
                <line
                  x1={PLOT_LEFT}
                  y1={y}
                  x2={CHART_WIDTH - PLOT_RIGHT}
                  y2={y}
                  stroke={COLORS.ink}
                  strokeOpacity="0.16"
                />
                <text
                  x={PLOT_LEFT - 9}
                  y={y + 4}
                  fill={COLORS.inkMuted}
                  fontSize="12"
                  textAnchor="end"
                >
                  {score}
                </text>
              </g>
            );
          })}

          {dateGroups.slice(1).map((group) => {
            const x = pointToX(group.start, results.length);

            return (
              <line
                key={group.key}
                x1={x}
                y1={PLOT_TOP}
                x2={x}
                y2={PLOT_BOTTOM}
                stroke={COLORS.ink}
                strokeDasharray="4 5"
                strokeOpacity="0.28"
              />
            );
          })}

          {BANDS.map((band) => (
            <path
              key={band.min}
              d={areaPath}
              fill={band.color}
              fillOpacity="0.42"
              clipPath={`url(#${id}-band-${band.min})`}
            />
          ))}
          <path
            d={linePath}
            fill="none"
            stroke={COLORS.ink}
            strokeWidth="2"
            strokeLinejoin="round"
          />

          <line
            x1={PLOT_LEFT}
            y1={PLOT_TOP}
            x2={PLOT_LEFT}
            y2={PLOT_BOTTOM}
            stroke={COLORS.ink}
            strokeWidth="2"
          />
          <text
            x={PLOT_LEFT + 7}
            y={PLOT_TOP + 15}
            fill={COLORS.ink}
            fontSize="12"
            fontWeight="600"
          >
            현재
          </text>

          {timeTicks.map(({ index, hour }) => {
            const x = pointToX(index, results.length);

            return (
              <g key={index}>
                <line
                  x1={x}
                  y1={PLOT_BOTTOM}
                  x2={x}
                  y2={PLOT_BOTTOM + 5}
                  stroke={COLORS.inkMuted}
                />
                <text
                  x={x}
                  y={PLOT_BOTTOM + 19}
                  fill={COLORS.inkMuted}
                  fontSize="11"
                  textAnchor={index === 0 ? 'start' : 'middle'}
                >
                  {String(hour).padStart(2, '0')}시
                </text>
              </g>
            );
          })}

          {dateGroups.map((group, index) => {
            const center = (group.start + group.end) / 2;
            const x = pointToX(center, results.length);
            const label = ['오늘', '내일', '모레'][index] ?? `${index}일 후`;

            return (
              <text
                key={group.key}
                x={x}
                y={CHART_HEIGHT - 10}
                fill={COLORS.ink}
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
              >
                {label}
              </text>
            );
          })}
        </svg>
      </div>
    </section>
  );
}
