/**
 * calculations.js
 *
 * Every derived field from trading-journal-build-spec.md, as pure functions.
 * Nothing in here touches React, Supabase, or the browser, so it can be
 * tested directly with `npm test` (Node's built-in test runner).
 *
 * The formulas are ported AS-IS from the original Excel tracker, quirks
 * included. Where the sheet would show an error (#DIV/0!, #VALUE!), these
 * functions return `null` so the UI can render a dash instead.
 *
 * Blank inputs follow Excel semantics: an empty cell used in arithmetic
 * counts as 0 (e.g. netSellPrice is 0 when the sell price is blank).
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const IBROKER = 0.0004; // Intraday brokerage rate
export const DBROKER = 0.001; // Delivery brokerage rate
export const DEFAULT_STARTING_CAPITAL = 0; // overridden by the signed-in account setting

const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Small helpers
// ---------------------------------------------------------------------------

/** True when a value is a blank cell (null, undefined, or empty string). */
export function isBlank(value) {
  return value === null || value === undefined || value === '';
}

/** Excel-style: a blank cell used in arithmetic counts as 0. */
function n(value) {
  return isBlank(value) ? 0 : Number(value);
}

/** True for real, finite numbers. */
export function isNum(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Division that returns null instead of Infinity/NaN (Excel's #DIV/0!). */
function div(a, b) {
  if (!isNum(a) || !isNum(b) || b === 0) return null;
  return a / b;
}

/** 'YYYY-MM-DD' -> whole-day serial number (UTC based, timezone safe). */
export function toDayNumber(dateStr) {
  if (isBlank(dateStr)) return null;
  const [y, m, d] = String(dateStr).slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return null;
  return Date.UTC(y, m - 1, d) / MS_PER_DAY;
}

/** Local calendar date of a JS Date -> day serial number (like Excel TODAY()). */
export function todayDayNumber(now = new Date()) {
  return Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / MS_PER_DAY;
}

// ---------------------------------------------------------------------------
// Running capital
// ---------------------------------------------------------------------------

/**
 * Running account capital down the rows, in entry order. Each row applies its
 * capital adjustment, then adds realized P/L when the trade is closed.
 *
 * @param {Array<{capAdjustment?: number|null}>} tradesInEntryOrder
 * @param {number} startingCapital
 * @returns {number[]} closingCapital for each row, same order as input
 */
export function computeRunningCapital(tradesInEntryOrder, startingCapital = DEFAULT_STARTING_CAPITAL) {
  const result = [];
  let running = n(startingCapital);
  for (const trade of tradesInEntryOrder) {
    running += n(trade.capAdjustment);
    const derived = deriveTrade(trade, running);
    if (!isOpenPosition(trade) && isNum(derived.netPL)) running += derived.netPL;
    result.push(running);
  }
  return result;
}

// ---------------------------------------------------------------------------
// Per-trade derived fields
// ---------------------------------------------------------------------------

/** Brokerage rate used by most formulas. */
export function getRate(contract) {
  if (contract === 'I') return IBROKER;
  if (contract === 'D') return DBROKER;
  return 0;
}

/**
 * Rate used by the open-position branch of netDiff.
 * QUIRK (ported as-is): picks IBROKER whenever buyDate equals sellDate
 * (including when both are blank), otherwise DBROKER only for delivery.
 * An open intraday long therefore uses 0 here, not IBROKER.
 */
export function getOpenRate(trade) {
  const buy = isBlank(trade.buyDate) ? '' : String(trade.buyDate).slice(0, 10);
  const sell = isBlank(trade.sellDate) ? '' : String(trade.sellDate).slice(0, 10);
  if (buy === sell) return IBROKER;
  return trade.contract === 'D' ? DBROKER : 0;
}

export function calcDaysHeld(trade, today = todayDayNumber()) {
  const buy = toDayNumber(trade.buyDate);
  const sell = toDayNumber(trade.sellDate);
  let days = null;

  if (trade.type === 'L') {
    if (trade.isSellOpen) days = buy === null ? null : today - buy + 1;
    else days = buy === null || sell === null ? null : sell - buy + 1;
  } else if (trade.type === 'S') {
    if (trade.isBuyOpen) days = sell === null ? null : today - sell + 1;
    else days = buy === null || sell === null ? null : buy - sell + 1;
  }
  return days;
}

export function calcNetDiff(trade, netBuyPrice, netSellPrice) {
  if (trade.type === 'L') {
    if (isBlank(trade.sellPrice)) return n(trade.ltp) / (1 + getRate(trade.contract)) - netBuyPrice;
    return netSellPrice - netBuyPrice;
  }
  if (trade.type === 'S') {
    if (isBlank(trade.buyPrice)) return netSellPrice - n(trade.ltp) * (1 + getRate(trade.contract));
    return netSellPrice - netBuyPrice;
  }
  return null;
}

/**
 * QUIRK (ported as-is): returns the string 'Closed', OR a NUMBER
 * (the open position's value) for open trades, OR ''.
 * Note that the 'Closed' check only looks at sellDate, so a Short trade
 * that has a sell date but is still waiting to be covered (isBuyOpen)
 * comes out as 'Closed' — exactly like the original sheet.
 */
export function calcTradeStatus(trade, netBuyValue, netSellValue) {
  const sellDateIsReal = !trade.isSellOpen && toDayNumber(trade.sellDate) !== null;
  if (sellDateIsReal) return 'Closed';
  if (trade.type === 'L' && trade.isSellOpen) return netBuyValue;
  if (trade.type === 'S' && trade.isBuyOpen) return netSellValue;
  return '';
}

/**
 * All derived values for one trade.
 *
 * @param {object} trade          camelCase trade (see mapTradeFromDb)
 * @param {number} capitalAtEntry running capital after this row's adjustment, before its result
 * @param {object} [options]
 * @param {number} [options.today] day serial number for "today" (tests)
 */
export function deriveTrade(trade, capitalAtEntry, { today = todayDayNumber() } = {}) {
  const rate = getRate(trade.contract);
  const qty = n(trade.lots) * n(trade.lotSize);

  const netBuyPrice = n(trade.buyPrice) * (1 + rate);
  const netBuyValue = qty * netBuyPrice;
  const netSellPrice = n(trade.sellPrice) / (1 + rate);
  const netSellValue = qty * netSellPrice;

  const daysHeld = calcDaysHeld(trade, today);
  const netDiff = calcNetDiff(trade, netBuyPrice, netSellPrice);
  const netPL = isNum(netDiff) ? qty * netDiff : null;

  const roiPct = trade.type === 'L' ? div(netDiff, netBuyPrice) : div(netDiff, netSellPrice);
  const rocePct = div(netPL, capitalAtEntry);

  const stop = n(trade.initialStop);
  let riskOnCapital = null;
  if (trade.type === 'L') {
    riskOnCapital = div((netBuyPrice - stop / (1 + rate)) * qty, capitalAtEntry);
  } else if (trade.type === 'S') {
    riskOnCapital = div((stop * (1 + rate) - netSellPrice) * qty, capitalAtEntry);
  }

  const rewardToRisk = isNum(riskOnCapital) ? div(rocePct, Math.abs(riskOnCapital)) : null;
  const tradeStatus = calcTradeStatus(trade, netBuyValue, netSellValue);

  const targetReport =
    isNum(rocePct) && isNum(riskOnCapital) ? (rocePct >= -riskOnCapital ? 'J' : 'L') : null;

  const allocationAmount = trade.type === 'L' ? netBuyValue : netSellValue;
  const allocationRatio = div(allocationAmount, capitalAtEntry);
  const allocationPct = allocationRatio === null ? null : allocationRatio * 100;

  return {
    rate,
    capitalAtEntry,
    closingCapital: capitalAtEntry,
    netBuyPrice,
    netBuyValue,
    netSellPrice,
    netSellValue,
    daysHeld,
    netDiff,
    netPL,
    roiPct, // fraction, e.g. 0.05 = 5% (formatted as % in the UI, like Excel)
    rocePct, // fraction
    riskOnCapital, // fraction
    rewardToRisk,
    tradeStatus,
    targetReport,
    allocationPct, // already multiplied by 100, as in the spec
  };
}

/** Convenience flag for UI styling: is this position still open? */
export function isOpenPosition(trade) {
  return Boolean(
    (trade.type === 'L' && trade.isSellOpen) || (trade.type === 'S' && trade.isBuyOpen)
  );
}

/** Sort key for entry order: created_at ascending, id as tie-breaker. */
function byEntryOrder(a, b) {
  const ta = a.createdAt ? Date.parse(a.createdAt) : 0;
  const tb = b.createdAt ? Date.parse(b.createdAt) : 0;
  if (ta !== tb) return ta - tb;
  return String(a.id).localeCompare(String(b.id));
}

/**
 * Derive every trade. Each trade's ratios use capital after its adjustment
 * and before its own result; closingCapital then includes its realized P/L
 * for subsequent rows. Open P/L stays unrealized. Returns entry order.
 */
export function deriveAllTrades(trades, { startingCapital = DEFAULT_STARTING_CAPITAL, today = todayDayNumber() } = {}) {
  const ordered = [...trades].sort(byEntryOrder);
  let capital = n(startingCapital);
  return ordered.map((trade) => {
    capital += n(trade.capAdjustment);
    const derived = deriveTrade(trade, capital, { today });
    if (!isOpenPosition(trade) && isNum(derived.netPL)) capital += derived.netPL;
    return { ...trade, ...derived, closingCapital: capital };
  });
}

// ---------------------------------------------------------------------------
// Dashboard stats
// ---------------------------------------------------------------------------

function sum(values) {
  return values.reduce((acc, v) => acc + v, 0);
}

function avg(values) {
  return values.length ? sum(values) / values.length : null;
}

/** Rows that no longer have an open position. */
export function closedTrades(derivedRows) {
  return derivedRows.filter((row) => !isOpenPosition(row));
}

/**
 * @param {Array} derivedRows output of deriveAllTrades (entry order)
 */
export function computeDashboardStats(derivedRows) {
  const closed = closedTrades(derivedRows);
  const pls = closed.map((r) => r.netPL).filter(isNum);
  const winners = pls.filter((v) => v > 0);
  const losers = pls.filter((v) => v < 0);

  const totalTrades = closed.length;
  const winRate = div(winners.length, totalTrades);
  const totalNetPL = sum(pls);

  // '-' (null) if there are no wins; also null if there are no losses (#DIV/0!)
  const profitFactor = winners.length ? div(sum(winners), Math.abs(sum(losers))) : null;

  const avgWinner = avg(winners);
  const avgLoser = avg(losers);

  // A missing average only happens when its weight is 0, so treat it as 0.
  // (Excel would show #DIV/0! here; this gives the mathematically equal value.)
  const expectancy =
    winRate === null ? null : winRate * (avgWinner ?? 0) + (1 - winRate) * (avgLoser ?? 0);

  const avgRRR = avg(closed.map((r) => r.rewardToRisk).filter((v) => isNum(v) && v !== 0));
  const avgHoldDays = avg(closed.map((r) => r.daysHeld).filter((v) => isNum(v) && v !== 0));

  const openTrades =
    derivedRows.filter((r) => r.isSellOpen).length + derivedRows.filter((r) => r.isBuyOpen).length;

  const unrealizedPL = sum(
    derivedRows.filter(isOpenPosition).map((r) => r.netPL).filter(isNum)
  );

  // Not captured from the sheet (TradeSheet!S1) — defined fresh:
  // sum of open position value / latest running capital.
  const openValue = sum(
    derivedRows
      .map((r) => {
        if (r.type === 'L' && r.isSellOpen) return r.netBuyValue;
        if (r.type === 'S' && r.isBuyOpen) return r.netSellValue;
        return 0;
      })
      .filter(isNum)
  );
  const latestCapital = derivedRows.length ? derivedRows[derivedRows.length - 1].closingCapital : null;
  const openExposurePct = div(openValue, latestCapital); // fraction

  return {
    totalTrades,
    winRate,
    totalNetPL,
    unrealizedPL,
    profitFactor,
    avgWinner,
    avgLoser,
    expectancy,
    avgRRR,
    avgHoldDays,
    openTrades,
    openExposurePct,
    latestCapital,
  };
}

// ---------------------------------------------------------------------------
// Monthly performance
// ---------------------------------------------------------------------------

/**
 * Closed trades grouped by their close month, chronologically. Longs close
 * on sellDate; shorts close when covered on buyDate.
 */
export function computeMonthlyPerformance(derivedRows) {
  const groups = new Map();

  for (const row of closedTrades(derivedRows)) {
    const closeDate = row.type === 'S' ? row.buyDate : row.sellDate;
    if (isBlank(closeDate)) continue;
    const key = String(closeDate).slice(0, 7); // 'YYYY-MM'
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(row);
  }

  const keys = [...groups.keys()].sort();
  let cumulativePL = 0;

  return keys.map((key) => {
    const rows = groups.get(key);
    const pls = rows.map((r) => r.netPL).filter(isNum);
    const trades = rows.length;
    const wins = pls.filter((v) => v > 0).length;
    const losses = pls.filter((v) => v < 0).length;
    const grossPL = sum(pls);
    cumulativePL += grossPL;
    const [year, month] = key.split('-').map(Number);

    return {
      key,
      year,
      month,
      trades,
      wins,
      losses,
      winRate: div(wins, trades),
      grossPL,
      avgPL: div(grossPL, trades),
      cumulativePL,
    };
  });
}
