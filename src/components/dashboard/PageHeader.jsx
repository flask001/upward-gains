export default function PageHeader({ title }) {
  return (
    <div className="mb-6 lg:mb-8">
      <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{title}</h1>
      <p className="text-sm text-slate-500 mt-1 font-medium">
        / <span>{title}</span>
      </p>
    </div>
  );
}
