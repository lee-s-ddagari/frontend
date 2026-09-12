import type { RiskResult } from '../types';

interface CalculationDetailsProps {
  result: RiskResult;
}

const formatValue = (value: number, unit: string): string =>
  `${value.toFixed(1)}${unit}`;

export default function CalculationDetails({
  result,
}: CalculationDetailsProps) {
  const rows = [
    { label: '실내 기온', value: formatValue(result.indoorTempC, '℃') },
    { label: '실내 습도', value: formatValue(result.indoorHumidity, '%') },
    { label: '실내 이슬점', value: formatValue(result.dewPointC, '℃') },
    { label: '벽면 온도', value: formatValue(result.wallTempC, '℃') },
    { label: '결로 여유값', value: formatValue(result.marginC, '℃') },
  ];

  return (
    <details className="border-t border-ink/20 text-ink">
      <summary className="cursor-pointer py-6 text-lg font-semibold focus-visible:outline-none">
        계산 근거
      </summary>
      <div className="pb-8">
        <dl className="divide-y divide-ink/20 border-y border-ink/20">
          {rows.map((row) => (
            <div
              key={row.label}
              className="flex items-baseline justify-between gap-4 py-3"
            >
              <dt className="text-sm text-ink-muted">{row.label}</dt>
              <dd className="text-right text-sm font-medium text-ink">
                {row.value}{' '}
                <span className="font-normal text-ink-muted">추정</span>
              </dd>
            </div>
          ))}
        </dl>
        <p className="mt-4 text-xs leading-5 text-ink-muted">
          이슬점은 Magnus 근사식으로 계산합니다
        </p>
      </div>
    </details>
  );
}
