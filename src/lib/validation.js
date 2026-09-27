// Basic trade-form validation. Returns { fieldName: 'message' } — empty when valid.

const isEmpty = (v) => v === null || v === undefined || String(v).trim() === '';
const isNumber = (v) => !isEmpty(v) && Number.isFinite(Number(v));

export function validateTrade(form) {
  const errors = {};

  const required = (field, label) => {
    if (isEmpty(form[field])) errors[field] = `Enter the ${label}.`;
  };
  const positive = (field, label) => {
    if (isEmpty(form[field])) errors[field] = `Enter the ${label}.`;
    else if (!isNumber(form[field])) errors[field] = `${label[0].toUpperCase() + label.slice(1)} must be a number.`;
    else if (Number(form[field]) <= 0) errors[field] = `${label[0].toUpperCase() + label.slice(1)} must be more than 0.`;
  };

  if (!['L', 'S'].includes(form.type)) errors.type = 'Choose long or short.';
  if (!['I', 'D'].includes(form.contract)) errors.contract = 'Choose intraday or delivery.';
  required('symbol', 'symbol');
  positive('lots', 'lots');
  positive('lotSize', 'lot size');
  positive('initialStop', 'initial stop');
  if (!isEmpty(form.trailingStop)) positive('trailingStop', 'trailing stop');
  required('entryTime', 'entry time');

  if (!isEmpty(form.capAdjustment) && !isNumber(form.capAdjustment)) {
    errors.capAdjustment = 'Capital adjustment must be a number (use minus for withdrawals).';
  }

  // Which leg opens the trade and which one closes it
  const buyOpen = form.type === 'S' && form.isBuyOpen;
  const sellOpen = form.type === 'L' && form.isSellOpen;

  if (!buyOpen) {
    required('buyDate', 'buy date');
    positive('buyPrice', 'buy price');
  }

  if ((buyOpen || sellOpen) && !isNumber(form.ltp)) {
    errors.ltp = isEmpty(form.ltp) ? 'Enter the last traded price.' : 'Last traded price must be a number.';
    if (!isEmpty(form.ltp) && Number(form.ltp) <= 0) errors.ltp = 'Last traded price must be more than 0.';
  }
  if (!sellOpen) {
    required('sellDate', 'sell date');
    positive('sellPrice', 'sell price');
  }

  if (!buyOpen && !sellOpen && !isEmpty(form.buyDate) && !isEmpty(form.sellDate)) {
    if (form.type === 'L' && form.sellDate < form.buyDate) errors.sellDate = 'Sell date can’t be before the buy date.';
    if (form.type === 'S' && form.buyDate < form.sellDate) errors.buyDate = 'Cover date can’t be before the sell date.';
  }

  return errors;
}
