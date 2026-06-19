'use client';
import { Sun, Moon, Cpu } from 'lucide-react';
import { useTheme, type ThemeMode } from './ThemeContext';

const OPTIONS: { key: ThemeMode; Icon: React.ElementType; label: string }[] = [
  { key: 'auto',  Icon: Cpu,  label: 'Auto'  },
  { key: 'day',   Icon: Sun,  label: 'Day'   },
  { key: 'night', Icon: Moon, label: 'Night' },
];

export default function ThemeToggle() {
  const { mode, active, setMode } = useTheme();

  return (
    <div
      title={mode === 'auto' ? `Auto — currently ${active}` : undefined}
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(8,8,8,0.55)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(184,115,51,0.22)',
        borderRadius: 10,
        padding: 3,
        gap: 2,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      }}
    >
      {OPTIONS.map(({ key, Icon, label }) => {
        const isActive = mode === key;
        return (
          <button
            key={key}
            onClick={() => setMode(key)}
            title={label}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              padding: '4px 9px',
              borderRadius: 7,
              fontSize: 11,
              fontWeight: 500,
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              background: isActive ? 'rgba(184,115,51,0.22)' : 'transparent',
              color: isActive ? '#d4a373' : 'rgba(255,255,255,0.38)',
              boxShadow: isActive
                ? '0 0 10px rgba(184,115,51,0.14), inset 0 1px 0 rgba(255,255,255,0.06)'
                : 'none',
            }}
          >
            <Icon style={{ width: 11, height: 11, flexShrink: 0 }} />
            {label}
          </button>
        );
      })}
    </div>
  );
}
