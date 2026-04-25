"use client";

import { useState } from "react";
import { cn, formControlClassName } from "../../lib/utils";
import { Button } from "./Button";

const BLOCKED_SKILL_TEXT = /^type a skill and press enter$/i;

type TagInputProps = {
  value: string[];
  onChange: (tags: string[]) => void;
  disabled?: boolean;
  /** When set with onInputChange, the draft text is controlled by the parent (for validation UX). */
  inputValue?: string;
  onInputChange?: (draft: string) => void;
  error?: boolean;
  /** Show an Add button next to the input (same behavior as Enter). */
  showAddButton?: boolean;
};

export const TagInput = ({ value, onChange, disabled, inputValue, onInputChange, error, showAddButton }: TagInputProps) => {
  const [internalInput, setInternalInput] = useState("");
  const controlled = onInputChange != null;
  const input = controlled ? (inputValue ?? "") : internalInput;
  const setDraft = (next: string) => {
    if (controlled) onInputChange(next);
    else setInternalInput(next);
  };
  const commit = () => {
    if (disabled || !input.trim()) return;
    const next = input.trim();
    if (BLOCKED_SKILL_TEXT.test(next)) {
      setDraft("");
      return;
    }
    if (!value.includes(next)) onChange([...value, next]);
    setDraft("");
  };
  return (
    <div className="space-y-2">
      <div className={cn("flex gap-2", showAddButton ? "items-stretch" : "")}>
        <input
          className={cn(formControlClassName, "rounded-xl py-2", showAddButton ? "min-w-0 flex-1" : "", error ? "border-red-500 focus-visible:ring-red-500/30" : "")}
          value={input}
          disabled={disabled}
          placeholder="Type a skill and press Enter"
          aria-label="Add skill tag"
          aria-invalid={error ? true : undefined}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (disabled) return;
            if (e.key === "Enter" && input.trim()) {
              e.preventDefault();
              commit();
            }
            if (e.key === "Backspace" && !input && value.length) {
              onChange(value.slice(0, -1));
            }
          }}
        />
        {showAddButton ? (
          <Button type="button" variant="secondary" size="sm" className="shrink-0 rounded-xl px-4" disabled={disabled || !input.trim()} onClick={commit}>
            Add
          </Button>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 rounded-full border border-brand-100 bg-brand-50 px-2.5 py-1 text-xs font-medium text-brand-900 dark:border-slate-600 dark:bg-slate-700 dark:text-slate-100"
          >
            {tag}
            {!disabled ? (
              <button
                type="button"
                onClick={() => onChange(value.filter((item) => item !== tag))}
                className="rounded-full px-1 leading-none text-brand-700 hover:bg-brand-100"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            ) : null}
          </span>
        ))}
      </div>
    </div>
  );
};
