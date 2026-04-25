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
    primary: "bg-brand-600 text-white shadow-brand-sm hover:bg-brand-700 active:scale-[0.98]",
    secondary: "border border-brand-200 bg-white text-brand-800 hover:bg-brand-50 dark:border-slate-600 dark:bg-slate-800 dark:text-slate-100 dark:hover:bg-slate-700 active:scale-[0.98]",
    danger: "bg-red-600 text-white hover:bg-red-500 active:scale-[0.98]",
    ghost: "bg-transparent text-slate-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-700 active:scale-[0.98]",
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
