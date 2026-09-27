import { useMemo } from 'react';
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { closedTrades, computeDashboardStats, computeMonthlyPerformance, isOpenPosition } from '../lib/calculations.js';
import { fmtDate, fmtMonth, fmtMoney, fmtPct, fmtRatio, fmtSignedMoney, fmtDays, plClass } from '../lib/format.js';
import { useDerivedTrades } from '../store/useTradeStore.js';
import MonthlyTable from '../components/MonthlyTable.jsx';
import StatCard from '../components/StatCard.jsx';

export default function Dashboard({ startingCapital }) {
  const rows = useDerivedTrades(startingCapital);
  const closed = useMemo(() => closedTrades(rows), [rows]);
  const stats = useMemo(() => computeDashboardStats(rows), [rows]);
  const months = useMemo(() => computeMonthlyPerformance(rows), [rows]);
  const model = useMemo(() => {
    const open = rows.filter(isOpenPosition);
    const openPL = open.reduce((sum, row) => sum + (row.netPL || 0), 0);
    const wins = closed.filter((row) => row.netPL > 0);
    const losses = closed.filter((row) => row.netPL < 0);
    const dailyMap = new Map();
    closed.forEach((row) => {
      const date = row.type === 'L' ? row.buyDate : row.sellDate;
      if (date) dailyMap.set(date, (dailyMap.get(date) || 0) + (row.netPL || 0));
    });
    let equity = Number(startingCapital || 0);
    const curve = [...closed].sort((a,b) => {
      const da = a.type === 'L' ? a.buyDate : a.sellDate;
      const db = b.type === 'L' ? b.buyDate : b.sellDate;
      return da.localeCompare(db);
    }).map((row) => {
      equity += row.netPL || 0;
      return { date: fmtDate(row.type === 'L' ? row.buyDate : row.sellDate), equity };
    });
    let best = null, worst = null, currentStreak = 0, bestWinStreak = 0, worstLossStreak = 0;
    closed.forEach((row) => {
      if (!best || row.netPL > best.netPL) best = row;
      if (!worst || row.netPL < worst.netPL) worst = row;
      if (row.netPL > 0) { currentStreak = currentStreak >= 0 ? currentStreak + 1 : 1; bestWinStreak = Math.max(bestWinStreak, currentStreak); }
      else if (row.netPL < 0) { currentStreak = currentStreak <= 0 ? currentStreak - 1 : -1; worstLossStreak = Math.max(worstLossStreak, Math.abs(currentStreak)); }
      else currentStreak = 0;
    });
    return {
      openPL, wins: wins.length, losses: losses.length,
      daily: [...dailyMap].sort(([a],[b])=>a.localeCompare(b)).map(([date,pnl])=>({date:fmtDate(date),pnl})),
      curve,
      outcomes: [{name:'Wins',value:wins.length,fill:'var(--gain)'},{name:'Losses',value:losses.length,fill:'var(--loss)'}].filter((x)=>x.value),
      best, worst, bestWinStreak, worstLossStreak, currentStreak,
      recent: [...closed].sort((a,b) => (b.type === 'L' ? b.buyDate : b.sellDate).localeCompare(a.type === 'L' ? a.buyDate : a.sellDate)).slice(0,6),
    };
  }, [rows, closed, startingCapital]);
  const primaryStats = [
    ['Closed P/L', fmtSignedMoney(stats.totalNetPL), plClass(stats.totalNetPL), closed.length + ' closed trades'],
    ['Win rate', fmtPct(stats.winRate, 1), '', model.wins + ' wins · ' + model.losses + ' losses'],
    ['Profit factor', fmtRatio(stats.profitFactor), '', 'Gross profit / gross loss'],
    ['Open P/L', fmtSignedMoney(model.openPL), plClass(model.openPL), stats.openTrades + ' open positions'],
  ];
  return <div className="page dashboard-page">
    <dl className="stats stats-primary">{primaryStats.map(([label,value,tone,detail])=><StatCard key={label} label={label} value={value} tone={tone} detail={detail} />)}</dl>
    <dl className="stats stats-secondary">
      <StatCard label="Total trades" value={stats.totalTrades} />
      <StatCard label="Avg winner" value={fmtSignedMoney(stats.avgWinner)} tone={plClass(stats.avgWinner)} />
      <StatCard label="Avg loser" value={fmtSignedMoney(stats.avgLoser)} tone={plClass(stats.avgLoser)} />
      <StatCard label="Expectancy" value={fmtSignedMoney(stats.expectancy)} tone={plClass(stats.expectancy)} detail="per closed trade" />
      <StatCard label="Avg RRR" value={fmtRatio(stats.avgRRR)} />
      <StatCard label="Avg hold" value={fmtDays(stats.avgHoldDays)} />
      <StatCard label="Open exposure" value={fmtPct(stats.openExposurePct, 1)} detail={'of ' + fmtMoney(stats.latestCapital) + ' capital'} />
    </dl>

    <div className="dashboard-main-grid">
      <div className="dashboard-side-stack">
        <section className="panel dashboard-insight-panel">
          <div className="dashboard-panel-head"><div><h3>Win / loss split</h3><p>Closed trade outcomes</p></div></div>
          {model.outcomes.length ? <div className="outcome-chart"><ResponsiveContainer width="100%" height={180}><PieChart><Pie data={model.outcomes} dataKey="value" nameKey="name" innerRadius={48} outerRadius={72} paddingAngle={2}>{model.outcomes.map((item)=><Cell key={item.name} fill={item.fill} />)}</Pie><Tooltip /></PieChart></ResponsiveContainer><div className="outcome-legend"><span><i className="legend-win" />{model.wins} wins</span><span><i className="legend-loss" />{model.losses} losses</span></div></div> : <p className="empty">Closed trades will appear here.</p>}
        </section>
        <section className="panel dashboard-insight-panel">
          <div className="dashboard-panel-head"><div><h3>Streak tracker</h3><p>Consecutive closed trade outcomes</p></div></div>
          <div className="streak-grid"><div><strong className="gain">{model.bestWinStreak}</strong><span>Best win</span></div><div><strong className="loss">{model.worstLossStreak}</strong><span>Worst loss</span></div><div><strong>{model.currentStreak > 0 ? '+' : ''}{model.currentStreak}</strong><span>Current</span></div></div>
        </section>
        <section className="panel dashboard-insight-panel">
          <div className="dashboard-panel-head"><div><h3>Best and worst</h3><p>By realized net P/L</p></div></div>
          <BestWorst label="Best trade" row={model.best} />
          <BestWorst label="Worst trade" row={model.worst} />
        </section>
      </div>
      <section className="panel dashboard-equity-panel">
        <div className="dashboard-panel-head"><div><h3>Equity curve</h3><p>Account capital after each closed trade</p></div><strong className={plClass(stats.totalNetPL)}>{fmtSignedMoney(stats.totalNetPL)}</strong></div>
        {model.curve.length ? <ResponsiveContainer width="100%" height={400}><AreaChart data={model.curve}><defs><linearGradient id="equityFill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="var(--gain)" stopOpacity={0.16}/><stop offset="100%" stopColor="var(--gain)" stopOpacity={0.01}/></linearGradient></defs><CartesianGrid stroke="var(--rule)" vertical={false}/><XAxis dataKey="date" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'var(--muted)',fontSize:10}} tickFormatter={(v)=>Number(v).toLocaleString('en-IN')} axisLine={false} tickLine={false} width={72}/><Tooltip formatter={(v)=>[fmtMoney(v),'Equity']}/><Area type="monotone" dataKey="equity" stroke="var(--gain)" strokeWidth={2} fill="url(#equityFill)" dot={{r:3,fill:'var(--gain)'}} activeDot={{r:5}}/></AreaChart></ResponsiveContainer> : <p className="empty">Add closed trades to start your equity curve.</p>}
      </section>
    </div>

    <section className="panel dashboard-daily-panel">
      <div className="dashboard-panel-head"><div><h3>Daily realized P/L</h3><p>Closed trade results grouped by date</p></div></div>
      {model.daily.length ? <ResponsiveContainer width="100%" height={220}><BarChart data={model.daily}><CartesianGrid stroke="var(--rule)" vertical={false}/><XAxis dataKey="date" tick={{fill:'var(--muted)',fontSize:10}} axisLine={false} tickLine={false}/><YAxis tick={{fill:'var(--muted)',fontSize:10}} tickFormatter={(v)=>Number(v).toLocaleString('en-IN')} axisLine={false} tickLine={false} width={65}/><Tooltip formatter={(v)=>[fmtSignedMoney(v),'Net P/L']}/><Bar dataKey="pnl" radius={[4,4,0,0]}>{model.daily.map((d,i)=><Cell key={i} fill={d.pnl>=0?'var(--gain)':'var(--loss)'}/>)}</Bar></BarChart></ResponsiveContainer> : <p className="empty">Daily results will appear when trades are closed.</p>}
    </section>
    <section className="panel dashboard-recent-panel">
      <div className="dashboard-panel-head"><div><h3>Recent closed trades</h3><p>Latest six realized results</p></div><a href="#journal" className="btn link">View journal →</a></div>
      <div className="table-wrap"><table className="ledger"><thead><tr><th>Date</th><th>Symbol</th><th>Side</th><th className="num">Qty</th><th className="num">Net P/L</th></tr></thead><tbody>{model.recent.map((row)=><tr key={row.id}><td>{fmtDate(row.type==='L'?row.buyDate:row.sellDate)}</td><th scope="row" className="symbol">{row.symbol}</th><td>{row.type==='L'?'Long':'Short'}</td><td className="num">{(row.lots||0)*(row.lotSize||0)}</td><td className={'num strong '+plClass(row.netPL)}>{fmtSignedMoney(row.netPL)}</td></tr>)}{!model.recent.length&&<tr><td colSpan="5" className="muted">No closed trades yet.</td></tr>}</tbody></table></div>
    </section>
    <section className="panel dashboard-monthly-panel"><div className="dashboard-panel-head"><div><h3>Monthly performance</h3><p>Wins, losses, and cumulative net P/L</p></div></div><MonthlyTable months={months}/></section>
  </div>;
}
function BestWorst({label,row}) { return <div className="best-worst-row"><span><small>{label}</small><strong>{row?.symbol || '—'}</strong></span><b className={row ? plClass(row.netPL) : 'muted'}>{row ? fmtSignedMoney(row.netPL) : '—'}</b></div>; }
