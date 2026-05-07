import { useEffect, useState } from "react";
import {
  Link,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import { QRCode } from "react-qr-code"; // Fixed: Named import instead of default
import { supabase } from "../../lib/supabaseClient";
import { formatCryptoDisplay } from "../../services/currencyService";
import { getInvoiceById } from "../../services/invoiceService";
import PageBody from "../../components/dashboard/PageBody";

// Debug logs to verify imports
console.log('QRCode import:', QRCode);
console.log('PageBody import:', PageBody);
console.log('formatCryptoDisplay import:', formatCryptoDisplay);
console.log('getInvoiceById import:', getInvoiceById);

function formatMoney(n) {
  if (n == null || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(n));
}

function paymentLabels(walletType) {
  switch (walletType) {
    case "Bitcoin":
      return {
        chain: "BITCOIN CHAIN",
        option: "BITCOIN",
        titleWord: "BITCOIN",
      };
    case "Ethereum":
      return {
        chain: "ETHEREUM MAINNET",
        option: "ETHEREUM",
        titleWord: "ETHEREUM",
      };
    case "ERC20":
      return {
        chain: "ETHEREUM (ERC20)",
        option: "USDT",
        titleWord: "USDT",
      };
    case "TRON":
      return {
        chain: "TRON (TRC20)",
        option: "USDT",
        titleWord: "USDT",
      };
    default:
      return {
        chain: String(walletType || "").toUpperCase(),
        option: String(walletType || "").toUpperCase(),
        titleWord: String(walletType || "CRYPTO").toUpperCase(),
      };
  }
}

function paymentStatusLabel(status) {
  if (status === "pending") return "UNPAID";
  if (status === "verified") return "VERIFIED";
  if (status === "rejected") return "REJECTED";
  return String(status || "").toUpperCase();
}

function CopyChip({ label, value }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      window.alert("Could not copy to clipboard.");
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded border border-sky-600 bg-white px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-sky-600 shadow-sm transition hover:bg-sky-50"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}

export default function Payment() {
  const { invoiceId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreatedToast, setShowCreatedToast] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  console.log('Payment component loaded with invoiceId:', invoiceId);

  // Fixed: Prevent navigation loops with proper cleanup
  useEffect(() => {
    if (location.state?.invoiceCreated) {
      const timer = setTimeout(() => {
        setShowCreatedToast(true);
        navigate(location.pathname, { replace: true, state: {} });
        const toastTimer = setTimeout(() => setShowCreatedToast(false), 4000);
        return () => clearTimeout(toastTimer);
      }, 0);
      return () => clearTimeout(timer);
    }
  }, [location.pathname, location.state, navigate]);

  useEffect(() => {
    if (!invoiceId) return;
    const key = `inv_confirm_${invoiceId}`;
    if (sessionStorage.getItem(key) === "1") {
      const timer = setTimeout(() => setConfirmationSent(true), 0);
      return () => clearTimeout(timer);
    }
  }, [invoiceId]);

  useEffect(() => {
    let mounted = true;
    let channel = null;

    async function load() {
      try {
        setLoading(true);
        setError("");
        
        console.log('Getting auth session...');
        const { data: { session }, error: authError } = await supabase.auth.getSession();
        if (authError || !session?.user) {
          console.error("Auth error:", authError);
          setError("Please login to access this page.");
          setLoading(false);
          return;
        }

        console.log('Session found:', session.user.id, 'metadata:', session.user.app_metadata);

        const isAdmin = session.user.app_metadata?.role === 'admin' || session.user.user_metadata?.role === 'admin';
        if (isAdmin) {
          console.log("Admin detected, redirecting to admin dashboard");
          navigate("/admin", { replace: true }); // Fixed: Use replace to prevent navigation loops
          setLoading(false);
          return;
        }

        console.log('Getting invoice data for ID:', invoiceId);
        const { data, error: invoiceError } = await getInvoiceById(invoiceId);
        if (!mounted) return;

        if (invoiceError) {
          console.error("Invoice error:", invoiceError);
          setError(invoiceError.message || "Invoice not found.");
          setLoading(false);
          return;
        }

        if (!data) {
          console.error("No invoice data found");
          setError("Invoice not found.");
          setLoading(false);
          return;
        }

        console.log('Invoice data:', data);
        console.log('User ID check - invoice.user_id:', data.user_id, 'session.user.id:', session.user.id);

        if (data.user_id !== session.user.id) {
          console.error("Access denied - user does not own this invoice");
          setError("You do not have access to this invoice.");
          setLoading(false);
          return;
        }

        console.log('Setting invoice data and completing load');
        setInvoice(data);
        setLoading(false);

        // Fixed: Proper Supabase realtime subscription with cleanup
        if (invoiceId) {
          channel = supabase
            .channel(`invoice_${invoiceId}`)
            .on('postgres_changes', 
              {
                event: '*',
                schema: 'public',
                table: 'invoices',
                filter: `id=eq.${invoiceId}`
              },
              (payload) => {
                console.log('Invoice update received:', payload);
                if (payload.new && mounted) {
                  setInvoice(payload.new);
                }
              }
            )
            .subscribe((status) => {
              console.log('Subscription status:', status);
            });
        }

      } catch (err) {
        console.error("Unexpected error in Payment component:", err);
        setError("An unexpected error occurred.");
        setLoading(false);
      }
    }

    load();

    return () => {
      mounted = false;
      // Fixed: Proper cleanup of Supabase channel
      if (channel) {
        console.log('Cleaning up Supabase channel');
        supabase.removeChannel(channel);
      }
    };
  }, [invoiceId, navigate]);

  function handleConfirmationRequest() {
    if (!invoiceId || confirmationSent) return;
    sessionStorage.setItem(`inv_confirm_${invoiceId}`, "1");
    setConfirmationSent(true);
  }

  if (loading) {
    return (
      <>
        <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-slate-800">
            Dashboard
          </Link>
          <span className="mx-1.5 text-slate-400">/</span>
          <span className="font-medium text-slate-700">Open Invoice</span>
        </nav>
        <PageBody>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#e86a4a]"></div>
            <p className="mt-4 text-slate-600">Loading invoice…</p>
          </div>
        </PageBody>
      </>
    );
  }

  if (error || !invoice) {
    return (
      <>
        <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
          <Link to="/dashboard" className="hover:text-slate-800">
            Dashboard
          </Link>
        </nav>
        <PageBody>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="text-center">
              <div className="mb-4 rounded-full bg-red-100 p-3">
                <svg className="h-6 w-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h2 className="mb-2 text-lg font-semibold text-slate-900">Error</h2>
              <p className="mb-4 text-red-600">{error || "Invoice not found."}</p>
              <div className="space-x-4">
                <Link
                  to="/dashboard/invest-now"
                  className="inline-block font-semibold text-[#e86a4a] hover:underline"
                >
                  New Investment
                </Link>
                <Link
                  to="/dashboard"
                  className="inline-block font-semibold text-slate-600 hover:underline"
                >
                  Dashboard
                </Link>
              </div>
            </div>
          </div>
        </PageBody>
      </>
    );
  }

  // Fixed: Defensive rendering with optional chaining and fallbacks
  const labels = paymentLabels(invoice?.wallet_type || '');
  const cryptoAmountStr = formatCryptoDisplay(
    Number(invoice?.crypto_amount || 0),
    invoice?.wallet_type || ''
  );
  const address = invoice?.payment_address ?? "";
  const unpaid = invoice?.status === "pending";

  return (
    <>
      {showCreatedToast ? (
        <div
          className="fixed right-4 top-20 z-50 flex items-center gap-2 rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg"
          role="status"
        >
          <span className="text-emerald-600">✓</span> Invoice Created Successfully!
        </div>
      ) : null}

      <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/dashboard" className="hover:text-slate-800">
          Dashboard
        </Link>
        <span className="mx-1.5 text-slate-400">/</span>
        <span className="font-medium text-slate-700">Open Invoice</span>
      </nav>

      <PageBody>
        <div className="mx-auto max-w-lg">
          <div className="rounded-none border border-slate-200 bg-white shadow-sm sm:rounded-xl">
            <div className="border-b border-slate-100 px-5 py-6 text-center sm:px-8">
              <h1 className="text-xl font-bold uppercase tracking-tight text-slate-900 sm:text-2xl">
                {labels?.titleWord || 'CRYPTO'} Payment Invoice
              </h1>
              <p className="mt-4 text-left text-sm leading-relaxed text-slate-700">
                Please send{" "}
                <span className="font-semibold">{cryptoAmountStr}</span> worth of{" "}
                <span className="font-semibold uppercase">{labels?.titleWord || 'CRYPTO'}</span>{" "}
                to wallet address provided on this invoice.
              </p>
            </div>

            <div className="divide-y divide-slate-200 px-5 py-2 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-slate-800">Network</span>
                <span className="font-bold uppercase text-slate-900">
                  {labels?.chain || 'NETWORK'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm">
                <span className="font-semibold text-slate-800">
                  Payment Option
                </span>
                <span className="font-bold uppercase text-slate-900">
                  {labels?.option || 'OPTION'}
                </span>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span className="font-semibold text-slate-800">
                  Amount to Pay
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono text-base font-bold text-slate-900">
                    {cryptoAmountStr}
                  </span>
                  <CopyChip label="copy" value={cryptoAmountStr} />
                </div>
              </div>
              <div className="py-4 text-sm">
                <span className="font-semibold text-slate-800">
                  Wallet Address
                </span>
                <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
                  <p className="min-w-0 flex-1 break-all font-mono text-sm font-medium leading-relaxed text-red-600">
                    {address}
                  </p>
                  <CopyChip label="copy" value={address} />
                </div>
              </div>
            </div>

            <div className="flex flex-col items-center border-t border-slate-100 px-5 py-6 sm:px-8">
              <p className="mb-3 text-xs font-medium uppercase tracking-wide text-slate-500">
                Scan to pay
              </p>
              <div className="rounded-lg border border-slate-200 bg-white p-3">
                {address ? (
                  <QRCode
                    value={address}
                    size={200}
                    level="M"
                    className="h-auto max-w-full"
                  />
                ) : (
                  <div className="flex h-50 w-50 items-center justify-center bg-slate-100 text-xs text-slate-500">
                    No address
                  </div>
                )}
              </div>
            </div>

            <div className="border-t border-slate-100 px-5 py-4 sm:px-8">
              <div className="flex flex-wrap items-baseline gap-2 text-sm">
                <span className="font-semibold text-slate-800">
                  Payment Status:
                </span>
                <span
                  className={`font-bold uppercase ${
                    unpaid
                      ? "text-red-600"
                      : invoice?.status === "verified"
                        ? "text-emerald-600"
                        : "text-slate-700"
                  }`}
                >
                  {paymentStatusLabel(invoice?.status)}
                </span>
              </div>
              <p className="mt-2 text-xs text-slate-500">
                Equivalent in USD: {formatMoney(invoice?.amount_usd)} · Plan:{" "}
                {invoice?.plan_id || 'Unknown'} · #{invoice?.invoice_number || 'Unknown'}
              </p>
            </div>

            <div className="space-y-2 border-t border-slate-100 bg-emerald-50/60 px-5 py-5 text-sm leading-relaxed text-emerald-900 sm:px-8">
              <p>
                Request for payment confirmation once you have completed{" "}
                <span className="font-semibold uppercase">{labels?.titleWord || 'CRYPTO'}</span>{" "}
                payment.
              </p>
              <p>
                Make sure to screenshot and upload your proof of payment (admin may
                ask for verification).
              </p>
              <p>
                Click the button below after your funds transfer is complete.
              </p>
            </div>

            <div className="px-5 pb-8 pt-2 sm:px-8">
              <button
                type="button"
                disabled={confirmationSent || !unpaid}
                onClick={handleConfirmationRequest}
                className="w-full rounded-lg bg-emerald-600 py-3.5 text-center text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-emerald-600/70 disabled:hover:bg-emerald-600/70"
              >
                {confirmationSent
                  ? "Confirmation Request Sent!"
                  : "Send Confirmation Request"}
              </button>
              {!unpaid ? (
                <p className="mt-3 text-center text-xs text-slate-500">
                  This invoice is no longer awaiting payment.
                </p>
              ) : null}
            </div>
          </div>

          <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm">
            <Link
              to="/dashboard/unpaid-invoice"
              className="font-semibold text-[#e86a4a] hover:underline"
            >
              Unpaid invoices
            </Link>
            <Link
              to="/dashboard/invest-now"
              className="font-semibold text-slate-600 hover:underline"
            >
              New investment
            </Link>
          </div>
        </div>
      </PageBody>
    </>
  );
}
