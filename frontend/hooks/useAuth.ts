"use client";

import { useRouter } from "next/navigation";
import { clearToken, getToken } from "../lib/auth";
import { useMeQuery } from "../store/api/authApi";

export const useAuth = () => {
  const router = useRouter();
  const isAuthenticated = Boolean(getToken());
  const { data: user, isLoading } = useMeQuery(undefined, { skip: !isAuthenticated });

  const logout = () => {
    clearToken();
    router.push("/login");
  };

  return { isAuthenticated, user, isLoading, logout };
};
