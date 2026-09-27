import { useState } from 'react';
import { EMPTY_FORM, mapTradeToForm } from '../lib/tradeMapper.js';
import { validateTrade } from '../lib/validation.js';

/**
 * Add / edit form. Raw fields only — nothing derived is entered or stored here.
 * Props:
 *   trade    – existing trade to edit, or null for a new one
 *   onSave   – async (formValues) => void
 *   onCancel – () => void
 */
export default function TradeForm({ trade, onSave, onCancel }) {
  const [form, setForm] = useState(trade ? mapTradeToForm(trade) : EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const isEdit = Boolean(trade);
  const isLong = form.type === 'L';
  const buyLocked = !isLong && form.isBuyOpen; // short not covered yet
  const sellLocked = isLong && form.isSellOpen; // long not sold yet

  function update(field, value) {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      // Only the closing leg can be open: keep the flags consistent with the type.
      if (field === 'type') {
        next.isSellOpen = false;
        next.isBuyOpen = false;
      }
      if (field === 'isSellOpen' && value) {
        next.sellDate = '';
        next.sellPrice = '';
        next.exitTime = '';
      }
      if (field === 'isBuyOpen' && value) {
        next.buyDate = '';
        next.buyPrice = '';
        next.exitTime = '';
      }
      return next;
    });
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSave() {
    const found = validateTrade(form);
    setErrors(found);
    if (Object.keys(found).length) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSave(form);
    } catch (err) {
      setSaveError(`Couldn’t save the trade: ${err.message}`);
      setSaving(false);
    }
  }

  const field = (name, label, props = {}) => (
    <Field name={name} label={label} error={errors[name]}>
      <input
        id={name}
        value={form[name]}
        onChange={(e) => update(name, e.target.value)}
        aria-invalid={Boolean(errors[name])}
        {...props}
      />
    </Field>
  );

  const numeric = { type: 'number', inputMode: 'decimal', step: 'any' };

  return (
    <section className="trade-form" aria-labelledby="trade-form-title">
      <div className="trade-form-head">
        <h2 id="trade-form-title">{isEdit ? `Edit ${trade.symbol}` : 'New trade'}</h2>
      </div>

      <div className="form-grid">
        <fieldset className="group">
          <legend>Position</legend>
          <Segmented
            label="Side"
            name="type"
            value={form.type}
            onChange={(v) => update('type', v)}
            options={[
              { value: 'L', label: 'Long' },
              { value: 'S', label: 'Short' },
            ]}
          />
          <Segmented
            label="Contract"
            name="contract"
            value={form.contract}
            onChange={(v) => update('contract', v)}
            options={[
              { value: 'I', label: 'Intraday' },
              { value: 'D', label: 'Delivery' },
            ]}
          />
          {field('symbol', 'Symbol', { autoCapitalize: 'characters', placeholder: 'e.g. NIFTY' })}
          <div className="row-2">
            {field('lots', 'Lots', numeric)}
            {field('lotSize', 'Lot size', numeric)}
          </div>
          {field('initialStop', 'Initial stop', numeric)}
        </fieldset>

        <fieldset className="group">
          <legend>{isLong ? 'Buy, then sell' : 'Sell, then cover'}</legend>

          {isLong ? (
            <>
              <div className="row-2">
                {field('buyDate', 'Buy date', { type: 'date' })}
                {field('buyPrice', 'Buy price', numeric)}
              </div>
              <Toggle
                id="isSellOpen"
                checked={form.isSellOpen}
                onChange={(v) => update('isSellOpen', v)}
                label="Still holding — not sold yet"
              />
              {form.isSellOpen && field('ltp', 'Last traded price (LTP)', numeric)}
              <div className="row-2">
                {field('sellDate', 'Sell date', { type: 'date', disabled: sellLocked })}
                {field('sellPrice', 'Sell price', { ...numeric, disabled: sellLocked })}
              </div>
            </>
          ) : (
            <>
              <div className="row-2">
                {field('sellDate', 'Sell date', { type: 'date' })}
                {field('sellPrice', 'Sell price', numeric)}
              </div>
              <Toggle
                id="isBuyOpen"
                checked={form.isBuyOpen}
                onChange={(v) => update('isBuyOpen', v)}
                label="Still short — not covered yet"
              />
              {form.isBuyOpen && field('ltp', 'Last traded price (LTP)', numeric)}
              <div className="row-2">
                {field('buyDate', 'Cover date', { type: 'date', disabled: buyLocked })}
                {field('buyPrice', 'Cover price', { ...numeric, disabled: buyLocked })}
              </div>
            </>
          )}

          <div className="row-2">
            {field('entryTime', 'Entry time', { type: 'time' })}
            {field('exitTime', 'Exit time', { type: 'time', disabled: sellLocked || buyLocked })}
          </div>
        </fieldset>

        <fieldset className="group">
          <legend>Capital and notes</legend>
          {field('capAdjustment', 'Capital added or withdrawn', { ...numeric, placeholder: '0' })}
          <p className="hint">Leave blank unless you moved money in (positive) or out (negative) with this entry.</p>
          <Field name="notes" label="Notes" error={errors.notes}>
            <textarea id="notes" rows={4} value={form.notes} onChange={(e) => update('notes', e.target.value)} />
          </Field>
        </fieldset>
      </div>

      {saveError && (
        <p className="form-error" role="alert">
          {saveError}
        </p>
      )}
      {Object.keys(errors).some((k) => errors[k]) && (
        <p className="form-error" role="alert">
          Fix the highlighted fields to save this trade.
        </p>
      )}

      <div className="form-actions">
        <button type="button" className="btn primary" onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add trade'}
        </button>
        <button type="button" className="btn ghost" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
      </div>
    </section>
  );
}

function Field({ name, label, error, children }) {
  return (
    <div className={`field${error ? ' has-error' : ''}`}>
      <label htmlFor={name}>{label}</label>
      {children}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

function Segmented({ label, name, value, options, onChange }) {
  return (
    <div className="field">
      <span className="field-label" id={`${name}-label`}>
        {label}
      </span>
      <div className="segmented" role="radiogroup" aria-labelledby={`${name}-label`}>
        {options.map((opt) => (
          <label key={opt.value} className={value === opt.value ? 'on' : ''}>
            <input
              type="radio"
              name={name}
              value={opt.value}
              checked={value === opt.value}
              onChange={() => onChange(opt.value)}
            />
            {opt.label}
          </label>
        ))}
      </div>
    </div>
  );
}

function Toggle({ id, checked, onChange, label }) {
  return (
    <label className="toggle" htmlFor={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span>{label}</span>
    </label>
  );
}
