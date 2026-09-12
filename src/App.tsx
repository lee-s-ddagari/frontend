import { useEffect, useMemo, useState } from 'react';
import BrandLogo from './components/BrandLogo';
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
  const [editingProfile, setEditingProfile] = useState(false);
  const [weather, setWeather] = useState<WeatherState>({ status: 'loading' });
  const [previewProfile, setPreviewProfile] = useState<RoomProfile | null>(null);
  const [demoScenario, setDemoScenario] =
    useState<MockScenarioKey | null>(null);
  const demoEnabled =
    typeof window !== 'undefined' &&
    new URLSearchParams(window.location.search).get('demo') === '1';
  const weatherNx = profile?.address.nx;
  const weatherNy = profile?.address.ny;

  useEffect(() => {
    if (weatherNx === undefined || weatherNy === undefined) {
      return;
    }

    let cancelled = false;
    const requestedScenario = demoEnabled
      ? demoScenario ?? 'rainy'
      : undefined;

    setWeather({ status: 'loading' });

    fetchWeather(weatherNx, weatherNy, requestedScenario)
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
  }, [demoEnabled, demoScenario, weatherNx, weatherNy]);

  const activeProfile = previewProfile ?? profile;
  const weatherMatchesProfile =
    profile !== null &&
    weather.status === 'ready' &&
    weather.data.location.nx === profile.address.nx &&
    weather.data.location.ny === profile.address.ny;
  const activeWeather = weatherMatchesProfile ? weather.data : null;
  const weatherIsLoading =
    weather.status === 'loading' ||
    (weather.status === 'ready' && !weatherMatchesProfile);

  const riskSeries = useMemo(() => {
    if (!activeProfile || !activeWeather) {
      return [];
    }

    return calculateRiskSeries(activeWeather.hourly, activeProfile);
  }, [activeProfile, activeWeather]);

  function handleOnboardingComplete(nextProfile: RoomProfile) {
    const updatedProfile: RoomProfile = {
      ...nextProfile,
      address: { ...nextProfile.address },
      ...(nextProfile.measured
        ? { measured: { ...nextProfile.measured } }
        : {}),
    };
    const addressChanged =
      profile !== null &&
      (profile.address.nx !== updatedProfile.address.nx ||
        profile.address.ny !== updatedProfile.address.ny);

    if (addressChanged) {
      setWeather({ status: 'loading' });
    }

    saveRoomProfile(updatedProfile);
    setProfile(updatedProfile);
    setPreviewProfile(null);
    setEditingProfile(false);
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  if (editingProfile) {
    return (
      <Onboarding
        initialProfile={profile}
        onComplete={handleOnboardingComplete}
        onCancel={() => setEditingProfile(false)}
      />
    );
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
        <header className="flex flex-col gap-2 border-b border-ink/20 pb-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo className="-ml-2" />
            <h1 className="text-2xl font-semibold">곰팡이 예보</h1>
          </div>
          <button
            type="button"
            className="group inline-flex cursor-pointer items-center gap-1 self-start text-sm text-ink-muted sm:self-auto"
            aria-label={`${profile.address.label}, 방 정보 설정`}
            title="방 정보 설정"
            onClick={() => setEditingProfile(true)}
          >
            <span className="underline decoration-ink/30 underline-offset-4 group-hover:decoration-ink">
              {profile.address.label}
            </span>
            <span aria-hidden="true" className="text-base leading-none">
              ›
            </span>
          </button>
        </header>

        {activeWeather?.source === 'fallback' && (
          <p
            className="border-b border-ink/20 py-2 text-xs text-ink-muted"
            role="status"
          >
            예시 데이터로 표시 중
          </p>
        )}

        {!activeWeather && weatherIsLoading && (
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
            <ComparePanel
              profile={previewProfile ?? profile}
              isPreviewing={previewProfile !== null}
              onChange={setPreviewProfile}
              onReset={() => setPreviewProfile(null)}
            />
            <VentilationSlots
              hourly={activeWeather.hourly}
              results={riskSeries}
            />
            <CalculationDetails result={currentRisk} />
          </>
        )}
      </div>

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
