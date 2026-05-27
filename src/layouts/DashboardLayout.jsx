import { useEffect, useMemo, useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import {
  Bell,
  LogOut,
  Mail,
  Maximize2,
  Menu,
  Search,
  ShieldCheck,
  X,
} from "lucide-react";
import { supabase } from "../lib/supabaseClient";
import { DashboardProfileMenu } from "../pages/dashboard/Profile";

import brandLogo from "../assets/Logo.png";
import homeIcon from "../assets/image/Dashboard-image/home.png";
import userIcon from "../assets/image/Dashboard-image/user.png";
import investIcon from "../assets/image/Dashboard-image/invest.png";
import invest2Icon from "../assets/image/Dashboard-image/invest2.png";
import approvedIcon from "../assets/image/Dashboard-image/approved.png";
import unpaidIcon from "../assets/image/Dashboard-image/unpaid.png";
import commissionIcon from "../assets/image/Dashboard-image/commission.png";
import earningIcon from "../assets/image/Dashboard-image/earning.png";
import cashWithdrawalIcon from "../assets/image/Dashboard-image/cash-withdrawal.png";

const navSections = [
  {
    heading: "DASHBOARD",
    items: [
      { to: "/dashboard", end: true, label: "Dashboard", image: homeIcon },
      { to: "/dashboard/profile", label: "Profile", image: userIcon },
    ],
  },
  {
    heading: "ACTIONS",
    items: [
      { to: "/dashboard/invest-now", label: "Invest Now", image: investIcon },
      { to: "/dashboard/my-plans", label: "My Plans", image: invest2Icon },
    ],
  },
  {
    heading: "INVOICES",
    items: [
      {
        to: "/dashboard/verified-invoice",
        label: "Verified Invoice",
        image: approvedIcon,
      },
      {
        to: "/dashboard/unpaid-invoice",
        label: "Unpaid Invoice",
        image: unpaidIcon,
      },
    ],
  },
  {
    heading: "EARNINGS",
    items: [
      { to: "/dashboard/commission", label: "Commission", image: commissionIcon },
      { to: "/dashboard/earnings", label: "Earnings", image: earningIcon },
    ],
  },
];

function SidebarLogoutRow({ onLogout }) {
  return (
    <button
      type="button"
      onClick={onLogout}
      className={`${sidebarLinkClass(false)} w-full text-left`}
    >
      <span className="shrink-0 text-rose-400">
        <LogOut className="h-5 w-5 stroke-[2]" />
      </span>
      Logout
    </button>
  );
}

function sidebarLinkClass(active) {
  return [
    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors",
    active
      ? "bg-white/10 text-white"
      : "text-slate-300 hover:bg-white/5 hover:text-white",
  ].join(" ");
}

function isAdminRole(role) {
  if (role == null) return false;
  return String(role).trim().toLowerCase() === "admin";
}

export default function DashboardLayout() {
  const [email, setEmail] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  /** null | "message" | "notification" — header icon modals */
  const [headerModal, setHeaderModal] = useState(null);
  const navigate = useNavigate();

  const initial = useMemo(
    () => (email?.trim() ? email.trim()[0].toUpperCase() : "U"),
    [email],
  );

  const profileDisplayName = useMemo(() => {
    const e = email?.trim();
    if (!e) return "";
    const at = e.indexOf("@");
    return at > 0 ? e.slice(0, at) : e;
  }, [email]);

  useEffect(() => {
    let mounted = true;

    async function applySession(session) {
      const user = session?.user;
      if (!mounted) return;
      setEmail(user?.email ?? "");

      if (!user?.id) {
        setIsAdmin(false);
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      if (!mounted) return;
      setIsAdmin(isAdminRole(profile?.role));
    }

    supabase.auth.getSession().then(({ data: { session } }) => {
      applySession(session);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!headerModal) return;
    function onKeyDown(e) {
      if (e.key === "Escape") setHeaderModal(null);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [headerModal]);

  function collapseMobileSidebar() {
    setSidebarOpen(false);
  }

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/login", { replace: true });
  }

  return (
    <div className="min-h-screen min-h-[100dvh] bg-slate-100 text-slate-900 flex flex-col lg:flex-row lg:items-stretch">
      <div
        className={`fixed inset-0 z-40 bg-black/50 lg:hidden transition-opacity ${
          sidebarOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        aria-hidden={!sidebarOpen}
        onClick={() => setSidebarOpen(false)}
      />

      <aside
        className={`fixed top-0 left-0 z-50 flex w-[260px] shrink-0 flex-col border-r border-white/10 bg-black transform transition-transform duration-200 max-lg:h-[100dvh] max-lg:max-h-[100dvh] lg:static lg:z-0 lg:min-h-screen lg:h-auto lg:translate-x-0 lg:transition-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="p-6 flex items-center gap-2 border-b border-white/5">
          <img
            src={brandLogo}
            alt=""
            className="h-9 w-9 shrink-0 rounded-lg object-contain"
            width={36}
            height={36}
          />
          <span className="text-white font-semibold tracking-tight">
            Upwards Gains
          </span>
        </div>

        <nav className="min-h-0 flex-1 overflow-y-auto py-4 px-3 space-y-6">
          {isAdmin ? (
            <div>
              <p className="px-3 text-[11px] font-semibold text-slate-500 tracking-[0.14em] mb-2">
                — ADMIN
              </p>
              <ul className="space-y-0.5">
                <li>
                  <Link
                    to="/dashboard/admin"
                    onClick={collapseMobileSidebar}
                    className={sidebarLinkClass(false)}
                  >
                    <span className="shrink-0 text-emerald-400">
                      <ShieldCheck className="h-5 w-5 stroke-[2]" />
                    </span>
                    Admin panel
                  </Link>
                </li>
              </ul>
            </div>
          ) : null}

          {navSections.map((section) => (
            <div key={section.heading}>
              <p className="px-3 text-[11px] font-semibold text-slate-500 tracking-[0.14em] mb-2">
                — {section.heading}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ to, label, image, end }) => (
                  <li key={to}>
                    <NavLink
                      to={to}
                      end={end}
                      onClick={collapseMobileSidebar}
                      className={({ isActive }) =>
                        sidebarLinkClass(Boolean(isActive))
                      }
                    >
                      <span className="shrink-0 text-amber-400/90">
                        <img src={image} alt={label} className="h-5 w-5" />
                      </span>
                      {label}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </div>
          ))}

          <div>
            <p className="px-3 text-[11px] font-semibold text-slate-500 tracking-[0.14em] mb-2">
              — WITHDRAW
            </p>
            <ul className="space-y-0.5">
              <li>
                <NavLink
                  to="/dashboard/withdrawal"
                  onClick={collapseMobileSidebar}
                  className={({ isActive }) =>
                    sidebarLinkClass(Boolean(isActive))
                  }
                >
                  <span className="shrink-0 text-amber-400/90">
                    <img src={cashWithdrawalIcon} alt="Withdrawal" className="h-5 w-5" />
                  </span>
                  Withdrawal
                </NavLink>
              </li>
              <li>
                <SidebarLogoutRow onLogout={handleLogout} />
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <div className="flex min-h-screen flex-1 flex-col min-w-0 lg:min-h-0">
        <header className="sticky top-0 z-30 flex min-h-[52px] items-center gap-2 border-b border-white/10 bg-black px-2 py-2 text-white sm:gap-3 sm:px-4 sm:py-3 lg:px-8">
          <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              className="shrink-0 rounded-lg p-2 text-amber-400 transition hover:bg-white/10 lg:hidden"
              aria-label="Open menu"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </button>

            <Link
              to="/dashboard"
              className="shrink-0 rounded-lg outline-none ring-offset-2 focus-visible:ring-2 focus-visible:ring-amber-400 lg:hidden"
              aria-label="Dashboard home"
            >
              <img
                src={brandLogo}
                alt="Upwards Gains"
                className="h-8 max-h-8 w-auto max-w-[min(7rem,calc(100vw-14rem))] object-contain object-left"
                width={120}
                height={32}
              />
            </Link>

            <div className="hidden min-w-0 flex-1 max-w-xl items-center gap-3 rounded-xl border border-transparent bg-white/10 px-4 py-2 focus-within:border-amber-300/70 focus-within:ring-1 focus-within:ring-amber-400/40 sm:flex">
              <Search className="h-5 w-5 shrink-0 text-slate-300" />
              <input
                type="search"
                placeholder="Search for anything..."
                className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-slate-300"
              />
            </div>

            <div className="flex min-w-0 flex-1 items-center rounded-xl border border-transparent bg-white/10 px-2.5 py-1.5 focus-within:border-amber-300/70 focus-within:ring-1 focus-within:ring-amber-400/40 sm:hidden">
              <Search className="mr-1.5 h-4 w-4 shrink-0 text-slate-300" />
              <input
                type="search"
                placeholder="Search…"
                className="min-w-0 flex-1 bg-transparent text-xs text-white outline-none placeholder:text-slate-300"
              />
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-2 md:gap-3">
            <button
              type="button"
              className="hidden rounded-lg p-2 text-slate-200 transition hover:bg-white/10 md:inline-flex"
              aria-label="Fullscreen"
              onClick={() => {
                if (!document.fullscreenElement)
                  document.documentElement.requestFullscreen?.();
                else document.exitFullscreen?.();
              }}
            >
              <Maximize2 className="h-5 w-5" />
            </button>
            <button
              type="button"
              className={`inline-flex shrink-0 rounded-lg p-1.5 text-slate-200 transition sm:p-2 ${
                headerModal === "message"
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"
                  : "hover:bg-white/10"
              }`}
              aria-label="Mail"
              aria-expanded={headerModal === "message"}
              onClick={() =>
                setHeaderModal((m) => (m === "message" ? null : "message"))
              }
            >
              <Mail className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button
              type="button"
              className={`shrink-0 rounded-lg p-1.5 text-slate-200 transition sm:p-2 ${
                headerModal === "notification"
                  ? "bg-amber-50 text-amber-800 ring-1 ring-amber-200/80"
                  : "hover:bg-white/10"
              }`}
              aria-label="Notifications"
              aria-expanded={headerModal === "notification"}
              onClick={() =>
                setHeaderModal((m) =>
                  m === "notification" ? null : "notification",
                )
              }
            >
              <Bell className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            {isAdmin ? (
              <Link
                to="/dashboard/admin"
                className="hidden sm:inline-flex items-center gap-2 rounded-lg border border-emerald-600/40 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 transition"
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                Admin
              </Link>
            ) : null}
            <DashboardProfileMenu
              displayName={profileDisplayName}
              roleLabelText={isAdmin ? "Admin" : "Investor"}
              initial={initial}
              onSignOut={handleLogout}
              userImage={userIcon}
            />
            <button
              type="button"
              className="hidden xl:inline-flex p-2 rounded-lg hover:bg-white/10 text-slate-200"
              aria-label="More"
            >
              <Menu className="h-5 w-5" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-x-hidden overflow-y-auto px-2 py-5 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
          <Outlet />
        </main>
      </div>

      {headerModal ? (
        <div
          className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-900/50 p-4 sm:items-center"
          role="presentation"
          onClick={() => setHeaderModal(null)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="dashboard-header-modal-title"
            className="w-full max-w-md rounded-2xl border border-slate-200/90 bg-white shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
              <div className="flex min-w-0 items-center gap-3">
                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${
                    headerModal === "message"
                      ? "bg-sky-50 text-sky-700"
                      : "bg-violet-50 text-violet-700"
                  }`}
                >
                  {headerModal === "message" ? (
                    <Mail className="h-5 w-5" strokeWidth={2} />
                  ) : (
                    <Bell className="h-5 w-5" strokeWidth={2} />
                  )}
                </div>
                <div className="min-w-0">
                  <h2
                    id="dashboard-header-modal-title"
                    className="text-base font-semibold text-slate-900"
                  >
                    {headerModal === "message"
                      ? "Messages"
                      : "Notifications"}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {headerModal === "message"
                      ? "Your inbox"
                      : "Your alerts"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
                aria-label="Close"
                onClick={() => setHeaderModal(null)}
              >
                <X className="h-5 w-5" strokeWidth={2} />
              </button>
            </div>
            <div className="px-5 py-8">
              <p className="text-center text-sm font-medium text-slate-600">
                {headerModal === "message"
                  ? "no message"
                  : "no notification"}
              </p>
            </div>
            <div className="flex justify-end border-t border-slate-100 px-5 py-3">
              <button
                type="button"
                className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-800"
                onClick={() => setHeaderModal(null)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
