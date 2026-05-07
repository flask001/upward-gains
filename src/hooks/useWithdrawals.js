import { useCallback, useEffect, useState } from "react";
import { listWithdrawalsForUser } from "../services/withdrawService";

export function useWithdrawals() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listWithdrawalsForUser();
    if (err) setError(err.message);
    setRows(data ?? []);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
