import { cn } from "../../lib/utils";

type Variant = "success" | "warning" | "error" | "info" | "neutral";

export const Badge = ({
  variant = "neutral",
  children,
}: {
  variant?: Variant;
  children: React.ReactNode;
}) => {
  const styles: Record<Variant, string> = {
    success: "pill pill-mint",
    warning: "pill pill-amber",
    error: "pill pill-rose",
    info: "pill pill-indigo",
    neutral: "pill",
  };
  return <span className={cn(styles[variant])}>{children}</span>;
};
