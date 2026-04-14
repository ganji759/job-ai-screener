import { Button } from "./Button";

export const Pagination = ({ page, totalPages, onPage }: { page: number; totalPages: number; onPage: (value: number) => void }) => {
  const safeTotal = Math.max(1, totalPages);
  const atFirst = page <= 1;
  const atLast = page >= safeTotal;
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="sm" disabled={atFirst} onClick={() => onPage(Math.max(1, page - 1))}>
        Prev
      </Button>
      <span className="text-sm tabular-nums text-slate-600 dark:text-slate-300">
        Page {page} / {safeTotal}
      </span>
      <Button variant="secondary" size="sm" disabled={atLast} onClick={() => onPage(Math.min(safeTotal, page + 1))}>
        Next
      </Button>
    </div>
  );
};
