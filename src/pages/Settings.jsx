import { useState } from 'react';
import { fmtMoney } from '../lib/format.js';

export default function Settings({ startingCapital, onSave, user, trades }) {
  const [capital, setCapital] = useState(String(startingCapital ?? ''));
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  async function save(event) {
    event.preventDefault(); setError(''); setMessage(''); setSaving(true);
    try { await onSave(capital); setMessage('Starting capital updated.'); }
    catch (err) { setError(err.message || 'Could not save account settings.'); }
    finally { setSaving(false); }
  }
  function exportJson() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), account: user?.email, trades }, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a');
    link.href = url; link.download = 'trading-journal-export.json'; link.click(); URL.revokeObjectURL(url);
  }
  return <div className="page">
    <div className="page-head"><div><h2>Settings</h2><p className="page-note">Account, capital, and data export.</p></div></div>
    <div className="settings-grid">
      <section className="panel settings-card"><h3>Account</h3><p className="settings-description">Signed in securely with Supabase.</p><dl className="settings-account"><div><dt>Email</dt><dd>{user?.email || '—'}</dd></div><div><dt>Trade records</dt><dd>{trades.length}</dd></div></dl></section>
      <section className="panel settings-card"><h3>Starting capital</h3><p className="settings-description">This is your account’s base. Realized P/L and adjustments update the running capital.</p><form className="settings-capital-form" onSubmit={save}><label className="field"><span>Base capital (₹)</span><input type="number" min="0" step="any" required value={capital} onChange={(e)=>setCapital(e.target.value)} /></label><button type="submit" className="btn primary" disabled={saving}>{saving?'Saving…':'Save capital'}</button></form><p className="settings-current">Current base: <strong>{fmtMoney(startingCapital)}</strong></p>{message&&<p className="settings-success" role="status">{message}</p>}{error&&<p className="field-error" role="alert">{error}</p>}</section>
      <section className="panel settings-card"><h3>Data management</h3><p className="settings-description">Download a copy of the trades stored in your account.</p><button type="button" className="btn ghost" onClick={exportJson}>Export trades as JSON</button></section>
      <section className="panel settings-card"><h3>Session</h3><p className="settings-description">Your trade records are scoped to your signed-in account.</p><span className="workspace-status"><i aria-hidden="true" /> Supabase connected</span></section>
    </div>
  </div>;
}
