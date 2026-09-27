import { useMemo, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { isOpenPosition } from '../lib/calculations.js';
import { fmtDate, fmtMoney, fmtSignedMoney, plClass } from '../lib/format.js';

const numberFmt = (value) => Number(value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

export default function Reports({ rows }) {
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const closed = useMemo(() => rows.filter((r) => !isOpenPosition(r)), [rows]);
  const filtered = useMemo(() => closed.filter((r) => {
    const date = r.type === 'L' ? r.buyDate : r.sellDate;
    return (!from || date >= from) && (!to || date <= to);
  }), [closed, from, to]);
  const stats = useMemo(() => {
    const winners = filtered.filter((r) => r.netPL > 0);
    const losers = filtered.filter((r) => r.netPL < 0);
    const grossWin = winners.reduce((sum, r) => sum + (r.netPL || 0), 0);
    const grossLoss = Math.abs(losers.reduce((sum, r) => sum + (r.netPL || 0), 0));
    return { net: filtered.reduce((sum, r) => sum + (r.netPL || 0), 0), count: filtered.length,
      wins: winners.length, losses: losers.length, rate: filtered.length ? winners.length / filtered.length : 0,
      factor: grossLoss ? grossWin / grossLoss : null,
      avgWin: winners.length ? grossWin / winners.length : null,
      avgLoss: losers.length ? -grossLoss / losers.length : null };
  }, [filtered]);
  const daily = useMemo(() => {
    const map = new Map();
    filtered.forEach((r) => {
      const date = r.type === 'L' ? r.buyDate : r.sellDate;
      map.set(date, (map.get(date) || 0) + (r.netPL || 0));
    });
    return [...map].sort(([a], [b]) => a.localeCompare(b)).map(([date, pnl]) => ({ date, label: fmtDate(date), pnl }));
  }, [filtered]);
  const weekdays = useMemo(() => {
    const values = Array(7).fill(0);
    filtered.forEach((r) => {
      const date = r.type === 'L' ? r.buyDate : r.sellDate;
      const day = new Date(date + 'T00:00:00').getDay();
      values[day] += r.netPL || 0;
    });
    return ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, i) => ({ day, pnl: values[i] }));
  }, [filtered]);
  const sorted = [...filtered].sort((a, b) => (b.type === 'L' ? b.buyDate : b.sellDate).localeCompare(a.type === 'L' ? a.buyDate : a.sellDate));
  return <div className="page">
    <div className="page-head"><div><h2>Reports</h2><p className="page-note">Review realized performance over a date range.</p></div></div>
    <section className="panel report-filters">
      <label className="field"><span>From</span><input type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></label>
      <label className="field"><span>To</span><input type="date" value={to} onChange={(e) => setTo(e.target.value)} /></label>
      <button className="btn ghost" type="button" onClick={() => { setFrom(''); setTo(''); }}>Clear dates</button>
    </section>
    <dl className="stats stats-primary report-stats">
      <ReportStat label="Net P/L" value={fmtSignedMoney(stats.net)} tone={plClass(stats.net)} detail={stats.count + ' closed trades'} />
      <ReportStat label="Win rate" value={(stats.rate * 100).toFixed(1) + '%'} detail={stats.wins + ' wins · ' + stats.losses + ' losses'} />
      <ReportStat label="Profit factor" value={stats.factor == null ? '—' : stats.factor.toFixed(2)} detail="Gross profit / gross loss" />
      <ReportStat label="Average winner" value={fmtSignedMoney(stats.avgWin)} tone={plClass(stats.avgWin)} />
      <ReportStat label="Average loser" value={fmtSignedMoney(stats.avgLoss)} tone={plClass(stats.avgLoss)} />
    </dl>
    <div className="report-chart-grid">
      <ChartPanel title="P/L by weekday" data={weekdays} xKey="day" />
      <ChartPanel title="Daily realized P/L" data={daily} xKey="label" />
    </div>
    <section className="panel report-table-panel">
      <div className="dashboard-panel-head"><div><h3>Trades in range</h3><p>{filtered.length} closed trades</p></div></div>
      <div className="table-wrap"><table className="ledger report-table"><thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th className="num">Entry</th><th className="num">Exit</th><th className="num">Qty</th><th className="num">Net P/L</th></tr></thead>
        <tbody>{sorted.map((r) => <tr key={r.id}><td>{fmtDate(r.type === 'L' ? r.buyDate : r.sellDate)}</td><th scope="row" className="symbol">{r.symbol}</th><td>{r.type === 'L' ? 'Long' : 'Short'}</td><td className="num">{fmtMoney(r.type === 'L' ? r.buyPrice : r.sellPrice)}</td><td className="num">{fmtMoney(r.type === 'L' ? r.sellPrice : r.buyPrice)}</td><td className="num">{numberFmt((r.lots || 0) * (r.lotSize || 0))}</td><td className={'num strong ' + plClass(r.netPL)}>{fmtSignedMoney(r.netPL)}</td></tr>)}
        {!sorted.length && <tr><td colSpan="7" className="muted">No closed trades match these dates.</td></tr>}</tbody>
      </table></div>
    </section>
  </div>;
}

function ReportStat({ label, value, detail, tone }) {
  return <div className="stat"><dt>{label}</dt><dd className={tone}>{value}</dd>{detail && <dd className="stat-detail">{detail}</dd>}</div>;
}
function ChartPanel({ title, data, xKey }) {
  return <section className="panel report-chart-panel"><h3>{title}</h3>{data.length ? <ResponsiveContainer width="100%" height={240}><BarChart data={data}><CartesianGrid stroke="var(--rule)" vertical={false} /><XAxis dataKey={xKey} tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={numberFmt} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(v) => [fmtSignedMoney(v), 'Net P/L']} /><Bar dataKey="pnl" radius={[4, 4, 0, 0]}>{data.map((d, i) => <Cell key={i} fill={d.pnl >= 0 ? 'var(--gain)' : 'var(--loss)'} />)}</Bar></BarChart></ResponsiveContainer> : <p className="empty">No closed trades in this period.</p>}</section>;
}
