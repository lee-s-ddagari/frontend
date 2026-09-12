import { useCallback, useEffect, useMemo, useState } from 'react';
import CalculationDetails from './components/CalculationDetails';
import ComparePanel from './components/ComparePanel';
import DemoControls from './components/DemoControls';
import Onboarding from './components/Onboarding';
import RiskGauge from './components/RiskGauge';
import RiskTimeline from './components/RiskTimeline';
import VentilationCard from './components/VentilationCard';
import VentilationSlots from './components/VentilationSlots';
import type { MockScenarioKey } from './data/mockScenarios';
import { fetchWeather } from './data/weatherSource';
import { calculateRiskSeries } from './logic/risk';
import {
  loadRoomProfile,
  saveRoomProfile,
} from './storage/roomProfile';
import type { RoomProfile, WeatherData } from './types';

type WeatherState =
  | { status: 'loading' }
  | { status: 'ready'; data: WeatherData }
  | { status: 'error' };

function App() {
  const [profile, setProfile] = useState<RoomProfile | null>(loadRoomProfile);
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' });
  const [compareOpen, setCompareOpen] = useState(false);
  const [previewProfile, setPreviewProfile] = useState<RoomProfile | null>(null);
  const [demoScenario, setDemoScenario] =
    useState<MockScenarioKey | null>(null);
  const demoEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === '1';

  useEffect(() => {
    if (!profile) {
      return;
    }

    let cancelled = false;
    const requestedScenario = demoEnabled
      ? demoScenario ?? undefined
      : undefined;

    if (requestedScenario === undefined) {
      setWeather({ status: 'loading' });
    }

    fetchWeather(
      profile.address.nx,
      profile.address.ny,
      requestedScenario,
    )
      .then((data) => {
        if (!cancelled) {
          setWeather({ status: 'ready', data });
        }
      })
      .catch(() => {
        if (!cancelled) {
          setWeather({ status: 'error' });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [demoEnabled, demoScenario, profile]);

  const activeProfile = previewProfile ?? profile;
  const activeWeather = weather.status === 'ready' ? weather.data : null;

  const riskSeries = useMemo(() => {
    if (!activeProfile || !activeWeather) {
      return [];
    }

    return calculateRiskSeries(activeWeather.hourly, activeProfile);
  }, [activeProfile, activeWeather]);

  function handleOnboardingComplete(nextProfile: RoomProfile) {
    saveRoomProfile(nextProfile);
    setProfile(nextProfile);
  }

  function openComparePanel() {
    if (!profile) {
      return;
    }

    setPreviewProfile(profile);
    setCompareOpen(true);
  }

  const closeComparePanel = useCallback(() => {
    setCompareOpen(false);
    setPreviewProfile(null);
  }, []);

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const currentRisk = riskSeries[0];
  const activeScenario = demoScenario ?? 'rainy';

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div
        className={`mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10 ${
          demoEnabled ? 'pb-36 sm:pb-36' : ''
        }`}
      >
        <header className="flex flex-col gap-1 border-b border-ink/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold">곰팡이 예보</h1>
          <p className="text-sm text-ink-muted">{profile.address.label}</p>
        </header>

        {compareOpen && (
          <p
            className="border-b border-ink/20 bg-surface-alt px-4 py-3 text-sm font-semibold text-ink-muted"
            role="status"
          >
            방 조건 미리보기 중 · 저장되지 않습니다
          </p>
        )}

        {!activeWeather && weather.status === 'loading' && (
          <section className="border-b border-ink/20 py-16" role="status">
            <p className="text-base text-ink-muted">날씨를 확인하고 있어요.</p>
          </section>
        )}

        {!activeWeather && weather.status === 'error' && (
          <section className="border-b border-ink/20 py-16" role="alert">
            <p className="text-base text-ink">
              날씨를 불러오지 못했어요. 잠시 후 다시 열어주세요.
            </p>
          </section>
        )}

        {activeWeather && currentRisk && (
          <>
            <RiskGauge result={currentRisk} />
            <VentilationCard
              outdoor={activeWeather.current}
              result={currentRisk}
            />
            <RiskTimeline results={riskSeries} />
            <VentilationSlots
              hourly={activeWeather.hourly}
              results={riskSeries}
            />
            <CalculationDetails result={currentRisk} />
            <section className="border-t border-ink/20 py-8">
              <button
                type="button"
                className="min-h-12 w-full rounded-md border border-ink/20 bg-surface-alt px-5 py-3 text-base font-semibold text-ink hover:border-ink/50"
                aria-expanded={compareOpen}
                aria-controls="compare-panel"
                onClick={openComparePanel}
              >
                내 방 조건 바꿔보기
              </button>
            </section>
          </>
        )}
      </div>

      <ComparePanel
        open={compareOpen}
        profile={previewProfile ?? profile}
        onChange={setPreviewProfile}
        onClose={closeComparePanel}
      />
      {demoEnabled && (
        <DemoControls
          activeScenario={activeScenario}
          onChange={setDemoScenario}
        />
      )}
    </main>
  );
}

export default App;
