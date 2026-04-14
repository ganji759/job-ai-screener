"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useIngestProfilesMutation } from "../../store/api/applicantsApi";
import { Button } from "../ui/Button";
import { Textarea } from "../ui/Textarea";
import type { UmuravaProfile } from "../../types";

export const UmuravaIngestForm = ({ jobId }: { jobId: string }) => {
  const [payload, setPayload] = useState("[]");
  const [ingestProfiles, { isLoading }] = useIngestProfilesMutation();

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
    <div className="space-y-3">
      <p className="text-sm text-slate-500">Paste JSON array of UmuravaProfile objects.</p>
      <Textarea rows={12} value={payload} onChange={(e) => setPayload(e.target.value)} />
      <Button loading={isLoading} onClick={submit}>Ingest Candidates</Button>
    </div>
  );
};
