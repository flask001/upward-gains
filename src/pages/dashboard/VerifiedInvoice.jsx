import DashboardListCard from "../../components/dashboard/DashboardListCard";
import { useInvoices } from "../../hooks/useInvoices";
import { formatCryptoDisplay } from "../../services/currencyService";

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(n));
}

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function VerifiedInvoice() {
  const { rows, loading, error, refresh } = useInvoices("verified");

  return (
    <DashboardListCard
      breadcrumbLabel="Verified Invoice"
      title="Verified Invoice"
      subtitle="Invoices approved by admin — funds credited to your balance."
      emptyText="No Verified Invoice Found"
    >
      {error ? (
        <p className="text-sm text-red-600 mb-4 px-2" role="alert">
          {error}
          <button
            type="button"
            onClick={() => refresh()}
            className="ml-2 text-[#e86a4a] font-semibold underline"
          >
            Retry
          </button>
        </p>
      ) : null}

      {loading ? (
        <p className="text-sm text-slate-500 px-2">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center py-16">
          <p className="text-center text-sm font-semibold text-slate-700">
            No Verified Invoice Found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 sm:-mx-8">
          <table className="min-w-[720px] w-full border-collapse text-sm text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <th className="whitespace-nowrap px-6 py-3 sm:px-8">Plan</th>
                <th className="whitespace-nowrap px-3 py-3">Amount</th>
                <th className="whitespace-nowrap px-3 py-3">Crypto</th>
                <th className="whitespace-nowrap px-3 py-3">Wallet</th>
                <th className="whitespace-nowrap px-3 py-3">Invoice #</th>
                <th className="whitespace-nowrap px-3 py-3">Verified</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 last:border-b-0"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 font-medium sm:px-8">
                    {row.plan_id}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5">
                    {formatMoney(row.amount_usd)}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-mono text-[13px]">
                    {formatCryptoDisplay(
                      Number(row.crypto_amount),
                      row.wallet_type
                    )}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 uppercase">
                    {row.wallet_type}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 font-mono text-xs">
                    {row.invoice_number}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                    {row.verified_at
                      ? formatDate(row.verified_at)
                      : formatDate(row.created_at)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </DashboardListCard>
  );
}
