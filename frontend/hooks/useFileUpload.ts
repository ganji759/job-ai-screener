"use client";

import { useState } from "react";

export const useFileUpload = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [progress, setProgress] = useState<Record<string, number>>({});

  const addFiles = (incoming: File[]) => {
    setFiles((prev) => [...prev, ...incoming]);
    incoming.forEach((file) => {
      setProgress((prev) => ({ ...prev, [file.name]: 0 }));
    });
  };

  const setFileProgress = (fileName: string, value: number) => {
    setProgress((prev) => ({ ...prev, [fileName]: value }));
  };

  const removeFile = (fileName: string) => {
    setFiles((prev) => prev.filter((file) => file.name !== fileName));
    setProgress((prev) => {
      const next = { ...prev };
      delete next[fileName];
      return next;
    });
  };

  return { files, progress, addFiles, setFileProgress, removeFile };
};
