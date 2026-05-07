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

export default function CommissionList() {
  const { transactions, loading, error } = useTransactions({ limit: 100 });

  const commissionTransactions = transactions.filter(t => t.type === 'commission');

  if (loading) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-16 sm:min-h-[260px]">
        <p className="text-center text-sm font-semibold text-slate-700">
          Loading commission history…
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-16 sm:min-h-[260px]">
        <p className="text-center text-sm font-semibold text-rose-700">
          Error loading commission history: {error}
        </p>
      </div>
    );
  }

  if (commissionTransactions.length === 0) {
    return (
      <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-16 sm:min-h-[260px]">
        <p className="text-center text-sm font-semibold text-slate-700">
          No Commission History
        </p>
      </div>
    );
  }

  const totalCommission = commissionTransactions.reduce((sum, t) => sum + Number(t.amount || 0), 0);

  return (
    <div className="pt-5">
      <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900">
        <div className="flex items-center justify-between">
          <span>Total Commission Earned</span>
          <span className="font-bold text-emerald-700">
            {formatMoney(totalCommission)}
          </span>
        </div>
      </div>

      <div className="space-y-3">
        {commissionTransactions.map((t) => (
          <div
            key={t.id}
            className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="inline-flex items-center rounded-md bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                  Commission
                </span>
                <span className="text-xs text-slate-500">
                  {formatWhen(t.created_at)}
                </span>
              </div>
              {t.description && (
                <p className="text-sm text-slate-600 mt-1">{t.description}</p>
              )}
            </div>
            <div className="text-right">
              <span className="font-mono font-semibold text-emerald-600">
                +{formatMoney(Math.abs(Number(t.amount)))}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
