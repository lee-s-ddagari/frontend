import { useState, type FormEvent } from 'react';
import AddressSearch from './AddressSearch';
import BrandLogo from './BrandLogo';
import { SEOUL_DONGS, type SeoulDong } from '../data/seoulDongs';
import { latLonToGrid } from '../logic/grid';
import type {
  Facing,
  FloorType,
  RoomProfile,
  WindowType,
} from '../types';

interface Option<T extends string> {
  value: T;
  label: string;
  description?: string;
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
  {
    value: 'basement',
    label: '반지하',
    description: '창문이 지면보다 낮아요',
  },
  {
    value: 'first',
    label: '1층',
    description: '지면과 같은 높이예요',
  },
  {
    value: 'middle',
    label: '중간층',
    description: '위아래 모두 집이에요',
  },
  {
    value: 'top',
    label: '최상층',
    description: '바로 위가 옥상이에요',
  },
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
              className={`flex flex-col items-center justify-center rounded-md border py-3 transition-colors ${
                option.description ? 'min-h-20 px-1' : 'min-h-14 px-3'
              } ${
                selected
                  ? 'border-ink bg-ink text-surface'
                  : 'border-ink/20 bg-surface-alt text-ink hover:border-ink/50'
              }`}
              onClick={() => onChange(option.value)}
            >
              <span className="text-base font-semibold leading-5">
                {option.label}
              </span>
              {option.description && (
                <span
                  className={`mt-1 whitespace-nowrap text-xs font-normal leading-4 ${
                    selected ? 'text-surface/70' : 'text-ink-muted'
                  }`}
                >
                  {option.description}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

interface OnboardingProps {
  initialProfile?: RoomProfile;
  onComplete: (profile: RoomProfile) => void;
  onCancel?: () => void;
}

function addressLabel(address: SeoulDong): string {
  return `서울 ${address.gu} ${address.dong}`;
}

function initialAddress(profile?: RoomProfile): SeoulDong | null {
  if (!profile) {
    return null;
  }

  return (
    SEOUL_DONGS.find(
      (address) => addressLabel(address) === profile.address.label,
    ) ?? null
  );
}

export default function Onboarding({
  initialProfile,
  onComplete,
  onCancel,
}: OnboardingProps) {
  const editing = initialProfile !== undefined;
  const [address, setAddress] = useState<SeoulDong | null>(() =>
    initialAddress(initialProfile),
  );
  const [floor, setFloor] = useState<FloorType | null>(
    initialProfile?.floor ?? null,
  );
  const [facing, setFacing] = useState<Facing | null>(
    initialProfile?.facing ?? null,
  );
  const [windowType, setWindowType] = useState<WindowType | null>(
    initialProfile?.window ?? null,
  );

  const complete = Boolean(address && floor && facing && windowType);

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!complete || !address || !floor || !facing || !windowType) {
      return;
    }

    const grid = latLonToGrid(address.lat, address.lon);

    const nextProfile: RoomProfile = {
      ...initialProfile,
      address: {
        label: addressLabel(address),
        nx: grid.nx,
        ny: grid.ny,
      },
      floor,
      facing,
      window: windowType,
    };

    onComplete(nextProfile);
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto w-full max-w-2xl px-5 py-10 sm:px-8 sm:py-14">
        <header className="mb-10 flex items-center gap-4">
          <BrandLogo size="large" className="-ml-3" />
          <div className="min-w-0">
            <h1 className="text-3xl font-semibold leading-tight">곰팡이 예보</h1>
            <p className="mt-2 text-base leading-7 text-ink-muted">
              {editing
                ? '저장된 지역과 방 조건을 수정해요.'
                : '내 방 조건을 알려주면 결로 위험과 환기할 시간을 계산해요.'}
            </p>
          </div>
        </header>

        <form className="space-y-8" onSubmit={handleSubmit}>
          <fieldset className="border-t border-ink/20 pt-6">
            <legend className="mb-4 flex w-full items-baseline gap-3 text-lg font-semibold">
              <span className="text-sm font-medium text-ink-muted">1.</span>
              어디 사세요?
            </legend>
            <AddressSearch value={address} onChange={setAddress} />
          </fieldset>
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

          <div className={editing ? 'grid grid-cols-2 gap-2' : ''}>
            {editing && onCancel && (
              <button
                type="button"
                className="min-h-14 rounded-md border border-ink/20 bg-surface-alt px-5 py-3 text-base font-semibold text-ink transition-colors hover:border-ink/50"
                onClick={onCancel}
              >
                취소
              </button>
            )}
            <button
              type="submit"
              disabled={!complete}
              className="min-h-14 w-full rounded-md bg-ink px-5 py-3 text-base font-semibold text-surface transition-colors hover:bg-ink/90 disabled:cursor-not-allowed disabled:bg-surface-alt disabled:text-ink-muted"
            >
              {editing ? '저장' : '선택 완료'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
