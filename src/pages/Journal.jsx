import { useMemo, useState } from 'react';
import TradeForm from '../components/TradeForm.jsx';
import TradeTable from '../components/TradeTable.jsx';
import { useTradeStore, useDerivedTrades } from '../store/useTradeStore.js';
import { isOpenPosition } from '../lib/calculations.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

export default function Journal() {
  const { loading, error, addTrade, updateTrade, deleteTrade, fetchTrades } = useTradeStore();
  const rows = useDerivedTrades();

  // null = form hidden, 'new' = adding, otherwise the trade being edited
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');

  // Capital is computed oldest-first; the journal shows newest first.
  const visible = useMemo(() => {
    const newestFirst = [...rows].reverse();
    if (filter === 'open') return newestFirst.filter(isOpenPosition);
    if (filter === 'closed') return newestFirst.filter((r) => !isOpenPosition(r));
    return newestFirst;
  }, [rows, filter]);

  async function handleSave(form) {
    if (editing === 'new') await addTrade(form);
    else await updateTrade(editing.id, form);
    setEditing(null);
  }

  async function handleDelete(trade) {
    if (!window.confirm(`Delete the ${trade.symbol} trade? This can’t be undone.`)) return;
    try {
      await deleteTrade(trade.id);
    } catch (err) {
      window.alert(`Couldn’t delete the trade: ${err.message}`);
    }
  }

  function startEdit(trade) {
    setEditing(trade);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="page">
      <div className="page-head">
        <h2>Journal</h2>
        <div className="page-tools">
          <div className="filter" role="group" aria-label="Show trades">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                className={filter === f.key ? 'on' : ''}
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
              >
                {f.label}
              </button>
            ))}
          </div>
          {!editing && (
            <button type="button" className="btn primary" onClick={() => setEditing('new')}>
              Add trade
            </button>
          )}
        </div>
      </div>

      {editing && (
        <TradeForm
          key={editing === 'new' ? 'new' : editing.id}
          trade={editing === 'new' ? null : editing}
          onSave={handleSave}
          onCancel={() => setEditing(null)}
        />
      )}

      {error && (
        <div className="form-error" role="alert">
          Couldn’t load trades from Supabase: {error}{' '}
          <button type="button" className="btn link" onClick={fetchTrades}>
            Try again
          </button>
        </div>
      )}

      {loading && !rows.length ? (
        <p className="empty">Loading trades…</p>
      ) : !rows.length ? (
        !editing && (
          <div className="empty">
            <p>No trades yet. Add your first one to start the ledger.</p>
            <button type="button" className="btn primary" onClick={() => setEditing('new')}>
              Add trade
            </button>
          </div>
        )
      ) : visible.length ? (
        <TradeTable rows={visible} onEdit={startEdit} onDelete={handleDelete} />
      ) : (
        <p className="empty">No {filter} trades.</p>
      )}
    </div>
  );
}
