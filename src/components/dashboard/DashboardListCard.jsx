import { Link } from "react-router-dom";
import { MoreHorizontal, MoreVertical } from "lucide-react";
import PageBody from "./PageBody";

/**
 * Breadcrumb + white card with uppercase title, subtitle, menu trigger, empty body.
 * Used for My Plans, Verified Invoice, and similar list pages.
 */
export default function DashboardListCard({
  breadcrumbLabel,
  title,
  subtitle,
  emptyText = "",
  children = null,
  /** "horizontal" (⋯) or "vertical" (⋮) for the card header menu trigger */
  menuVariant = "horizontal",
}) {
  const showEmpty = !children;
  const MenuIcon = menuVariant === "vertical" ? MoreVertical : MoreHorizontal;

  return (
    <>
      <nav className="mb-6 text-sm text-slate-500" aria-label="Breadcrumb">
        <Link to="/dashboard" className="hover:text-slate-800">
          Dashboard
        </Link>
        <span className="mx-1.5 text-slate-400">/</span>
        <span className="font-medium text-slate-700">{breadcrumbLabel}</span>
      </nav>
      <PageBody>
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4 sm:pb-5">
          <div className="min-w-0">
            <h1 className="text-base font-bold uppercase tracking-[0.06em] text-slate-900 sm:text-lg">
              {title}
            </h1>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            className="shrink-0 rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="More options"
          >
            <MenuIcon className="h-5 w-5" strokeWidth={2} />
          </button>
        </header>
        {showEmpty ? (
          <div className="flex min-h-[220px] flex-col items-center justify-center px-4 py-16 sm:min-h-[260px]">
            <p className="text-center text-sm font-semibold text-slate-700">
              {emptyText}
            </p>
          </div>
        ) : (
          <div className="pt-5">{children}</div>
        )}
      </PageBody>
    </>
  );
}
