"use client";

import { useEffect, useRef, useState } from "react";
import toast from "react-hot-toast";
import { useIngestProfilesMutation } from "../../store/api/applicantsApi";
import { Button } from "../ui/Button";
import type { UmuravaProfile } from "../../types";

/**
 * Max pixel height the paste-box will grow to before scrolling takes over.
 * Keeps the card small for short payloads while letting big pastes breathe.
 */
const MAX_TEXTAREA_PX = 320;
const MIN_TEXTAREA_PX = 64;

export const UmuravaIngestForm = ({ jobId }: { jobId: string }) => {
  const [payload, setPayload] = useState("[]");
  const [ingestProfiles, { isLoading }] = useIngestProfilesMutation();
  const taRef = useRef<HTMLTextAreaElement | null>(null);

  // Grow the textarea to fit its content (bounded by MAX_TEXTAREA_PX).
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    const next = Math.min(MAX_TEXTAREA_PX, Math.max(MIN_TEXTAREA_PX, ta.scrollHeight));
    ta.style.height = `${next}px`;
  }, [payload]);

  const submit = async () => {
    try {
      const profiles = JSON.parse(payload) as UmuravaProfile[];
      const result = await ingestProfiles({ jobId, profiles }).unwrap();
      toast.success(`Ingestion complete: ${result.inserted} inserted, ${result.failed} failed.`);
    } catch (error) {
      toast.error((error as Error).message || "Invalid JSON payload.");
    }
  };

  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-500">Paste a JSON array of UmuravaProfile objects.</p>
      <textarea
        ref={taRef}
        value={payload}
        onChange={(e) => setPayload(e.target.value)}
        spellCheck={false}
        className="block w-full resize-none overflow-auto rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-xs text-slate-900 transition focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/30 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
        style={{ minHeight: MIN_TEXTAREA_PX, maxHeight: MAX_TEXTAREA_PX }}
        placeholder='[{"firstName":"Aline","lastName":"Uwase","email":"aline@example.com","title":"Frontend Dev","skills":["React"]}]'
      />
      <div className="flex justify-end">
        <Button loading={isLoading} onClick={submit}>
          Ingest Candidates
        </Button>
      </div>
    </div>
  );
};
