"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutGrid, Users, ClipboardList } from "lucide-react";
import { cn } from "../../lib/utils";

const tabs = (jobId: string) =>
  [
    { href: `/jobs/${jobId}`, label: "Overview", icon: LayoutGrid, end: true },
    { href: `/jobs/${jobId}/applicants`, label: "Applicants", icon: Users, end: false },
    { href: `/jobs/${jobId}/screenings`, label: "Screenings", icon: ClipboardList, end: false },
  ] as const;

export const JobSubNav = ({ jobId }: { jobId: string }) => {
  const pathname = usePathname();
  return (
    <nav className="mt-4 flex flex-wrap gap-2" aria-label="Job sections">
      {tabs(jobId).map(({ href, label, icon: Icon, end }) => {
        const active = end ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-semibold outline-none transition focus-visible:ring-2 focus-visible:ring-brand-500/40",
              active ? "bg-brand-600 text-white shadow-brand-sm" : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600",
            )}
          >
            <Icon className="h-4 w-4" aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );
};
