// Converts between the database shape (snake_case) and the app shape (camelCase).
// Only raw input columns ever go to the database.

const toNumOrNull = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const toStrOrNull = (v) => (v === null || v === undefined || String(v).trim() === '' ? null : String(v).trim());

export function mapTradeFromDb(row) {
  return {
    id: row.id,
    createdAt: row.created_at,
    capAdjustment: toNumOrNull(row.cap_adjustment),
    type: row.type,
    contract: row.contract,
    symbol: row.symbol,
    lots: toNumOrNull(row.lots),
    lotSize: toNumOrNull(row.lot_size),
    buyDate: row.buy_date,
    buyPrice: toNumOrNull(row.buy_price),
    sellDate: row.sell_date,
    sellPrice: toNumOrNull(row.sell_price),
    ltp: toNumOrNull(row.last_traded_price),
    initialStop: toNumOrNull(row.initial_stop),
    trailingStop: toNumOrNull(row.trailing_stop),
    isBuyOpen: Boolean(row.is_buy_open),
    isSellOpen: Boolean(row.is_sell_open),
    entryTime: row.entry_time ? String(row.entry_time).slice(0, 5) : '',
    exitTime: row.exit_time ? String(row.exit_time).slice(0, 5) : '',
    notes: row.notes ?? '',
  };
}

/** Form values (strings) -> database row. */
export function mapFormToDb(form) {
  return {
    cap_adjustment: toNumOrNull(form.capAdjustment),
    type: form.type,
    contract: form.contract,
    symbol: String(form.symbol).trim().toUpperCase(),
    lots: toNumOrNull(form.lots),
    lot_size: toNumOrNull(form.lotSize),
    buy_date: form.isBuyOpen ? null : toStrOrNull(form.buyDate),
    buy_price: form.isBuyOpen ? null : toNumOrNull(form.buyPrice),
    sell_date: form.isSellOpen ? null : toStrOrNull(form.sellDate),
    sell_price: form.isSellOpen ? null : toNumOrNull(form.sellPrice),
    last_traded_price: (form.isSellOpen || form.isBuyOpen) ? toNumOrNull(form.ltp) : null,
    initial_stop: toNumOrNull(form.initialStop),
    trailing_stop: toNumOrNull(form.trailingStop),
    is_buy_open: Boolean(form.isBuyOpen),
    is_sell_open: Boolean(form.isSellOpen),
    entry_time: toStrOrNull(form.entryTime),
    exit_time: toStrOrNull(form.exitTime),
    notes: toStrOrNull(form.notes),
  };
}

/** App trade -> form values (everything as strings for controlled inputs). */
export function mapTradeToForm(trade) {
  const s = (v) => (v === null || v === undefined ? '' : String(v));
  return {
    capAdjustment: s(trade.capAdjustment),
    type: trade.type,
    contract: trade.contract,
    symbol: s(trade.symbol),
    lots: s(trade.lots),
    lotSize: s(trade.lotSize),
    buyDate: s(trade.buyDate),
    buyPrice: s(trade.buyPrice),
    sellDate: s(trade.sellDate),
    sellPrice: s(trade.sellPrice),
    ltp: s(trade.ltp),
    initialStop: s(trade.initialStop),
    trailingStop: s(trade.trailingStop),
    isBuyOpen: Boolean(trade.isBuyOpen),
    isSellOpen: Boolean(trade.isSellOpen),
    entryTime: s(trade.entryTime),
    exitTime: s(trade.exitTime),
    notes: s(trade.notes),
  };
}

export const EMPTY_FORM = {
  capAdjustment: '',
  type: 'L',
  contract: 'I',
  symbol: '',
  lots: '1',
  lotSize: '',
  buyDate: '',
  buyPrice: '',
  sellDate: '',
  sellPrice: '',
  ltp: '',
  initialStop: '',
  trailingStop: '',
  isBuyOpen: false,
  isSellOpen: false,
  entryTime: '',
  exitTime: '',
  notes: '',
};
