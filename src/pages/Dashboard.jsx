import { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Cell,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  CartesianGrid,
} from 'recharts';
import StatCard from '../components/StatCard.jsx';
import MonthlyTable from '../components/MonthlyTable.jsx';
import { useDerivedTrades } from '../store/useTradeStore.js';
import { computeDashboardStats, computeMonthlyPerformance } from '../lib/calculations.js';
import { fmtMonth, fmtPct, fmtRatio, fmtSignedMoney, fmtDays, fmtMoney, plClass } from '../lib/format.js';

export default function Dashboard({ startingCapital, onSaveStartingCapital }) {
  const rows = useDerivedTrades(startingCapital);
  const stats = useMemo(() => computeDashboardStats(rows), [rows]);
  const months = useMemo(() => computeMonthlyPerformance(rows), [rows]);

  const chartData = months.map((m) => ({
    label: fmtMonth(m.year, m.month),
    gross: Number(m.grossPL.toFixed(2)),
    cumulative: Number(m.cumulativePL.toFixed(2)),
  }));

  const performanceMessage = stats.totalTrades === 0 && rows.length > 0
    ? 'Your open positions are in the journal. Close a trade to start seeing realised performance patterns.'
    : stats.totalTrades === 0
      ? 'Log your first trade to start building a clear picture of your performance.'
      : stats.totalTrades < 10
        ? `You have ${stats.totalTrades} closed ${stats.totalTrades === 1 ? 'trade' : 'trades'} logged. Keep journaling before drawing conclusions from the pattern.`
        : stats.expectancy > 0
          ? `Your average result is ${fmtSignedMoney(stats.expectancy)} per closed trade across ${stats.totalTrades} trades.`
          : `Review your last trades for repeatable patterns. Your average result is ${fmtSignedMoney(stats.expectancy)} per closed trade.`;

  return (
    <div className="page">
      <div className="dashboard-heading">
        <div>
          <p className="eyebrow">YOUR TRADING OVERVIEW</p>
          <h2>Performance</h2>
          <p className="page-note">A clear view of your results, trade by trade.</p>
        </div>
        <div className="dashboard-actions">
          <CapitalControl startingCapital={startingCapital} onSave={onSaveStartingCapital} />
          <a className="btn primary" href="#journal">Review trades <span aria-hidden="true">→</span></a>
        </div>
      </div>

      <section className="review-prompt" aria-label="Performance snapshot">
        <div className="review-mark" aria-hidden="true">✳</div>
        <div className="review-copy">
          <p className="eyebrow">PERFORMANCE SNAPSHOT</p>
          <p>{performanceMessage}</p>
        </div>
        <span className="snapshot-count">{stats.totalTrades} closed {stats.totalTrades === 1 ? 'trade' : 'trades'}</span>
      </section>

      <dl className="stats">
        <StatCard label="Account capital" value={fmtMoney(stats.latestCapital ?? startingCapital)} />
        <StatCard label="Unrealised P/L" value={fmtSignedMoney(stats.unrealizedPL)} tone={plClass(stats.unrealizedPL)} detail="open positions" />
        <StatCard label="Total trades" value={stats.totalTrades} />
        <StatCard label="Win rate" value={fmtPct(stats.winRate, 1)} />
        <StatCard label="Total net P/L" value={fmtSignedMoney(stats.totalNetPL)} tone={plClass(stats.totalNetPL)} />
        <StatCard label="Profit factor" value={fmtRatio(stats.profitFactor)} />
        <StatCard label="Avg winner" value={fmtSignedMoney(stats.avgWinner)} tone={plClass(stats.avgWinner)} />
        <StatCard label="Avg loser" value={fmtSignedMoney(stats.avgLoser)} tone={plClass(stats.avgLoser)} />
        <StatCard label="Expectancy" value={fmtSignedMoney(stats.expectancy)} tone={plClass(stats.expectancy)} detail="per trade" />
        <StatCard label="Avg RRR" value={fmtRatio(stats.avgRRR)} />
        <StatCard label="Avg hold" value={fmtDays(stats.avgHoldDays)} />
        <StatCard label="Open trades" value={stats.openTrades} />
        <StatCard
          label="Open exposure"
          value={fmtPct(stats.openExposurePct, 1)}
          detail={`of ${fmtMoney(stats.latestCapital)} capital`}
        />
      </dl>

      <section className="panel">
        <div className="section-heading">
          <div>
            <h3>Performance over time</h3>
            <p className="page-note">Monthly realised P/L and cumulative results</p>
          </div>
          <span className="chart-legend"><i /> Monthly P/L <b /> Cumulative</span>
        </div>
        {chartData.length ? (
          <div className="chart">
            <ResponsiveContainer width="100%" height={260}>
              <ComposedChart data={chartData} margin={{ top: 8, right: 8, bottom: 0, left: 8 }}>
                <CartesianGrid stroke="var(--rule)" vertical={false} />
                <XAxis dataKey="label" tick={{ fill: 'var(--muted)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fill: 'var(--muted)', fontSize: 12 }}
                  axisLine={false}
                  tickLine={false}
                  width={70}
                  tickFormatter={(v) => v.toLocaleString('en-IN')}
                />
                <ReferenceLine y={0} stroke="var(--ink)" strokeOpacity={0.4} />
                <Tooltip
                  formatter={(v, name) => [fmtSignedMoney(v), name === 'gross' ? 'Month P/L' : 'Cumulative']}
                  contentStyle={{ borderRadius: 4, border: '1px solid var(--rule)', fontSize: 13 }}
                />
                <Bar dataKey="gross" maxBarSize={36}>
                  {chartData.map((d) => (
                    <Cell key={d.label} fill={d.gross >= 0 ? 'var(--gain)' : 'var(--loss)'} fillOpacity={0.75} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="cumulative" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        ) : null}
        <MonthlyTable months={months} />
      </section>
    </div>
  );
}

function CapitalControl({ startingCapital, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(startingCapital));
  const [error, setError] = useState('');

  async function save(event) {
    event.preventDefault();
    setError('');
    try {
      await onSave(value);
      setEditing(false);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="capital-control">
      <button type="button" className="btn ghost" onClick={() => { setValue(String(startingCapital)); setEditing(!editing); }}>
        Edit capital
      </button>
      {editing && (
        <form className="capital-editor" onSubmit={save}>
          <label className="visually-hidden" htmlFor="starting-capital">Starting capital</label>
          <input id="starting-capital" type="number" step="any" required value={value} onChange={(e) => setValue(e.target.value)} />
          <button type="submit" className="btn primary">Save</button>
          <button type="button" className="btn ghost" onClick={() => setEditing(false)}>Cancel</button>
          {error && <span role="alert">{error}</span>}
        </form>
      )}
    </div>
  );
}

