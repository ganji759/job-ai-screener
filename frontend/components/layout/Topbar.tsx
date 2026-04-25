"use client";

import { Header } from "./Header";

export const Topbar = ({ onToggleSidebar }: { onToggleSidebar?: () => void }) => <Header onToggleSidebar={onToggleSidebar ?? (() => undefined)} />;
