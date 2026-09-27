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

/**
 * Journal table. `rows` are derived trades, already in display order.
 */
export default function TradeTable({ rows, onEdit, onDelete, onSelect }) {
  return (
    <div className="table-wrap">
      <table className="ledger">
        <thead>
          <tr>
            <th className="sticky">Symbol</th>
            <th>Opened</th>
            <th>Side</th>
            <th className="num">Qty</th>
            <th className="num">Buy</th>
            <th className="num">Sell</th>
            <th className="num">LTP</th>
            <th className="num">Initial SL</th>
            <th className="num">TSL</th>
            <th className="num">Net P/L</th>
            <th className="num">ROI</th>
            <th className="num">ROCE</th>
            <th className="num">Risk</th>
            <th className="num">RRR</th>
            <th className="num">Alloc.</th>
            <th className="num">Days</th>
            <th>Status</th>
            <th>Target</th>
            <th className="num">Cap. adj.</th>
            <th className="num">Capital</th>
            <th>
              <span className="visually-hidden">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const open = isOpenPosition(r);
            const qty = (r.lots ?? 0) * (r.lotSize ?? 0);
            return (
              <tr
                key={r.id}
                className={(open ? 'is-open' : 'is-closed') + ' is-clickable'}
                tabIndex={0}
                aria-label={`View ${r.symbol} trade details`}
                onClick={() => onSelect(r)}
                onKeyDown={(event) => {
                  if (event.target === event.currentTarget && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onSelect(r);
                  }
                }}
              >
                <th scope="row" className="sticky symbol">
                  {r.symbol}
                  {r.notes && <span className="note-dot" title={r.notes} aria-label="Has notes" />}
                </th>
                <td>{fmtDate(r.type === 'L' ? r.buyDate : r.sellDate)}</td>
                <td>
                  {r.type === 'L' ? 'Long' : 'Short'}
                  <span className="sub">{r.contract === 'I' ? 'Intraday' : 'Delivery'}</span>
                </td>
                <td className="num">{fmtWhole(qty)}</td>
                <td className="num">{fmtPrice(r.buyPrice)}</td>
                <td className="num">{fmtPrice(r.sellPrice)}</td>
                <td className="num">{open ? fmtPrice(r.ltp) : '—'}</td>
                <td className="num">{fmtPrice(r.initialStop)}</td>
                <td className="num">{fmtPrice(r.trailingStop)}</td>
                <td className={`num strong ${plClass(r.netPL)}`}>{fmtSignedMoney(r.netPL)}</td>
                <td className={`num ${plClass(r.roiPct)}`}>{fmtPct(r.roiPct)}</td>
                <td className={`num ${plClass(r.rocePct)}`}>{fmtPct(r.rocePct)}</td>
                <td className="num">{fmtPct(r.riskOnCapital)}</td>
                <td className="num">{fmtRatio(r.rewardToRisk)}</td>
                <td className="num">{fmtPctRaw(r.allocationPct)}</td>
                <td className="num">{fmtDays(r.daysHeld)}</td>
                <td>
                  <Status row={r} open={open} />
                </td>
                <td>
                  <Target value={r.targetReport} />
                </td>
                <td className="num muted">{r.capAdjustment ? fmtSignedMoney(r.capAdjustment) : ''}</td>
                <td className="num">{fmtMoney(r.closingCapital)}</td>
                <td className="actions">
                  <button type="button" className="btn link" onClick={(event) => { event.stopPropagation(); onEdit(r); }}>
                    Edit
                  </button>
                  <button type="button" className="btn link danger" onClick={(event) => { event.stopPropagation(); onDelete(r); }}>
                    Delete
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * tradeStatus is 'Closed', a NUMBER (open position value), or ''.
 * The number is shown as "Open" plus the value instead of a bare figure.
 */
function Status({ row, open }) {
  const s = row.tradeStatus;
  if (typeof s === 'number') {
    return (
      <span className="status open">
        Open
        <span className="sub">{fmtMoney(s)}</span>
      </span>
    );
  }
  if (s === 'Closed' && open) {
    // Sheet quirk: an uncovered short still reports "Closed". Flag it.
    return (
      <span className="status quirk" title="The original sheet marks an uncovered short as Closed. It is still open.">
        Closed*
      </span>
    );
  }
  if (s === 'Closed') return <span className="status closed">Closed</span>;
  return <span className="muted">—</span>;
}

function Target({ value }) {
  if (value === 'J') return <span className="target hit" title="Met the risk-adjusted target">J</span>;
  if (value === 'L') return <span className="target miss" title="Missed the risk-adjusted target">L</span>;
  return <span className="muted">—</span>;
}
