import { Loader2 } from "lucide-react";
import { cn } from "../../lib/utils";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  loading,
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size; loading?: boolean }) => {
  const variantClass: Record<Variant, string> = {
    primary:
      "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-md hover:from-indigo-600 hover:to-violet-700 hover:shadow-indigo-lg active:scale-[0.97]",
    secondary:
      "border border-slate-200/80 bg-white/80 text-slate-800 shadow-card backdrop-blur-sm hover:border-brand-200 hover:bg-brand-50/60 hover:text-brand-800 dark:border-slate-600/60 dark:bg-slate-800/70 dark:text-slate-100 dark:hover:bg-slate-700/70 active:scale-[0.97]",
    danger: "bg-gradient-to-br from-red-500 to-rose-600 text-white hover:from-red-600 hover:to-rose-700 shadow-sm active:scale-[0.97]",
    ghost: "bg-transparent text-slate-600 hover:bg-slate-100/80 dark:text-slate-300 dark:hover:bg-white/[0.06] active:scale-[0.97]",
  };
  const sizeClass: Record<Size, string> = { sm: "px-4 py-2 text-sm", md: "px-5 py-2.5", lg: "px-6 py-3 text-lg" };
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition disabled:pointer-events-none disabled:opacity-60 disabled:active:scale-100",
        variantClass[variant],
        sizeClass[size],
        className,
      )}
      disabled={props.disabled || loading}
      {...props}
    >
      {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      {children}
    </button>
  );
};
