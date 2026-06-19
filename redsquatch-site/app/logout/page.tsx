'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function LogoutPage() {
  const router = useRouter();
  const [count, setCount] = useState(2);

  useEffect(() => {
    const tick = setInterval(() => {
      setCount(c => {
        if (c <= 1) {
          clearInterval(tick);
          router.push('/');
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(tick);
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-surface flex flex-col items-center gap-6 rounded-2xl p-10 text-center">
        {/* Checkmark */}
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
          style={{
            backgroundColor: 'rgba(184,115,51,0.12)',
            border: '2px solid rgba(184,115,51,0.4)',
          }}
        >
          ✓
        </div>

        <div className="space-y-1">
          <h1 className="text-xl font-bold" style={{ color: '#d4a373' }}>
            You&apos;ve been logged out
          </h1>
          <p className="text-sm text-muted-foreground">
            Redirecting to login in {count}…
          </p>
        </div>

        {/* Progress bar */}
        <div
          className="w-48 h-0.5 rounded-full overflow-hidden"
          style={{ backgroundColor: 'rgba(184,115,51,0.15)' }}
        >
          <div
            className="h-full rounded-full"
            style={{
              backgroundColor: '#b87333',
              width: `${(count / 2) * 100}%`,
              transition: 'width 1s linear',
            }}
          />
        </div>

        <a
          href="/"
          className="text-xs underline-offset-2 hover:underline"
          style={{ color: '#b87333' }}
        >
          Go to login now
        </a>
      </div>
    </div>
  );
}
