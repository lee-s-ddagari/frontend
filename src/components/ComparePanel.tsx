import { useEffect, useRef } from 'react';
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

interface OptionGroupProps<T extends string> {
  legend: string;
  options: readonly Option<T>[];
  value: T;
  columns: 'two' | 'three';
  onChange: (value: T) => void;
}

function OptionGroup<T extends string>({
  legend,
  options,
  value,
  columns,
  onChange,
}: OptionGroupProps<T>) {
  const gridClassName =
    columns === 'two' ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-3';

  return (
    <fieldset className="border-t border-ink/20 pt-5">
      <legend className="mb-3 text-base font-semibold text-ink">
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
              className={`min-h-12 rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
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

interface ComparePanelProps {
  open: boolean;
  profile: RoomProfile;
  onChange: (profile: RoomProfile) => void;
  onClose: () => void;
}

export default function ComparePanel({
  open,
  profile,
  onChange,
  onClose,
}: ComparePanelProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButtonRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40">
      <button
        type="button"
        className="absolute inset-0 h-full w-full bg-ink/40"
        aria-label="조건 비교 닫기"
        onClick={onClose}
      />
      <section
        id="compare-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="compare-panel-heading"
        className="absolute inset-x-0 bottom-0 max-h-[88vh] overflow-y-auto rounded-t-md border-t border-ink/20 bg-surface px-5 pb-7 sm:left-1/2 sm:max-w-2xl sm:-translate-x-1/2 sm:border-x"
      >
        <div className="sticky top-0 z-10 -mx-5 flex items-start justify-between gap-4 border-b border-ink/20 bg-surface-alt px-5 py-4">
          <div>
            <p className="text-sm font-semibold text-ink-muted">
              미리보기 중 · 저장되지 않습니다
            </p>
            <h2
              id="compare-panel-heading"
              className="mt-1 text-xl font-semibold text-ink"
            >
              내 방 조건 바꿔보기
            </h2>
          </div>
          <button
            ref={closeButtonRef}
            type="button"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-ink/20 bg-surface text-2xl leading-none text-ink hover:bg-surface-alt"
            aria-label="미리보기 닫기"
            title="닫기"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="space-y-6 pt-6">
          <OptionGroup
            legend="층수"
            options={FLOOR_OPTIONS}
            value={profile.floor}
            columns="two"
            onChange={(floor) => onChange({ ...profile, floor })}
          />
          <OptionGroup
            legend="방향"
            options={FACING_OPTIONS}
            value={profile.facing}
            columns="three"
            onChange={(facing) => onChange({ ...profile, facing })}
          />
          <OptionGroup
            legend="창호"
            options={WINDOW_OPTIONS}
            value={profile.window}
            columns="three"
            onChange={(window) => onChange({ ...profile, window })}
          />
        </div>
      </section>
    </div>
  );
}
