import { useCallback, useEffect, useState } from "react";
import { listInvoicesForUser } from "../services/invoiceService";

export function useInvoices(status) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await listInvoicesForUser(
      status ? { status } : {}
    );
    if (err) setError(err.message);
    setRows(data ?? []);
    setLoading(false);
  }, [status]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { rows, loading, error, refresh };
}
