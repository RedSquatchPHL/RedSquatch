'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { API } from '@/lib/api';
import Bi from '@/components/tonatiuh/Bi';
import s from './gates.module.css';

/* Gates — the login. Tōnatiuh OS dark-glass; the form is shown straight away.
   Auth logic (login → optional OTP → interceptor) is unchanged. */
function GatesInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get('next');

  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [otp,         setOtp]         = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/client/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Login failed'); return; }
      if (data.awaiting_otp) { setAwaitingOtp(true); return; }
      router.push(nextPath || '/login-interceptor');
    } catch {
      setError('Network error. Check API connectivity.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/client/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token: otp }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      router.push(nextPath || '/login-interceptor');
    } catch {
      setError('Network error. Check API connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={s.gates}>
      <div className={s.wall} aria-hidden />
      <div className={s.sun} aria-hidden />

      <div className={s.panel}>
        <div className={s.brand}>
          <div className={s.brandName}><span className={s.brandAccent}>Red</span>Squatch</div>
          <div className={s.brandSub}><Bi es="Centro de mando" en="Command center" inline /></div>
        </div>

        {!awaitingOtp ? (
          <form onSubmit={handleLogin}>
            <div className={s.field}>
              <label className={s.label} htmlFor="username"><Bi es="Usuario" en="Username" inline /></label>
              <input
                id="username"
                className={s.input}
                type="text"
                autoComplete="username"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            <div className={s.field}>
              <label className={s.label} htmlFor="password"><Bi es="Contraseña" en="Password" inline /></label>
              <input
                id="password"
                className={s.input}
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
              />
            </div>
            {error && <p className={s.error} role="alert">{error}</p>}
            <button type="submit" className={s.submit} disabled={loading}>
              {loading ? 'Entrando… (Signing in)' : 'Entrar (Sign in)'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit}>
            <div className={s.field}>
              <label className={s.label} htmlFor="otp"><Bi es="Código del autenticador" en="Authenticator code" inline /></label>
              <input
                id="otp"
                className={`${s.input} ${s.inputOtp}`}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                disabled={loading}
                autoFocus
              />
            </div>
            {error && <p className={s.error} role="alert">{error}</p>}
            <button type="submit" className={s.submit} disabled={loading}>
              {loading ? 'Verificando… (Verifying)' : 'Verificar (Verify)'}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}

export default function GatesPage() {
  return (
    <Suspense>
      <GatesInner />
    </Suspense>
  );
}
