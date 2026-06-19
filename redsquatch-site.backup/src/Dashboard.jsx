import { useState, useEffect } from 'react';
import TopBar from './components/TopBar';
import CenterPane from './components/CenterPane';
import './Dashboard.css';

function Dashboard() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [user, setUser] = useState(null);
  const [activeView, setActiveView] = useState('overview');

  // Check if already logged in on mount
  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
        setIsLoggedIn(true);
      } catch (e) {
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('http://67.217.62.213:3001/api/client/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
        credentials: 'include'
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || 'Login failed');
        return;
      }

      const data = await res.json();
      console.log('Login successful:', data);
      
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);
      setIsLoggedIn(true);
      setUsername('');
      setPassword('');
      setActiveView('overview');

    } catch (err) {
      console.error('Login error:', err);
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await fetch('http://67.217.62.213:3001/api/client/logout', {
        method: 'POST',
        credentials: 'include',
      });
    } catch (err) {
      console.error('Logout error:', err);
    }
    localStorage.removeItem('user');
    setUser(null);
    setIsLoggedIn(false);
    setUsername('');
    setPassword('');
    setError('');
    setActiveView('overview');
  };

  // ========================================
  // DASHBOARD VIEW (after login)
  // ========================================
  if (isLoggedIn && user) {
    return (
      <div className="rs-dashboard-container">
        {/* Top Nav with Dropdowns */}
        <TopBar 
          user={user} 
          onLogout={handleLogout}
          onMenuSelect={setActiveView}
          activeView={activeView}
        />

        {/* Main Content Area - No Sidebar */}
        <main className="rs-dashboard-main-full">
          <CenterPane activeView={activeView} />
        </main>
      </div>
    );
  }

  // ========================================
  // LOGIN VIEW (default)
  // ========================================
  return (
    <div className="rs-login-container">
      <div className="rs-login-card">
        <h1 className="rs-login-title">RedSquatch</h1>
        <p className="rs-login-subtitle">Command Center</p>

        <form onSubmit={handleLogin}>
          <div className="rs-form-group">
            <label htmlFor="username">Username</label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="Enter username"
              disabled={loading}
            />
          </div>

          <div className="rs-form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter password"
              disabled={loading}
            />
          </div>

          {error && <div className="rs-error-message">{error}</div>}

          <button 
            type="submit" 
            className="rs-login-btn"
            disabled={loading}
          >
            {loading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    </div>
  );
}

export default Dashboard;
