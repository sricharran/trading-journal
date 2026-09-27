// Run with: npm test   (uses Node's built-in test runner, no extra deps)
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  IBROKER,
  DBROKER,
  computeRunningCapital,
  deriveTrade,
  deriveAllTrades,
  computeDashboardStats,
  computeMonthlyPerformance,
  getOpenRate,
  toDayNumber,
} from './calculations.js';

const close = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `expected ${expected}, got ${actual}`);

const longClosed = {
  id: 'a',
  createdAt: '2026-01-05T09:00:00Z',
  capAdjustment: 0,
  type: 'L',
  contract: 'I',
  symbol: 'ABC',
  lots: 1,
  lotSize: 100,
  buyDate: '2026-01-05',
  buyPrice: 100,
  sellDate: '2026-01-05',
  sellPrice: 110,
  initialStop: 95,
  isSellOpen: false,
  isBuyOpen: false,
};

test('running capital is a manual running total, not P/L driven', () => {
  const rows = [{ capAdjustment: 5000 }, { capAdjustment: null }, { capAdjustment: -1000 }];
  assert.deepEqual(computeRunningCapital(rows, 100000), [105000, 105000, 104000]);
});

test('closed intraday long matches hand calculation', () => {
  const d = deriveTrade(longClosed, 100000, { today: toDayNumber('2026-02-01') });
  close(d.netBuyPrice, 100 * (1 + IBROKER));
  close(d.netSellPrice, 110 / (1 + IBROKER));
  close(d.netDiff, 110 / 1.0004 - 100.04);
  close(d.netPL, 100 * (110 / 1.0004 - 100.04));
  close(d.roiPct, (110 / 1.0004 - 100.04) / 100.04);
  close(d.rocePct, d.netPL / 100000);
  close(d.riskOnCapital, ((100.04 - 95 / 1.0004) * 100) / 100000);
  close(d.rewardToRisk, d.rocePct / Math.abs(d.riskOnCapital));
  assert.equal(d.daysHeld, 1);
  assert.equal(d.tradeStatus, 'Closed');
  assert.equal(d.targetReport, 'J');
  close(d.allocationPct, (10004 / 100000) * 100);
});

test('open long: status is the numeric netBuyValue and P/L is marked to stop', () => {
  const t = { ...longClosed, contract: 'D', sellDate: null, sellPrice: null, isSellOpen: true };
  const d = deriveTrade(t, 100000, { today: toDayNumber('2026-01-14') });
  const netBuy = 100 * (1 + DBROKER);
  assert.equal(typeof d.tradeStatus, 'number');
  close(d.tradeStatus, 100 * netBuy);
  // openRate: buyDate !== sellDate and contract D -> DBROKER
  close(d.netDiff, 95 / (1 + DBROKER) - netBuy);
  assert.equal(d.daysHeld, 10);
});

test('openRate quirk: open intraday long uses 0, same-day dates use IBROKER', () => {
  assert.equal(getOpenRate({ contract: 'I', buyDate: '2026-01-05', sellDate: null }), 0);
  assert.equal(getOpenRate({ contract: 'D', buyDate: '2026-01-05', sellDate: '2026-01-05' }), IBROKER);
  assert.equal(getOpenRate({ contract: 'D', buyDate: '2026-01-05', sellDate: '2026-01-09' }), DBROKER);
});

test('closed short trade', () => {
  const t = {
    ...longClosed,
    type: 'S',
    contract: 'D',
    sellDate: '2026-01-05',
    sellPrice: 200,
    buyDate: '2026-01-08',
    buyPrice: 190,
    initialStop: 205,
  };
  const d = deriveTrade(t, 50000);
  close(d.netDiff, 200 / 1.001 - 190 * 1.001);
  close(d.roiPct, d.netDiff / (200 / 1.001));
  close(d.riskOnCapital, ((205 * 1.001 - 200 / 1.001) * 100) / 50000);
  assert.equal(d.daysHeld, 4);
  assert.equal(d.tradeStatus, 'Closed');
});

test('status quirk: open short with a sell date reports "Closed", like the sheet', () => {
  const t = {
    ...longClosed,
    type: 'S',
    sellDate: '2026-01-05',
    sellPrice: 200,
    buyDate: null,
    buyPrice: null,
    isBuyOpen: true,
    initialStop: 205,
  };
  const d = deriveTrade(t, 50000, { today: toDayNumber('2026-01-06') });
  assert.equal(d.tradeStatus, 'Closed');
  assert.equal(d.daysHeld, 2);
  // openRate: '2026-01-05' !== '' and contract I -> 0
  close(d.netDiff, 200 / 1.0004 - 205);
});

test('zero capital returns null (Excel #DIV/0!) instead of Infinity', () => {
  const d = deriveTrade(longClosed, 0);
  assert.equal(d.rocePct, null);
  assert.equal(d.riskOnCapital, null);
  assert.equal(d.rewardToRisk, null);
  assert.equal(d.targetReport, null);
});

test('dashboard stats and monthly table', () => {
  const trades = [
    { ...longClosed, id: '1', createdAt: '2026-01-05T09:00:00Z', capAdjustment: 100000 },
    { ...longClosed, id: '2', createdAt: '2026-01-06T09:00:00Z', buyDate: '2026-01-06', sellDate: '2026-01-06', sellPrice: 97 },
    { ...longClosed, id: '3', createdAt: '2026-02-02T09:00:00Z', buyDate: '2026-02-02', sellDate: '2026-02-03', sellPrice: 105 },
    { ...longClosed, id: '4', createdAt: '2026-02-10T09:00:00Z', buyDate: '2026-02-10', sellDate: null, sellPrice: null, isSellOpen: true },
  ];
  const rows = deriveAllTrades(trades, { startingCapital: 0, today: toDayNumber('2026-02-12') });
  const s = computeDashboardStats(rows);

  assert.equal(s.totalTrades, 3);
  close(s.winRate, 2 / 3);
  assert.equal(s.openTrades, 1);
  const pl = rows.slice(0, 3).map((r) => r.netPL);
  close(s.totalNetPL, pl[0] + pl[1] + pl[2]);
  close(s.profitFactor, (pl[0] + pl[2]) / Math.abs(pl[1]));
  close(s.expectancy, (2 / 3) * ((pl[0] + pl[2]) / 2) + (1 / 3) * pl[1]);
  close(s.openExposurePct, rows[3].netBuyValue / 100000);

  const m = computeMonthlyPerformance(rows);
  assert.equal(m.length, 2);
  assert.equal(m[0].key, '2026-01');
  assert.equal(m[0].trades, 2);
  assert.equal(m[0].wins, 1);
  assert.equal(m[0].losses, 1);
  assert.equal(m[1].trades, 1);
  close(m[1].cumulativePL, pl[0] + pl[1] + pl[2]);
});
