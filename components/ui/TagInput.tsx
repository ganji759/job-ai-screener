"use client";

import { useState } from "react";
import { cn, formControlClassName } from "../../lib/utils";

export const TagInput = ({ value, onChange, disabled }: { value: string[]; onChange: (tags: string[]) => void; disabled?: boolean }) => {
  const [input, setInput] = useState("");
  return (
    <div className="space-y-2">
      <input
        className={cn(formControlClassName, "rounded-xl py-2")}
        value={input}
        disabled={disabled}
        placeholder="Type a skill and press Enter"
        aria-label="Add skill tag"
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === "Enter" && input.trim()) {
            e.preventDefault();
            onChange([...value, input.trim()]);
            setInput("");
          }
          if (e.key === "Backspace" && !input && value.length) {
            onChange(value.slice(0, -1));
          }
        }}
      />
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {tag}
          </span>
        ))}
      </div>
    </div>
  );
};
