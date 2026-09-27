import { useEffect, useMemo, useState } from 'react';
import TradeForm from '../components/TradeForm.jsx';
import TradeTable from '../components/TradeTable.jsx';
import { useTradeStore, useDerivedTrades } from '../store/useTradeStore.js';
import { isOpenPosition } from '../lib/calculations.js';
import { fmtDate, fmtDays, fmtMoney, fmtPct, fmtPctRaw, fmtPrice, fmtRatio, fmtSignedMoney, fmtWhole } from '../lib/format.js';

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'open', label: 'Open' },
  { key: 'closed', label: 'Closed' },
];

export default function Journal({ startingCapital, addTradeRequest = 0 }) {
  const { loading, error, addTrade, updateTrade, deleteTrade, fetchTrades } = useTradeStore();
  const rows = useDerivedTrades(startingCapital);

  // null = form hidden, 'new' = adding, otherwise the trade being edited
  const [editing, setEditing] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedTrade, setSelectedTrade] = useState(null);
  const [search, setSearch] = useState('');
  const [resultFilter, setResultFilter] = useState('all');
  const [sortOrder, setSortOrder] = useState('newest');

  useEffect(() => {
    if (addTradeRequest > 0) {
      setSelectedTrade(null);
      setEditing('new');
    }
  }, [addTradeRequest]);

  // Capital is computed oldest-first; the journal shows newest first.
  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const open = isOpenPosition(row);
      const pnl = Number(row.netPL || 0);
      if (filter === 'open' && !open) return false;
      if (filter === 'closed' && open) return false;
      if (resultFilter === 'win' && (open || pnl <= 0)) return false;
      if (resultFilter === 'loss' && (open || pnl >= 0)) return false;
      if (query && !String(row.symbol || '').toLowerCase().includes(query)) return false;
      return true;
    });
    const dateOf = (row) => row.type === 'L' ? row.buyDate || '' : row.sellDate || '';
    return filtered.sort((a, b) => {
      if (sortOrder === 'oldest') return dateOf(a).localeCompare(dateOf(b));
      if (sortOrder === 'highest') return (b.netPL || 0) - (a.netPL || 0);
      if (sortOrder === 'lowest') return (a.netPL || 0) - (b.netPL || 0);
      return dateOf(b).localeCompare(dateOf(a));
    });
  }, [rows, filter, resultFilter, search, sortOrder]);

  async function handleSave(form) {
    if (editing === 'new') await addTrade(form);
    else await updateTrade(editing.id, form);
    setEditing(null);
  }

  async function handleDelete(trade) {
    if (!window.confirm(`Delete the ${trade.symbol} trade? This can’t be undone.`)) return false;
    try {
      await deleteTrade(trade.id);
      return true;
    } catch (err) {
      window.alert(`Couldn’t delete the trade: ${err.message}`);
      return false;
    }
  }

  function startEdit(trade) {
    setSelectedTrade(null);
    setEditing(trade);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <div className="page">
      <div className="page-head">
        <div><h2>Journal <span className="journal-count">{visible.length}</span></h2><p className="page-note">All trades · Stocks · INR</p></div>
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
          <button type="button" className="btn ghost" onClick={() => window.print()}>↓ Export PDF</button>
          {!editing && (
            <button type="button" className="btn primary" onClick={() => setEditing('new')}>
              Add trade
            </button>
          )}
        </div>
      </div>

      <section className="journal-filterbar" aria-label="Filter trades">
        <input type="search" aria-label="Search by symbol" placeholder="Search symbol…" value={search} onChange={(event) => setSearch(event.target.value)} />
        <select aria-label="Filter results" value={resultFilter} onChange={(event) => setResultFilter(event.target.value)}>
          <option value="all">All results</option><option value="win">Wins</option><option value="loss">Losses</option>
        </select>
        <select aria-label="Sort trades" value={sortOrder} onChange={(event) => setSortOrder(event.target.value)}>
          <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="highest">Highest P/L</option><option value="lowest">Lowest P/L</option>
        </select>
      </section>
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
        <TradeTable rows={visible} onSelect={setSelectedTrade} />
      ) : (
        <p className="empty">No {filter} trades.</p>
      )}
      {selectedTrade && (
        <TradeDetailsDialog
          trade={selectedTrade}
          onClose={() => setSelectedTrade(null)}
          onEdit={startEdit}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
}

function TradeDetailsDialog({ trade, onClose, onEdit, onDelete }) {
  const open = isOpenPosition(trade);
  const quantity = (trade.lots ?? 0) * (trade.lotSize ?? 0);
  const entryDate = trade.type === 'L' ? trade.buyDate : trade.sellDate;
  const exitDate = trade.type === 'L' ? trade.sellDate : trade.buyDate;
  const entryPrice = trade.type === 'L' ? trade.buyPrice : trade.sellPrice;
  const exitPrice = trade.type === 'L' ? trade.sellPrice : trade.buyPrice;

  useEffect(() => {
    function onKeyDown(event) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  const details = [
    ['Status', open ? 'Open' : 'Closed'],
    ['Side', trade.type === 'L' ? 'Long' : 'Short'],
    ['Contract', trade.contract === 'I' ? 'Intraday' : 'Delivery'],
    ['Quantity', fmtWhole(quantity)],
    ['Entry date', fmtDate(entryDate)],
    ['Entry price', fmtPrice(entryPrice)],
    ['Exit date', fmtDate(exitDate)],
    ['Exit price', fmtPrice(exitPrice)],
    ['Last traded price', open ? fmtPrice(trade.ltp) : '—'],
    ['Initial SL', fmtPrice(trade.initialStop)],
    ['TSL', fmtPrice(trade.trailingStop)],
    ['Net P/L', fmtSignedMoney(trade.netPL)],
    ['ROI', fmtPct(trade.roiPct)],
    ['ROCE', fmtPct(trade.rocePct)],
    ['Risk', fmtPct(trade.riskOnCapital)],
    ['Reward / risk', fmtRatio(trade.rewardToRisk)],
    ['Allocation', fmtPctRaw(trade.allocationPct)],
    ['Days held', fmtDays(trade.daysHeld)],
    ['Capital', fmtMoney(trade.closingCapital)],
    ['Capital adjustment', trade.capAdjustment ? fmtSignedMoney(trade.capAdjustment) : '—'],
    ['Target', trade.targetReport ?? '—'],
  ];

  async function removeTrade() {
    if (await onDelete(trade)) onClose();
  }

  return (
    <div
      className="trade-details-backdrop"
      role="presentation"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <section className="trade-details-dialog" role="dialog" aria-modal="true" aria-labelledby="trade-details-title" tabIndex={-1}>
        <header className="trade-details-head">
          <div>
            <p className="eyebrow">Trade details</p>
            <h2 id="trade-details-title">{trade.symbol}</h2>
            <p className="trade-details-subtitle">{open ? 'Open position' : 'Closed trade'} · {trade.type === 'L' ? 'Long' : 'Short'}</p>
          </div>
          <button type="button" className="btn ghost" onClick={onClose} autoFocus aria-label="Close trade details">Close</button>
        </header>

        <dl className="trade-details-grid">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>

        <div className="trade-details-notes">
          <h3>Notes</h3>
          <p>{trade.notes?.trim() || 'No notes for this trade.'}</p>
        </div>

        <footer className="trade-details-actions">
          <button type="button" className="btn danger-action" onClick={removeTrade}>Delete trade</button>
          <button type="button" className="btn primary" onClick={() => onEdit(trade)}>Edit trade</button>
        </footer>
      </section>
    </div>
  );
}
