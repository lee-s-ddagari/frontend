import { useEffect, useMemo, useState } from 'react';
import Onboarding from './components/Onboarding';
import RiskGauge from './components/RiskGauge';
import VentilationCard from './components/VentilationCard';
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

  useEffect(() => {
    if (!profile) {
      return;
    }

    let cancelled = false;
    setWeather({ status: 'loading' });

    fetchWeather(profile.address.nx, profile.address.ny)
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
  }, [profile]);

  const riskSeries = useMemo(() => {
    if (!profile || weather.status !== 'ready') {
      return [];
    }

    return calculateRiskSeries(weather.data.hourly, profile);
  }, [profile, weather]);

  function handleOnboardingComplete(nextProfile: RoomProfile) {
    saveRoomProfile(nextProfile);
    setProfile(nextProfile);
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  const currentRisk = riskSeries[0];

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto w-full max-w-2xl px-5 py-8 sm:px-8 sm:py-10">
        <header className="flex flex-col gap-1 border-b border-ink/20 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-2xl font-semibold">곰팡이 예보</h1>
          <p className="text-sm text-ink-muted">{profile.address.label}</p>
        </header>

        {weather.status === 'loading' && (
          <section className="border-b border-ink/20 py-16" role="status">
            <p className="text-base text-ink-muted">날씨를 확인하고 있어요.</p>
          </section>
        )}

        {weather.status === 'error' && (
          <section className="border-b border-ink/20 py-16" role="alert">
            <p className="text-base text-ink">
              날씨를 불러오지 못했어요. 잠시 후 다시 열어주세요.
            </p>
          </section>
        )}

        {weather.status === 'ready' && currentRisk && (
          <>
            <RiskGauge result={currentRisk} />
            <VentilationCard
              outdoor={weather.data.current}
              result={currentRisk}
            />
          </>
        )}
      </div>
    </main>
  );
}

export default App;
