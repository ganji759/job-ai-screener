export const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-1 border-b border-brand-100 pb-4 dark:border-slate-700">
    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 md:text-3xl">{title}</h1>
    {subtitle ? <p className="mt-1 max-w-2xl text-sm text-slate-600 dark:text-slate-300 md:text-base">{subtitle}</p> : null}
  </div>
);
