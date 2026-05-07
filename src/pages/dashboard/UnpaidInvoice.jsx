import { Link } from "react-router-dom";
import { Monitor } from "lucide-react";
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

export default function UnpaidInvoice() {
  const { rows, loading, error, refresh } = useInvoices("pending");

  return (
    <DashboardListCard
      breadcrumbLabel="Unpaid Invoice"
      title="Invoice List"
      subtitle="Pending invoices — pay using the address on the payment page."
      menuVariant="vertical"
    >
      {error ? (
        <p className="px-6 sm:px-8 text-sm text-red-600 mb-4" role="alert">
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
        <p className="px-6 sm:px-8 text-sm text-slate-500">Loading…</p>
      ) : rows.length === 0 ? (
        <div className="flex min-h-[200px] flex-col items-center justify-center py-16">
          <p className="text-center text-sm font-semibold text-slate-700">
            No unpaid invoices found
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto -mx-6 sm:-mx-8">
          <table className="min-w-[760px] w-full border-collapse text-sm text-slate-800">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/90 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">
                <th className="whitespace-nowrap px-6 py-3 sm:px-8">Plan</th>
                <th className="whitespace-nowrap px-3 py-3">Amount</th>
                <th className="whitespace-nowrap px-3 py-3">Crypto</th>
                <th className="whitespace-nowrap px-3 py-3">Payment</th>
                <th className="whitespace-nowrap px-3 py-3">Status</th>
                <th className="whitespace-nowrap px-3 py-3">Created</th>
                <th className="whitespace-nowrap px-6 py-3 text-right sm:px-8">
                  Action
                </th>
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
                  <td className="whitespace-nowrap px-3 py-3.5 font-semibold text-amber-600">
                    {row.status}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3.5 text-slate-600">
                    {formatDate(row.created_at)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-3.5 text-right sm:px-8">
                    <Link
                      to={`/dashboard/payment/${row.id}`}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md bg-[#e86a4a] text-white shadow-sm transition hover:bg-[#dc5f40] focus:outline-none focus:ring-2 focus:ring-[#e86a4a]/45"
                      aria-label={`Open payment for invoice ${row.invoice_number}`}
                    >
                      <Monitor className="h-4 w-4" strokeWidth={2} />
                    </Link>
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
