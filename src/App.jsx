import { useEffect, useState } from 'react';
import Journal from './pages/Journal.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Login from './pages/Login.jsx';
import { isSupabaseConfigured, supabase } from './lib/supabaseClient.js';
import { useTradeStore } from './store/useTradeStore.js';
import { useAccountSettings } from './store/useAccountSettings.js';

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
  const { startingCapital, loading: settingsLoading, error: settingsError } = useAccountSettings(user?.id);

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
            <a href="#journal" className="brand-link" aria-label="Trading journal home">
              <span className="brand-mark" aria-hidden="true">T</span>
              <h1>Trading journal</h1>
            </a>
            <nav className="tabs" aria-label="Views">
              {Object.entries(PAGES).map(([key, label]) => (
                <a key={key} href={`#${key}`} className="tab" aria-current={page === key ? 'page' : undefined}>
                  {label}
                </a>
              ))}
            </nav>
          </div>

          <div className="account-menu">
            <span className="account-email">{user.email}</span>
            <span className="account-avatar" aria-hidden="true">{(user.email || 'T').slice(0, 1).toUpperCase()}</span>
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
        {settingsLoading ? <p className="empty">Loading account…</p> : page === 'journal' ? <Journal startingCapital={startingCapital} /> : <Dashboard startingCapital={startingCapital} />}
      </main>
    </div>
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

