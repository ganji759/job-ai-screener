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
    try {
      if (fileType === "pdf") {
        for (const file of files) {
          setProgress((prev) => ({ ...prev, [file.name]: 30 }));
          const formData = new FormData();
          formData.append("files", file);
          await uploadFiles({ jobId, formData }).unwrap();
          setProgress((prev) => ({ ...prev, [file.name]: 100 }));
        }
      } else {
        const file = files[0];
        if (!file) return;
        setProgress((prev) => ({ ...prev, [file.name]: 30 }));
        const formData = new FormData();
        formData.append("files", file);
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
    <div className="space-y-3">
      <Select
        options={[
          { label: "PDF Resume Upload", value: "pdf" },
          { label: "CSV Upload", value: "csv" },
          { label: "Excel Upload", value: "excel" },
        ]}
        value={fileType}
        onChange={(e) => setFileType(e.target.value as "pdf" | "csv" | "excel")}
        aria-label="File type for upload"
      />
      <FileDropzone
        accept={fileType === "pdf" ? { "application/pdf": [".pdf"] } : { "text/csv": [".csv"], "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"] }}
        onFiles={(newFiles) => setFiles((prev) => [...prev, ...newFiles])}
        disabled={isLoading}
      />
      <ul className="space-y-2 text-sm text-slate-600">
        {files.map((file) => (
          <li key={file.name} className="rounded-lg border border-brand-100 p-2">
            <div className="flex items-center justify-between">
              <span>{file.name}</span>
              <button type="button" className="text-xs text-red-500" onClick={() => setFiles((prev) => prev.filter((f) => f.name !== file.name))}>Remove</button>
            </div>
            <div className="mt-2 h-2 rounded-full bg-slate-200">
              <div className="h-2 rounded-full bg-brand-600 transition-all" style={{ width: `${progress[file.name] ?? 0}%` }} />
            </div>
          </li>
        ))}
      </ul>
      <Button loading={isLoading} onClick={submit}>Upload & Ingest</Button>
    </div>
  );
};
