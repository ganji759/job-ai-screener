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
  // Map onto Heron `btn` utilities so buttons match the dark/gradient design system.
  // Each variant has graceful fallback styles for surfaces outside `.heron-app-shell`.
  const variantClass: Record<Variant, string> = {
    primary: "btn btn-primary",
    secondary: "btn btn-ghost",
    danger: "btn",
    ghost: "btn btn-ghost",
  };
  const sizeClass: Record<Size, string> = {
    sm: "!h-[32px] !px-[14px] text-[12px]",
    md: "",
    lg: "!h-[44px] !px-[20px] text-[14px]",
  };
  const dangerExtra =
    variant === "danger"
      ? "!bg-gradient-to-br !from-rose-500 !to-rose-700 !text-white shadow-[0_10px_30px_-8px_rgba(244,63,94,.55)] hover:!shadow-[0_14px_38px_-8px_rgba(244,63,94,.7)] hover:-translate-y-[1px]"
      : "";

  return (
    <button
      className={cn(
        "disabled:pointer-events-none disabled:opacity-60",
        variantClass[variant],
        sizeClass[size],
        dangerExtra,
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
