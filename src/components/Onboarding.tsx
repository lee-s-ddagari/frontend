import { useState, type FormEvent } from 'react';
import {
  MOCK_LOCATIONS,
  type MockLocationId,
} from '../data/mockScenarios';
import type {
  Facing,
  FloorType,
  RoomProfile,
  WindowType,
} from '../types';

interface Option<T extends string> {
  value: T;
  label: string;
}

interface OptionGroupProps<T extends string> {
  questionNumber: number;
  legend: string;
  options: readonly Option<T>[];
  value: T | null;
  onChange: (value: T) => void;
  columns: 'two' | 'three';
}

const FLOOR_OPTIONS: readonly Option<FloorType>[] = [
  { value: 'basement', label: '반지하' },
  { value: 'first', label: '1층' },
  { value: 'middle', label: '중간층' },
  { value: 'top', label: '최상층' },
];

const FACING_OPTIONS: readonly Option<Facing>[] = [
  { value: 'N', label: '북' },
  { value: 'E', label: '동' },
  { value: 'W', label: '서' },
  { value: 'S', label: '남' },
  { value: 'unknown', label: '모르겠음' },
];

const WINDOW_OPTIONS: readonly Option<WindowType>[] = [
  { value: 'single', label: '한 겹' },
  { value: 'double', label: '두 겹' },
  { value: 'unknown', label: '모르겠음' },
];

const ADDRESS_OPTIONS: readonly Option<MockLocationId>[] =
  MOCK_LOCATIONS.map((location) => ({
    value: location.id,
    label: location.label.split(' ').pop() ?? location.label,
  }));

function OptionGroup<T extends string>({
  questionNumber,
  legend,
  options,
  value,
  onChange,
  columns,
}: OptionGroupProps<T>) {
  const gridClassName =
    columns === 'two'
      ? 'grid-cols-2 sm:grid-cols-4'
      : 'grid-cols-3';

  return (
    <fieldset className="border-t border-ink/20 pt-6">
      <legend className="mb-4 flex w-full items-baseline gap-3 text-lg font-semibold">
        <span className="text-sm font-medium text-ink-muted">
          {questionNumber}.
        </span>
        {legend}
      </legend>
      <div className={`grid gap-2 ${gridClassName}`}>
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={`min-h-14 rounded-md border px-3 py-3 text-base font-semibold transition-colors ${
                selected
                  ? 'border-ink bg-ink text-surface'
                  : 'border-ink/20 bg-surface-alt text-ink hover:border-ink/50'
              }`}
              onClick={() => onChange(option.value)}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface OnboardingProps {
  onComplete: (profile: RoomProfile) => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const [address, setAddress] = useState<MockLocationId | null>(null);
  const [floor, setFloor] = useState<FloorType | null>(null);
  const [facing, setFacing] = useState<Facing | null>(null);
  const [windowType, setWindowType] = useState<WindowType | null>(null);

  const complete = Boolean(address && floor && facing && windowType);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const location = MOCK_LOCATIONS.find(
      (candidate) => candidate.id === address,
    );
    if (!complete || !location || !floor || !facing || !windowType) {
      return;
    }

    onComplete({
      address: {
        label: location.label,
        nx: location.nx,
        ny: location.ny,
      },
      floor,
      facing,
      window: windowType,
    });
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10">
          <h1 className="text-3xl font-semibold leading-tight">곰팡이 예보</h1>
          <p className="mt-3 text-base leading-7 text-ink-muted">
            내 방 조건을 알려주면 결로 위험과 환기할 시간을 계산해요.
          </p>
        </header>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <OptionGroup
            questionNumber={1}
            legend="어디 사세요?"
            options={ADDRESS_OPTIONS}
            value={address}
            onChange={setAddress}
            columns="three"
          />
          <OptionGroup
            questionNumber={2}
            legend="몇 층인가요?"
            options={FLOOR_OPTIONS}
            value={floor}
            onChange={setFloor}
            columns="two"
          />
          <OptionGroup
            questionNumber={3}
            legend="창문이 어느 쪽을 보나요?"
            options={FACING_OPTIONS}
            value={facing}
            onChange={setFacing}
            columns="three"
          />
          <OptionGroup
            questionNumber={4}
            legend="창문이 몇 겹인가요?"
            options={WINDOW_OPTIONS}
            value={windowType}
            onChange={setWindowType}
            columns="three"
          />

          <button
            type="submit"
            disabled={!complete}
            className="min-h-14 w-full rounded-md bg-ink px-5 py-3 text-base font-semibold text-surface transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted"
          >
            선택 완료
          </button>
        </form>
      </div>
    </main>
  );
}
