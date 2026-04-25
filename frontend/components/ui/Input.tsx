import { forwardRef } from "react";
import { cn, formControlClassName, formErrorClassName, formLabelClassName } from "../../lib/utils";

export type InputProps = React.InputHTMLAttributes<HTMLInputElement> & { label?: string; error?: string };

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ label, error, className, ...props }, ref) {
  const inner = (
    <>
      {label ? <span className={formLabelClassName}>{label}</span> : null}
      <input ref={ref} className={cn(formControlClassName, className)} {...props} />
      {error ? <span className={formErrorClassName}>{error}</span> : null}
    </>
  );
  return label ? <label className="block space-y-1.5">{inner}</label> : <div className="block space-y-1.5">{inner}</div>;
});
