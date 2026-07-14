'use client';
import { useTheme } from './ThemeContext';
import WeatherBackground from './WeatherBackground';
import FireflyBackground from './FireflyBackground';
import StarBackground from './StarBackground';
import DayBackground from './DayBackground';
import ClockGateMenu from './ClockGateMenu';

export default function GlobalEffects() {
  const { active, season } = useTheme();

  return (
    <>
      {/* Work Mode <-> Downtime Mode manual toggle — global, not tied to /ws or /hs */}
      <ClockGateMenu />

      {/* Sky gradient + weather-condition overlays (always active, adapts to conditions) */}
      <WeatherBackground />

      {active === 'night' ? (
        <>
          <StarBackground />
          <FireflyBackground />
        </>
      ) : (
        <>
          {/* Warm sunlight corona behind the UI */}
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: '140%',
              height: '55vh',
              background: 'radial-gradient(ellipse at 50% -15%, rgba(255,195,65,0.11) 0%, rgba(255,160,40,0.05) 45%, transparent 70%)',
              pointerEvents: 'none',
              zIndex: 0,
            }}
          />
          <DayBackground season={season} />
        </>
      )}
    </>
  );
}
