import { useState } from 'react';
import { isOpenPosition } from '../lib/calculations.js';
import {
  fmtDate,
  fmtWhole,
  fmtPrice,
  fmtSignedMoney,
  fmtMoney,
  fmtPct,
  fmtPctRaw,
  fmtRatio,
  fmtDays,
  plClass,
} from '../lib/format.js';

/** Compact journal list; select a symbol to open the full trade record. */
export default function TradeTable({ rows, onEdit, onDelete }) {
  const [selected, setSelected] = useState(null);

  return (
    <>
      <div className="table-wrap">
        <table className="ledger journal-ledger">
          <colgroup>
            <col className="col-symbol" />
            <col className="col-opened" />
            <col className="col-side" />
            <col className="col-qty" />
            <col className="col-price" />
            <col className="col-price" />
            <col className="col-price" />
            <col className="col-pl" />
            <col className="col-status" />
          </colgroup>
          <thead>
            <tr>
              <th>Symbol</th>
              <th>Opened</th>
              <th>Side</th>
              <th className="num">Qty</th>
              <th className="num">Buy</th>
              <th className="num">Sell</th>
              <th className="num">LTP</th>
              <th className="num">Net P/L</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const open = isOpenPosition(r);
              const qty = (r.lots ?? 0) * (r.lotSize ?? 0);
              return (
                <tr key={r.id} className={open ? 'is-open' : 'is-closed'}>
                  <th scope="row" className="symbol">
                    <button type="button" className="trade-link" onClick={() => setSelected(r)}>
                      {r.symbol}
                    </button>
                    {r.notes && <span className="note-dot" title="Has notes" aria-label="Has notes" />}
                  </th>
                  <td>{fmtDate(r.type === 'L' ? r.buyDate : r.sellDate)}</td>
                  <td>{r.type === 'L' ? 'Long' : 'Short'}</td>
                  <td className="num">{fmtWhole(qty)}</td>
                  <td className="num">{fmtPrice(r.buyPrice)}</td>
                  <td className="num">{fmtPrice(r.sellPrice)}</td>
                  <td className="num">{open ? fmtPrice(r.ltp) : '—'}</td>
                  <td className={`num strong ${plClass(r.netPL)}`}>{fmtSignedMoney(r.netPL)}</td>
                  <td><Status open={open} /></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="trade-mobile-list">
        {rows.map((r) => {
          const open = isOpenPosition(r);
          const qty = (r.lots ?? 0) * (r.lotSize ?? 0);
          return (
            <article key={r.id} className={`mobile-trade${open ? ' is-open' : ''}`}>
              <header className="mobile-trade-head">
                <div>
                  <button type="button" className="trade-link mobile-trade-symbol" onClick={() => setSelected(r)}>{r.symbol}</button>
                  <p>{r.type === 'L' ? 'Long' : 'Short'} · {fmtDate(r.type === 'L' ? r.buyDate : r.sellDate)} · {fmtWhole(qty)} qty</p>
                </div>
                <Status open={open} />
              </header>
              <div className="mobile-trade-metrics">
                <div><span>Buy</span><strong>{fmtPrice(r.buyPrice)}</strong></div>
                <div><span>{open ? 'LTP' : 'Sell'}</span><strong>{open ? fmtPrice(r.ltp) : fmtPrice(r.sellPrice)}</strong></div>
                <div><span>Net P/L</span><strong className={plClass(r.netPL)}>{fmtSignedMoney(r.netPL)}</strong></div>
              </div>
            </article>
          );
        })}
      </div>
      {selected && (
        <TradeDetails
          row={selected}
          onClose={() => setSelected(null)}
          onEdit={() => { const row = selected; setSelected(null); onEdit(row); }}
          onDelete={() => { const row = selected; setSelected(null); onDelete(row); }}
        />
      )}
    </>
  );
}

function Status({ open }) {
  if (open) return <span className="status open">Open</span>;
  return <span className="status closed">Closed</span>;
}

function TradeDetails({ row, onClose, onEdit, onDelete }) {
  const open = isOpenPosition(row);
  const qty = (row.lots ?? 0) * (row.lotSize ?? 0);
  const details = [
    ['Buy date', fmtDate(row.buyDate)],
    ['Sell / cover date', fmtDate(row.sellDate)],
    ['Side', row.type === 'L' ? 'Long' : 'Short'],
    ['Contract', row.contract === 'I' ? 'Intraday' : 'Delivery'],
    ['Quantity', fmtWhole(qty)],
    ['Lots', fmtWhole(row.lots)],
    ['Lot size', fmtWhole(row.lotSize)],
    ['Buy price', fmtPrice(row.buyPrice)],
    ['Sell price', fmtPrice(row.sellPrice)],
    ['Last traded price', open ? fmtPrice(row.ltp) : '—'],
    ['Initial stop', fmtPrice(row.initialStop)],
    ['Realised P/L', open ? '—' : fmtSignedMoney(row.netPL)],
    ['Unrealised P/L', open ? fmtSignedMoney(row.netPL) : '—'],
    ['ROI', fmtPct(row.roiPct)],
    ['ROCE', fmtPct(row.rocePct)],
    ['Risk on capital', fmtPct(row.riskOnCapital)],
    ['Reward to risk', fmtRatio(row.rewardToRisk)],
    ['Allocation', fmtPctRaw(row.allocationPct)],
    ['Days held', fmtDays(row.daysHeld)],
    ['Target', row.targetReport === 'J' ? 'Met' : row.targetReport === 'L' ? 'Missed' : '—'],
    ['Capital adjustment', row.capAdjustment ? fmtSignedMoney(row.capAdjustment) : '—'],
    ['Capital before result', fmtMoney(row.capitalAtEntry)],
    ['Capital after trade', fmtMoney(row.closingCapital)],
    ['Entry time', row.entryTime || '—'],
    ['Exit time', row.exitTime || '—'],
  ];

  return (
    <div className="trade-dialog-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <section className="trade-dialog" role="dialog" aria-modal="true" aria-labelledby="trade-dialog-title">
        <div className="trade-dialog-head">
          <div>
            <p className="eyebrow">{open ? 'Open trade' : 'Closed trade'}</p>
            <h2 id="trade-dialog-title">{row.symbol}</h2>
          </div>
          <button type="button" className="btn ghost" onClick={onClose}>Close</button>
        </div>
        <dl className="trade-details">
          {details.map(([label, value]) => (
            <div key={label}>
              <dt>{label}</dt>
              <dd>{value}</dd>
            </div>
          ))}
        </dl>
        {row.notes && <div className="trade-notes"><h3>Notes</h3><p>{row.notes}</p></div>}
        <div className="form-actions">
          <button type="button" className="btn primary" onClick={onEdit}>Edit trade</button>
          <button type="button" className="btn link danger" onClick={onDelete}>Delete</button>
        </div>
      </section>
    </div>
  );
}
