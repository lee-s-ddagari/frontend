import {
  VENT_HOUR_END,
  VENT_HOUR_START,
} from '../logic/constants';
import { dewPoint } from '../logic/psychrometrics';
import type { ForecastPoint, RiskResult } from '../types';

interface VentilationSlotsProps {
  hourly: ForecastPoint[];
  results: RiskResult[];
}

export interface VentilationSlot {
  startTime: string;
  endTime: string;
  averageDewPointGap: number;
  averageScore: number;
  rankingScore: number;
  startIndex: number;
}

interface RecommendedHour {
  time: string;
  dewPointGap: number;
  score: number;
  index: number;
}

const DAY_LABELS = ['오늘', '내일', '모레'] as const;

function formatHour(time: string): string {
  return `${time.slice(11, 13)}시`;
}

function formatDay(time: string, dates: string[]): string {
  const dayIndex = dates.indexOf(time.slice(0, 10));
  return DAY_LABELS[dayIndex] ?? `${dayIndex}일 후`;
}

function formatSlot(slot: VentilationSlot, dates: string[]): string {
  const startDay = formatDay(slot.startTime, dates);
  const startHour = formatHour(slot.startTime);
  const endHour = `${String(Number(slot.endTime.slice(11, 13)) + 1).padStart(2, '0')}시`;

  return `${startDay} ${startHour}–${endHour}`;
}

function createSlot(hours: RecommendedHour[]): VentilationSlot {
  let selectedHours = hours;

  if (hours.length > 8) {
    const windowLength = 6;
    let bestStart = 0;
    let bestRankingTotal = Number.NEGATIVE_INFINITY;

    for (let start = 0; start <= hours.length - windowLength; start += 1) {
      const rankingTotal = hours
        .slice(start, start + windowLength)
        .reduce(
          (sum, hour) => sum + hour.dewPointGap - hour.score / 20,
          0,
        );

      if (rankingTotal > bestRankingTotal) {
        bestRankingTotal = rankingTotal;
        bestStart = start;
      }
    }

    selectedHours = hours.slice(bestStart, bestStart + windowLength);
  }

  const first = selectedHours[0];
  const last = selectedHours[selectedHours.length - 1];
  const averageDewPointGap =
    selectedHours.reduce((sum, hour) => sum + hour.dewPointGap, 0) /
    selectedHours.length;
  const averageScore =
    selectedHours.reduce((sum, hour) => sum + hour.score, 0) /
    selectedHours.length;

  return {
    startTime: first.time,
    endTime: last.time,
    averageDewPointGap,
    averageScore,
    rankingScore: averageDewPointGap - averageScore / 20,
    startIndex: first.index,
  };
}

export function buildVentilationSlots(
  hourly: ForecastPoint[],
  results: RiskResult[],
): VentilationSlot[] {
  const groups: RecommendedHour[][] = [];
  let active: RecommendedHour[] = [];

  const finishActiveGroup = () => {
    if (active.length > 0) {
      groups.push(active);
      active = [];
    }
  };

  results.forEach((result, index) => {
    const outdoor = hourly[index];
    const hour = Number(result.time.slice(11, 13));
    const isAvailableHour =
      hour >= VENT_HOUR_START && hour < VENT_HOUR_END;
    const isRecommended =
      result.ventilation === 'recommended' && isAvailableHour && outdoor;

    if (isRecommended) {
      const dewPointGap =
        result.dewPointC - dewPoint(outdoor.tempC, outdoor.humidity);
      const previous = active[active.length - 1];
      const startsNewDay =
        previous && previous.time.slice(0, 10) !== result.time.slice(0, 10);

      if (startsNewDay) {
        finishActiveGroup();
      }

      active.push({
        time: result.time,
        dewPointGap,
        score: result.score,
        index,
      });

      return;
    }

    finishActiveGroup();
  });

  finishActiveGroup();

  const bestSlotByDate = new Map<string, VentilationSlot>();

  groups.map(createSlot).forEach((slot) => {
    const date = slot.startTime.slice(0, 10);
    const currentBest = bestSlotByDate.get(date);

    if (
      !currentBest ||
      slot.rankingScore > currentBest.rankingScore
    ) {
      bestSlotByDate.set(date, slot);
    }
  });

  return Array.from(bestSlotByDate.values())
    .sort(
      (a, b) =>
        b.rankingScore - a.rankingScore ||
        a.startIndex - b.startIndex,
    )
    .slice(0, 3);
}

export default function VentilationSlots({
  hourly,
  results,
}: VentilationSlotsProps) {
  const slots = buildVentilationSlots(hourly, results);
  const dates = Array.from(
    new Set(results.map((result) => result.time.slice(0, 10))),
  );

  return (
    <section
      className="border-t border-ink/20 py-8"
      aria-labelledby="ventilation-slots-heading"
    >
      <h2
        id="ventilation-slots-heading"
        className="text-lg font-semibold text-ink"
      >
        환기 추천 시간대
      </h2>

      {slots.length > 0 ? (
        <ol className="mt-4 divide-y divide-ink/20 border-y border-ink/20">
          {slots.map((slot) => (
            <li
              key={`${slot.startTime}-${slot.endTime}`}
              className="py-4 text-base font-medium text-ink"
            >
              {formatSlot(slot, dates)}
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-4 text-base leading-7 text-ink-muted">
          낮 시간대에는 환기하기 어려운 날씨예요
        </p>
      )}
    </section>
  );
}
