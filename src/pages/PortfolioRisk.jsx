import { isOpenPosition, isNum } from '../lib/calculations.js';

function sumField(positions, field) {
  if (positions.some((position) => !isNum(position[field]))) return null;
  return positions.reduce((total, position) => total + position[field], 0);
}

function asCapitalPercent(amount, capital) {
  if (!isNum(amount) || !isNum(capital) || capital <= 0) return null;
  return (amount / capital) * 100;
}

function formatPercent(value, signed = false) {
  if (!isNum(value)) return '—';
  const prefix = signed && value > 0 ? '+' : '';
  return prefix + value.toFixed(2) + '%';
}

function derivePosition(row, capital) {
  const quantity = Number(row.lots) * Number(row.lotSize);
  const hasQuantity = isNum(quantity) && quantity > 0;
  const hasLtp = isNum(row.ltp) && row.ltp > 0;
  const activeStop = isNum(row.trailingStop) && row.trailingStop > 0 ? row.trailingStop : row.initialStop;
  const hasStop = isNum(row.initialStop) && row.initialStop > 0;
  const hasActiveStop = isNum(activeStop) && activeStop > 0;
  const rate = isNum(row.rate) ? row.rate : 0;

  let initialRiskAmount = null;
  let openRiskAmount = null;
  let stopBreached = false;

  if (hasQuantity && hasStop) {
    const initialRisk = row.type === 'L'
      ? (row.netBuyPrice - row.initialStop / (1 + rate)) * quantity
      : (row.initialStop * (1 + rate) - row.netSellPrice) * quantity;
    initialRiskAmount = Math.max(0, initialRisk);
  }

  if (hasQuantity && hasActiveStop && hasLtp) {
    if (row.type === 'L') {
      stopBreached = row.ltp <= activeStop;
      openRiskAmount = Math.max(0, (row.ltp - activeStop) * quantity);
    } else {
      stopBreached = row.ltp >= activeStop;
      openRiskAmount = Math.max(0, (activeStop - row.ltp) * quantity);
    }
  }

  const allocationAmount = row.type === 'L' ? row.netBuyValue : row.netSellValue;
  return {
    ...row,
    initialRiskAmount,
    activeStop,
    openRiskAmount,
    stopBreached,
    impactPct: asCapitalPercent(row.netPL, capital),
    openRiskPct: asCapitalPercent(openRiskAmount, capital),
    allocationPct: asCapitalPercent(allocationAmount, capital),
  };
}

export default function PortfolioRisk({ rows = [], capital, loading = false }) {
  const positions = rows.filter(isOpenPosition).map((row) => derivePosition(row, capital));
  const initialRiskPct = asCapitalPercent(sumField(positions, 'initialRiskAmount'), capital);
  const openPlPct = asCapitalPercent(sumField(positions, 'netPL'), capital);
  const openRiskPct = asCapitalPercent(sumField(positions, 'openRiskAmount'), capital);
  const allocatedPct = sumField(positions, 'allocationPct');
  const stopBreachCount = positions.filter((position) => position.stopBreached).length;
  const missingStopCount = positions.filter((position) => position.openRiskAmount === null).length;

  const badge = loading
    ? 'Loading trades'
    : positions.length === 0
      ? 'No open positions'
      : stopBreachCount
        ? stopBreachCount + ' stop crossed'
        : missingStopCount
          ? missingStopCount + ' missing LTP/SL'
          : 'Monitoring';

  const summary = [
    { label: 'Initial risk', value: formatPercent(initialRiskPct), tone: 'positive' },
    { label: 'Open P&L', value: formatPercent(openPlPct, true), tone: openPlPct === null ? '' : openPlPct >= 0 ? 'positive' : 'negative' },
    { label: 'Open risk @ SL', value: formatPercent(openRiskPct), tone: 'risk' },
    { label: 'Allocated', value: formatPercent(allocatedPct), tone: 'allocation' },
  ];

  return (
    <main className="portfolio-risk">
      <section className="risk-overview" aria-labelledby="risk-title">
        <div className="risk-overview-head">
          <div>
            <p className="risk-eyebrow">Live exposure</p>
            <h2 id="risk-title">Portfolio Risk</h2>
          </div>
          <span className={'risk-badge' + (stopBreachCount || missingStopCount ? ' warning' : '')}><i /> {badge}</span>
        </div>

        <div className="risk-summary">
          {summary.map((item) => (
            <article className={'risk-summary-card ' + item.tone} key={item.label}>
              <h3>{item.label}</h3>
              <p>{item.value}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="risk-tracker" aria-labelledby="positions-title">
        <header className="risk-tracker-head">
          <div>
            <p className="risk-eyebrow">Live tracker</p>
            <h2 id="positions-title">Open Positions</h2>
          </div>
          <span className="position-count">{loading ? 'Loading…' : positions.length + ' positions'}</span>
        </header>

        <div className="risk-table-wrap">
          <table className="risk-table">
            <thead>
              <tr>
                <th scope="col">Stock</th>
                <th scope="col" className="align-right">Running impact</th>
                <th scope="col" className="risk-column">Open risk <small>to active SL/TSL</small></th>
                <th scope="col">Alloc</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan="4">Loading your open trades…</td></tr>
              ) : positions.length ? positions.map((position) => (
                <tr key={position.id}>
                  <th scope="row" className="risk-stock">
                    <span className="position-dot" aria-hidden="true" />
                    <span className="stock-chip">{position.symbol}</span>
                  </th>
                  <td className="align-right">
                    <span className={'risk-pill ' + (position.impactPct === null ? '' : position.impactPct >= 0 ? 'positive' : 'negative')}>
                      {formatPercent(position.impactPct, true)}
                    </span>
                  </td>
                  <td className="align-right">
                    <span className={'risk-pill ' + (position.stopBreached ? 'breached' : 'risk-value')}>
                      {position.stopBreached ? 'SL/TSL crossed' : formatPercent(position.openRiskPct)}
                    </span>
                  </td>
                  <td>
                    <div className="allocation-cell">
                      <span>{formatPercent(position.allocationPct)}</span>
                      <span className="allocation-track" aria-hidden="true"><i style={{ width: Math.min(position.allocationPct ?? 0, 100) + '%' }} /></span>
                    </div>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="4">No open trades in your journal.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <p className="risk-prototype-note">
          Uses saved LTP and TSL when set; otherwise current risk uses the initial stop.
        </p>
      </section>
    </main>
  );
}
