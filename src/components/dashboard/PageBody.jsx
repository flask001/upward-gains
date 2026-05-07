export default function PageBody({ children }) {
  return (
    <div className="w-full min-w-0 max-w-3xl bg-white rounded-2xl border border-slate-200/70 shadow-[0_4px_20px_-12px_rgba(15,23,42,0.12)] p-4 text-slate-600 text-sm leading-relaxed sm:p-8">
      {children}
    </div>
  );
}
