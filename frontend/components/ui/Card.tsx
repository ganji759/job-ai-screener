import { cn } from "../../lib/utils";

export const Card = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("panel panel-lg", className)} {...props} />
);
