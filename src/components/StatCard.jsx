/** One dashboard figure. `tone` is 'gain' | 'loss' | '' for colouring. */
export default function StatCard({ label, value, tone = '', detail }) {
  return (
    <div className="stat">
      <dt>{label}</dt>
      <dd className={tone}>{value}</dd>
      {detail && <dd className="stat-detail">{detail}</dd>}
    </div>
  );
}
