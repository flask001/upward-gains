import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { listTransactionsForUser } from "../services/transactionService";

/**
 * Calculates total commission from transactions for the current user.
 */
export function useCommission() {
  const [totalCommission, setTotalCommission] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const calculateCommission = useCallback((transactions) => {
    return transactions
      .filter(t => t.type === 'commission')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let channel;

    async function loadCommission(uid) {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      if (!uid) {
        setTotalCommission(0);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      
      const { data, error: err } = await listTransactionsForUser({ limit: 1000 });
      if (cancelled) return;
      
      if (err) {
        setError(err.message);
        setTotalCommission(0);
      } else {
        const commission = calculateCommission(data || []);
        setTotalCommission(commission);
      }
      setLoading(false);

      // Subscribe to live transaction updates
      channel = supabase
        .channel(`commission-live-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${uid}`,
          },
          async () => {
            // Reload all transactions when any change occurs
            const { data: refreshedData, error: refreshErr } = await listTransactionsForUser({ limit: 1000 });
            if (!refreshErr && !cancelled) {
              const commission = calculateCommission(refreshedData || []);
              setTotalCommission(commission);
            }
          }
        )
        .subscribe();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      loadCommission(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      loadCommission(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [calculateCommission]);

  return { totalCommission, loading, error };
}
