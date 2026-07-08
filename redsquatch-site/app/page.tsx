'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function LoginPage() {
  const [username,    setUsername]    = useState('');
  const [password,    setPassword]    = useState('');
  const [otp,         setOtp]         = useState('');
  const [awaitingOtp, setAwaitingOtp] = useState(false);
  const [error,       setError]       = useState('');
  const [loading,     setLoading]     = useState(false);
  const router = useRouter();

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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="glass-surface w-full max-w-sm rounded-2xl p-8 space-y-7">

        {/* Logo / brand */}
        <div className="text-center space-y-1">
          <h1
            className="text-3xl font-bold tracking-tight"
            style={{ color: '#d4a373', textShadow: '0 0 28px rgba(184,115,51,0.5)' }}
          >
            RedSquatch
          </h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Command center
          </p>
        </div>

        {/* Copper divider */}
        <div className="copper-line" />

        {/* Form */}
        {!awaitingOtp ? (
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="username"
                className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(184,115,51,0.8)' }}
              >
                Username
              </label>
              <input
                id="username"
                type="text"
                autoComplete="username"
                placeholder="acme_client"
                value={username}
                onChange={e => setUsername(e.target.value)}
                disabled={loading}
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="password"
                className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(184,115,51,0.8)' }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={e => setPassword(e.target.value)}
                disabled={loading}
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm"
              />
            </div>

            {error && (
              <p className="text-xs px-1" style={{ color: '#f87171' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
              style={{
                background: loading
                  ? 'rgba(184,115,51,0.5)'
                  : 'linear-gradient(135deg, #b87333 0%, #d4a373 100%)',
                color: '#0f0f0f',
                boxShadow: loading ? 'none' : '0 0 20px rgba(184,115,51,0.35)',
              }}
            >
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtpSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label
                htmlFor="otp"
                className="block text-xs font-semibold uppercase tracking-widest"
                style={{ color: 'rgba(184,115,51,0.8)' }}
              >
                Authenticator Code
              </label>
              <input
                id="otp"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={otp}
                onChange={e => setOtp(e.target.value)}
                disabled={loading}
                autoFocus
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm tracking-widest text-center"
              />
            </div>

            {error && (
              <p className="text-xs px-1" style={{ color: '#f87171' }}>{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
              style={{
                background: loading
                  ? 'rgba(184,115,51,0.5)'
                  : 'linear-gradient(135deg, #b87333 0%, #d4a373 100%)',
                color: '#0f0f0f',
                boxShadow: loading ? 'none' : '0 0 20px rgba(184,115,51,0.35)',
              }}
            >
              {loading ? 'Verifying…' : 'Verify'}
            </button>
          </form>
        )}

        {/* Bottom copper line */}
        <div
          className="absolute bottom-0 left-8 right-8 h-px rounded"
          style={{ background: 'linear-gradient(90deg, transparent, #b87333 50%, transparent)' }}
        />
      </div>
    </div>
  );
}
