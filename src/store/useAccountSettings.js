import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export function useAccountSettings(userId) {
  const [startingCapital, setStartingCapital] = useState(0);
  const [loading, setLoading] = useState(Boolean(userId));
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;
    if (!userId) {
      setStartingCapital(0);
      setLoading(false);
      setError(null);
      return () => { active = false; };
    }

    setLoading(true);
    setError(null);
    async function load() {
      const { data, error: readError } = await supabase
        .from('account_settings')
        .select('starting_capital')
        .eq('user_id', userId)
        .maybeSingle();
      if (readError) {
        if (active) setError(readError.message);
      } else if (!data) {
        const { error: insertError } = await supabase
          .from('account_settings')
          .insert({ user_id: userId, starting_capital: 0 });
        if (insertError && active) setError(insertError.message);
      } else if (active) {
        setStartingCapital(Number(data.starting_capital));
      }
      if (active) setLoading(false);
    }
    load();
    return () => { active = false; };
  }, [userId]);

  async function saveStartingCapital(value) {
    const amount = Number(value);
    if (!Number.isFinite(amount)) throw new Error('Enter a valid capital amount.');
    const { error: saveError } = await supabase
      .from('account_settings')
      .upsert({ user_id: userId, starting_capital: amount });
    if (saveError) throw new Error(saveError.message);
    setStartingCapital(amount);
  }

  return { startingCapital, loading, error, saveStartingCapital };
}
