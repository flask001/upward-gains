import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../services/supabaseClient";
import { listTransactionsForUser } from "../services/transactionService";

/**
 * Loads transactions and subscribes to live INSERTs for the current user.
 */
export function useTransactions(options = {}) {
  const { limit = 50 } = options;
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const pushIncoming = useCallback(
    (row) => {
      setRows((prev) => {
        if (prev.some((r) => r.id === row.id)) return prev;
        return [row, ...prev].slice(0, limit);
      });
    },
    [limit]
  );

  useEffect(() => {
    let cancelled = false;
    let channel;

    async function bind(uid) {
      if (channel) {
        await supabase.removeChannel(channel);
        channel = null;
      }

      if (!uid) {
        setRows([]);
        setLoading(false);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      const { data, error: err } = await listTransactionsForUser({ limit });
      if (cancelled) return;
      if (err) setError(err.message);
      setRows(data ?? []);
      setLoading(false);

      channel = supabase
        .channel(`transactions-live-${uid}`)
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "transactions",
            filter: `user_id=eq.${uid}`,
          },
          (payload) => {
            if (payload.new) pushIncoming(payload.new);
          }
        )
        .subscribe();
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      bind(session?.user?.id ?? null);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      bind(session?.user?.id ?? null);
    });

    return () => {
      cancelled = true;
      subscription.unsubscribe();
      if (channel) supabase.removeChannel(channel);
    };
  }, [limit, pushIncoming]);

  const sorted = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      ),
    [rows]
  );

  return { transactions: sorted, loading, error };
}
