import { cn } from "../../lib/utils";

export const LoadingSkeleton = ({ lines = 3, type = "text" }: { lines?: number; type?: "text" | "card" | "table" }) => {
  if (type === "card") return <div className="animate-shimmer h-40 rounded-2xl" />;
  if (type === "table")
    return (
      <div className="space-y-2">
        {Array.from({ length: lines }).map((_, i) => (
          <div key={i} className="animate-shimmer h-8 rounded-lg" />
        ))}
      </div>
    );
  return (
    <div className="space-y-2">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className={cn("animate-shimmer h-4 rounded", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
};
