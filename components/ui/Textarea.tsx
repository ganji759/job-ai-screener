import { forwardRef } from "react";
import { cn, formControlClassName, formErrorClassName, formLabelClassName } from "../../lib/utils";

export type TextareaProps = React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label?: string; error?: string };

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, ...props },
  ref,
) {
  const inner = (
    <>
      {label ? <span className={formLabelClassName}>{label}</span> : null}
      <textarea ref={ref} className={cn(formControlClassName, "h-auto min-h-[100px] resize-y", className)} {...props} />
      {error ? <span className={formErrorClassName}>{error}</span> : null}
    </>
  );
  return label ? <label className="block space-y-1.5">{inner}</label> : <div className="block space-y-1.5">{inner}</div>;
});
