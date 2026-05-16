import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Layers,
  LineChart,
  MessageCircle,
  UserRound,
  WalletCards,
} from "lucide-react";
import { supabase } from "../../lib/supabaseClient";
import PageHeader from "../../components/dashboard/PageHeader";
import TransactionFeed from "../../components/dashboard/TransactionFeed";
import { useBalance } from "../../hooks/useBalance";
import { useCommission } from "../../hooks/useCommission";
import { useTransactions } from "../../hooks/useTransactions";

function formatUsd(balance, loading) {
  if (loading) return "…";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(Number(balance ?? 0));
}

function StatCardRound({ icon: Icon, label, value, circleClass }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 flex flex-col items-center text-center gap-4 will-change-auto">
      <div
        className={`h-14 w-14 rounded-full flex items-center justify-center ${circleClass}`}
      >
        <Icon className="h-7 w-7 text-white" strokeWidth={2} />
      </div>
      <div>
        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
          {label}
        </p>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
          {value}
        </p>
      </div>
    </div>
  );
}

function StatCardAccent({
  title,
  titleColor,
  value,
  subtitle,
  dotClass,
  icon: Icon,
  iconTint,
}) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 flex items-start gap-4 will-change-auto">
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-bold ${titleColor}`}>{title}</p>
        <p className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">
          {value}
        </p>
        <p className="text-xs text-slate-500 mt-3 flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${dotClass}`} />
          {subtitle}
        </p>
      </div>
      <div
        className={`shrink-0 h-14 w-14 rounded-2xl flex items-center justify-center ${iconTint}`}
      >
        <Icon className="h-8 w-8" strokeWidth={1.75} />
      </div>
    </div>
  );
}

export default function DashboardHome() {
  const [role, setRole] = useState(null);
  const { balance, loading: balanceLoading } = useBalance();
  const { totalCommission, loading: commissionLoading } = useCommission();
  const { transactions } = useTransactions();

  // Calculate actual earnings from profit transactions (today's earnings)
  const today = new Date().toDateString();
  const todayProfit = transactions
    .filter(t => t.type === 'profit' && new Date(t.created_at).toDateString() === today)
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  // Calculate total earnings from all profit transactions
  const totalEarnings = transactions
    .filter(t => t.type === 'profit')
    .reduce((sum, t) => sum + (t.amount || 0), 0);

  useEffect(() => {
    let mounted = true;

    async function load(session) {
      const user = session?.user;
      if (!user?.id) {
        if (mounted) setRole(null);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;
      setRole(profile?.role ?? null);
    }

    supabase.auth.getSession().then(({ data: { session } }) => load(session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => load(session));

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  return (
    <>
      <PageHeader title="Dashboard" />

      {role === "admin" ? (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50/90 px-4 py-3 text-sm text-emerald-900 flex flex-wrap items-center justify-between gap-3">
          <span>You have admin access.</span>
          <Link
            to="/dashboard/admin"
            className="font-semibold text-emerald-700 hover:text-emerald-900 underline-offset-2 hover:underline"
          >
            Open admin panel
          </Link>
        </div>
      ) : null}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 lg:gap-6">
        <StatCardRound
          label="Net Worth"
          value={formatUsd(balance, balanceLoading)}
          icon={UserRound}
          circleClass="bg-orange-400 shadow-inner"
        />
        <StatCardRound
          label="Today Profit"
          value={formatUsd(todayProfit, false)}
          icon={MessageCircle}
          circleClass="bg-amber-400 shadow-inner"
        />
        <StatCardRound
          label="Commission"
          value={formatUsd(totalCommission, commissionLoading)}
          icon={LineChart}
          circleClass="bg-emerald-500 shadow-inner"
        />

        <StatCardAccent
          title="Earnings"
          titleColor="text-orange-500"
          value={formatUsd(totalEarnings, false)}
          subtitle="Total Earnings"
          dotClass="bg-orange-500"
          icon={Layers}
          iconTint="bg-orange-50 text-orange-400"
        />
        <StatCardAccent
          title="Withdrawable"
          titleColor="text-slate-700"
          value={formatUsd(balance, balanceLoading)}
          subtitle="Available Balance"
          dotClass="bg-blue-500"
          icon={WalletCards}
          iconTint="bg-fuchsia-50 text-fuchsia-500"
        />

        <div className="sm:col-span-2 xl:col-span-3">
          <TransactionFeed limit={15} />
        </div>
      </div>
    </>
  );
}
