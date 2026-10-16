// Spanish primary labels for the /ws nav destinations (Tōnatiuh OS shows
// Spanish with an English subtitle). Keyed by WS_NAV item id; the English
// label stays in lib/menuConfig.ts, which /hs and ClockGateMenu also read.
export const WS_NAV_ES: Record<string, string> = {
  'ws-dashboard': 'Tablero',
  'ws-goals': 'Metas',
  'ws-batools': 'Herramientas BA',
  'ws-work': 'Trabajo',
  'ws-jobsearch': 'Búsqueda de Empleo',
  'ws-tools': 'Herramientas',
};

// Extra Spanish (and English) words the OSHeader jump-search resolves to a /ws page.
export const WS_SEARCH_ALIASES: Record<string, string> = {
  home: '/ws/dashboard',
  inicio: '/ws/dashboard',
  tablero: '/ws/dashboard',
  panel: '/ws/dashboard',
  metas: '/ws/goals',
  objetivos: '/ws/goals',
  ba: '/ws/batools',
  'ba tools': '/ws/batools',
  'herramientas ba': '/ws/batools',
  trabajo: '/ws/work',
  tareas: '/ws/work',
  jobs: '/ws/jobsearch',
  'job search': '/ws/jobsearch',
  empleo: '/ws/jobsearch',
  'busqueda de empleo': '/ws/jobsearch',
  'búsqueda de empleo': '/ws/jobsearch',
  herramientas: '/ws/tools',
};

export function greetingEs(hour: number): { es: string; en: string } {
  if (hour < 12) return { es: 'Buenos Días', en: 'Good Morning' };
  if (hour < 18) return { es: 'Buenas Tardes', en: 'Good Afternoon' };
  return { es: 'Buenas Noches', en: 'Good Evening' };
}
