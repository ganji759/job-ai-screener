export const PageHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => (
  <div className="mb-1">
    <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-[1.75rem]">{title}</h1>
    {subtitle ? <p className="mt-1.5 max-w-2xl text-sm text-slate-500 dark:text-slate-400">{subtitle}</p> : null}
  </div>
);
