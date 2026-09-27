import { fmtMonth, fmtPct, fmtSignedMoney, plClass } from '../lib/format.js';

/** Monthly performance of closed trades, grouped by buy date. */
export default function MonthlyTable({ months }) {
  if (!months.length) {
    return <p className="empty">Close a trade to see its month here.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="ledger monthly">
        <thead>
          <tr>
            <th>Month</th>
            <th className="num">Trades</th>
            <th className="num">Wins</th>
            <th className="num">Losses</th>
            <th className="num">Win rate</th>
            <th className="num">Gross P/L</th>
            <th className="num">Avg P/L</th>
            <th className="num">Cumulative P/L</th>
          </tr>
        </thead>
        <tbody>
          {months.map((m) => (
            <tr key={m.key}>
              <th scope="row">{fmtMonth(m.year, m.month)}</th>
              <td className="num">{m.trades}</td>
              <td className="num">{m.wins}</td>
              <td className="num">{m.losses}</td>
              <td className="num">{fmtPct(m.winRate, 1)}</td>
              <td className={`num strong ${plClass(m.grossPL)}`}>{fmtSignedMoney(m.grossPL)}</td>
              <td className={`num ${plClass(m.avgPL)}`}>{fmtSignedMoney(m.avgPL)}</td>
              <td className={`num ${plClass(m.cumulativePL)}`}>{fmtSignedMoney(m.cumulativePL)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
