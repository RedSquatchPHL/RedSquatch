'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API } from '@/lib/api';

export default function SettingsPage() {
  const [loading,    setLoading]    = useState(true);
  const [enabled,    setEnabled]    = useState(false);
  const [qr,         setQr]         = useState<string | null>(null);
  const [token,      setToken]      = useState('');
  const [error,      setError]      = useState('');
  const [message,    setMessage]    = useState('');
  const [busy,       setBusy]       = useState(false);
  const router = useRouter();

  useEffect(() => {
    (async () => {
      try {
        const res  = await fetch(`${API}/api/client/session`, { credentials: 'include' });
        const data = await res.json();
        if (!res.ok || !data.authenticated) { router.push('/login'); return; }

        const statusRes  = await fetch(`${API}/api/client/totp/status`, { credentials: 'include' });
        const statusData = await statusRes.json();
        setEnabled(!!statusData.enabled);
        setLoading(false);
      } catch {
        router.push('/login');
      }
    })();
  }, [router]);

  const startSetup = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res  = await fetch(`${API}/api/client/totp/setup`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to start setup'); return; }
      setQr(data.qr);
    } catch {
      setError('Network error. Check API connectivity.');
    } finally {
      setBusy(false);
    }
  };

  const confirmSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res  = await fetch(`${API}/api/client/totp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Invalid code'); return; }
      setEnabled(true);
      setQr(null);
      setToken('');
      setMessage('Two-factor authentication is now enabled.');
    } catch {
      setError('Network error. Check API connectivity.');
    } finally {
      setBusy(false);
    }
  };

  const disable2fa = async () => {
    setError('');
    setMessage('');
    setBusy(true);
    try {
      const res  = await fetch(`${API}/api/client/totp/disable`, {
        method: 'POST',
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to disable'); return; }
      setEnabled(false);
      setQr(null);
      setMessage('Two-factor authentication has been disabled.');
    } catch {
      setError('Network error. Check API connectivity.');
    } finally {
      setBusy(false);
    }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-screen">
      <div
        className="glass-surface rounded-2xl px-10 py-8 text-center"
        style={{ minWidth: 220 }}
      >
        <div
          className="w-8 h-8 rounded-full border-2 mx-auto mb-4 animate-spin"
          style={{ borderColor: 'rgba(184,115,51,0.2)', borderTopColor: '#b87333' }}
        />
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.45)' }}>Loading settings…</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-10">
      <div className="glass-surface w-full max-w-sm rounded-2xl p-8 space-y-7">

        <div className="text-center space-y-1">
          <h1
            className="text-2xl font-bold tracking-tight"
            style={{ color: '#d4a373', textShadow: '0 0 28px rgba(184,115,51,0.5)' }}
          >
            Two-Factor Authentication
          </h1>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
            {enabled ? 'Currently enabled' : 'Currently disabled'}
          </p>
        </div>

        <div className="copper-line" />

        {message && (
          <p className="text-xs px-1 text-center" style={{ color: '#4ade80' }}>{message}</p>
        )}
        {error && (
          <p className="text-xs px-1 text-center" style={{ color: '#f87171' }}>{error}</p>
        )}

        {enabled && !qr && (
          <button
            onClick={disable2fa}
            disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 glass-btn"
          >
            {busy ? 'Working…' : 'Disable 2FA'}
          </button>
        )}

        {!enabled && !qr && (
          <button
            onClick={startSetup}
            disabled={busy}
            className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
            style={{
              background: busy
                ? 'rgba(184,115,51,0.5)'
                : 'linear-gradient(135deg, #b87333 0%, #d4a373 100%)',
              color: '#0f0f0f',
              boxShadow: busy ? 'none' : '0 0 20px rgba(184,115,51,0.35)',
            }}
          >
            {busy ? 'Starting…' : 'Enable 2FA'}
          </button>
        )}

        {qr && (
          <div className="space-y-4">
            <p className="text-xs text-center" style={{ color: 'rgba(255,255,255,0.5)' }}>
              Scan this with your authenticator app, then enter the 6-digit code below.
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qr} alt="TOTP QR code" className="mx-auto rounded-lg" style={{ width: 200, height: 200 }} />
            <form onSubmit={confirmSetup} className="space-y-4">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="123456"
                maxLength={6}
                value={token}
                onChange={e => setToken(e.target.value)}
                disabled={busy}
                autoFocus
                className="glass-input w-full rounded-lg px-4 py-2.5 text-sm tracking-widest text-center"
              />
              <button
                type="submit"
                disabled={busy}
                className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50"
                style={{
                  background: busy
                    ? 'rgba(184,115,51,0.5)'
                    : 'linear-gradient(135deg, #b87333 0%, #d4a373 100%)',
                  color: '#0f0f0f',
                  boxShadow: busy ? 'none' : '0 0 20px rgba(184,115,51,0.35)',
                }}
              >
                {busy ? 'Verifying…' : 'Confirm & Enable'}
              </button>
            </form>
          </div>
        )}

        <button
          onClick={() => router.back()}
          className="w-full text-xs text-center py-1"
          style={{ color: 'rgba(255,255,255,0.4)' }}
        >
          ← Back
        </button>
      </div>
    </div>
  );
}
