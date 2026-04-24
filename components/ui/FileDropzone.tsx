"use client";

import { useDropzone } from "react-dropzone";
import { Upload } from "lucide-react";
import { cn } from "../../lib/utils";

export const FileDropzone = ({
  onFiles,
  accept,
  disabled,
  compact = false,
  hint = "PDF, CSV, or Excel depending on your selection",
}: {
  onFiles: (files: File[]) => void;
  accept: Record<string, string[]>;
  disabled?: boolean;
  /** Use a smaller dropzone for inline panels. */
  compact?: boolean;
  hint?: string;
}) => {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({ accept, onDrop: onFiles, disabled });
  return (
    <div
      {...getRootProps()}
      className={cn(
        "rounded-xl border-2 border-dashed text-center transition outline-none",
        compact ? "px-3 py-3" : "p-8",
        "focus-visible:ring-2 focus-visible:ring-brand-500/35 focus-visible:ring-offset-2 dark:focus-visible:ring-offset-slate-900",
        disabled ? "cursor-not-allowed border-slate-200 bg-slate-50 opacity-60 dark:border-slate-700 dark:bg-slate-900" : "cursor-pointer",
        !disabled && isDragActive && "border-brand-500 bg-brand-50 shadow-md dark:bg-brand-950/40",
        !disabled &&
          !isDragActive &&
          "border-brand-200 bg-brand-50/20 hover:border-brand-400 hover:bg-brand-50/40 dark:border-slate-600 dark:bg-slate-800/40 dark:hover:border-brand-500 dark:hover:bg-slate-800/80",
      )}
    >
      <input {...getInputProps()} disabled={disabled} />
      <Upload
        className={cn("mx-auto text-brand-500 dark:text-brand-400", compact ? "mb-1 h-5 w-5" : "mb-2 h-8 w-8")}
        aria-hidden
      />
      <p className={cn("font-medium text-slate-700 dark:text-slate-200", compact ? "text-xs" : "text-sm")}>
        {disabled ? "Upload disabled" : isDragActive ? "Drop files here…" : "Drag & drop files here, or click to browse"}
      </p>
      {!compact ? (
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{hint}</p>
      ) : null}
    </div>
  );
};
