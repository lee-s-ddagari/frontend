import { dewPoint } from '../logic/psychrometrics';
import type {
  ForecastPoint,
  RiskResult,
  VentilationVerdict,
} from '../types';

const VERDICT_COPY: Record<VentilationVerdict, string> = {
  recommended: '지금 환기하기 좋아요',
  neutral: '환기해도 큰 차이는 없어요',
  harmful: '지금 열면 습기가 들어옵니다',
};

interface VentilationCardProps {
  outdoor: ForecastPoint;
  result: RiskResult;
}

export default function VentilationCard({
  outdoor,
  result,
}: VentilationCardProps) {
  const outdoorDewPointC = dewPoint(outdoor.tempC, outdoor.humidity);

  return (
    <section
      className="my-8 rounded-md border border-ink/20 bg-surface-alt p-5 sm:p-6"
      aria-labelledby="ventilation-heading"
    >
      <h2
        id="ventilation-heading"
        className="text-sm font-semibold text-ink-muted"
      >
        지금 환기
      </h2>
      <p className="mt-3 text-xl font-semibold leading-8 text-ink">
        {VERDICT_COPY[result.ventilation]}
      </p>
      <p className="mt-3 text-sm leading-6 text-ink-muted">
        바깥 이슬점 {outdoorDewPointC.toFixed(1)}℃ · 벽면 추정{' '}
        {result.wallTempC.toFixed(1)}℃
      </p>
    </section>
  );
}
