import { useMemo } from 'react';
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { mapTradeFromDb, mapFormToDb } from '../lib/tradeMapper.js';
import { deriveTradesWithCapitalAdjustments } from '../lib/calculations.js';

/**
 * Raw trades live here, exactly as stored in Supabase.
 * Derived values are never stored — use useDerivedTrades() for those.
 */
export const useTradeStore = create((set, get) => ({
  trades: [],
  capitalAdjustments: [],
  capitalAdjustmentError: null,
  loading: false,
  error: null,

  clearTrades() {
    set({ trades: [], capitalAdjustments: [], capitalAdjustmentError: null, loading: false, error: null });
  },

  async fetchTrades() {
    if (!isSupabaseConfigured) return;
    set({ loading: true, error: null, capitalAdjustments: [], capitalAdjustmentError: null });
    const [tradesResult, adjustmentsResult] = await Promise.all([
      supabase.from('trades').select('*').order('created_at', { ascending: true }),
      supabase.from('capital_adjustments').select('*').order('created_at', { ascending: true }),
    ]);
    if (tradesResult.error) {
      set({ loading: false, error: tradesResult.error.message });
      return;
    }
    set({
      loading: false,
      trades: tradesResult.data.map(mapTradeFromDb),
      capitalAdjustments: adjustmentsResult.error ? [] : adjustmentsResult.data.map((row) => ({
        id: row.id,
        direction: row.direction,
        amount: Number(row.amount),
        createdAt: row.created_at,
      })),
      capitalAdjustmentError: adjustmentsResult.error?.message ?? null,
    });
  },

  async addCapitalAdjustment(direction, amount) {
    const { data, error } = await supabase
      .from('capital_adjustments')
      .insert({ direction, amount: Number(amount) })
      .select()
      .single();
    if (error) throw new Error(error.message);
    const adjustment = { id: data.id, direction: data.direction, amount: Number(data.amount), createdAt: data.created_at };
    set({ capitalAdjustments: [...get().capitalAdjustments, adjustment], capitalAdjustmentError: null });
    return adjustment;
  },

  async addTrade(form) {
    const { data, error } = await supabase.from('trades').insert(mapFormToDb(form)).select().single();
    if (error) throw new Error(error.message);
    set({ trades: [...get().trades, mapTradeFromDb(data)] });
  },

  async updateTrade(id, form) {
    const { data, error } = await supabase
      .from('trades')
      .update(mapFormToDb(form))
      .eq('id', id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    const updated = mapTradeFromDb(data);
    set({ trades: get().trades.map((t) => (t.id === id ? updated : t)) });
  },

  async deleteTrade(id) {
    const { error } = await supabase.from('trades').delete().eq('id', id);
    if (error) throw new Error(error.message);
    set({ trades: get().trades.filter((t) => t.id !== id) });
  },
}));

/** All trades with derived fields, in entry order (oldest first). */
export function useDerivedTrades(startingCapital = 0) {
  const trades = useTradeStore((s) => s.trades);
  const capitalAdjustments = useTradeStore((s) => s.capitalAdjustments);
  return useMemo(
    () => deriveTradesWithCapitalAdjustments(trades, capitalAdjustments, { startingCapital }),
    [trades, capitalAdjustments, startingCapital]
  );
}
