import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { plans } from "../components/Plans";
import { WALLET_OPTIONS } from "../constants/wallets";
import { convertUsdToCrypto } from "../services/currencyService";
import {
  adminCreateInvoice,
  approveInvoice,
  countInvoicesByUserAdmin,
  listInvoicesAdmin,
  rejectInvoice,
} from "../services/invoiceService";
import { applyDailyProfits } from "../services/investmentService";
import {
  approveWithdrawal,
  listWithdrawalsAdmin,
  rejectWithdrawal,
} from "../services/withdrawService";
import { getCountryFlag } from "../services/countryDetectionService";
import { formatLastSeen, isUserOnline } from "../hooks/useUserActivity";

function formatDate(value) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return String(value);
  }
}

function formatMoney(n) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(n));
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [section, setSection] = useState("users");

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  const [invoices, setInvoices] = useState([]);
  const [invoiceLoading, setInvoiceLoading] = useState(false);
  const [invoiceError, setInvoiceError] = useState("");
  const [invoiceUserFilter, setInvoiceUserFilter] = useState("");
  const [invoiceStatusFilter, setInvoiceStatusFilter] = useState("");

  const [withdrawals, setWithdrawals] = useState([]);
  const [wdLoading, setWdLoading] = useState(false);
  const [wdError, setWdError] = useState("");
  const [wdUserFilter, setWdUserFilter] = useState("");
  const [wdStatusFilter, setWdStatusFilter] = useState("");

  const [invoiceCounts, setInvoiceCounts] = useState({});

  const [newInv, setNewInv] = useState({
    userId: "",
    planId: plans[0]?.name ?? "",
    walletType: WALLET_OPTIONS[0] ?? "Bitcoin",
    amountUsd: "",
    cryptoAmount: "",
  });

  const [profitBusy, setProfitBusy] = useState(false);
  const [profitMsg, setProfitMsg] = useState("");
  const channelRef = useRef(null);

  const profileById = useMemo(() => {
    const m = {};
    for (const r of rows) {
      m[r.id] = r;
    }
    return m;
  }, [rows]);

  async function loadProfiles() {
    console.log("📊 loadProfiles() called");
    setError("");
    const { data, error: selError } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    console.log("📊 loadProfiles result:", { data, error: selError });

    if (selError) {
      console.log("❌ loadProfiles error:", selError);
      setError(selError.message);
      setRows([]);
      return;
    }

    console.log("✅ Profiles loaded:", data?.length ?? 0, "rows");
    setRows(data ?? []);
    const { counts } = await countInvoicesByUserAdmin();
    console.log("📊 Invoice counts:", counts);
    setInvoiceCounts(counts ?? {});
  }

  const loadInvoices = useCallback(async () => {
    setInvoiceLoading(true);
    setInvoiceError("");
    const { data, error: err } = await listInvoicesAdmin({
      userId: invoiceUserFilter || undefined,
      status: invoiceStatusFilter || undefined,
    });
    if (err) setInvoiceError(err.message);
    setInvoices(data ?? []);
    const { counts } = await countInvoicesByUserAdmin();
    setInvoiceCounts(counts ?? {});
    setInvoiceLoading(false);
  }, [invoiceUserFilter, invoiceStatusFilter]);

  const loadWithdrawals = useCallback(async () => {
    setWdLoading(true);
    setWdError("");
    const { data, error: err } = await listWithdrawalsAdmin({
      userId: wdUserFilter || undefined,
      status: wdStatusFilter || undefined,
    });
    if (err) setWdError(err.message);
    setWithdrawals(data ?? []);
    setWdLoading(false);
  }, [wdUserFilter, wdStatusFilter]);

  useEffect(() => {
    let mounted = true;
    console.log("🎣 AdminDashboard useEffect mounted");

    async function boot() {
      console.log("🚀 AdminDashboard boot() called");
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!mounted) return;
      console.log("📥 AdminDashboard session:", session);
      setCurrentUserId(session?.user?.id ?? null);
      setLoading(true);
      console.log("📊 Loading profiles...");
      await loadProfiles();
      if (!mounted) return;
      console.log("✅ AdminDashboard boot completed");
      setLoading(false);
    }

    boot();

    // Set up realtime subscription for profiles table
    const channel = supabase
      .channel('admin-profiles-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'profiles',
        },
        (payload) => {
          console.log('🔄 Profile change detected:', payload);
          // Refresh profiles when any change occurs
          if (mounted) {
            loadProfiles();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Admin profiles subscription status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Admin profiles channel error');
        } else if (status === 'TIMED_OUT') {
          console.error('⏱️ Admin profiles channel timed out');
        } else if (status === 'CLOSED') {
          console.log('🔌 Admin profiles channel closed');
        }
      });

    channelRef.current = channel;

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_e, session) => {
      console.log("🔄 AdminDashboard auth state change:", { hasSession: !!session?.user?.id });
      setCurrentUserId(session?.user?.id ?? null);
    });

    return () => {
      console.log("🧹 AdminDashboard useEffect cleanup");
      mounted = false;
      subscription.unsubscribe();
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (section === "invoices") loadInvoices();
  }, [section, loadInvoices]);

  useEffect(() => {
    if (section === "withdrawals") loadWithdrawals();
  }, [section, loadWithdrawals]);

  async function refresh() {
    setLoading(true);
    await loadProfiles();
    setLoading(false);
  }

  async function promote(userId) {
    setBusyId(userId);
    setError("");
    const { error: upError } = await supabase
      .from("profiles")
      .update({ role: "admin" })
      .eq("id", userId);
    setBusyId(null);
    if (upError) {
      setError(upError.message);
      return;
    }
    await refresh();
  }

  async function demote(userId) {
    setBusyId(userId);
    setError("");
    const { error: upError } = await supabase
      .from("profiles")
      .update({ role: "user" })
      .eq("id", userId);
    setBusyId(null);
    if (upError) {
      setError(upError.message);
      return;
    }
    await refresh();
  }

  async function removeProfile(userId) {
    const ok =
      typeof window !== "undefined"
        ? window.confirm("Remove this profile? The auth account will remain.")
        : true;
    if (!ok) return;

    setBusyId(userId);
    setError("");
    const { error: delError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", userId);
    setBusyId(null);
    if (delError) {
      setError(delError.message);
      return;
    }
    await refresh();
  }

  async function onApproveInvoice(id) {
    setBusyId(id);
    setInvoiceError("");
    const { error: err } = await approveInvoice(id);
    setBusyId(null);
    if (err) {
      setInvoiceError(err.message);
      return;
    }
    loadInvoices();
  }

  async function onRejectInvoice(id) {
    setBusyId(id);
    setInvoiceError("");
    const { error: err } = await rejectInvoice(id);
    setBusyId(null);
    if (err) {
      setInvoiceError(err.message);
      return;
    }
    loadInvoices();
  }

  async function onApproveWd(id) {
    setBusyId(id);
    setWdError("");
    const { error: err } = await approveWithdrawal(id);
    setBusyId(null);
    if (err) {
      setWdError(err.message);
      return;
    }
    loadWithdrawals();
  }

  async function onRejectWd(id) {
    setBusyId(id);
    setWdError("");
    const { error: err } = await rejectWithdrawal(id);
    setBusyId(null);
    if (err) {
      setWdError(err.message);
      return;
    }
    loadWithdrawals();
  }

  async function handleAdminCreateInvoice(e) {
    e.preventDefault();
    setInvoiceError("");
    const amt = Number.parseFloat(newInv.amountUsd);
    let crypto = Number.parseFloat(newInv.cryptoAmount);
    if (!newInv.userId || !Number.isFinite(amt) || amt <= 0) {
      setInvoiceError("Choose user and valid USD amount.");
      return;
    }
    if (!Number.isFinite(crypto) || crypto <= 0) {
      try {
        const c = await convertUsdToCrypto(amt, newInv.walletType);
        crypto = c.cryptoAmount;
      } catch (err) {
        setInvoiceError(err?.message ?? "Could not compute crypto amount.");
        return;
      }
    }

    setBusyId("new-inv");
    const { data, error: err } = await adminCreateInvoice({
      userId: newInv.userId,
      planId: newInv.planId,
      walletType: newInv.walletType,
      amountUsd: amt,
      cryptoAmount: crypto,
      paymentAddress: null,
    });
    setBusyId(null);
    if (err) {
      setInvoiceError(err.message);
      return;
    }
    
    // Show success message and refresh invoices list instead of navigating
    // Admin doesn't need to access payment page for invoices created for other users
    console.log('Admin invoice created, staying on admin dashboard. Invoice ID:', data);
    
    loadInvoices();
  }

  async function handleDailyProfit() {
    setProfitBusy(true);
    setProfitMsg("");
    const { count, error: err } = await applyDailyProfits();
    setProfitBusy(false);
    if (err) setProfitMsg(err.message);
    else setProfitMsg(`Processed ${count ?? 0} investment day(s).`);
  }

  async function handleBack() {
    navigate("/dashboard");
  }

  const tabBtn = (id, label) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
        section === id
          ? "bg-emerald-600 text-white"
          : "bg-white/10 text-gray-300 hover:bg-white/15"
      }`}
    >
      {label}
    </button>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-black via-gray-900 to-emerald-950 px-4 py-10">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">
              Admin panel
            </h1>
            <p className="text-gray-400 text-sm mt-1">
              Users, invoices, withdrawals, and payouts
            </p>
          </div>
          <button
            type="button"
            onClick={handleBack}
            className="self-start sm:self-auto px-4 py-2 rounded-lg border border-white/20 text-gray-200 hover:bg-white/5 text-sm transition"
          >
            Back to dashboard
          </button>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          {tabBtn("users", "Users")}
          {tabBtn("invoices", "Invoices")}
          {tabBtn("withdrawals", "Withdrawals")}
        </div>

        {error ? (
          <div
            className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200"
            role="alert"
          >
            {error}
          </div>
        ) : null}

        {section === "users" ? (
          <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden shadow-xl">
            {loading ? (
              <p className="p-8 text-center text-gray-400 text-sm">Loading…</p>
            ) : (
              <>
                {/* Desktop Table View */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-200">
                    <thead className="bg-black/30 text-gray-400 uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-4 py-3 font-medium">Email</th>
                        <th className="px-4 py-3 font-medium">Country</th>
                        <th className="px-4 py-3 font-medium">Status</th>
                        <th className="px-4 py-3 font-medium">Last Seen</th>
                        <th className="px-4 py-3 font-medium">Role</th>
                        <th className="px-4 py-3 font-medium">Invoices</th>
                        <th className="px-4 py-3 font-medium">Joined</th>
                        <th className="px-4 py-3 font-medium text-right">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No profiles found.
                          </td>
                        </tr>
                      ) : (
                        rows.map((row) => {
                          const isSelf = row.id === currentUserId;
                          const disabled = busyId === row.id;
                          const online = isUserOnline(row.last_seen) || row.is_online;
                          const flag = getCountryFlag(row.country_code);
                          return (
                            <tr key={row.id} className="hover:bg-white/5">
                              <td className="px-4 py-3 font-medium text-white break-all max-w-[220px]">
                                {row.email ?? "—"}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  {flag && <span className="text-xl">{flag}</span>}
                                  <span className="text-gray-300 text-sm">
                                    {row.country_name || "—"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex items-center gap-2">
                                  <span
                                    className={`h-2.5 w-2.5 rounded-full ${
                                      online ? "bg-emerald-500" : "bg-gray-500"
                                    }`}
                                  />
                                  <span
                                    className={
                                      online
                                        ? "text-emerald-400 text-xs font-medium"
                                        : "text-gray-500 text-xs"
                                    }
                                  >
                                    {online ? "Online" : "Offline"}
                                  </span>
                                </div>
                              </td>
                              <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                                {formatLastSeen(row.last_seen)}
                              </td>
                              <td className="px-4 py-3">
                                <span
                                  className={
                                    row.role === "admin"
                                      ? "text-emerald-400"
                                      : "text-gray-300"
                                  }
                                >
                                  {row.role ?? "user"}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-gray-300">
                                {invoiceCounts[row.id] ?? 0}
                              </td>
                              <td className="px-4 py-3 text-gray-400 whitespace-nowrap">
                                {formatDate(row.created_at)}
                              </td>
                              <td className="px-4 py-3">
                                <div className="flex flex-wrap justify-end gap-2">
                                  <button
                                    type="button"
                                    disabled={disabled || row.role === "admin"}
                                    onClick={() => promote(row.id)}
                                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
                                  >
                                    Promote
                                  </button>
                                  <button
                                    type="button"
                                    disabled={
                                      disabled ||
                                      row.role !== "admin" ||
                                      isSelf
                                    }
                                    onClick={() => demote(row.id)}
                                    className="px-3 py-1.5 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-semibold transition"
                                  >
                                    Demote
                                  </button>
                                  <button
                                    type="button"
                                    disabled={disabled || isSelf}
                                    onClick={() => removeProfile(row.id)}
                                    className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
                                  >
                                    Delete
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Mobile Card View */}
                <div className="md:hidden space-y-4 p-4">
                  {rows.length === 0 ? (
                    <p className="text-center text-gray-500 text-sm py-8">
                      No profiles found.
                    </p>
                  ) : (
                    rows.map((row) => {
                      const isSelf = row.id === currentUserId;
                      const disabled = busyId === row.id;
                      const online = isUserOnline(row.last_seen) || row.is_online;
                      const flag = getCountryFlag(row.country_code);
                      return (
                        <div key={row.id} className="bg-black/20 rounded-xl p-4 border border-white/10">
                          <div className="space-y-3">
                            {/* Email */}
                            <div className="flex justify-between items-start gap-2">
                              <span className="text-gray-400 text-xs">Email</span>
                              <span className="text-white text-sm font-medium break-all text-right">
                                {row.email ?? "—"}
                              </span>
                            </div>

                            {/* Country & Status */}
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                {flag && <span className="text-lg">{flag}</span>}
                                <span className="text-gray-300 text-sm">
                                  {row.country_name || "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-2 w-2 rounded-full ${
                                    online ? "bg-emerald-500" : "bg-gray-500"
                                  }`}
                                />
                                <span
                                  className={
                                    online
                                    ? "text-emerald-400 text-xs font-medium"
                                    : "text-gray-500 text-xs"
                                  }
                                >
                                  {online ? "Online" : "Offline"}
                                </span>
                              </div>
                            </div>

                            {/* Role & Invoices */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-xs">Role</span>
                              <span
                                className={
                                  row.role === "admin"
                                    ? "text-emerald-400 text-sm font-medium"
                                    : "text-gray-300 text-sm"
                                }
                              >
                                {row.role ?? "user"}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-xs">Invoices</span>
                              <span className="text-gray-300 text-sm">
                                {invoiceCounts[row.id] ?? 0}
                              </span>
                            </div>

                            {/* Last Seen & Joined */}
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-xs">Last Seen</span>
                              <span className="text-gray-400 text-xs">
                                {formatLastSeen(row.last_seen)}
                              </span>
                            </div>

                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 text-xs">Joined</span>
                              <span className="text-gray-400 text-xs">
                                {formatDate(row.created_at)}
                              </span>
                            </div>

                            {/* Actions */}
                            <div className="pt-3 border-t border-white/10">
                              <div className="grid grid-cols-3 gap-2">
                                <button
                                  type="button"
                                  disabled={disabled || row.role === "admin"}
                                  onClick={() => promote(row.id)}
                                  className="px-2 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
                                >
                                  Promote
                                </button>
                                <button
                                  type="button"
                                  disabled={
                                    disabled ||
                                    row.role !== "admin" ||
                                    isSelf
                                  }
                                  onClick={() => demote(row.id)}
                                  className="px-2 py-2 rounded-lg bg-yellow-600 hover:bg-yellow-500 disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-semibold transition"
                                >
                                  Demote
                                </button>
                                <button
                                  type="button"
                                  disabled={disabled || isSelf}
                                  onClick={() => removeProfile(row.id)}
                                  className="px-2 py-2 rounded-lg bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        ) : null}

        {section === "invoices" ? (
          <div className="space-y-6">
            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl p-6 shadow-xl">
              <h2 className="text-lg font-semibold text-white mb-4">
                Create invoice (user)
              </h2>
              <form
                onSubmit={handleAdminCreateInvoice}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm"
              >
                <label className="block">
                  <span className="text-gray-400 text-xs">User</span>
                  <select
                    required
                    value={newInv.userId}
                    onChange={(e) =>
                      setNewInv((s) => ({ ...s, userId: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
                  >
                    <option value="">Select user</option>
                    {rows.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.email ?? p.id}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-gray-400 text-xs">Plan</span>
                  <select
                    value={newInv.planId}
                    onChange={(e) =>
                      setNewInv((s) => ({ ...s, planId: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
                  >
                    {plans.map((p) => (
                      <option key={p.name} value={p.name}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-gray-400 text-xs">Wallet</span>
                  <select
                    value={newInv.walletType}
                    onChange={(e) =>
                      setNewInv((s) => ({ ...s, walletType: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
                  >
                    {WALLET_OPTIONS.map((w) => (
                      <option key={w} value={w}>
                        {w}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block">
                  <span className="text-gray-400 text-xs">Amount USD</span>
                  <input
                    type="number"
                    required
                    min="0"
                    step="any"
                    value={newInv.amountUsd}
                    onChange={(e) =>
                      setNewInv((s) => ({ ...s, amountUsd: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
                  />
                </label>
                <label className="block">
                  <span className="text-gray-400 text-xs">
                    Crypto amount (optional — auto from API if empty)
                  </span>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={newInv.cryptoAmount}
                    onChange={(e) =>
                      setNewInv((s) => ({ ...s, cryptoAmount: e.target.value }))
                    }
                    className="mt-1 w-full rounded-lg bg-black/40 border border-white/20 px-3 py-2 text-white"
                    placeholder="Leave blank to convert USD"
                  />
                </label>
                <div className="flex items-end">
                  <button
                    type="submit"
                    disabled={busyId === "new-inv"}
                    className="w-full rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 px-4 py-2 text-white font-semibold"
                  >
                    {busyId === "new-inv" ? "Creating…" : "Create invoice"}
                  </button>
                </div>
              </form>
            </div>

            <div className="flex flex-wrap items-center gap-4 mb-2">
              <label className="text-sm text-gray-300 flex items-center gap-2">
                Filter user
                <select
                  value={invoiceUserFilter}
                  onChange={(e) => setInvoiceUserFilter(e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/20 px-2 py-1 text-white text-sm"
                >
                  <option value="">All</option>
                  {rows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-300 flex items-center gap-2">
                Status
                <select
                  value={invoiceStatusFilter}
                  onChange={(e) => setInvoiceStatusFilter(e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/20 px-2 py-1 text-white text-sm"
                >
                  <option value="">All</option>
                  <option value="pending">pending</option>
                  <option value="verified">verified</option>
                  <option value="rejected">rejected</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => loadInvoices()}
                className="text-sm text-emerald-400 hover:underline"
              >
                Refresh
              </button>
              <button
                type="button"
                disabled={profitBusy}
                onClick={handleDailyProfit}
                className="ml-auto rounded-lg border border-amber-500/50 px-3 py-1.5 text-sm text-amber-200 hover:bg-amber-900/30 disabled:opacity-50"
              >
                {profitBusy ? "Running…" : "Run daily profit job"}
              </button>
            </div>
            {profitMsg ? (
              <p className="text-sm text-amber-200/90 mb-2">{profitMsg}</p>
            ) : null}

            {invoiceError ? (
              <div className="mb-4 rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {invoiceError}
              </div>
            ) : null}

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              {invoiceLoading ? (
                <p className="p-8 text-center text-gray-400 text-sm">
                  Loading invoices…
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-200 min-w-[900px]">
                    <thead className="bg-black/30 text-gray-400 uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-4 py-3">Invoice #</th>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Plan</th>
                        <th className="px-4 py-3">USD</th>
                        <th className="px-4 py-3">Wallet</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {invoices.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No invoices.
                          </td>
                        </tr>
                      ) : (
                        invoices.map((inv) => {
                          const prof = profileById[inv.user_id];
                          const busy = busyId === inv.id;
                          return (
                            <tr key={inv.id} className="hover:bg-white/5">
                              <td className="px-4 py-3 font-mono text-xs">
                                {inv.invoice_number}
                              </td>
                              <td className="px-4 py-3 break-all max-w-[160px]">
                                {prof?.email ?? inv.user_id}
                              </td>
                              <td className="px-4 py-3">{inv.plan_id}</td>
                              <td className="px-4 py-3">{formatMoney(inv.amount_usd)}</td>
                              <td className="px-4 py-3 uppercase text-xs">
                                {inv.wallet_type}
                              </td>
                              <td className="px-4 py-3">{inv.status}</td>
                              <td className="px-4 py-3 text-gray-400 whitespace-nowrap text-xs">
                                {formatDate(inv.created_at)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {inv.status === "pending" ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onApproveInvoice(inv.id)}
                                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onRejectInvoice(inv.id)}
                                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}

        {section === "withdrawals" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <label className="text-sm text-gray-300 flex items-center gap-2">
                Filter user
                <select
                  value={wdUserFilter}
                  onChange={(e) => setWdUserFilter(e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/20 px-2 py-1 text-white text-sm"
                >
                  <option value="">All</option>
                  {rows.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.email}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-sm text-gray-300 flex items-center gap-2">
                Status
                <select
                  value={wdStatusFilter}
                  onChange={(e) => setWdStatusFilter(e.target.value)}
                  className="rounded-lg bg-black/40 border border-white/20 px-2 py-1 text-white text-sm"
                >
                  <option value="">All</option>
                  <option value="pending">pending</option>
                  <option value="approved">approved</option>
                  <option value="rejected">rejected</option>
                </select>
              </label>
              <button
                type="button"
                onClick={() => loadWithdrawals()}
                className="text-sm text-emerald-400 hover:underline"
              >
                Refresh
              </button>
            </div>

            {wdError ? (
              <div className="rounded-lg border border-red-500/40 bg-red-950/40 px-4 py-3 text-sm text-red-200">
                {wdError}
              </div>
            ) : null}

            <div className="bg-white/5 backdrop-blur-lg border border-white/10 rounded-2xl overflow-hidden shadow-xl">
              {wdLoading ? (
                <p className="p-8 text-center text-gray-400 text-sm">
                  Loading…
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm text-gray-200 min-w-[800px]">
                    <thead className="bg-black/30 text-gray-400 uppercase text-xs tracking-wide">
                      <tr>
                        <th className="px-4 py-3">User</th>
                        <th className="px-4 py-3">Amount</th>
                        <th className="px-4 py-3">Address</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Created</th>
                        <th className="px-4 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/10">
                      {withdrawals.length === 0 ? (
                        <tr>
                          <td
                            colSpan={6}
                            className="px-4 py-8 text-center text-gray-500"
                          >
                            No withdrawals.
                          </td>
                        </tr>
                      ) : (
                        withdrawals.map((w) => {
                          const prof = profileById[w.user_id];
                          const busy = busyId === w.id;
                          return (
                            <tr key={w.id} className="hover:bg-white/5">
                              <td className="px-4 py-3 break-all max-w-[180px]">
                                {prof?.email ?? w.user_id}
                              </td>
                              <td className="px-4 py-3">
                                {formatMoney(w.amount)}
                              </td>
                              <td className="px-4 py-3 font-mono text-xs max-w-[200px] truncate">
                                {w.wallet_address}
                              </td>
                              <td className="px-4 py-3">{w.status}</td>
                              <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                                {formatDate(w.created_at)}
                              </td>
                              <td className="px-4 py-3 text-right">
                                {w.status === "pending" ? (
                                  <div className="flex justify-end gap-2">
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onApproveWd(w.id)}
                                      className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Approve
                                    </button>
                                    <button
                                      type="button"
                                      disabled={busy}
                                      onClick={() => onRejectWd(w.id)}
                                      className="px-2 py-1 rounded bg-red-600 hover:bg-red-700 text-xs font-semibold text-white disabled:opacity-50"
                                    >
                                      Reject
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-gray-500">—</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
