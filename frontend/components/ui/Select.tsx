import { forwardRef } from "react";
import { cn, formControlClassName, formErrorClassName, formLabelClassName } from "../../lib/utils";

export type SelectProps = Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "children"> & {
  label?: string;
  options: Array<{ label: string; value: string }>;
  error?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, options, error, className, ...props },
  ref,
) {
  const selectEl = (
    <select ref={ref} className={cn(formControlClassName, "cursor-pointer disabled:cursor-not-allowed", className)} {...props}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );

  const inner = (
    <>
      {label ? <span className={formLabelClassName}>{label}</span> : null}
      {selectEl}
      {error ? <span className={formErrorClassName}>{error}</span> : null}
    </>
  );

  return label ? <label className="block space-y-1.5">{inner}</label> : <div className="block space-y-1.5">{inner}</div>;
});
