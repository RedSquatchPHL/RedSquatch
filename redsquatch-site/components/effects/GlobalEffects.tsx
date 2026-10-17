'use client';
import { usePathname } from 'next/navigation';
import ClockGateMenu from '../ClockGateMenu';

// Quiet stand-in for the ambient stack on /ws/* work screens (work items,
// forms) — task-dense screens shouldn't compete with animation. One static
// gradient keeps the shell from looking bare.
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

// The old ambient stack (weather gradient, stars, fireflies, day corona) was
// retired when /hs got the ocean background (components/hs/OceanBackground).
export default function GlobalEffects() {
  const pathname = usePathname();
  const isWorkMode = pathname?.startsWith('/ws') ?? false;

  return (
    <>
      {/* Work Mode <-> Downtime Mode manual toggle. Floating bottom-left everywhere except
          /ws, where OSHeader renders it in the top bar instead (no bottom buttons there). */}
      {!isWorkMode && <ClockGateMenu />}
      {isWorkMode && <StaticWorkBackdrop />}
    </>
  );
}
