"use client";

import { StoreProvider } from "../store/provider";
import { ThemeProvider } from "../hooks/useTheme";

export const Providers = ({ children }: { children: React.ReactNode }) => (
  <StoreProvider>
    <ThemeProvider>{children}</ThemeProvider>
  </StoreProvider>
);
