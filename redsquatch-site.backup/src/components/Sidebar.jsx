import { useState, useEffect } from 'react';
import { getCacheWithTTL, setCacheWithTTL, CACHE_KEYS, TTL } from '../utils/cacheUtils';
import { mockGoalsData, mockSportsData } from '../data/mockData';

const Sidebar = () => {
  const [goalsData, setGoalsData] = useState([]);
  const [sportsData, setSportsData] = useState([]);
  const [expandedSections, setExpandedSections] = useState({
    dashboard: true,
    goals: true,
    sports: true,
    tools: false,
  });

  useEffect(() => {
    // Load Goals
    setGoalsData(mockGoalsData);

    // Load Sports with cache
    const cachedSports = getCacheWithTTL(CACHE_KEYS.SPORTS_DATA);
    if (cachedSports) {
      setSportsData(cachedSports);
    } else {
      setSportsData(mockSportsData);
      setCacheWithTTL(CACHE_KEYS.SPORTS_DATA, mockSportsData, TTL.SPORTS);
    }
  }, []);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  const toolLinks = [
    { id: 'n8n', label: 'n8n Workflows', icon: '⚙️', href: '#' },
    { id: 'bookstack', label: 'BookStack', icon: '📚', href: '#' },
    { id: 'huginn', label: 'Huginn', icon: '🔄', href: '#' },
    { id: 'intake', label: 'Intake Form', icon: '📋', href: '#' },
  ];

  return (
    <aside className="rs-sidebar">
      {/* Dashboard Section */}
      <div className="rs-sidebar-section">
        <div
          className="rs-sidebar-header"
          onClick={() => toggleSection('dashboard')}
        >
          <h2 className="rs-sidebar-title">Dashboard</h2>
          <div className="rs-sidebar-toggle">
            {expandedSections.dashboard ? '▼' : '▶'}
          </div>
        </div>
        <div className={`rs-sidebar-content ${!expandedSections.dashboard ? 'collapsed' : ''}`}>
          <div className="rs-nav-item">Overview</div>
          <div className="rs-nav-item">Quick Stats</div>
        </div>
      </div>

      {/* Goals Tracker Section */}
      <div className="rs-sidebar-section">
        <div
          className="rs-sidebar-header"
          onClick={() => toggleSection('goals')}
        >
          <h2 className="rs-sidebar-title">Goals & Progress</h2>
          <div className="rs-sidebar-toggle">
            {expandedSections.goals ? '▼' : '▶'}
          </div>
        </div>

        <div className={`rs-sidebar-content ${!expandedSections.goals ? 'collapsed' : ''}`}>
          {goalsData.map(goal => {
            const percentage = (goal.completed / goal.total) * 100;
            return (
              <div key={goal.id} className="rs-goal-item">
                <div className="rs-goal-label">
                  {goal.label}
                  <br />
                  <span style={{ fontSize: '11px', opacity: 0.7 }}>
                    {goal.completed}/{goal.total} complete
                  </span>
                </div>
                <div className="rs-goal-progress-bar">
                  <div
                    className="rs-goal-progress-fill"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Sports Hub Section */}
      <div className="rs-sidebar-section">
        <div
          className="rs-sidebar-header"
          onClick={() => toggleSection('sports')}
        >
          <h2 className="rs-sidebar-title">Sports Hub</h2>
          <div className="rs-sidebar-toggle">
            {expandedSections.sports ? '▼' : '▶'}
          </div>
        </div>

        <div className={`rs-sidebar-content ${!expandedSections.sports ? 'collapsed' : ''}`}>
          {sportsData.map(sport => (
            <div key={sport.id} className="rs-sport-card">
              <div className="rs-sport-matchup">
                <span className="rs-sport-icon">{sport.icon}</span>
                {sport.matchup}
              </div>
              <div className="rs-sport-score">
                {sport.score} · {sport.status}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tools Section */}
      <div className="rs-sidebar-section">
        <div
          className="rs-sidebar-header"
          onClick={() => toggleSection('tools')}
        >
          <h2 className="rs-sidebar-title">Tools</h2>
          <div className="rs-sidebar-toggle">
            {expandedSections.tools ? '▼' : '▶'}
          </div>
        </div>

        <div className={`rs-sidebar-content ${!expandedSections.tools ? 'collapsed' : ''}`}>
          {toolLinks.map(tool => (
            <a
              key={tool.id}
              href={tool.href}
              className="rs-tool-link"
              title={tool.label}
            >
              <span className="rs-tool-icon">{tool.icon}</span>
              <span className="rs-tool-label">{tool.label}</span>
            </a>
          ))}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
