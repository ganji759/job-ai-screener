export const Tooltip = ({ text, children }: { text: string; children: React.ReactNode }) => (
  <span className="group relative inline-flex">
    {children}
    <span className="pointer-events-none absolute -top-8 left-1/2 hidden -translate-x-1/2 rounded bg-slate-800 px-2 py-1 text-xs text-white group-hover:block">{text}</span>
  </span>
);
