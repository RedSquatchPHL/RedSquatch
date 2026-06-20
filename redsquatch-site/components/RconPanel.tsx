'use client';
import { useState, useEffect } from 'react';

export const RconPanel = () => {
  const [players, setPlayers] = useState<string[]>([]);
  const [selectedPlayer, setSelectedPlayer] = useState('');
  const [item, setItem] = useState('diamond');
  const [amount, setAmount] = useState('64');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [x, setX] = useState('0');
  const [y, setY] = useState('64');
  const [z, setZ] = useState('0');

  const items = ['diamond', 'iron', 'gold', 'copper', 'lapis_lazuli', 'emerald', 'cooked_beef', 'cooked_salmon', 'bread'];

  useEffect(() => {
    fetchPlayers();
    const interval = setInterval(fetchPlayers, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPlayers = async () => {
    try {
      const res = await fetch('/api/client/rcon/players');
      const data = await res.json();
      if (data.success && data.players) {
        const playerList = data.players
          .split('\n')
          .filter((p: string) => p.trim() && p.includes(':'))
          .map((p: string) => p.split(':')[1]?.trim())
          .filter(Boolean);
        setPlayers(playerList);
      }
    } catch (error) {
      console.error('Error fetching players:', error);
    }
  };

  const giveItem = async () => {
    if (!selectedPlayer) {
      setMessage('Please select a player');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/rcon/give-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: selectedPlayer, item, amount: parseInt(amount) || 1 })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Gave ${amount} ${item} to ${selectedPlayer}`);
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
    }
    setLoading(false);
  };

  const teleport = async () => {
    if (!selectedPlayer) {
      setMessage('Please select a player');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/rcon/teleport', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player: selectedPlayer, x: parseInt(x) || 0, y: parseInt(y) || 64, z: parseInt(z) || 0 })
      });
      const data = await res.json();
      if (data.success) {
        setMessage(`✓ Teleported ${selectedPlayer} to (${x}, ${y}, ${z})`);
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
    }
    setLoading(false);
  };

  const restart = async () => {
    if (!window.confirm('Restart server? Players will be disconnected.')) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch('/api/client/rcon/restart', { method: 'POST' });
      const data = await res.json();
      if (data.success) {
        setMessage('✓ Server restarting in 10 seconds...');
      } else {
        setMessage(`✗ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`✗ Error: ${error}`);
    }
    setLoading(false);
  };

  return (
    <div style={{ padding: '1.5rem', color: '#d4a373', maxWidth: '500px' }}>
      <h2 style={{ marginBottom: '1.5rem', fontSize: '1.5rem' }}>⚙️ Server Control</h2>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>Player: </label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <select
            value={selectedPlayer}
            onChange={(e) => setSelectedPlayer(e.target.value)}
            style={{
              flex: 1,
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            <option value="">Select...</option>
            {players.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
          <button
            onClick={fetchPlayers}
            disabled={loading}
            style={{
              padding: '0.5rem 1rem',
              background: 'rgba(184,115,51,0.2)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1
            }}
          >
            Refresh
          </button>
        </div>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Give Item</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <select
            value={item}
            onChange={(e) => setItem(e.target.value)}
            style={{
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem',
              cursor: 'pointer'
            }}
          >
            {items.map((i) => <option key={i} value={i}>{i}</option>)}
          </select>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            style={{
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem'
            }}
          />
        </div>
        <button
          onClick={giveItem}
          disabled={loading || !selectedPlayer}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184,115,51,0.3)',
            border: '1px solid rgba(184,115,51,0.3)',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading || !selectedPlayer ? 'not-allowed' : 'pointer',
            opacity: loading || !selectedPlayer ? 0.6 : 1
          }}
        >
          Give Item
        </button>
      </div>

      <div style={{ marginBottom: '1.5rem', padding: '1rem', background: 'rgba(184,115,51,0.05)', borderRadius: '0.5rem' }}>
        <h3 style={{ marginBottom: '0.75rem', fontSize: '1rem' }}>Teleport</h3>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
          <input
            type="number"
            placeholder="X"
            value={x}
            onChange={(e) => setX(e.target.value)}
            style={{
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem'
            }}
          />
          <input
            type="number"
            placeholder="Y"
            value={y}
            onChange={(e) => setY(e.target.value)}
            style={{
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem'
            }}
          />
          <input
            type="number"
            placeholder="Z"
            value={z}
            onChange={(e) => setZ(e.target.value)}
            style={{
              padding: '0.5rem',
              background: 'rgba(0,0,0,0.3)',
              border: '1px solid rgba(184,115,51,0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem'
            }}
          />
        </div>
        <button
          onClick={teleport}
          disabled={loading || !selectedPlayer}
          style={{
            width: '100%',
            padding: '0.5rem',
            background: 'rgba(184,115,51,0.3)',
            border: '1px solid rgba(184,115,51,0.3)',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading || !selectedPlayer ? 'not-allowed' : 'pointer',
            opacity: loading || !selectedPlayer ? 0.6 : 1
          }}
        >
          Teleport
        </button>
      </div>

      <button
        onClick={restart}
        disabled={loading}
        style={{
          width: '100%',
          padding: '0.75rem',
          background: 'rgba(153,101,21,0.4)',
          border: '1px solid rgba(184,115,51,0.3)',
          color: '#ff6b6b',
          borderRadius: '0.25rem',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.6 : 1,
          fontWeight: 'bold',
          marginBottom: '1rem'
        }}
      >
        ⚠️ Restart Server
      </button>

      {message && (
        <p style={{
          marginTop: '1rem',
          padding: '0.75rem',
          background: 'rgba(184,115,51,0.1)',
          borderRadius: '0.25rem',
          fontSize: '0.9rem',
          borderLeft: `3px solid ${message.startsWith('✓') ? '#22c55e' : '#ef4444'}`
        }}>
          {message}
        </p>
      )}
    </div>
  );
};
