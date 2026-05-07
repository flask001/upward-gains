import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import PageBody from "../../components/dashboard/PageBody";
import { plans } from "../../components/Plans";
import { WALLET_OPTIONS } from "../../constants/wallets";
import { createDepositInvoice } from "../../services/depositService";

const fieldBase =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-800 outline-none transition focus:border-amber-300/70 focus:ring-2 focus:ring-amber-400/35";

const lockedBox =
  "w-full rounded-lg border-0 bg-[#eaebf1] px-3 py-2.5 text-sm text-slate-800 cursor-default select-text";

function planRoiSummary(plan) {
  if (!plan) return "";
  return `You Will Earn ${plan.roi} Of Your Investment Daily`;
}

function planPeriodSummary(plan) {
  if (!plan) return "";
  const p = String(plan.period ?? "").trim();
  return `Plan Runs For ${p}`;
}

/** Parse currency strings from plan data (e.g. "$500"). */
function parsePlanMoney(value) {
  const cleaned = String(value ?? "").replace(/[^0-9.]/g, "");
  if (cleaned === "") return null;
  const n = Number.parseFloat(cleaned);
  return Number.isFinite(n) ? n : null;
}

function clampAmountToPlan(raw, plan) {
  if (!plan || raw === "") return raw;
  const n = Number.parseFloat(raw);
  if (!Number.isFinite(n)) return raw;
  const minV = parsePlanMoney(plan.min);
  const maxV = parsePlanMoney(plan.max);
  let next = n;
  if (minV != null && next < minV) next = minV;
  if (maxV != null && next > maxV) next = maxV;
  return String(next);
}

export default function InvestNow() {
  const navigate = useNavigate();
  const [planOpen, setPlanOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [selectedPlanName, setSelectedPlanName] = useState("");
  const [amount, setAmount] = useState("");
  const [wallet, setWallet] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const planWrapRef = useRef(null);
  const walletWrapRef = useRef(null);

  const selectedPlan = plans.find((p) => p.name === selectedPlanName) ?? null;

  const planMinNum = selectedPlan ? parsePlanMoney(selectedPlan.min) : null;
  const planMaxNum = selectedPlan ? parsePlanMoney(selectedPlan.max) : null;

  useEffect(() => {
    const plan = plans.find((p) => p.name === selectedPlanName);
    if (!plan) return;
    setAmount((prev) => clampAmountToPlan(prev, plan));
  }, [selectedPlanName]);

  useEffect(() => {
    function onDocMouseDown(e) {
      if (planWrapRef.current && !planWrapRef.current.contains(e.target)) {
        setPlanOpen(false);
      }
      if (walletWrapRef.current && !walletWrapRef.current.contains(e.target)) {
        setWalletOpen(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  function pickPlan(name) {
    setSelectedPlanName(name);
    setPlanOpen(false);
  }

  function pickWallet(label) {
    setWallet(label);
    setWalletOpen(false);
  }

  function handleAmountChange(e) {
    const v = e.target.value;
    if (v === "") {
      setAmount("");
      return;
    }
    if (!/^\d*\.?\d*$/.test(v)) return;
    setAmount(v);
  }

  function handleAmountBlur() {
    if (!selectedPlan || amount === "") return;
    setAmount((prev) => clampAmountToPlan(prev, selectedPlan));
  }

  async function handleContinue(e) {
    e.preventDefault();
    if (!selectedPlan) return;
    if (!wallet) {
      window.alert("Choose a wallet.");
      return;
    }
    const n = Number.parseFloat(amount);
    const minV = parsePlanMoney(selectedPlan.min);
    if (
      amount === "" ||
      !Number.isFinite(n) ||
      (minV != null && n < minV)
    ) {
      window.alert(
        minV != null
          ? `Enter an amount of at least ${selectedPlan.min} for this plan.`
          : "Enter a valid investment amount.",
      );
      return;
    }
    setSubmitting(true);
    const { data, error } = await createDepositInvoice({
      planId: selectedPlanName,
      walletLabel: wallet,
      amountUsd: n,
    });
    setSubmitting(false);
    if (error) {
      window.alert(error.message ?? "Could not create invoice.");
      return;
    }
    if (data?.id) {
      navigate(`/dashboard/payment/${data.id}`, {
        state: { invoiceCreated: true },
      });
    }
  }

  return (
    <>
      <nav
        className="mb-6 text-sm text-slate-500"
        aria-label="Breadcrumb"
      >
        <Link to="/dashboard" className="hover:text-slate-800">
          Dashboard
        </Link>
        <span className="mx-1.5 text-slate-400">/</span>
        <span className="font-medium text-slate-700">Buy Plan</span>
      </nav>

      <PageBody>
        <form onSubmit={handleContinue} className="space-y-6">
          <div>
            <h1 className="text-xl font-bold uppercase tracking-wide text-slate-900 sm:text-2xl">
              Invest Now
            </h1>
            <p className="mt-1 text-sm text-slate-500">Select Plan</p>
          </div>

          <div ref={planWrapRef} className="relative">
            <span className="mb-1.5 block text-xs font-medium text-slate-600">
              Select Plan
            </span>
            <button
              type="button"
              id="invest-plan-trigger"
              aria-haspopup="listbox"
              aria-expanded={planOpen}
              onClick={() => {
                setPlanOpen((o) => !o);
                setWalletOpen(false);
              }}
              className={`${fieldBase} flex w-full items-center justify-between text-left uppercase tracking-wide text-slate-700`}
            >
              <span className={selectedPlanName ? "" : "text-slate-400"}>
                {selectedPlanName || "SELECT PLAN"}
              </span>
              <ChevronDown
                className={`h-4 w-4 shrink-0 text-slate-500 transition ${planOpen ? "rotate-180" : ""}`}
              />
            </button>
            {planOpen && (
              <ul
                role="listbox"
                aria-labelledby="invest-plan-trigger"
                className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
              >
                <li>
                  <button
                    type="button"
                    role="option"
                    aria-selected={selectedPlanName === ""}
                    onClick={() => pickPlan("")}
                    className={`w-full px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wide transition ${
                      selectedPlanName === ""
                        ? "bg-slate-700 text-white"
                        : "text-slate-800 hover:bg-slate-50"
                    }`}
                  >
                    SELECT PLAN
                  </button>
                </li>
                {plans.map((p) => (
                  <li key={p.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={selectedPlanName === p.name}
                      onClick={() => pickPlan(p.name)}
                      className={`w-full border-t border-slate-100 px-3 py-2.5 text-left text-sm font-semibold uppercase tracking-wide transition ${
                        selectedPlanName === p.name
                          ? "bg-slate-700 text-white"
                          : "text-slate-800 hover:bg-slate-50"
                      }`}
                    >
                      {p.name}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div>
              <label
                htmlFor="invest-amount"
                className="mb-1.5 block text-xs font-medium text-slate-600"
              >
                Amount
              </label>
              <input
                id="invest-amount"
                type="number"
                inputMode="decimal"
                autoComplete="off"
                placeholder="Amount to invest*"
                min={planMinNum ?? undefined}
                max={planMaxNum ?? undefined}
                step="any"
                value={amount}
                onChange={handleAmountChange}
                onBlur={handleAmountBlur}
                className={fieldBase}
              />
              {selectedPlan && planMinNum != null ? (
                <p className="mt-1 text-xs text-slate-500">
                  Minimum for this plan: {selectedPlan.min}
                  {planMaxNum != null ? ` · Maximum: ${selectedPlan.max}` : ""}
                </p>
              ) : null}
            </div>
            <div ref={walletWrapRef} className="relative">
              <span className="mb-1.5 block text-xs font-medium text-slate-600">
                Wallet
              </span>
              <button
                type="button"
                id="invest-wallet-trigger"
                aria-haspopup="listbox"
                aria-expanded={walletOpen}
                onClick={() => {
                  setWalletOpen((o) => !o);
                  setPlanOpen(false);
                }}
                className={`${fieldBase} flex w-full items-center justify-between text-left uppercase tracking-wide text-slate-700`}
              >
                <span className={wallet ? "" : "text-slate-400"}>
                  {wallet || "CHOOSE WALLET"}
                </span>
                <ChevronDown
                  className={`h-4 w-4 shrink-0 text-slate-500 transition ${walletOpen ? "rotate-180" : ""}`}
                />
              </button>
              {walletOpen && (
                <ul
                  role="listbox"
                  aria-labelledby="invest-wallet-trigger"
                  className="absolute left-0 right-0 top-full z-20 mt-1 max-h-60 overflow-auto rounded-lg border border-slate-200 bg-white py-1 shadow-lg"
                >
                  {WALLET_OPTIONS.map((w, i) => (
                    <li key={w}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={wallet === w}
                        onClick={() => pickWallet(w)}
                        className={`w-full px-3 py-2.5 text-left text-sm font-medium transition ${
                          i > 0 ? "border-t border-slate-100" : ""
                        } ${
                          wallet === w
                            ? "bg-slate-700 text-white"
                            : "text-slate-800 hover:bg-slate-50"
                        }`}
                      >
                        {w}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>

          {selectedPlan && (
            <div className="space-y-4 border-t border-slate-100 pt-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    ROI
                  </span>
                  <div className={lockedBox}>{planRoiSummary(selectedPlan)}</div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    Period
                  </span>
                  <div className={lockedBox}>
                    {planPeriodSummary(selectedPlan)}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    Minimum Amount
                  </span>
                  <div className={lockedBox}>{selectedPlan.min}</div>
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-slate-600">
                    Maximum Amount
                  </span>
                  <div className={lockedBox}>{selectedPlan.max}</div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="rounded-lg bg-[#e86a4a] px-8 py-3 text-sm font-bold uppercase tracking-wide text-white shadow-sm transition hover:bg-[#dc5f40] focus:outline-none focus:ring-2 focus:ring-[#e86a4a]/50 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {submitting ? "Creating invoice…" : "Continue"}
          </button>
        </form>
      </PageBody>
    </>
  );
}
