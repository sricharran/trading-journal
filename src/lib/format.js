// Display formatting. Every formatter returns '—' for null/NaN so Excel-style
// errors (#DIV/0!) show up as a dash.

const DASH = '—';
const ok = (v) => typeof v === 'number' && Number.isFinite(v);

const money = new Intl.NumberFormat('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });

export const fmtMoney = (v) => (ok(v) ? money.format(v) : DASH);
export const fmtSignedMoney = (v) => (ok(v) ? `${v > 0 ? '+' : ''}${money.format(v)}` : DASH);
export const fmtWhole = (v) => (ok(v) ? whole.format(v) : DASH);
export const fmtPrice = (v) => (ok(v) ? money.format(v) : DASH);

/** Fraction -> percent, e.g. 0.0512 -> '5.12%' (matches Excel % formatting). */
export const fmtPct = (v, digits = 2) => (ok(v) ? `${(v * 100).toFixed(digits)}%` : DASH);
/** Value that's already × 100 (allocationPct). */
export const fmtPctRaw = (v, digits = 1) => (ok(v) ? `${v.toFixed(digits)}%` : DASH);
export const fmtRatio = (v, digits = 2) => (ok(v) ? v.toFixed(digits) : DASH);
export const fmtDays = (v) => (ok(v) ? `${whole.format(v)}d` : DASH);

export function fmtDate(dateStr) {
  if (!dateStr) return DASH;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export function fmtMonth(year, month) {
  return new Date(Date.UTC(year, month - 1, 1)).toLocaleDateString('en-GB', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

/** CSS class for a P/L number. */
export const plClass = (v) => (!ok(v) || v === 0 ? '' : v > 0 ? 'gain' : 'loss');
