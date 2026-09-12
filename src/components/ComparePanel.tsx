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
  onChange: (value: T) => void;
}

function OptionGroup<T extends string>({
  legend,
  options,
  value,
  onChange,
}: OptionGroupProps<T>) {
  return (
    <fieldset className="flex items-center gap-5 border-t border-ink/20 py-4">
      <legend className="sr-only">{legend}</legend>
      <span
        aria-hidden="true"
        className="w-16 shrink-0 text-base font-semibold text-ink"
      >
        {legend}
      </span>
      <div className="flex min-w-0 flex-1 gap-2">
        {options.map((option) => {
          const selected = option.value === value;

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              className={`min-h-11 min-w-0 flex-1 whitespace-nowrap rounded-md border px-3 py-2 text-sm font-semibold transition-colors ${
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
  profile: RoomProfile;
  isPreviewing: boolean;
  onChange: (profile: RoomProfile) => void;
  onReset: () => void;
}

export default function ComparePanel({
  profile,
  isPreviewing,
  onChange,
  onReset,
}: ComparePanelProps) {
  return (
    <section
      id="compare-panel"
      aria-labelledby="compare-panel-heading"
      className="border-t border-ink/20 py-8"
    >
      <div className="mb-5 flex items-start justify-between gap-6">
        <div>
          <h2
            id="compare-panel-heading"
            className="text-xl font-semibold text-ink"
          >
            내 방 조건 바꿔보기
          </h2>
          <p className="mt-1 text-sm text-ink-muted">
            저장되지 않는 미리보기입니다.
          </p>
        </div>
        <button
          type="button"
          className="min-h-10 shrink-0 rounded-md border border-ink/20 bg-surface-alt px-4 py-2 text-sm font-semibold text-ink transition-colors hover:border-ink/50 disabled:cursor-default disabled:text-ink-muted disabled:hover:border-ink/20"
          disabled={!isPreviewing}
          onClick={onReset}
        >
          원래대로
        </button>
      </div>

      <div>
        <OptionGroup
          legend="층수"
          options={FLOOR_OPTIONS}
          value={profile.floor}
          onChange={(floor) => onChange({ ...profile, floor })}
        />
        <OptionGroup
          legend="방향"
          options={FACING_OPTIONS}
          value={profile.facing}
          onChange={(facing) => onChange({ ...profile, facing })}
        />
        <OptionGroup
          legend="창호"
          options={WINDOW_OPTIONS}
          value={profile.window}
          onChange={(window) => onChange({ ...profile, window })}
        />
      </div>

      {isPreviewing && (
        <p className="mt-3 text-sm font-semibold text-ink-muted" role="status">
          변경한 조건을 미리 보는 중입니다.
        </p>
      )}
    </section>
  );
}
