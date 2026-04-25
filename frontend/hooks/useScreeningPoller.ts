"use client";

import { useMemo } from "react";
import { useGetScreeningStatusQuery } from "../store/api/screeningsApi";

export const useScreeningPoller = (screeningId: string) => {
  const query = useGetScreeningStatusQuery(screeningId, {
    skip: !screeningId,
    pollingInterval: 3000,
    refetchOnFocus: true,
  });

  const status = String((query.data as { status?: string } | undefined)?.status ?? "queued");

  return useMemo(
    () => ({
      ...query,
      status,
      isComplete: status === "completed",
      isFailed: status === "failed",
      progress: (query.data as { progress?: number } | undefined)?.progress,
    }),
    [query, status],
  );
};
