import { useEffect, useState } from 'react';
import Journal from './pages/Journal.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';
import { useTradeStore, useDerivedTrades } from './store/useTradeStore.js';
import { useAccountSettings } from './store/useAccountSettings.js';
import { computeDashboardStats } from './lib/calculations.js';
import { fmtMoney, fmtSignedMoney, plClass } from './lib/format.js';

const PAGES = { journal: 'Journal', dashboard: 'Dashboard' };

function pageFromHash() {
  const key = window.location.hash.replace('#', '');
  return PAGES[key] ? key : 'journal';
}

export default function App() {
  const [page, setPage] = useState(pageFromHash);
  const [user, setUser] = useState(null);
  const [authReady, setAuthReady] = useState(false);
  const fetchTrades = useTradeStore((s) => s.fetchTrades);
  const clearTrades = useTradeStore((s) => s.clearTrades);
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

  if (!isSupabaseConfigured) return <SetupNotice />;
  if (!authReady) return <p className="auth-loading">Loading secure sessionâ€¦</p>;
  if (!user) return <Login />;

  return (
    <div className="app">
      <header className="masthead">
        <div className="masthead-inner">
          <div className="brand">
            <h1>Trading journal</h1>
            <nav className="tabs" aria-label="Views">
              {Object.entries(PAGES).map(([key, label]) => (
                <a key={key} href={`#${key}`} className="tab" aria-current={page === key ? 'page' : undefined}>
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <dl className="ledger-strip">
            <div>
              <CapitalControl startingCapital={startingCapital} onSave={saveStartingCapital} />
              <dd>{fmtMoney(stats.latestCapital ?? startingCapital)}</dd>
            </div>
            <div>
              <dt>Realised P/L</dt>
              <dd className={plClass(stats.totalNetPL)}>{fmtSignedMoney(stats.totalNetPL)}</dd>
            </div>
            <div>
              <dt>Unrealised P/L</dt>
              <dd className={plClass(stats.unrealizedPL)}>{fmtSignedMoney(stats.unrealizedPL)}</dd>
            </div>
          </dl>
          <div className="account-menu">
            <span>{user.email}</span>
            <button type="button" className="btn ghost sign-out" onClick={() => supabase.auth.signOut()}>
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="content">
        {settingsError && (
          <div className="form-error" role="alert">
            Could not load account settings. Apply <code>supabase/schema.sql</code> or the auth migration, then reload. ({settingsError})
          </div>
        )}
        {settingsLoading ? <p className="empty">Loading accountâ€¦</p> : page === 'journal' ? <Journal startingCapital={startingCapital} /> : <Dashboard startingCapital={startingCapital} />}
      </main>
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
      <dt>Capital <button type="button" className="capital-edit" onClick={() => { setValue(String(startingCapital)); setEditing(!editing); }}>Edit base</button></dt>
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

