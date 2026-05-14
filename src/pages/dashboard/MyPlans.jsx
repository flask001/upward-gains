import DashboardListCard from "../../components/dashboard/DashboardListCard";
import { useInvestments } from "../../hooks/useInvestments";
import { plans } from "../../components/Plans";

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
    return new Date(value).toLocaleDateString();
  } catch {
    return String(value);
  }
}

export default function MyPlans() {
  const { investments, loading, error } = useInvestments();

  if (loading) {
    return (
      <DashboardListCard
        breadcrumbLabel="My Plans"
        title="Active Plans"
        subtitle="List of all active investments!"
        emptyText="Loading..."
      />
    );
  }

  if (error) {
    return (
      <DashboardListCard
        breadcrumbLabel="My Plans"
        title="Active Plans"
        subtitle="List of all active investments!"
        emptyText={`Error: ${error}`}
      />
    );
  }

  if (investments.length === 0) {
    return (
      <DashboardListCard
        breadcrumbLabel="My Plans"
        title="Active Plans"
        subtitle="List of all active investments!"
        emptyText="No Active Plans Found"
      />
    );
  }

  return (
    <DashboardListCard
      breadcrumbLabel="My Plans"
      title="Active Plans"
      subtitle="List of all active investments!"
    >
      <div className="space-y-4">
        {investments.map((investment) => {
          const plan = plans.find((p) => p.name === investment.plan_id);
          return (
            <div
              key={investment.id}
              className="border border-slate-200 rounded-lg p-4 bg-white hover:bg-slate-50 transition"
            >
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-slate-900 text-lg">
                    {plan?.displayName || investment.plan_id}
                  </h3>
                  <div className="mt-2 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-slate-500">Invested Amount:</span>
                      <span className="ml-2 font-medium text-slate-900">
                        {formatMoney(investment.amount)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Daily Profit:</span>
                      <span className="ml-2 font-medium text-emerald-600">
                        {formatMoney(investment.daily_profit)}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">ROI Rate:</span>
                      <span className="ml-2 font-medium text-slate-900">
                        {plan?.roi || "N/A"}
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500">Started:</span>
                      <span className="ml-2 font-medium text-slate-900">
                        {formatDate(investment.created_at)}
                      </span>
                    </div>
                  </div>
                  {investment.last_profit_update && (
                    <div className="mt-2 text-xs text-slate-400">
                      Last profit update: {formatDate(investment.last_profit_update)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardListCard>
  );
}
