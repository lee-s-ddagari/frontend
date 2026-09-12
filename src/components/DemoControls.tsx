import type { MockScenarioKey } from '../data/mockScenarios';

const SCENARIOS: readonly MockScenarioKey[] = [
  'rainy',
  'winter',
  'mild',
];

interface DemoControlsProps {
  activeScenario: MockScenarioKey | null;
  onChange: (scenario: MockScenarioKey) => void;
}

export default function DemoControls({
  activeScenario,
  onChange,
}: DemoControlsProps) {
  return (
    <aside
      className="fixed bottom-4 left-4 right-4 z-30 border border-ink/20 bg-surface-alt p-3 sm:left-auto sm:w-80"
      aria-labelledby="demo-controls-heading"
    >
      <h2
        id="demo-controls-heading"
        className="text-xs font-semibold text-ink-muted"
      >
        시연 시나리오
      </h2>
      <div className="mt-2 grid grid-cols-3 gap-2">
        {SCENARIOS.map((scenario) => {
          const selected = scenario === activeScenario;

          return (
            <button
              key={scenario}
              type="button"
              aria-pressed={selected}
              className={`min-h-10 rounded-md border px-2 py-2 text-sm font-semibold transition-colors ${
                selected
                  ? 'border-ink bg-ink text-surface'
                  : 'border-ink/20 bg-surface text-ink hover:border-ink/50'
              }`}
              onClick={() => onChange(scenario)}
            >
              {scenario}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
