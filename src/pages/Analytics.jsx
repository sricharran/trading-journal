import { useMemo } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis, Area, AreaChart } from 'recharts';
import { isOpenPosition } from '../lib/calculations.js';
import { fmtMonth, fmtMoney, fmtSignedMoney, fmtPct, plClass } from '../lib/format.js';

export default function Analytics({ rows, startingCapital }) {
  const closed = useMemo(() => rows.filter((r) => !isOpenPosition(r)).sort((a, b) => (a.type === 'L' ? a.buyDate : a.sellDate).localeCompare(b.type === 'L' ? b.buyDate : b.sellDate)), [rows]);
  const data = useMemo(() => {
    let equity = Number(startingCapital || 0), peak = equity, maxDrawdown = 0, maxDrawdownPct = 0;
    const curve = closed.map((r) => {
      equity += Number(r.netPL || 0);
      peak = Math.max(peak, equity);
      const drawdown = equity - peak;
      maxDrawdown = Math.min(maxDrawdown, drawdown);
      if (peak > 0) maxDrawdownPct = Math.min(maxDrawdownPct, drawdown / peak);
      return { date: r.type === 'L' ? r.buyDate : r.sellDate, equity, drawdown };
    });
    const currentDD = equity - peak;
    const wins = closed.filter((r) => r.netPL > 0), losses = closed.filter((r) => r.netPL < 0);
    const avgWin = wins.length ? wins.reduce((s, r) => s + r.netPL, 0) / wins.length : 0;
    const avgLoss = losses.length ? losses.reduce((s, r) => s + r.netPL, 0) / losses.length : 0;
    const expectancy = closed.length ? closed.reduce((s, r) => s + (r.netPL || 0), 0) / closed.length : 0;
    const months = new Map();
    closed.forEach((r) => {
      const date = r.type === 'L' ? r.buyDate : r.sellDate;
      const key = date?.slice(0, 7);
      if (!key) return;
      const [year, month] = key.split('-').map(Number);
      const group = months.get(key) || { key, year, month, pnl: 0, trades: 0, wins: 0 };
      group.pnl += r.netPL || 0; group.trades++; if (r.netPL > 0) group.wins++;
      months.set(key, group);
    });
    const contract = ['I', 'D'].map((key) => {
      const subset = closed.filter((r) => r.contract === key);
      return { name: key === 'I' ? 'Intraday' : 'Delivery', pnl: subset.reduce((s, r) => s + (r.netPL || 0), 0), count: subset.length };
    });
    return { curve, peak, currentDD, maxDrawdown, maxDrawdownPct, avgWin, avgLoss, expectancy, months: [...months.values()].sort((a,b)=>a.key.localeCompare(b.key)), contract };
  }, [closed, startingCapital]);
  const monthly = data.months.map((m) => ({ ...m, label: fmtMonth(m.year, m.month) }));
  const winLossRatio = data.avgLoss ? Math.abs(data.avgWin / data.avgLoss) : null;
  return <div className="page">
    <div className="page-head"><div><h2>Analytics</h2><p className="page-note">Drawdown, expectancy, monthly performance, and trade breakdown.</p></div></div>
    <div className="analytics-metrics">
      <Metric label="Maximum drawdown" value={fmtSignedMoney(data.maxDrawdown)} tone="loss" detail={fmtPct(data.maxDrawdownPct)} />
      <Metric label="Current drawdown" value={fmtSignedMoney(data.currentDD)} tone={plClass(data.currentDD)} detail={'Peak equity ' + fmtMoney(data.peak)} />
      <Metric label="Expectancy / trade" value={fmtSignedMoney(data.expectancy)} tone={plClass(data.expectancy)} detail={closed.length + ' closed trades'} />
      <Metric label="Average win / loss" value={winLossRatio == null ? '—' : winLossRatio.toFixed(2) + ' : 1'} detail={fmtMoney(data.avgWin) + ' / ' + fmtMoney(Math.abs(data.avgLoss))} />
    </div>
    <div className="report-chart-grid">
      <section className="panel report-chart-panel"><h3>Drawdown over time</h3>{data.curve.length ? <ResponsiveContainer width="100%" height={250}><AreaChart data={data.curve}><CartesianGrid stroke="var(--rule)" vertical={false} /><XAxis dataKey="date" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v)=>Number(v).toLocaleString('en-IN')} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(v)=>[fmtSignedMoney(v),'Drawdown']} /><Area type="monotone" dataKey="drawdown" stroke="var(--loss)" fill="var(--loss)" fillOpacity={0.12} /></AreaChart></ResponsiveContainer> : <p className="empty">Add closed trades to view drawdown.</p>}</section>
      <section className="panel report-chart-panel"><h3>Monthly P/L</h3>{monthly.length ? <ResponsiveContainer width="100%" height={250}><BarChart data={monthly}><CartesianGrid stroke="var(--rule)" vertical={false} /><XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 10 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v)=>Number(v).toLocaleString('en-IN')} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(v)=>[fmtSignedMoney(v),'Net P/L']} /><Bar dataKey="pnl" radius={[4,4,0,0]}>{monthly.map((m)=> <Cell key={m.key} fill={m.pnl >= 0 ? 'var(--gain)' : 'var(--loss)'} />)}</Bar></BarChart></ResponsiveContainer> : <p className="empty">No monthly history yet.</p>}</section>
    </div>
    <div className="report-chart-grid">
      <section className="panel report-chart-panel"><h3>Closed P/L by contract</h3>{data.contract.some((r)=>r.count) ? <ResponsiveContainer width="100%" height={220}><BarChart data={data.contract}><CartesianGrid stroke="var(--rule)" vertical={false} /><XAxis dataKey="name" tick={{ fill: 'var(--muted)', fontSize: 11 }} axisLine={false} tickLine={false} /><YAxis tick={{ fill: 'var(--muted)', fontSize: 11 }} tickFormatter={(v)=>Number(v).toLocaleString('en-IN')} axisLine={false} tickLine={false} width={55} /><Tooltip formatter={(v)=>[fmtSignedMoney(v),'Net P/L']} /><Bar dataKey="pnl">{data.contract.map((r,i)=><Cell key={i} fill={r.pnl >= 0 ? 'var(--gain)' : 'var(--loss)'} />)}</Bar></BarChart></ResponsiveContainer> : <p className="empty">No closed trades yet.</p>}</section>
      <section className="panel report-chart-panel"><h3>Monthly breakdown</h3><div className="table-wrap"><table className="ledger"><thead><tr><th>Month</th><th className="num">Trades</th><th className="num">Win rate</th><th className="num">Net P/L</th></tr></thead><tbody>{monthly.map(m=><tr key={m.key}><th scope="row">{m.label}</th><td className="num">{m.trades}</td><td className="num">{m.trades ? (m.wins/m.trades*100).toFixed(1)+'%' : '—'}</td><td className={'num '+plClass(m.pnl)}>{fmtSignedMoney(m.pnl)}</td></tr>)}{!monthly.length&&<tr><td colSpan="4" className="muted">No monthly history yet.</td></tr>}</tbody></table></div></section>
    </div>
  </div>;
}
function Metric({label,value,tone,detail}) { return <div className="analysis-metric"><span>{label}</span><strong className={tone}>{value}</strong><small>{detail}</small></div>; }
