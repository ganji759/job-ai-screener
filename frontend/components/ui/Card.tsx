import { cn } from "../../lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn("surface-card p-6 transition-shadow duration-200 hover:shadow-card-hover", className)}
    {...props}
  />
);
