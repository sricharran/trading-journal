const positions = [
  { symbol: 'AEQUS', impact: 1.16, risk: 1.18, allocation: 14.4 },
  { symbol: 'PARAS', impact: 2.71, risk: 2.87, allocation: 15.6 },
  { symbol: 'FCL', impact: 2.99, risk: 2.25, allocation: 25.5 },
  { symbol: 'HSCL', impact: 0.76, risk: 0.54, allocation: 18.8 },
  { symbol: 'BLUESTONE', impact: 0.93, risk: 0, allocation: 15.5 },
  { symbol: 'AEROFLEX', impact: 2.04, risk: 2.04, allocation: 15.0 },
  { symbol: 'DATAPATTNS', impact: 1.03, risk: 1.18, allocation: 15.6 },
];

const summary = [
  { label: 'Initial risk', value: '2.29%', tone: 'positive' },
  { label: 'Open P&L', value: '+11.62%', tone: 'positive' },
  { label: 'Open risk @ SL', value: '10.07%', tone: 'risk' },
  { label: 'Allocated', value: '120.30%', tone: 'allocation' },
];

export default function PortfolioRisk() {
  return (
    <main className="portfolio-risk">
      <section className="risk-overview" aria-labelledby="risk-title">
        <div className="risk-overview-head">
          <div>
            <p className="risk-eyebrow">Live exposure</p>
            <h2 id="risk-title">Portfolio Risk</h2>
          </div>
          <span className="risk-badge"><i /> Low Risk</span>
        </div>

        <div className="risk-summary">
          {summary.map((item) => (
            <article className={`risk-summary-card ${item.tone}`} key={item.label}>
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
          <span className="position-count">{positions.length} positions</span>
        </header>

        <div className="risk-table-wrap">
          <table className="risk-table">
            <thead>
              <tr>
                <th scope="col">Stock</th>
                <th scope="col" className="align-right">Running impact</th>
                <th scope="col" className="risk-column">Open risk <small>if SL/TSL hits</small></th>
                <th scope="col">Alloc</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((position) => (
                <tr key={position.symbol}>
                  <th scope="row" className="risk-stock">
                    <span className="position-dot" aria-hidden="true" />
                    <span className="stock-chip">{position.symbol}</span>
                  </th>
                  <td className="align-right"><span className="risk-pill positive">+{position.impact.toFixed(2)}%</span></td>
                  <td className="align-right"><span className="risk-pill positive">{position.risk.toFixed(2)}%</span></td>
                  <td>
                    <div className="allocation-cell">
                      <span>{position.allocation.toFixed(1)}%</span>
                      <span className="allocation-track" aria-hidden="true"><i style={{ width: `${Math.min(position.allocation * 2, 100)}%` }} /></span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="risk-prototype-note">Prototype preview â€” illustrative data only</p>
      </section>
    </main>
  );
}

