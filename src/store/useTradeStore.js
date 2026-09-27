import { useMemo } from 'react';
import { create } from 'zustand';
import { supabase, isSupabaseConfigured } from '../lib/supabaseClient.js';
import { mapTradeFromDb, mapFormToDb } from '../lib/tradeMapper.js';
import { deriveAllTrades } from '../lib/calculations.js';

/**
 * Raw trades live here, exactly as stored in Supabase.
 * Derived values are never stored — use useDerivedTrades() for those.
 */
export const useTradeStore = create((set, get) => ({
  trades: [],
  loading: false,
  error: null,

  clearTrades() {
    set({ trades: [], loading: false, error: null });
  },

  async fetchTrades() {
    if (!isSupabaseConfigured) return;
    set({ loading: true, error: null });
    const { data, error } = await supabase
      .from('trades')
      .select('*')
      .order('created_at', { ascending: true });
    if (error) set({ loading: false, error: error.message });
    else set({ loading: false, trades: data.map(mapTradeFromDb) });
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
  return useMemo(() => deriveAllTrades(trades, { startingCapital }), [trades, startingCapital]);
}
