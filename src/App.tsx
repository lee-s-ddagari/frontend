import { useState } from 'react';
import Onboarding from './components/Onboarding';
import {
  loadRoomProfile,
  saveRoomProfile,
} from './storage/roomProfile';
import type { RoomProfile } from './types';

function App() {
  const [profile, setProfile] = useState<RoomProfile | null>(loadRoomProfile);

  function handleOnboardingComplete(nextProfile: RoomProfile) {
    saveRoomProfile(nextProfile);
    setProfile(nextProfile);
  }

  if (!profile) {
    return <Onboarding onComplete={handleOnboardingComplete} />;
  }

  return (
    <main className="min-h-screen bg-surface text-ink">
      <div className="mx-auto flex min-h-screen max-w-2xl items-center px-5 py-12 sm:px-8">
        <section className="w-full border-y border-ink/20 py-8">
          <p className="text-base text-ink-muted">{profile.address.label}</p>
          <h1 className="mt-2 text-3xl font-semibold">곰팡이 예보</h1>
          <p className="mt-4 text-base leading-7 text-ink-muted">
            방 정보가 저장되었습니다.
          </p>
        </section>
      </div>
    </main>
  );
}

export default App;
