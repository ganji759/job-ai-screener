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
  Search,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { cn } from "../../lib/utils";
import { useMeQuery } from "../../store/api/authApi";
import { useGetNotificationsQuery } from "../../store/api/notificationsApi";
import { useGlobalSearchQuery } from "../../store/api/searchApi";
import { NotificationPanel } from "./NotificationPanel";
import { UserAccountDropdown } from "./UserAccountDropdown";
import { getLocalReadIds, getLocalUnreadIds, subscribeLocalReadUpdates } from "../../lib/notificationReadState";
import { useDebounce } from "../../hooks/useDebounce";

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
  if (s === "active") return "pill pill-mint";
  if (s === "closed") return "pill";
  return "pill pill-amber";
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
      className="panel absolute left-0 right-0 top-[calc(100%+8px)] z-[100] max-h-[min(70vh,420px)] overflow-hidden"
    >
      <div className="max-h-[min(70vh,420px)] overflow-y-auto p-2">
        {isFetching && qOk ? (
          <div className="flex items-center justify-center gap-2 py-10 text-sm" style={{ color: "var(--ink-3)" }}>
            <Loader2 className="h-5 w-5 animate-spin" style={{ color: "var(--indigo-2)" }} />
            Searching…
          </div>
        ) : showEmpty ? (
          <div className="px-4 py-8 text-center text-sm" style={{ color: "var(--ink-3)" }}>
            No results found for &quot;{debouncedSearch.trim()}&quot;
          </div>
        ) : (
          <>
            {jobs.length ? (
              <div className="mb-3">
                <p className="mono px-2 py-1.5 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-4)" }}>Jobs</p>
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
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150",
                          )}
                          style={{
                            background: active ? "rgba(99,102,241,0.12)" : "transparent",
                          }}
                        >
                          <Briefcase className="h-4 w-4 shrink-0" style={{ color: "var(--indigo-2)" }} />
                          <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: "#fff" }}>{job.title}</span>
                          <span className={jobStatusClass(job.status)}>{job.status}</span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : null}
            {applicants.length ? (
              <div className="mb-3">
                <p className="mono px-2 py-1.5 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-4)" }}>Applicants</p>
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
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150",
                          )}
                          style={{
                            background: active ? "rgba(99,102,241,0.12)" : "transparent",
                          }}
                        >
                          <span className="avatar" style={{ width: 32, height: 32, fontSize: 11 }}>
                            {applicantInitials(applicant.profile)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold" style={{ color: "#fff" }}>{name}</span>
                            <span className="block truncate text-xs" style={{ color: "var(--ink-3)" }}>
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
                <p className="mono px-2 py-1.5 text-[10.5px] uppercase tracking-[0.14em]" style={{ color: "var(--ink-4)" }}>Screenings</p>
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
                            "flex w-full items-center gap-3 rounded-lg px-2 py-2.5 text-left transition-colors duration-150",
                          )}
                          style={{
                            background: active ? "rgba(99,102,241,0.12)" : "transparent",
                          }}
                        >
                          <Brain className="h-4 w-4 shrink-0" style={{ color: "#f0abfc" }} />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-semibold" style={{ color: "#fff" }}>
                              Screening · {String(screening.status ?? "")}
                            </span>
                            <span className="block truncate text-xs" style={{ color: "var(--ink-3)" }}>{when}</span>
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
      <Search
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2"
        style={{ color: "var(--ink-4)" }}
      />
      {isFetching && qOk ? (
        <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin" style={{ color: "var(--indigo-2)" }} />
      ) : (
        <span
          className="mono pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 rounded-md px-1.5 py-[2px] text-[10px]"
          style={{ border: "1px solid var(--line)", color: "var(--ink-4)" }}
        >
          ⌘K
        </span>
      )}
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
        placeholder="Search jobs, applicants, screenings…"
        className={cn("input pl-10 pr-12", wide ? "max-w-2xl" : "max-w-md md:focus-within:max-w-2xl")}
      />
    </div>
  );

  return (
    <>
      <header
        className="topbar"
        style={{
          boxShadow: scrolled ? "0 8px 24px -16px rgba(0,0,0,0.6)" : "none",
        }}
      >
        <button type="button" aria-label="Toggle sidebar" onClick={onToggleSidebar} className="btn-icon">
          <Menu className="h-[18px] w-[18px]" />
        </button>
        <div className="hidden min-w-0 md:block">
          <p className="truncate text-[14.5px] font-semibold" style={{ color: "#fff" }}>{title}</p>
        </div>

        {isMdUp ? (
          <div ref={searchContainerRef} className="relative mx-auto min-w-0 flex-1" style={{ maxWidth: 560 }}>
            {renderSearchField(false)}
            <AnimatePresence>{searchOpen && searchDropdownVisible ? renderResultsPanel() : null}</AnimatePresence>
          </div>
        ) : !mobileSearchOpen ? (
          <div className="min-w-0 flex-1" />
        ) : (
          <div ref={searchContainerRef} className="relative min-w-0 flex-1">
            {renderSearchField(true)}
            <AnimatePresence>{mobileSearchOpen && searchDropdownVisible ? renderResultsPanel() : null}</AnimatePresence>
          </div>
        )}

        <div className="flex shrink-0 items-center gap-2">
          {!isMdUp && !mobileSearchOpen ? (
            <button
              type="button"
              aria-label="Open search"
              className="btn-icon"
              onClick={() => {
                setMobileSearchOpen(true);
                setSearchOpen(true);
              }}
            >
              <Search className="h-4 w-4" />
            </button>
          ) : null}
          {!isMdUp && mobileSearchOpen ? (
            <button
              type="button"
              aria-label="Close search"
              className="btn-icon"
              onClick={() => {
                setMobileSearchOpen(false);
                setSearchOpen(false);
                setSearchTerm("");
              }}
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          ) : null}

          <div ref={notifContainerRef} className="relative">
            <button
              type="button"
              aria-label="Notifications"
              aria-expanded={showNotif}
              onClick={() => setShowNotif((v) => !v)}
              className="btn-icon relative"
            >
              <Bell className="h-4 w-4" />
              {unread > 0 ? (
                <span
                  className="mono absolute -right-[3px] -top-[3px] inline-flex items-center justify-center rounded-full text-white"
                  style={{
                    background: "#ef4444",
                    fontSize: 9,
                    fontWeight: 700,
                    minWidth: 16,
                    height: 16,
                    padding: "0 4px",
                    border: "2px solid #0c0c18",
                  }}
                >
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
                  className="absolute right-0 top-11 z-[90] origin-top-right"
                >
                  <NotificationPanel onClose={() => setShowNotif(false)} />
                </motion.div>
              ) : null}
            </AnimatePresence>
          </div>

          <UserAccountDropdown align="end" side="bottom">
            <button
              type="button"
              className="flex max-w-[220px] items-center gap-[10px] transition-colors duration-150"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid var(--line)",
                borderRadius: 999,
                padding: "4px 12px 4px 4px",
              }}
            >
              {avatarUrl && !avatarLoadError ? (
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-[30px] w-[30px] rounded-full object-cover"
                  onError={() => setAvatarLoadError(true)}
                />
              ) : (
                <span className="avatar" style={{ width: 30, height: 30, fontSize: 11 }}>
                  {initials}
                </span>
              )}
              <div className="hidden min-w-0 text-left sm:block" style={{ lineHeight: 1.15 }}>
                <p className="truncate text-[12.5px] font-semibold" style={{ color: "#fff" }}>{user?.name ?? "Recruiter"}</p>
                <p className="truncate text-[10.5px]" style={{ color: "var(--ink-3)" }}>{user?.email ?? "…"}</p>
              </div>
              <ChevronDown className="hidden h-[14px] w-[14px] shrink-0 sm:block" style={{ color: "var(--ink-3)" }} />
            </button>
          </UserAccountDropdown>
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
            className="panel pointer-events-none fixed right-4 top-20 z-[60] w-[360px] max-w-[calc(100vw-2rem)] px-4 py-3"
          >
            <p className="text-sm font-semibold" style={{ color: "#fff" }}>{banner.title}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--ink-3)" }}>{banner.message}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </>
  );
};
