import { useMemo } from 'react';
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

export default function Dashboard({ startingCapital }) {
  const rows = useDerivedTrades(startingCapital);
  const stats = useMemo(() => computeDashboardStats(rows), [rows]);
  const months = useMemo(() => computeMonthlyPerformance(rows), [rows]);

  const chartData = months.map((m) => ({
    label: fmtMonth(m.year, m.month),
    gross: Number(m.grossPL.toFixed(2)),
    cumulative: Number(m.cumulativePL.toFixed(2)),
  }));

  return (
    <div className="page">
      <div className="page-head">
        <h2>Dashboard</h2>
        <p className="page-note">Closed trades only, except open trades and exposure.</p>
      </div>

      <dl className="stats">
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
        <h3>Month by month</h3>
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

