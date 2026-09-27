import { useEffect, useState } from 'react';
import Journal from './pages/Journal.jsx';
import Dashboard from './pages/Dashboard.jsx';
import PortfolioRisk from './pages/PortfolioRisk.jsx';
import Reports from './pages/Reports.jsx';
import Analytics from './pages/Analytics.jsx';
import Settings from './pages/Settings.jsx';
import Login from './pages/Login.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';
import { useTradeStore, useDerivedTrades } from './store/useTradeStore.js';
import { useAccountSettings } from './store/useAccountSettings.js';
import { computeDashboardStats } from './lib/calculations.js';
import { fmtMoney, fmtSignedMoney, plClass } from './lib/format.js';

const PAGES = { risk: 'Live Trade', journal: 'Journal', dashboard: 'Dashboard', reports: 'Reports', analytics: 'Analytics', settings: 'Settings' };

function pageFromHash() {
  const key = window.location.hash.replace('#', '');
  return PAGES[key] ? key : 'journal';
}

function getGreeting(now = new Date()) {
  const hour = now.getHours();
  if (hour < 12) return 'Good morning!';
  if (hour < 17) return 'Good afternoon!';
  return 'Good evening!';
}

function formatToday(now = new Date()) {
  return now.toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function App() {
  const [page, setPage] = useState(pageFromHash);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const [addTradeRequest, setAddTradeRequest] = useState(0);
  const fetchTrades = useTradeStore((s) => s.fetchTrades);
  const clearTrades = useTradeStore((s) => s.clearTrades);
  const tradesLoading = useTradeStore((s) => s.loading);
  const rawTrades = useTradeStore((s) => s.trades);
  const { startingCapital, loading: settingsLoading, error: settingsError, saveStartingCapital } = useAccountSettings(user?.id);
  const rows = useDerivedTrades(startingCapital);
  const stats = computeDashboardStats(rows);

  useEffect(() => {
    if (!isSupabaseConfigured) return undefined;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setAuthReady(true);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) fetchTrades();
    else clearTrades();
  }, [user?.id, fetchTrades, clearTrades]);

  useEffect(() => {
    const onHash = () => setPage(pageFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  function requestAddTrade() {
    if (window.location.hash !== '#journal') window.location.hash = 'journal';
    setPage('journal');
    setAddTradeRequest((request) => request + 1);
  }

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (!authReady) return <p className="auth-loading">Loading secure session...</p>;
  if (!user) return <Login />;

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a className="sidebar-brand" href="#dashboard" aria-label="Trading journal home">
          <span className="sidebar-brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none">
              <path d="M4 17.5 9 12l3.5 3.5L20 7" />
              <path d="M14.5 7H20v5.5" />
            </svg>
          </span>
          <span className="sidebar-brand-copy">
            <strong>Trading journal</strong>
            <small>Personal journal · INR</small>
          </span>
        </a>

        <nav className="sidebar-nav" aria-label="Main navigation">
          <section className="sidebar-nav-group">
            <h2>Overview</h2>
            <a href="#dashboard" className="sidebar-link" aria-current={page === 'dashboard' ? 'page' : undefined}>
              <span className="sidebar-icon" aria-hidden="true">▦</span>
              Dashboard
            </a>
          </section>
          <section className="sidebar-nav-group">
            <h2>Trading</h2>
            <a href="#risk" className="sidebar-link" aria-current={page === 'risk' ? 'page' : undefined}>
              <span className="sidebar-icon" aria-hidden="true">◉</span>
              Live Trade
            </a>
            <a href="#journal" className="sidebar-link" aria-current={page === 'journal' ? 'page' : undefined}>
              <span className="sidebar-icon" aria-hidden="true">▤</span>
              Journal
            </a>
          </section>
          <section className="sidebar-nav-group">
            <h2>Analysis</h2>
            <a href="#reports" className="sidebar-link" aria-current={page === 'reports' ? 'page' : undefined}><span className="sidebar-icon" aria-hidden="true">▥</span>Reports</a>
            <a href="#analytics" className="sidebar-link" aria-current={page === 'analytics' ? 'page' : undefined}><span className="sidebar-icon" aria-hidden="true">◌</span>Analytics</a>
          </section>
          <section className="sidebar-nav-group sidebar-nav-settings">
            <a href="#settings" className="sidebar-link" aria-current={page === 'settings' ? 'page' : undefined}><span className="sidebar-icon" aria-hidden="true">⚙</span>Settings</a>
          </section>
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-account">
            <span className="sidebar-account-dot" aria-hidden="true" />
            <span className="sidebar-account-email" title={user.email}>{user.email}</span>
            <button type="button" className="sidebar-sign-out" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
          <button type="button" className="sidebar-add-trade" onClick={requestAddTrade}>
            <span aria-hidden="true">+</span> Add trade
          </button>
        </div>
      </aside>

      <div className="workspace">
        <header className="workspace-header">
          <div>
            <h1>{getGreeting()}</h1>
            <p>{formatToday()}</p>
          </div>
          <span className="workspace-status"><i aria-hidden="true" /> Account active</span>
        </header>

        <main className="content">
          {settingsError && (
            <div className="form-error" role="alert">
              Could not load account settings. Apply <code>supabase/schema.sql</code> or the auth migration, then reload. ({settingsError})
            </div>
          )}
          {page === 'risk' && !settingsLoading && (
            <section className="account-summary" aria-label="Account summary">
              <dl className="ledger-strip">
                <div>
                  <CapitalControl startingCapital={startingCapital} onSave={saveStartingCapital} />
                  <dd>{fmtMoney(stats.latestCapital ?? startingCapital)}</dd>
                </div>
                <div>
                  <dt>Net P/L, closed</dt>
                  <dd className={plClass(stats.totalNetPL)}>{fmtSignedMoney(stats.totalNetPL)}</dd>
                </div>
              </dl>
            </section>
          )}
          {settingsLoading ? (
            <p className="empty">Loading account...</p>
          ) : page === 'journal' ? (
            <Journal startingCapital={startingCapital} addTradeRequest={addTradeRequest} />
          ) : page === 'risk' ? (
            <PortfolioRisk rows={rows} capital={stats.latestCapital ?? startingCapital} loading={tradesLoading} />
          ) : page === 'reports' ? (
            <Reports rows={rows} />
          ) : page === 'analytics' ? (
            <Analytics rows={rows} startingCapital={startingCapital} />
          ) : page === 'settings' ? (
            <Settings startingCapital={startingCapital} onSave={saveStartingCapital} user={user} trades={rawTrades} />
          ) : (
            <Dashboard startingCapital={startingCapital} />
          )}
        </main>
      </div>
    </div>
  );
}

function CapitalControl({ startingCapital, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(startingCapital));
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await onSave(value);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <>
      <dt>
        Capital
        <button
          type="button"
          className="capital-edit"
          onClick={() => { setValue(String(startingCapital)); setEditing(!editing); }}
        >
          Edit base
        </button>
      </dt>
      {editing && (
        <form className="capital-editor" onSubmit={save}>
          <input aria-label="Starting capital" type="number" step="any" required value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="submit" className="btn primary">Save</button>
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
    </>
  );
}

function SetupNotice() {
  return (
    <section className="notice">
      <h2>Connect Supabase to start</h2>
      <p>
        Add your Supabase project URL and publishable/anon key to <code>.env</code>, run <code>supabase/schema.sql</code> in the SQL editor, then restart <code>npm run dev</code>.
      </p>
    </section>
  );
}
