/**
 * Mock data for dashboard components
 * Replace with real API calls in Phase 3
 */

export const mockGoalsData = [
  {
    id: 1,
    label: 'Q2 Objectives',
    completed: 5,
    total: 12,
    milestones: [
      { id: 1, name: 'Sprint 1 Complete', status: 'done' },
      { id: 2, name: 'API Integration', status: 'done' },
      { id: 3, name: 'Design Tokens Locked', status: 'done' },
      { id: 4, name: 'Frontend Build', status: 'in-progress' },
      { id: 5, name: 'Testing Suite', status: 'pending' },
    ],
  },
  {
    id: 2,
    label: 'Personal Growth',
    completed: 3,
    total: 8,
    milestones: [
      { id: 1, name: 'Morning Pages Daily', status: 'in-progress' },
      { id: 2, name: 'Read 2 Books', status: 'done' },
      { id: 3, name: 'Exercise 3x/week', status: 'in-progress' },
    ],
  },
  {
    id: 3,
    label: 'Infrastructure',
    completed: 2,
    total: 5,
    milestones: [
      { id: 1, name: 'Docker Optimization', status: 'done' },
      { id: 2, name: 'Database Migration', status: 'done' },
      { id: 3, name: 'CI/CD Pipeline', status: 'pending' },
    ],
  },
];

export const mockSportsData = [
  {
    id: 1,
    team: 'LAD',
    name: 'Los Angeles Dodgers',
    league: 'MLB',
    matchup: 'LAD vs NYY',
    score: '2-1',
    status: 'Final',
    icon: '⚾',
  },
  {
    id: 2,
    team: 'LAL',
    name: 'Los Angeles Lakers',
    league: 'NBA',
    matchup: 'LAL vs GSW',
    score: '108-102',
    status: 'Final',
    icon: '🏀',
  },
  {
    id: 3,
    team: 'LAK',
    name: 'Los Angeles Kings',
    league: 'NHL',
    matchup: 'LAK vs SJS',
    score: '4-3 (OT)',
    status: 'Final',
    icon: '🏒',
  },
  {
    id: 4,
    team: 'SF49ERS',
    name: 'San Francisco 49ers',
    league: 'NFL',
    matchup: 'SF49ERS vs SEA',
    score: 'TBD',
    status: 'Upcoming - 10/26',
    icon: '🏈',
  },
];

export const mockQuickInfo = {
  quote: 'Precision in thought, speed in execution.',
  weather: '75°F, Partly Cloudy',
  history: [
    'Morning Pages Done',
    'Shipped 3 tasks',
    'Updated Notion Database',
  ],
};

export const mockCarouselPlaceholders = [
  {
    id: 1,
    title: 'Quick Stats',
    description: 'Coming Soon',
  },
  {
    id: 2,
    title: 'Recent Activity',
    description: 'Coming Soon',
  },
  {
    id: 3,
    title: 'Upcoming Focus',
    description: 'Coming Soon',
  },
];
