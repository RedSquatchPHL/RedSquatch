'use client';

export type AppContext = 'work' | 'home' | 'personal';

const CONTEXTS: { value: AppContext; label: string; icon: string }[] = [
  { value: 'work',     label: 'Work',     icon: '💼' },
  { value: 'home',     label: 'Home',     icon: '🏠' },
  { value: 'personal', label: 'Personal', icon: '⚡' },
];

interface Props {
  value: AppContext;
  onChange: (ctx: AppContext) => void;
}

export function ContextSwitcher({ value, onChange }: Props) {
  return (
    <div className="glass-tabs flex items-center gap-1 p-1 rounded-xl">
      {CONTEXTS.map((ctx) => (
        <button
          key={ctx.value}
          onClick={() => onChange(ctx.value)}
          className={[
            'flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200',
            value === ctx.value ? 'ctx-btn-active' : 'ctx-btn-inactive',
          ].join(' ')}
        >
          <span className="text-xs">{ctx.icon}</span>
          <span>{ctx.label}</span>
        </button>
      ))}
    </div>
  );
}
