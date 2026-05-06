"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  Bell,
  Brain,
  Briefcase,
  ChevronDown,
  Loader2,
  Menu,
  Moon,
  Search,
  Sun,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/utils";
import { useMeQuery } from "../../store/api/authApi";
import { useGetNotificationsQuery } from "../../store/api/notificationsApi";
import { useGlobalSearchQuery } from "../../store/api/searchApi";
import { NotificationPanel } from "./NotificationPanel";
import { UserAccountDropdown } from "./UserAccountDropdown";
import { useTheme } from "../../hooks/useTheme";
import { getLocalReadIds, getLocalUnreadIds, subscribeLocalReadUpdates } from "../../lib/notificationReadState";
import { useDebounce } from "../../hooks/useDebounce";

const iconBtn =
  "flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-slate-600 transition-all duration-200 ease-out hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500/30 dark:text-slate-300 dark:hover:bg-slate-800";

function useIsMdUp() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia("(min-width: 768px)");
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia("(min-width: 768px)").matches,
    () => true,
  );
}

function jobStatusClass(status: string): string {
  const s = status?.toLowerCase();
  if (s === "active") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300";
  if (s === "closed") return "bg-slate-200 text-slate-700 dark:bg-slate-600 dark:text-slate-100";
  return "bg-amber-100 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200";
}

function applicantInitials(profile: { firstName?: string; lastName?: string }): string {
  const a = (profile?.firstName ?? "").trim().charAt(0).toUpperCase();
  const b = (profile?.lastName ?? "").trim().charAt(0).toUpperCase();
  if (a && b) return `${a}${b}`;
  if (a) return `${a}${a}`;
  return "A";
}

export const Header = ({ onToggleSidebar }: { onToggleSidebar: () => void }) => {
  const pathname = usePathname();
  const router = useRouter();
  const isMdUp = useIsMdUp();
  const { data: user } = useMeQuery();

  useEffect(() => {
    if (isMdUp) setMobileSearchOpen(false);
  }, [isMdUp]);
  const [showNotif, setShowNotif] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeHit, setActiveHit] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [banner, setBanner] = useState<{ id: string; title: string; message: string } | null>(null);
  const [avatarLoadError, setAvatarLoadError] = useState(false);
  const [localReadIds, setLocalReadIds] = useState<Set<string>>(new Set());
  const [localUnreadIds, setLocalUnreadIds] = useState<Set<string>>(new Set());
  const { theme, toggleTheme } = useTheme();
  const { data: notificationsData } = useGetNotificationsQuery({ page: 1, limit: 50 });

  const debouncedSearch = useDebounce(searchTerm, 250);
  const qOk = debouncedSearch.trim().length >= 2;
  const { data: globalSearchData, isFetching } = useGlobalSearchQuery(
    { q: debouncedSearch.trim(), limit: 8 },
    { skip: !qOk },
  );

  const notifContainerRef = useRef<HTMLDivElement | null>(null);
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const knownNotificationIds = useRef<Set<string>>(new Set());
  const initializedNotifications = useRef(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const onScroll = () => setScrolled(window.scrollY > 4);
      onScroll();
      window.addEventListener("scroll", onScroll, { passive: true });
      return () => window.removeEventListener("scroll", onScroll);
    }
    return undefined;
  }, []);

  useEffect(() => {
    if (!showNotif) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (notifContainerRef.current && !notifContainerRef.current.contains(t)) setShowNotif(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [showNotif]);

  useEffect(() => {
    if (!searchOpen && !mobileSearchOpen) return undefined;
    const handleClickOutside = (event: MouseEvent) => {
      const t = event.target as Node;
      if (searchContainerRef.current && !searchContainerRef.current.contains(t)) {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    };
    const onEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setSearchOpen(false);
        setMobileSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", onEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", onEsc);
    };
  }, [searchOpen, mobileSearchOpen]);

  useEffect(() => {
    setLocalReadIds(getLocalReadIds());
    setLocalUnreadIds(getLocalUnreadIds());
    return subscribeLocalReadUpdates(() => {
      setLocalReadIds(getLocalReadIds());
      setLocalUnreadIds(getLocalUnreadIds());
    });
  }, []);

  useEffect(() => {
    const notifications = notificationsData?.notifications ?? [];
    if (!initializedNotifications.current) {
      knownNotificationIds.current = new Set(notifications.map((item) => item._id));
      initializedNotifications.current = true;
      return;
    }
    const newNotification = notifications.find((item) => !knownNotificationIds.current.has(item._id));
    notifications.forEach((item) => knownNotificationIds.current.add(item._id));
    if (newNotification) {
      setBanner({ id: newNotification._id, title: newNotification.title, message: newNotification.message });
    }
  }, [notificationsData?.notifications]);

  useEffect(() => {
    if (!banner) return;
    const timeout = window.setTimeout(() => setBanner(null), 3000);
    return () => window.clearTimeout(timeout);
  }, [banner]);

  useEffect(() => {
    setAvatarLoadError(false);
  }, [user?.avatarUrl]);

  const title = useMemo(() => {
    const parts = pathname.split("/").filter(Boolean);
    const last = parts.at(-1) ?? "dashboard";
    const secondLast = parts.at(-2);
    const isOid = (s: string) => /^[a-f\d]{24}$/i.test(s);
    if (parts[0] === "jobs" && secondLast && isOid(secondLast)) {
      if (last === "applicants") return "Applicants";
      if (last === "screenings") return "Screenings";
      if (isOid(last)) return "Job overview";
    }
    if (isOid(last)) return "Details";
    return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ");
  }, [pathname]);

  const unread = (notificationsData?.notifications ?? []).filter((n) => {
    if (localUnreadIds.has(n._id)) return true;
    if (localReadIds.has(n._id)) return false;
    return !n.readAt;
  }).length;

  const initials = (user?.name ?? "RC")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("");

  const dark = theme === "dark";
  const avatarUrl = user?.avatarUrl ?? null;

  const jobs = globalSearchData?.jobs ?? [];
  const applicants = globalSearchData?.applicants ?? [];
  const screenings = globalSearchData?.screenings ?? [];

  type Hit = { id: string; href: string };
  const flatHits: Hit[] = useMemo(() => {
    const h: Hit[] = [];
    jobs.forEach((j) => h.push({ id: `job-${j._id}`, href: `/jobs/${j._id}` }));
    applicants.forEach((a) => h.push({ id: `app-${a._id}`, href: `/applicants?highlightApplicant=${a._id}` }));
    screenings.forEach((s) => h.push({ id: `scr-${s._id}`, href: `/screenings/${s._id}` }));
    return h;
  }, [applicants, jobs, screenings]);

  useEffect(() => {
    setActiveHit(0);
  }, [debouncedSearch, flatHits.length]);

  const openSearchResult = useCallback(
    (href: string) => {
      router.push(href);
      setSearchOpen(false);
      setMobileSearchOpen(false);
      setSearchTerm("");
    },
    [router],
  );

  const searchDropdownVisible = (searchOpen || mobileSearchOpen) && qOk;

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setSearchOpen(false);
      setMobileSearchOpen(false);
      return;
    }
    if (!searchDropdownVisible || flatHits.length === 0) {
      if (e.key === "Enter") {
        e.preventDefault();
        if (flatHits[0]) openSearchResult(flatHits[0].href);
      }
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveHit((i) => Math.min(i + 1, flatHits.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveHit((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = flatHits[activeHit] ?? flatHits[0];
      if (hit) openSearchResult(hit.href);
    }
  };

  const hasAnyResults = jobs.length > 0 || applicants.length > 0 || screenings.length > 0;
  const showEmpty = qOk && !isFetching && !hasAnyResults;

  const renderResultsPanel = () => (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 4 }}
      transition={{ duration: 0.15 }}
      className="absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(70vh,420px)] overflow-hidden rounded-xl border border-white/60 bg-white/95 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-slate-900/95"
    >
      <div className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
        {isFetching && qOk ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            Searching…
          </div>
        ) : showEmpty ? (
          <div className="px-4 py-8 text-center text-sm text-slate-500">
            No results found for &quot;{debouncedSearch.trim()}&quot;
          </div>
        ) : (
          <>
            {jobs.length ? (
              <div className="mb-3">
                <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Jobs</p>
                <ul className="space-y-0.5">
                  {jobs.map((job) => {
                    const i = flatHits.findIndex((h) => h.id === `job-${job._id}`);
                    const active = i === activeHit;
                    return (
                      <li key={job._id}>
                        <button
                          type="button"
                          onClick={() => openSearchResult(`/jobs/${job._id}`)}
                          onMouseEnter={() => setActiveHit(i)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition duration-200 ease-out",
                            active ? "bg-brand-50 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700/80",
                          )}
                        >
                          <Briefcase className="h-4 w-4 shrink-0 text-brand-600" />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{job.title}</span>
                          <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold capitalize", jobStatusClass(job.status))}>
                            {job.status}
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {applicants.length ? (
              <div className="mb-3">
                <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Applicants</p>
                <ul className="space-y-0.5">
                  {applicants.map((applicant) => {
                    const i = flatHits.findIndex((h) => h.id === `app-${applicant._id}`);
                    const active = i === activeHit;
                    const name =
                      `${(applicant.profile?.firstName ?? "").trim()} ${(applicant.profile?.lastName ?? "").trim()}`.trim() || "Applicant";
                    return (
                      <li key={applicant._id}>
                        <button
                          type="button"
                          onClick={() => openSearchResult(`/applicants?highlightApplicant=${applicant._id}`)}
                          onMouseEnter={() => setActiveHit(i)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition duration-200 ease-out",
                            active ? "bg-brand-50 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700/80",
                          )}
                        >
                          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-800 dark:bg-brand-950/50 dark:text-brand-200">
                            {applicantInitials(applicant.profile)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{name}</span>
                            <span className="block truncate text-xs text-slate-500">
                              {applicant.jobTitle ? `Applied: ${applicant.jobTitle}` : "Applicant"}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {screenings.length ? (
              <div>
                <p className="px-2 py-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-400">Screenings</p>
                <ul className="space-y-0.5">
                  {screenings.map((screening) => {
                    const i = flatHits.findIndex((h) => h.id === `scr-${screening._id}`);
                    const active = i === activeHit;
                    const when = screening.createdAt
                      ? new Date(screening.createdAt).toLocaleString(undefined, { month: "short", day: "numeric", year: "numeric" })
                      : "";
                    return (
                      <li key={screening._id}>
                        <button
                          type="button"
                          onClick={() => openSearchResult(`/screenings/${screening._id}`)}
                          onMouseEnter={() => setActiveHit(i)}
                          className={cn(
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition duration-200 ease-out",
                            active ? "bg-brand-50 dark:bg-slate-700" : "hover:bg-slate-50 dark:hover:bg-slate-700/80",
                          )}
                        >
                          <Brain className="h-4 w-4 shrink-0 text-violet-600" />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
                              Screening · {String(screening.status ?? "")}
                            </span>
                            <span className="block truncate text-xs text-slate-500">{when}</span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
          </>
        )}
      </div>
    </motion.div>
  );

  const renderSearchField = (wide: boolean) => (
    <div className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
      {isFetching && qOk ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-brand-600" />
      ) : null}
      <input
        value={searchTerm}
        onFocus={() => {
          setSearchOpen(true);
          if (!isMdUp) setMobileSearchOpen(true);
        }}
        onChange={(e) => {
          setSearchTerm(e.target.value);
          setSearchOpen(true);
          if (!isMdUp) setMobileSearchOpen(true);
        }}
        onKeyDown={onSearchKeyDown}
        placeholder="Search for jobs, applicants, screenings..."
        className={cn(
          "h-10 w-full rounded-full border border-slate-200 bg-slate-50/80 pl-10 pr-10 text-sm text-slate-800 shadow-sm outline-none transition-all duration-200 ease-out placeholder:text-slate-400 focus:border-brand-500 focus:bg-white focus:ring-2 focus:ring-brand-500/20 dark:border-slate-600 dark:bg-slate-900/50 dark:text-slate-100 dark:placeholder:text-slate-500",
          wide ? "max-w-2xl" : "max-w-md md:focus-within:max-w-2xl",
        )}
      />
    </div>
  );

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 w-full border-b backdrop-blur-xl transition-all duration-200 ease-out",
          scrolled
            ? "border-white/30 bg-white/85 shadow-header dark:border-white/[0.06] dark:bg-[#0d1117]/90"
            : "border-white/40 bg-white/65 dark:border-white/[0.04] dark:bg-[#0d1117]/75",
        )}
      >
        <div className="mx-auto flex h-16 max-w-[1600px] items-center gap-2 px-3 md:gap-4 md:px-4">
          <div className="flex min-w-0 flex-shrink-0 items-center gap-2 md:gap-3">
            <button type="button" aria-label="Toggle sidebar" onClick={onToggleSidebar} className={iconBtn}>
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden min-w-0 md:block">
              <p className="truncate text-sm font-bold text-slate-900 dark:text-slate-100">{title}</p>
            </div>
          </div>

          {isMdUp ? (
            <div ref={searchContainerRef} className="relative min-w-0 flex-1 px-2">
              <div className="mx-auto w-full max-w-xl transition-[max-width] duration-200 ease-out focus-within:max-w-2xl">
                {renderSearchField(false)}
                <AnimatePresence>{searchOpen && searchDropdownVisible ? renderResultsPanel() : null}</AnimatePresence>
              </div>
            </div>
          ) : (
            <>
              {!mobileSearchOpen ? (
                <div className="min-w-0 flex-1" />
              ) : (
                <div ref={searchContainerRef} className="relative min-w-0 flex-1 px-1">
                  {renderSearchField(true)}
                  <AnimatePresence>{mobileSearchOpen && searchDropdownVisible ? renderResultsPanel() : null}</AnimatePresence>
                </div>
              )}
            </>
          )}

          <div className="flex shrink-0 items-center gap-1 md:gap-2">
            {!isMdUp && !mobileSearchOpen ? (
              <button
                type="button"
                aria-label="Open search"
                className={iconBtn}
                onClick={() => {
                  setMobileSearchOpen(true);
                  setSearchOpen(true);
                }}
              >
                <Search className="h-5 w-5" />
              </button>
            ) : null}
            {!isMdUp && mobileSearchOpen ? (
              <button
                type="button"
                aria-label="Close search"
                className={iconBtn}
                onClick={() => {
                  setMobileSearchOpen(false);
                  setSearchOpen(false);
                  setSearchTerm("");
                }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            ) : null}

            <button
              type="button"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
              title={dark ? "Switch to light mode" : "Switch to dark mode"}
              onClick={toggleTheme}
              className={iconBtn}
            >
              <motion.span animate={{ rotate: dark ? 180 : 0 }} transition={{ duration: 0.2 }} className="block">
                {dark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
              </motion.span>
            </button>

            <div ref={notifContainerRef} className="relative">
              <button
                type="button"
                aria-label="Notifications"
                aria-expanded={showNotif}
                onClick={() => setShowNotif((v) => !v)}
                className={iconBtn}
              >
                <Bell className="h-5 w-5" />
                {unread > 0 ? (
                  <span className="absolute right-0.5 top-0.5 z-10 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white">
                    {unread > 99 ? "99+" : unread}
                  </span>
                ) : null}
              </button>
              <AnimatePresence>
                {showNotif ? (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: "easeOut" }}
                    className="absolute right-0 top-12 z-[90] origin-top-right"
                  >
                    <NotificationPanel onClose={() => setShowNotif(false)} />
                  </motion.div>
                ) : null}
              </AnimatePresence>
            </div>

            <UserAccountDropdown align="end" side="bottom">
              <button
                type="button"
                className="flex max-w-[200px] items-center gap-2 rounded-full border-0 bg-transparent py-1 pl-1 pr-2 transition-colors duration-200 ease-out hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                {avatarUrl && !avatarLoadError ? (
                  <img
                    src={avatarUrl}
                    alt=""
                    className="h-9 w-9 rounded-full object-cover ring-2 ring-slate-200 dark:ring-slate-600"
                    onError={() => setAvatarLoadError(true)}
                  />
                ) : (
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-xs font-bold text-white ring-2 ring-indigo-500/20">
                    {initials}
                  </span>
                )}
                <div className="hidden min-w-0 text-left sm:block">
                  <p className="truncate text-sm font-bold text-[#1d1d1f] dark:text-slate-100">{user?.name ?? "Recruiter"}</p>
                  <p className="truncate text-xs text-[#8e8e93] dark:text-slate-400">{user?.email ?? "…"}</p>
                </div>
                <ChevronDown className="hidden h-4 w-4 shrink-0 text-slate-500 sm:block" />
              </button>
            </UserAccountDropdown>
          </div>
        </div>
      </header>

      <AnimatePresence>
        {banner ? (
          <motion.div
            key={banner.id}
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={{ duration: 0.2 }}
            className="pointer-events-none fixed right-4 top-20 z-[60] w-[360px] max-w-[calc(100vw-2rem)] rounded-xl border border-white/60 bg-white/90 px-4 py-3 shadow-glass backdrop-blur-xl dark:border-white/10 dark:bg-slate-800/90"
          >
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{banner.title}</p>
            <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">{banner.message}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
