import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { getBalance } from "../services/balanceService";

export function useBalance() {
  const [balance, setBalance] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  const refresh = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) {
      setBalance(0);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { balance: b, error: err } = await getBalance(id);
    if (err) setError(err.message);
    setBalance(b ?? 0);
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    let mounted = true;

    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const uid = session?.user?.id ?? null;
      if (!mounted) return;
      setUserId(uid);
      if (!uid) {
        setBalance(0);
        setLoading(false);
        return;
      }
      await refresh(uid);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      const uid = session?.user?.id ?? null;
      setUserId(uid);
      if (uid) refresh(uid);
      else {
        setBalance(0);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  return { balance, loading, error, refresh: () => refresh(userId), userId };
}
