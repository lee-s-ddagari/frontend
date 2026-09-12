import type { RiskLevel, RiskResult } from '../types';

interface LevelContent {
  label: string;
  description: string;
  textClassName: string;
  barClassName: string;
}

const LEVEL_CONTENT: Record<RiskLevel, LevelContent> = {
  safe: {
    label: '안전',
    description: '지금은 창가 벽에 물이 맺힐 가능성이 낮아요',
    textClassName: 'text-safe',
    barClassName: 'bg-safe',
  },
  caution: {
    label: '주의',
    description: '창가 주변에 습기가 차기 시작할 수 있어요',
    textClassName: 'text-caution',
    barClassName: 'bg-caution',
  },
  warning: {
    label: '경고',
    description: '창가 벽을 확인하고 실내 습기를 줄여주세요',
    textClassName: 'text-warning',
    barClassName: 'bg-warning',
  },
  danger: {
    label: '위험',
    description: '창가 벽에 물이 맺힐 수 있어요',
    textClassName: 'text-danger',
    barClassName: 'bg-danger',
  },
};

interface RiskGaugeProps {
  result: RiskResult;
}

export default function RiskGauge({ result }: RiskGaugeProps) {
  const content = LEVEL_CONTENT[result.level];

  return (
    <section className="border-b border-ink/20 py-9" aria-labelledby="risk-heading">
      <h2 id="risk-heading" className="text-base font-semibold text-ink-muted">
        현재 결로 위험
      </h2>

      <div className="mt-5 flex min-h-28 items-end gap-3">
        <span
          className={`text-[7rem] font-semibold leading-none ${content.textClassName}`}
        >
          {result.score}
        </span>
        <span className="pb-3 text-lg font-medium text-ink-muted">/ 100</span>
      </div>

      <div
        className="mt-6 h-2 overflow-hidden rounded-full bg-surface-alt"
        role="meter"
        aria-label={`결로 위험 점수 ${result.score}점`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={result.score}
      >
        <div
          className={`h-full ${content.barClassName}`}
          style={{ width: `${result.score}%` }}
        />
      </div>

      <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:items-baseline sm:gap-4">
        <strong className={`text-2xl ${content.textClassName}`}>
          {content.label}
        </strong>
        <p className="m-0 text-base leading-7 text-ink">
          {content.description}
        </p>
      </div>
    </section>
  );
}
