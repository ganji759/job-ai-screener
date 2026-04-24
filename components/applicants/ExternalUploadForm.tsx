"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import { useUploadFilesMutation } from "../../store/api/applicantsApi";
import { FileDropzone } from "../ui/FileDropzone";
import { Button } from "../ui/Button";
import { Select } from "../ui/Select";

export const ExternalUploadForm = ({ jobId, initialFileType = "pdf" }: { jobId: string; initialFileType?: "pdf" | "csv" | "excel" }) => {
  const [files, setFiles] = useState<File[]>([]);
  const [fileType, setFileType] = useState<"pdf" | "csv" | "excel">(initialFileType);
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [uploadFiles, { isLoading }] = useUploadFilesMutation();

  const submit = async () => {
    if (!files.length) return toast.error("Please select at least one file.");
    if (!jobId) return toast.error("Missing jobId — open this page via /jobs/:id/applicants.");
    try {
      // Backend `POST /applicants/upload` expects a single multipart request per file with
      // these three parts: `jobId`, `fileType`, and `file` (note: singular). For PDFs we
      // loop; CSV/Excel is always a single file.
      const filesToSend = fileType === "pdf" ? files : files.slice(0, 1);
      for (const file of filesToSend) {
        setProgress((prev) => ({ ...prev, [file.name]: 30 }));
        const formData = new FormData();
        formData.append("jobId", jobId);
        formData.append("fileType", fileType);
        formData.append("file", file);
        await uploadFiles({ jobId, formData }).unwrap();
        setProgress((prev) => ({ ...prev, [file.name]: 100 }));
      }
      toast.success("Upload completed successfully.");
      setFiles([]);
    } catch (error) {
      toast.error((error as { data?: { error?: string } })?.data?.error ?? "Upload failed.");
    }
  };

  return (
    <div className="space-y-2">
      <Select
        options={[
          { label: "PDF Resume Upload", value: "pdf" },
          { label: "CSV Upload", value: "csv" },
          { label: "Excel Upload", value: "excel" },
        ]}
        value={fileType}
        onChange={(e) => setFileType(e.target.value as "pdf" | "csv" | "excel")}
        aria-label="File type for upload"
        className="h-9 text-xs"
      />
      <FileDropzone
        accept={
          fileType === "pdf"
            ? { "application/pdf": [".pdf"] }
            : { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }
        }
        onFiles={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
        disabled={isLoading}
        compact
      />
      {files.length ? (
        <ul className="space-y-1 text-xs text-slate-600">
          {files.map((file) => (
            <li key={file.name} className="rounded-md border border-brand-100 px-2 py-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate" title={file.name}>
                  {file.name}
                </span>
                <button
                  type="button"
                  className="text-[11px] text-red-500"
                  onClick={() => setFiles((prev) => prev.filter((f) => f.name !== file.name))}
                >
                  Remove
                </button>
              </div>
              <div className="mt-1 h-1 rounded-full bg-slate-200">
                <div
                  className="h-1 rounded-full bg-brand-600 transition-all"
                  style={{ width: `${progress[file.name] ?? 0}%` }}
                />
              </div>
            </li>
          ))}
        </ul>
      ) : null}
      <div className="flex justify-end">
        <Button loading={isLoading} onClick={submit}>
          Upload & Ingest
        </Button>
      </div>
    </div>
  );
};
