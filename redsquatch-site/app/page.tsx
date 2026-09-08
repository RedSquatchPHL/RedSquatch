'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';
import s from './gates.module.css';

/* Gates — the login threshold.
   Arrive to the compound; click the carved RS shield; the login panel slides
   up over the scene. Auth logic (login → optional OTP → interceptor) is
   unchanged from the previous version — only the skin and the reveal are new. */
export default function GatesPage() {
  const router = useRouter();

  const [revealed,    setRevealed]    = useState(false);
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
      router.push('/login-interceptor');
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
      router.push('/login-interceptor');
    } catch {
      setError('Network error. Check API connectivity.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className={s.gates}>
      <div className={s.backdrop} />
      <div className={s.warmth} />
      <span className={`${s.lantern} ${s.lanternL}`} aria-hidden />
      <span className={`${s.lantern} ${s.lanternR}`} aria-hidden />

      {!revealed && (
        <button
          className={s.mark}
          onClick={() => setRevealed(true)}
          aria-label="Enter RedSquatch"
        />
      )}

      {revealed && (
        <div className={s.panelWrap}>
          <div className={s.panel}>
            <div className={s.brand}>
              <div className={s.brandName}>RedSquatch</div>
              <div className={s.brandSub}>Command center</div>
            </div>
            <hr className={s.rule} />

            {!awaitingOtp ? (
              <form onSubmit={handleLogin}>
                <div className={s.field}>
                  <label className={s.label} htmlFor="username">Username</label>
                  <input
                    id="username"
                    className={s.input}
                    type="text"
                    autoComplete="username"
                    placeholder="acme_client"
                    value={username}
                    onChange={e => setUsername(e.target.value)}
                    disabled={loading}
                    autoFocus
                  />
                </div>
                <div className={s.field}>
                  <label className={s.label} htmlFor="password">Password</label>
                  <input
                    id="password"
                    className={s.input}
                    type="password"
                    autoComplete="current-password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    disabled={loading}
                  />
                </div>
                {error && <p className={s.error}>{error}</p>}
                <button type="submit" className={s.submit} disabled={loading}>
                  {loading ? 'Signing in…' : 'Sign In'}
                </button>
              </form>
            ) : (
              <form onSubmit={handleOtpSubmit}>
                <div className={s.field}>
                  <label className={s.label} htmlFor="otp">Authenticator Code</label>
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
                {error && <p className={s.error}>{error}</p>}
                <button type="submit" className={s.submit} disabled={loading}>
                  {loading ? 'Verifying…' : 'Verify'}
                </button>
              </form>
            )}

            {!awaitingOtp && (
              <button
                type="button"
                className={s.back}
                onClick={() => { setRevealed(false); setError(''); }}
              >
                ← Back to the gate
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
