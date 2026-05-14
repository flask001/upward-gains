import DashboardListCard from "../../components/dashboard/DashboardListCard";
import { useTransactions } from "../../hooks/useTransactions";

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(n));
}

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

export default function Earnings() {
  const { transactions, loading, error } = useTransactions();

  // Filter for profit transactions only
  const profitTransactions = transactions?.filter(t => t.type === 'profit') ?? [];

  if (loading) {
    return (
      <DashboardListCard
        breadcrumbLabel="Earnings"
        title="Earnings"
        subtitle="Earning History"
        emptyText="Loading..."
      />
    );
  }

  if (error) {
    return (
      <DashboardListCard
        breadcrumbLabel="Earnings"
        title="Earnings"
        subtitle="Earning History"
        emptyText={`Error: ${error}`}
      />
    );
  }

  if (profitTransactions.length === 0) {
    return (
      <DashboardListCard
        breadcrumbLabel="Earnings"
        title="Earnings"
        subtitle="Earning History"
        emptyText="No Earning History"
      />
    );
  }

  return (
    <DashboardListCard
      breadcrumbLabel="Earnings"
      title="Earnings"
      subtitle="Earning History"
    >
      <div className="space-y-4">
        {profitTransactions.map((transaction) => (
          <div
            key={transaction.id}
            className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50 transition"
          >
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                    Profit
                  </span>
                  <span className="text-sm text-slate-500">
                    {formatDate(transaction.created_at)}
                  </span>
                </div>
                <div className="mt-2">
                  <span className="text-2xl font-bold text-emerald-600">
                    {formatMoney(transaction.amount)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DashboardListCard>
  );
}
