import { useTransactions } from "../../hooks/useTransactions";

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(n));
}

function formatWhen(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function TransactionFeed({ limit = 12 }) {
  const { transactions, loading, error } = useTransactions({ limit });

  if (loading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">Loading activity…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-sm text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <h3 className="text-sm font-bold uppercase tracking-wide text-slate-800 mb-4">
        Live transactions
      </h3>
      {transactions.length === 0 ? (
        <p className="text-sm text-slate-500">No transactions yet.</p>
      ) : (
        <ul className="space-y-3 max-h-72 overflow-y-auto pr-1">
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex flex-wrap items-baseline justify-between gap-2 border-b border-slate-100 pb-3 last:border-0 last:pb-0 text-sm"
            >
              <div>
                <span
                  className={`font-semibold capitalize ${
                    t.type === "deposit"
                      ? "text-emerald-600"
                      : t.type === "withdrawal"
                        ? "text-rose-600"
                        : "text-amber-600"
                  }`}
                >
                  {t.type}
                </span>
                <span className="text-slate-400 mx-1">·</span>
                <span className="text-slate-500">{formatWhen(t.created_at)}</span>
              </div>
              <span className="font-mono font-semibold text-slate-900">
                {t.type === "withdrawal" ? "−" : "+"}
                {formatMoney(Math.abs(Number(t.amount)))}
              </span>
            </li>
          ))}
        </ul>
      )}
      <p className="mt-3 text-xs text-slate-400">
        Updates automatically when deposits, withdrawals, or profits post.
      </p>
    </div>
  );
}
