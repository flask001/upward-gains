import { useCallback, useEffect, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { listInvestmentsForUser } from "../services/investmentService";

export function useInvestments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userId, setUserId] = useState(null);

  const refresh = useCallback(async (uid) => {
    const id = uid ?? userId;
    if (!id) {
      setInvestments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: err } = await listInvestmentsForUser();
    if (err) setError(err.message);
    // Filter investments for current user
    const userInvestments = data?.filter(inv => inv.user_id === id) ?? [];
    setInvestments(userInvestments);
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
        setInvestments([]);
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
        setInvestments([]);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [refresh]);

  return { investments, loading, error, refresh: () => refresh(userId), userId };
}
