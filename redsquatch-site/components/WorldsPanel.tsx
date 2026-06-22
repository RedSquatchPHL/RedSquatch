'use client';
import { useState, useEffect } from 'react';
import { CreateWorldModal } from './CreateWorldModal';
import { SwitchWorldModal } from './SwitchWorldModal';

export interface World {
  id: number;
  slot: 'active' | 'inactive_1' | 'inactive_2';
  world_name: string | null;
  seed: string | null;
  last_backup_date: string | null;
  size_mb: number;
}

export const WorldsPanel = () => {
  const [worlds, setWorlds] = useState<World[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showSwitchModal, setShowSwitchModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<'active' | 'inactive_1' | 'inactive_2' | null>(null);
  const [targetSlot, setTargetSlot] = useState<'active' | 'inactive_1' | 'inactive_2' | null>(null);
  const [switching, setSwitching] = useState(false);

  useEffect(() => {
    fetchWorlds();
    const interval = setInterval(fetchWorlds, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchWorlds = async () => {
    try {
      const res = await fetch('/api/client/rcon/worlds');
      const data = await res.json();
      if (data.success && data.worlds) {
        setWorlds(data.worlds);
        setError('');
      }
    } catch (err) {
      console.error('Error fetching worlds:', err);
      setError('Failed to fetch worlds');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateWorld = async (slotName: string, worldName: string, seed: string) => {
    setLoading(true);
    try {
      const res = await fetch('/api/client/rcon/worlds/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot: slotName,
          world_name: worldName,
          seed: seed || null
        })
      });
      const data = await res.json();
      if (data.success) {
        setShowCreateModal(false);
        await fetchWorlds();
      } else {
        setError(`Failed to create world: ${data.error}`);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSwitchWorld = async (fromSlot: string, toSlot: string) => {
    setSwitching(true);
    try {
      const res = await fetch('/api/client/rcon/worlds/switch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ from_slot: fromSlot, to_slot: toSlot })
      });
      const data = await res.json();
      if (data.success) {
        setShowSwitchModal(false);
        await fetchWorlds();
      } else {
        setError(`Failed to switch worlds: ${data.error}`);
      }
    } catch (err) {
      setError(`Error: ${err}`);
    } finally {
      setSwitching(false);
    }
  };

  const activeWorld = worlds.find(w => w.slot === 'active');
  const inactiveWorlds = worlds.filter(w => w.slot !== 'active');

  const slotLabels: Record<string, string> = {
    active: 'Active (Live)',
    inactive_1: 'Inactive Slot 1',
    inactive_2: 'Inactive Slot 2'
  };

  return (
    <div style={{ padding: '1.5rem', color: '#d4a373', maxWidth: '1200px' }}>
      <h2 style={{ marginBottom: '0.5rem', fontSize: '1.5rem' }}>⛏️ Minecraft Worlds</h2>

      {activeWorld?.world_name && (
        <p style={{ marginBottom: '1.5rem', fontSize: '0.9rem', opacity: 0.8 }}>
          Active World: <strong>{activeWorld.world_name}</strong>
          {activeWorld.seed && ` | Seed: ${activeWorld.seed}`}
        </p>
      )}

      {error && (
        <div style={{
          marginBottom: '1rem',
          padding: '0.75rem',
          background: 'rgba(200, 100, 100, 0.2)',
          border: '1px solid rgba(200, 100, 100, 0.5)',
          borderRadius: '0.25rem',
          color: '#ff9999'
        }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ opacity: 0.6 }}>Loading worlds...</div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {worlds.map((world) => (
            <WorldCard
              key={world.slot}
              world={world}
              label={slotLabels[world.slot]}
              isActive={world.slot === 'active'}
              onCreateClick={() => {
                setSelectedSlot(world.slot as any);
                setShowCreateModal(true);
              }}
              onSwitchClick={() => {
                setTargetSlot(world.slot as any);
                setShowSwitchModal(true);
              }}
              loading={loading}
            />
          ))}
        </div>
      )}

      {showCreateModal && selectedSlot && (
        <CreateWorldModal
          slot={selectedSlot}
          currentWorld={worlds.find(w => w.slot === selectedSlot)}
          onCreate={(worldName, seed) => handleCreateWorld(selectedSlot, worldName, seed)}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedSlot(null);
          }}
          loading={loading}
        />
      )}

      {showSwitchModal && activeWorld && targetSlot && targetSlot !== 'active' && (
        <SwitchWorldModal
          fromWorld={activeWorld}
          toWorld={worlds.find(w => w.slot === targetSlot)!}
          onSwitch={() => handleSwitchWorld(activeWorld.slot, targetSlot)}
          onClose={() => {
            setShowSwitchModal(false);
            setTargetSlot(null);
          }}
          switching={switching}
        />
      )}
    </div>
  );
};

interface WorldCardProps {
  world: World;
  label: string;
  isActive: boolean;
  onCreateClick: () => void;
  onSwitchClick: () => void;
  loading: boolean;
}

const WorldCard = ({
  world,
  label,
  isActive,
  onCreateClick,
  onSwitchClick,
  loading
}: WorldCardProps) => {
  const formatDate = (date: string | null) => {
    if (!date) return 'Never';
    return new Date(date).toLocaleDateString();
  };

  return (
    <div
      style={{
        padding: '1.5rem',
        background: isActive ? 'rgba(184, 115, 51, 0.1)' : 'rgba(184, 115, 51, 0.05)',
        border: `1px solid rgba(184, 115, 51, ${isActive ? 0.5 : 0.2})`,
        borderRadius: '0.5rem'
      }}
    >
      <div style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '0.25rem', fontSize: '1rem' }}>
          {isActive ? '🟢' : '⚪'} {label}
        </h3>
        {world.world_name ? (
          <>
            <p style={{ fontSize: '0.9rem', margin: '0.25rem 0' }}>
              <strong>{world.world_name}</strong>
            </p>
            {world.seed && (
              <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.25rem 0' }}>
                Seed: {world.seed}
              </p>
            )}
            <p style={{ fontSize: '0.85rem', opacity: 0.7, margin: '0.5rem 0 0 0' }}>
              Backup: {formatDate(world.last_backup_date)}
              {world.size_mb > 0 && ` | ${world.size_mb} MB`}
            </p>
          </>
        ) : (
          <p style={{ fontSize: '0.9rem', opacity: 0.5, fontStyle: 'italic' }}>Empty slot</p>
        )}
      </div>

      <div style={{ display: 'flex', gap: '0.75rem' }}>
        {world.world_name && !isActive && (
          <button
            onClick={onSwitchClick}
            disabled={loading}
            style={{
              flex: 1,
              padding: '0.5rem 1rem',
              background: 'rgba(100, 150, 100, 0.2)',
              border: '1px solid rgba(100, 150, 100, 0.3)',
              color: '#99dd99',
              borderRadius: '0.25rem',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.6 : 1,
              fontSize: '0.9rem'
            }}
          >
            Switch To
          </button>
        )}
        <button
          onClick={onCreateClick}
          disabled={loading}
          style={{
            flex: 1,
            padding: '0.5rem 1rem',
            background: 'rgba(184, 115, 51, 0.2)',
            border: '1px solid rgba(184, 115, 51, 0.3)',
            color: '#d4a373',
            borderRadius: '0.25rem',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.6 : 1,
            fontSize: '0.9rem'
          }}
        >
          {world.world_name ? 'Replace' : 'Create'}
        </button>
      </div>
    </div>
  );
};
