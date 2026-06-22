'use client';
import { useState } from 'react';
import type { World } from './WorldsPanel';

interface CreateWorldModalProps {
  slot: 'active' | 'inactive_1' | 'inactive_2';
  currentWorld: World | undefined;
  onCreate: (worldName: string, seed: string) => void;
  onClose: () => void;
  loading: boolean;
}

export const CreateWorldModal = ({
  slot,
  currentWorld,
  onCreate,
  onClose,
  loading
}: CreateWorldModalProps) => {
  const [worldName, setWorldName] = useState('');
  const [seed, setSeed] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [seedError, setSeedError] = useState('');

  const slotLabels: Record<string, string> = {
    active: 'Active (Live)',
    inactive_1: 'Inactive Slot 1',
    inactive_2: 'Inactive Slot 2'
  };

  const validateSeed = (s: string) => {
    if (!s) {
      setSeedError('');
      return true;
    }
    if (!/^-?\d+$/.test(s) && !/^[a-zA-Z0-9_\-]{1,50}$/.test(s)) {
      setSeedError('Seed must be alphanumeric, underscore, or minus sign (up to 50 chars)');
      return false;
    }
    setSeedError('');
    return true;
  };

  const handleCreate = () => {
    if (!worldName.trim()) {
      setSeedError('World name is required');
      return;
    }
    if (!validateSeed(seed)) {
      return;
    }
    if (!confirmed) {
      setSeedError('Please confirm the creation');
      return;
    }
    onCreate(worldName, seed);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.7)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000
      }}
      onClick={onClose}
    >
      <div
        style={{
          padding: '2rem',
          background: 'rgba(30, 20, 10, 0.95)',
          border: '1px solid rgba(184, 115, 51, 0.5)',
          borderRadius: '0.5rem',
          maxWidth: '500px',
          width: '90%',
          color: '#d4a373'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h2 style={{ marginBottom: '1.5rem', fontSize: '1.3rem' }}>Create New World</h2>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Slot: {slotLabels[slot]}
          </label>
        </div>

        <div style={{ marginBottom: '1rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            World Name
          </label>
          <input
            type="text"
            value={worldName}
            onChange={(e) => setWorldName(e.target.value)}
            placeholder="e.g., Survival World, Creative Build"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: '1px solid rgba(184, 115, 51, 0.3)',
              color: '#d4a373',
              borderRadius: '0.25rem',
              boxSizing: 'border-box',
              opacity: loading ? 0.6 : 1
            }}
          />
        </div>

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            Seed (optional)
          </label>
          <input
            type="text"
            value={seed}
            onChange={(e) => {
              setSeed(e.target.value);
              validateSeed(e.target.value);
            }}
            placeholder="Numeric or alphanumeric seed"
            disabled={loading}
            style={{
              width: '100%',
              padding: '0.75rem',
              background: 'rgba(0, 0, 0, 0.3)',
              border: `1px solid rgba(${seedError ? '200, 100, 100' : '184, 115, 51'}, 0.3)`,
              color: seedError ? '#ff9999' : '#d4a373',
              borderRadius: '0.25rem',
              boxSizing: 'border-box',
              opacity: loading ? 0.6 : 1
            }}
          />
          {seedError && (
            <p style={{ fontSize: '0.8rem', color: '#ff9999', marginTop: '0.25rem' }}>
              {seedError}
            </p>
          )}
          <p style={{ fontSize: '0.75rem', opacity: 0.6, marginTop: '0.5rem' }}>
            Leave empty for random seed
          </p>
        </div>

        {currentWorld?.world_name && (
          <div style={{
            marginBottom: '1.5rem',
            padding: '1rem',
            background: 'rgba(200, 100, 100, 0.1)',
            border: '1px solid rgba(200, 100, 100, 0.3)',
            borderRadius: '0.25rem',
            color: '#ffcc99'
          }}>
            <strong>⚠️ Warning:</strong> Creating a new world will overwrite <strong>{currentWorld.world_name}</strong>
            {currentWorld.last_backup_date && (
              <>
                <br />Last backup: {new Date(currentWorld.last_backup_date).toLocaleDateString()}
              </>
            )}
          </div>
        )}

        <div style={{ marginBottom: '1.5rem' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              disabled={loading}
              style={{ cursor: 'pointer' }}
            />
            <span style={{ fontSize: '0.9rem' }}>Create & Backup Current</span>
          </label>
        </div>

        <div style={{ display: 'flex', gap: '1rem' }}>
          <button
            onClick={handleCreate}
            disabled={loading || !confirmed}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              background: 'rgba(100, 150, 100, 0.2)',
              border: '1px solid rgba(100, 150, 100, 0.3)',
              color: '#99dd99',
              borderRadius: '0.25rem',
              cursor: loading || !confirmed ? 'not-allowed' : 'pointer',
              opacity: loading || !confirmed ? 0.6 : 1,
              fontSize: '0.95rem',
              fontWeight: 'bold'
            }}
          >
            {loading ? 'Creating...' : 'Create World'}
          </button>
          <button
            onClick={onClose}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.75rem 1.5rem',
              background: 'rgba(100, 100, 100, 0.2)',
              border: '1px solid rgba(100, 100, 100, 0.3)',
              color: '#999999',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.95rem'
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};
