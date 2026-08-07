'use client';
import { usePathname } from 'next/navigation';
import { useTheme } from '../ThemeContext';
import WeatherBackground from './WeatherBackground';
import FireflyBackground from './FireflyBackground';
import StarBackground from './StarBackground';
import DayBackground from './DayBackground';
import ClockGateMenu from '../ClockGateMenu';

// Quiet stand-in for the full ambient stack on /ws/* work screens (work
// items, demand/discovery forms) — those are task-dense and shouldn't
// compete with ~70 animated star/rain/snow DOM nodes plus a weather API
// call that WeatherBackground fires on every mount. One static gradient
// keeps the shell from looking bare without the animation or network cost.
function StaticWorkBackdrop() {
  return (
    <div
      className="fixed inset-0 pointer-events-none"
      style={{
        zIndex: -1,
        background:
          'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(var(--copper-bold-rgb),0.06) 0%, transparent 55%), ' +
          'linear-gradient(180deg, var(--stone-1) 0%, var(--stone-0) 100%)',
      }}
    />
  );
}

export default function GlobalEffects() {
  const { active, season } = useTheme();
  const pathname = usePathname();
  const isWorkMode = pathname?.startsWith('/ws') ?? false;

  return (
    <>
      {/* Work Mode <-> Downtime Mode manual toggle — global, not tied to /ws or /hs */}
      <ClockGateMenu />

      {isWorkMode ? (
        <StaticWorkBackdrop />
      ) : (
        <>
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
      )}
    </>
  );
}
