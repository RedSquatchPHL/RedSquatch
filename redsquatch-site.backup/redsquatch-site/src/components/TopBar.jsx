import { useState, useEffect } from 'react';

const TopBar = ({ user, onLogout, onMenuSelect, activeView }) => {
  const [quickInfo, setQuickInfo] = useState({
    quote: 'Loading...',
    weather: 'Loading...',
    history: ['Loading...'],
  });
  const [openDropdown, setOpenDropdown] = useState(null);

  useEffect(() => {
    const fetchQuickInfo = async () => {
      try {
        const res = await fetch('http://67.217.62.213:3001/api/client/quick-info', {
          credentials: 'include',
        });
        if (res.ok) {
          const data = await res.json();
          setQuickInfo(data);
        }
      } catch (err) {
        console.error('Quick info fetch error:', err);
      }
    };

    fetchQuickInfo();
  }, []);

  const menuItems = {
    dashboard: [
      { id: 'overview', label: 'Overview' },
      { id: 'quick-stats', label: 'Quick Stats' },
    ],
    goals: [
      { id: 'active-goals', label: 'Active Goals' },
      { id: 'milestones', label: 'Milestones' },
      { id: 'completed', label: 'Completed' },
    ],
    sports: [
      { id: 'lad', label: 'LAD' },
      { id: 'lal', label: 'LAL' },
      { id: 'lak', label: 'LAK' },
      { id: 'sf49ers', label: 'SF 49ERS' },
    ],
    tools: [
      { id: 'n8n', label: 'n8n Workflows', href: 'http://67.217.62.213:5678' },
      { id: 'trilium', label: 'Trilium Notes', href: 'http://67.217.62.213:8080' },
      { id: 'vikunja', label: 'Vikunja Tasks', href: 'http://67.217.62.213:3456' },
      { id: 'huginn', label: 'Huginn', href: 'http://67.217.62.213:3000' },
    ],
  };

  const handleMenuClick = (menuId, itemId, href) => {
    if (href) {
      window.open(href, '_blank');
    } else {
      onMenuSelect(itemId);
      setOpenDropdown(null);
    }
  };

  return (
    <header className="rs-topbar-new">
      {/* Left: Logo, Title, Dropdowns */}
      <div className="rs-topbar-left">
        <div className="rs-topbar-branding">
          <img src="/RS1_logo.png" alt="RedSquatch" className="rs-topbar-logo" />
          <h1 className="rs-topbar-title">Command Center</h1>
        </div>

        <nav className="rs-topbar-nav">
          {/* Dashboard Dropdown */}
          <div className="rs-dropdown">
            <button
              className="rs-dropdown-trigger"
              onClick={() => setOpenDropdown(openDropdown === 'dashboard' ? null : 'dashboard')}
            >
              Dashboard <span className="rs-dropdown-arrow">▼</span>
            </button>
            {openDropdown === 'dashboard' && (
              <div className="rs-dropdown-menu">
                {menuItems.dashboard.map(item => (
                  <button
                    key={item.id}
                    className={`rs-dropdown-item ${activeView === item.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick('dashboard', item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Goals Dropdown */}
          <div className="rs-dropdown">
            <button
              className="rs-dropdown-trigger"
              onClick={() => setOpenDropdown(openDropdown === 'goals' ? null : 'goals')}
            >
              Goals <span className="rs-dropdown-arrow">▼</span>
            </button>
            {openDropdown === 'goals' && (
              <div className="rs-dropdown-menu">
                {menuItems.goals.map(item => (
                  <button
                    key={item.id}
                    className={`rs-dropdown-item ${activeView === item.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick('goals', item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Sports Dropdown */}
          <div className="rs-dropdown">
            <button
              className="rs-dropdown-trigger"
              onClick={() => setOpenDropdown(openDropdown === 'sports' ? null : 'sports')}
            >
              Sports <span className="rs-dropdown-arrow">▼</span>
            </button>
            {openDropdown === 'sports' && (
              <div className="rs-dropdown-menu">
                {menuItems.sports.map(item => (
                  <button
                    key={item.id}
                    className={`rs-dropdown-item ${activeView === item.id ? 'active' : ''}`}
                    onClick={() => handleMenuClick('sports', item.id)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tools Dropdown */}
          <div className="rs-dropdown">
            <button
              className="rs-dropdown-trigger"
              onClick={() => setOpenDropdown(openDropdown === 'tools' ? null : 'tools')}
            >
              Tools <span className="rs-dropdown-arrow">▼</span>
            </button>
            {openDropdown === 'tools' && (
              <div className="rs-dropdown-menu">
                {menuItems.tools.map(item => (
                  <button
                    key={item.id}
                    className="rs-dropdown-item"
                    onClick={() => handleMenuClick('tools', item.id, item.href)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </nav>
      </div>

      {/* Right: Quick Info Widgets */}
      <div className="rs-topbar-right">
        <div className="rs-quick-info-compact">
          <div className="rs-quick-info-item">
            <span className="rs-quick-info-label">Quote</span>
            <span className="rs-quick-info-value">{quickInfo.quote || 'Loading...'}</span>
          </div>
          <div className="rs-quick-info-item">
            <span className="rs-quick-info-label">Weather</span>
            <span className="rs-quick-info-value">{quickInfo.weather || 'Loading...'}</span>
          </div>
          <div className="rs-quick-info-item">
            <span className="rs-quick-info-label">Recent</span>
            <span className="rs-quick-info-value">
              {quickInfo.history && quickInfo.history[0] ? quickInfo.history[0] : 'Loading...'}
            </span>
          </div>
        </div>

        <div className="rs-user-controls">
          <span className="rs-user-name">{user?.username || 'User'}</span>
          <button className="rs-logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </div>
    </header>
  );
};

export default TopBar;
