import { useState } from "react";
import PageHeader from "../../components/dashboard/PageHeader";
import PageBody from "../../components/dashboard/PageBody";
import { useWithdrawals } from "../../hooks/useWithdrawals";
import { useBalance } from "../../hooks/useBalance";
import { createWithdrawal } from "../../services/withdrawService";

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

export default function Withdrawal() {
  const { rows, loading, error, refresh } = useWithdrawals();
  const { balance, loading: balanceLoading } = useBalance();
  const [amount, setAmount] = useState("");
  const [walletAddress, setWalletAddress] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState("");
  const [amountError, setAmountError] = useState("");

  function validateAmount() {
    const amountNum = Number(amount);
    const balanceNum = Number(balance || 0);
    
    if (amountNum <= 0) {
      return "Amount must be greater than 0.";
    }
    
    if (amountNum > balanceNum) {
      return "Insufficient funds. You cannot withdraw more than your available balance.";
    }
    
    return null;
  }

  function handleAmountChange(e) {
    const newAmount = e.target.value;
    setAmount(newAmount);
    
    // Clear previous errors when user starts typing
    setFormError("");
    setAmountError("");
    
    // Real-time validation for insufficient funds
    if (newAmount) {
      const amountNum = Number(newAmount);
      const balanceNum = Number(balance || 0);
      
      if (amountNum > balanceNum) {
        setAmountError("Insufficient funds");
      }
    }
  }

  const isSubmitDisabled = submitting || amountError !== "" || !amount || Number(amount) <= 0 || Number(amount) > Number(balance || 0);

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    
    const validationError = validateAmount();
    if (validationError) {
      setFormError(validationError);
      return;
    }
    
    setSubmitting(true);
    const { error: err } = await createWithdrawal({
      amount,
      walletAddress,
    });
    setSubmitting(false);
    if (err) {
      setFormError(err.message ?? "Request failed.");
      return;
    }
    setAmount("");
    setWalletAddress("");
    refresh();
  }

  return (
    <>
      <PageHeader title="Withdrawal" />
      <PageBody>
        <div className="max-w-2xl space-y-8">
          <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800">
              New request
            </h2>
            
            {/* Balance Display */}
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-slate-600">Available Balance</span>
                <span className="text-sm font-bold text-slate-900">
                  {balanceLoading ? "…" : formatMoney(balance)}
                </span>
              </div>
            </div>
            
            {formError ? (
              <p className="text-sm text-red-600" role="alert">
                {formError}
              </p>
            ) : null}
            <div>
              <label
                htmlFor="wd-amount"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Amount (USD)
              </label>
              <input
                id="wd-amount"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                required
                value={amount}
                onChange={handleAmountChange}
                className={`w-full rounded-lg border px-3 py-2.5 text-sm ${
                  amountError
                    ? "border-red-300 bg-red-50"
                    : "border-slate-200 bg-white"
                }`}
              />
              {amountError && (
                <p className="text-xs text-red-600 mt-1">{amountError}</p>
              )}
            </div>
            <div>
              <label
                htmlFor="wd-address"
                className="block text-xs font-medium text-slate-600 mb-1"
              >
                Wallet address
              </label>
              <input
                id="wd-address"
                type="text"
                required
                autoComplete="off"
                value={walletAddress}
                onChange={(e) => setWalletAddress(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono"
                placeholder="Your crypto wallet address"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitDisabled}
              className="rounded-lg bg-[#e86a4a] px-6 py-2.5 text-sm font-bold uppercase tracking-wide text-white shadow-sm hover:bg-[#dc5f40] disabled:opacity-60"
            >
              {submitting ? "Submitting…" : "Submit request"}
            </button>
            <p className="text-xs text-slate-500">
              Withdrawals require admin approval. Funds are deducted only after
              approval.
            </p>
          </form>

          <div>
            <h2 className="text-sm font-bold uppercase tracking-wide text-slate-800 mb-3">
              Your requests
            </h2>
            {error ? (
              <p className="text-sm text-red-600">{error}</p>
            ) : loading ? (
              <p className="text-sm text-slate-500">Loading…</p>
            ) : rows.length === 0 ? (
              <p className="text-sm text-slate-500">No withdrawal requests yet.</p>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-full text-sm text-slate-800">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-4 py-2">Amount</th>
                      <th className="px-4 py-2">Address</th>
                      <th className="px-4 py-2">Status</th>
                      <th className="px-4 py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((w) => (
                      <tr key={w.id} className="border-t border-slate-100">
                        <td className="px-4 py-2 whitespace-nowrap">
                          {formatMoney(w.amount)}
                        </td>
                        <td className="px-4 py-2 font-mono text-xs max-w-[200px] truncate">
                          {w.wallet_address}
                        </td>
                        <td className="px-4 py-2 font-semibold capitalize">
                          {w.status}
                        </td>
                        <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                          {formatDate(w.created_at)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </PageBody>
    </>
  );
}
