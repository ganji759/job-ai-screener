"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  Bot,
  Brain,
  Briefcase,
  Calendar,
  CalendarCheck,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  FileSpreadsheet,
  FileText,
  FileUp,
  Loader2,
  MessageSquare,
  MessagesSquare,
  Mic,
  MicOff,
  Paperclip,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  PlusCircle,
  RefreshCw,
  Search,
  Send,
  Sparkles,
  Trash2,
  Users,
  Wand2,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AgentMessage, ToolCall } from "../../store/api/agentApi";
import { useAgentChatMutation } from "../../store/api/agentApi";
import { useMeQuery } from "../../store/api/authApi";
import { cn } from "../../lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntryUser  = { type: "user";     id: string; content: string };
type EntryAgent = { type: "agent";    id: string; content: string; toolCalls: ToolCall[] };
type EntryThink = { type: "thinking"; id: string };
type Entry = EntryUser | EntryAgent | EntryThink;

type AttachedFile = { id: string; name: string; kind: "pdf" | "resume" | "excel"; file: File };

type Conversation = {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  history: AgentMessage[];
  entries: Entry[];
};

type StoredData = { conversations: Conversation[]; activeId: string | null };

// ── Storage ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "umurava_agent_v2";
const MAX_CONVERSATIONS = 30;

function loadData(): StoredData {
  if (typeof window === "undefined") return { conversations: [], activeId: null };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { conversations: [], activeId: null };
    return JSON.parse(raw) as StoredData;
  } catch {
    return { conversations: [], activeId: null };
  }
}

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ── Tool metadata ─────────────────────────────────────────────────────────────

type ToolMeta = { label: string; icon: ComponentType<{ className?: string }> };

const TOOL_META: Record<string, ToolMeta> = {
  list_jobs:             { label: "Searched job listings",     icon: Briefcase    },
  get_job_details:       { label: "Fetched job details",       icon: FileText     },
  get_applicants:        { label: "Looked up applicants",      icon: Users        },
  search_applicants:     { label: "Searched for candidates",   icon: Search       },
  list_screenings:       { label: "Checked screening runs",    icon: Brain        },
  get_screening_results: { label: "Fetched screening scores",  icon: BarChart3    },
  list_interviews:       { label: "Loaded interview schedule", icon: Calendar     },
  get_pipeline_summary:  { label: "Summarised pipeline",       icon: Zap          },
  schedule_interview:    { label: "Scheduled interview",       icon: CalendarCheck },
  create_job:            { label: "Created job posting",       icon: PlusCircle   },
  update_job_status:     { label: "Updated job status",        icon: RefreshCw    },
  approve_candidate:     { label: "Saved HR decision",         icon: CheckCircle2 },
  ingest_resume:         { label: "Ingested resume",           icon: FileUp       },
  run_screening:         { label: "Ran AI screening",          icon: Brain        },
};

// ── Thinking status messages ──────────────────────────────────────────────────

const THINKING_MSGS = [
  "Understanding your request…",
  "Searching the database…",
  "Analysing your pipeline…",
  "Reviewing candidates…",
  "Running calculations…",
  "Preparing response…",
];

// ── Suggestions ───────────────────────────────────────────────────────────────

const SUGGESTIONS: { icon: ComponentType<{ className?: string }>; text: string }[] = [
  { icon: Zap,         text: "Give me a pipeline summary" },
  { icon: FileUp,      text: "I want to paste a resume and run a screening" },
  { icon: Brain,       text: "Show latest screening results" },
  { icon: Calendar,    text: "List upcoming interviews" },
  { icon: Users,       text: "Who are my top candidates?" },
  { icon: PlusCircle,  text: "Create a mock senior engineer job" },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

function groupConversations(convs: Conversation[]) {
  const DAY = 86_400_000;
  const now  = Date.now();
  const today: Conversation[]     = [];
  const yesterday: Conversation[] = [];
  const week: Conversation[]      = [];
  const older: Conversation[]     = [];
  for (const c of convs) {
    const age = now - new Date(c.updatedAt).getTime();
    if      (age < DAY)     today.push(c);
    else if (age < 2 * DAY) yesterday.push(c);
    else if (age < 7 * DAY) week.push(c);
    else                    older.push(c);
  }
  return { today, yesterday, week, older };
}

function extractError(err: unknown): string {
  if (err instanceof Error) return err.message;
  const r = err as { data?: unknown };
  if (typeof r?.data === "string") return r.data;
  if (r?.data && typeof r.data === "object" && "message" in (r.data as object))
    return String((r.data as { message: unknown }).message);
  return "Request failed — is the backend running and GEMINI_API_KEY set?";
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

const Markdown = ({ text }: { text: string }) => {
  const lines  = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: Array<{ kind: "bullet" | "num"; text: string }> = [];

  const flushList = (key: string) => {
    if (!listBuf.length) return;
    const isBullet = listBuf[0].kind === "bullet";
    const Tag = isBullet ? "ul" : "ol";
    nodes.push(
      <Tag key={key} className={`my-1 space-y-0.5 pl-5 ${isBullet ? "list-disc" : "list-decimal"}`}>
        {listBuf.map((item, i) => <li key={i}>{inline(item.text)}</li>)}
      </Tag>,
    );
    listBuf = [];
  };

  const inline = (raw: string): React.ReactNode =>
    raw.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`")  && p.endsWith("`"))
        return <code key={i} className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-700/60">{p.slice(1, -1)}</code>;
      return p;
    });

  lines.forEach((line, i) => {
    const bullet   = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+\.\s+(.*)/);
    const heading  = line.match(/^#{1,3}\s+(.*)/);
    if (bullet)   { listBuf.push({ kind: "bullet", text: bullet[1] });   return; }
    if (numbered) { listBuf.push({ kind: "num",    text: numbered[1] }); return; }
    flushList(`fl-${i}`);
    if (heading)        nodes.push(<p key={i} className="mt-2 font-semibold">{inline(heading[1])}</p>);
    else if (!line.trim()) nodes.push(<div key={i} className="h-1.5" />);
    else                nodes.push(<p key={i} className="leading-relaxed">{inline(line)}</p>);
  });
  flushList("fl-end");
  return <div className="space-y-0.5 text-sm">{nodes}</div>;
};

// ── Agent avatar ──────────────────────────────────────────────────────────────

const AgentAvatar = ({ size = "md" }: { size?: "sm" | "md" }) => (
  <span className={cn(
    "shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 shadow-md shadow-indigo-500/25",
    size === "sm" ? "h-7 w-7" : "h-9 w-9",
  )}>
    <Bot className={cn("text-white", size === "sm" ? "h-3.5 w-3.5" : "h-5 w-5")} />
  </span>
);

// ── Thinking card ─────────────────────────────────────────────────────────────

const ThinkingCard = () => {
  const [idx, setIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setIdx((i) => (i + 1) % THINKING_MSGS.length), 1900);
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-start gap-3"
    >
      <AgentAvatar />
      <div className="space-y-2">
        <div className="inline-flex items-center gap-3 rounded-2xl rounded-tl-sm border border-indigo-100/80 bg-white/80 px-5 py-3.5 shadow-glass backdrop-blur-sm dark:border-indigo-900/30 dark:bg-slate-800/60">
          {/* Bouncing dots */}
          <span className="flex items-end gap-1">
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="block h-1.5 w-1.5 rounded-full bg-indigo-500"
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 0.7, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
              />
            ))}
          </span>
          <AnimatePresence mode="wait">
            <motion.span
              key={idx}
              initial={{ opacity: 0, y: 5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              transition={{ duration: 0.22 }}
              className="text-sm text-slate-500 dark:text-slate-400"
            >
              {THINKING_MSGS[idx]}
            </motion.span>
          </AnimatePresence>
        </div>
        <p className="pl-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
          AI is working on your request
        </p>
      </div>
    </motion.div>
  );
};

// ── Tool activity card ────────────────────────────────────────────────────────

const ToolCard = ({ toolCall, delay }: { toolCall: ToolCall; delay: number }) => {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[toolCall.name] ?? { label: toolCall.name.replaceAll("_", " "), icon: Wrench };
  const Icon = meta.icon;
  const isErr = toolCall.result != null && typeof toolCall.result === "object" && "error" in (toolCall.result as object);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22 }}
      className={cn(
        "overflow-hidden rounded-xl border text-xs",
        isErr
          ? "border-red-200/80 bg-red-50/60 dark:border-red-900/30 dark:bg-red-950/20"
          : "border-indigo-100/70 bg-gradient-to-r from-indigo-50/60 to-violet-50/40 dark:border-indigo-900/30 dark:from-indigo-950/30 dark:to-violet-950/20",
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left"
      >
        <span className={cn(
          "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg",
          isErr ? "bg-red-100 dark:bg-red-900/30" : "bg-indigo-100 dark:bg-indigo-900/40",
        )}>
          <Icon className={cn("h-3.5 w-3.5", isErr ? "text-red-600 dark:text-red-400" : "text-indigo-600 dark:text-indigo-400")} />
        </span>
        <span className={cn("flex-1 font-semibold", isErr ? "text-red-700 dark:text-red-400" : "text-indigo-700 dark:text-indigo-300")}>
          {meta.label}
        </span>
        {isErr
          ? <AlertCircle className="h-3.5 w-3.5 shrink-0 text-red-500" />
          : <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
        }
        {open
          ? <ChevronDown className="ml-1 h-3.5 w-3.5 text-slate-400" />
          : <ChevronRight className="ml-1 h-3.5 w-3.5 text-slate-400" />
        }
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden"
          >
            <pre className="overflow-x-auto border-t border-indigo-100/60 p-3 text-[10px] leading-relaxed text-slate-500 dark:border-indigo-900/30 dark:text-slate-400">
              {JSON.stringify({ args: toolCall.args, result: toolCall.result }, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Message bubbles ───────────────────────────────────────────────────────────

const UserBubble = ({ entry }: { entry: EntryUser }) => (
  <motion.div
    initial={{ opacity: 0, y: 8, scale: 0.97 }}
    animate={{ opacity: 1, y: 0, scale: 1 }}
    className="flex justify-end"
  >
    <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 px-5 py-3.5 text-sm leading-relaxed text-white shadow-indigo-md">
      {entry.content}
    </div>
  </motion.div>
);

const AgentBubble = ({ entry }: { entry: EntryAgent }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex items-start gap-3"
  >
    <AgentAvatar />
    <div className="flex min-w-0 flex-1 flex-col gap-2">
      {entry.toolCalls.length > 0 && (
        <div className="space-y-1.5">
          <p className="pl-1 text-[10px] font-semibold uppercase tracking-widest text-slate-400 dark:text-slate-500">
            Actions taken
          </p>
          {entry.toolCalls.map((tc, i) => (
            <ToolCard key={i} toolCall={tc} delay={i * 0.07} />
          ))}
        </div>
      )}
      <div className="rounded-2xl rounded-tl-sm border border-white/60 bg-white/85 px-5 py-4 shadow-glass backdrop-blur-sm dark:border-white/[0.06] dark:bg-slate-800/70">
        <Markdown text={entry.content} />
      </div>
    </div>
  </motion.div>
);

// ── Conversation sidebar ──────────────────────────────────────────────────────

const ConvItem = ({
  conv,
  active,
  onSelect,
  onDelete,
}: {
  conv: Conversation;
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) => {
  const [hovering, setHovering] = useState(false);
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className={cn(
        "group flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm transition-colors duration-150",
        active
          ? "bg-gradient-to-r from-indigo-500/15 to-violet-500/10 text-indigo-800 ring-1 ring-inset ring-indigo-500/20 dark:from-indigo-500/20 dark:to-violet-500/12 dark:text-indigo-200 dark:ring-indigo-500/25"
          : "text-slate-600 hover:bg-slate-100/70 dark:text-slate-400 dark:hover:bg-white/[0.05]",
      )}
    >
      <MessageSquare className={cn("h-4 w-4 shrink-0", active ? "text-indigo-500" : "text-slate-400")} />
      <span className="flex-1 truncate font-medium">{conv.title}</span>
      {hovering && (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => { e.stopPropagation(); onDelete(); }}
          onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(); } }}
          className="ml-1 rounded p-0.5 text-slate-400 transition hover:text-red-500 dark:text-slate-500 dark:hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </span>
      )}
    </button>
  );
};

const ConvSidebar = ({
  open,
  conversations,
  activeId,
  onSelect,
  onNew,
  onDelete,
}: {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNew: () => void;
  onDelete: (id: string) => void;
}) => {
  const groups = useMemo(() => groupConversations(conversations), [conversations]);

  const Section = ({ label, convs }: { label: string; convs: Conversation[] }) => {
    if (!convs.length) return null;
    return (
      <div className="mb-4">
        <p className="mb-1.5 px-3 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
        <div className="space-y-0.5">
          {convs.map((c) => (
            <ConvItem
              key={c.id}
              conv={c}
              active={c.id === activeId}
              onSelect={() => onSelect(c.id)}
              onDelete={() => onDelete(c.id)}
            />
          ))}
        </div>
      </div>
    );
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 264, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="flex h-full shrink-0 flex-col overflow-hidden border-r border-white/30 bg-white/40 backdrop-blur-xl dark:border-white/[0.05] dark:bg-slate-900/40"
        >
          {/* New chat button */}
          <div className="shrink-0 p-3">
            <button
              type="button"
              onClick={onNew}
              className="flex w-full items-center gap-2 rounded-xl border border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 to-violet-50/60 px-3.5 py-2.5 text-sm font-semibold text-indigo-700 transition hover:border-indigo-200 hover:from-indigo-100/80 hover:to-violet-100/60 dark:border-indigo-900/40 dark:from-indigo-950/40 dark:to-violet-950/30 dark:text-indigo-300 dark:hover:from-indigo-950/60"
            >
              <Plus className="h-4 w-4" />
              New conversation
            </button>
          </div>

          {/* Conversation list */}
          <div className="flex-1 overflow-y-auto px-2 pb-4">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <MessagesSquare className="h-10 w-10 text-slate-300 dark:text-slate-600" />
                <p className="text-xs text-slate-400 dark:text-slate-500">
                  No conversations yet.<br />Start by asking something below.
                </p>
              </div>
            ) : (
              <>
                <Section label="Today"      convs={groups.today}     />
                <Section label="Yesterday"  convs={groups.yesterday} />
                <Section label="Last 7 days" convs={groups.week}    />
                <Section label="Older"      convs={groups.older}     />
              </>
            )}
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
};

// ── Attach menu ───────────────────────────────────────────────────────────────

const ATTACH_OPTIONS = [
  { kind: "pdf"    as const, label: "PDF Document", icon: FileText,        accept: ".pdf"                         },
  { kind: "resume" as const, label: "Resume",        icon: FileUp,          accept: ".pdf,.doc,.docx"              },
  { kind: "excel"  as const, label: "Excel / CSV",   icon: FileSpreadsheet, accept: ".xlsx,.xls,.csv,.ods"         },
];

const AttachMenu = ({
  onSelect,
  onClose,
}: {
  onSelect: (kind: AttachedFile["kind"], accept: string) => void;
  onClose: () => void;
}) => (
  <>
    <div className="fixed inset-0 z-10" onClick={onClose} />
    <motion.div
      initial={{ opacity: 0, y: 6, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 6, scale: 0.96 }}
      transition={{ duration: 0.14 }}
      className="absolute bottom-full left-0 z-20 mb-2 w-52 overflow-hidden rounded-2xl border border-white/60 bg-white/95 shadow-lg backdrop-blur-xl dark:border-white/[0.08] dark:bg-slate-800/95"
    >
      {ATTACH_OPTIONS.map(({ kind, label, icon: Icon, accept }) => (
        <button
          key={kind}
          type="button"
          onClick={() => { onSelect(kind, accept); onClose(); }}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm text-slate-700 transition hover:bg-indigo-50/70 hover:text-indigo-700 dark:text-slate-300 dark:hover:bg-indigo-950/40 dark:hover:text-indigo-300"
        >
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-100/70 dark:bg-indigo-900/40">
            <Icon className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
          </span>
          <span className="font-medium">{label}</span>
        </button>
      ))}
    </motion.div>
  </>
);

// ── Welcome screen ────────────────────────────────────────────────────────────

const CAPABILITIES = [
  { icon: FileUp,       text: "Paste a resume → instant applicant"  },
  { icon: Brain,        text: "Run AI screenings & rank candidates"  },
  { icon: CalendarCheck,text: "Schedule & manage interviews"         },
  { icon: Briefcase,    text: "Create & manage job postings"         },
  { icon: Zap,          text: "Summarise your entire pipeline"       },
];

const WelcomeScreen = ({ onSend, userName }: { onSend: (text: string) => void; userName: string }) => {
  const firstName = userName.split(" ")[0] || userName;
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-10">
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: "spring", stiffness: 220, damping: 16 }}
        className="relative"
      >
        <span className="flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 shadow-indigo-lg">
          <Wand2 className="h-12 w-12 text-white" />
        </span>
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-amber-400 to-orange-500 shadow-md"
        >
          <Sparkles className="h-4 w-4 text-white" />
        </motion.span>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.12 }}
        className="text-center"
      >
        <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
          Welcome back, {firstName}!
        </h2>
        <p className="mt-2 text-sm font-medium text-indigo-600 dark:text-indigo-400">
          I'm your AI Hiring Assistant — here's what I can do for you:
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {CAPABILITIES.map(({ icon: Icon, text }, i) => (
            <motion.span
              key={text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.06 }}
              className="flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/70 px-3 py-1.5 text-xs font-medium text-slate-600 shadow-card backdrop-blur-sm dark:border-white/[0.08] dark:bg-slate-800/60 dark:text-slate-300"
            >
              <Icon className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
              {text}
            </motion.span>
          ))}
        </div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.55 }}
          className="mt-5 text-sm text-slate-500 dark:text-slate-400"
        >
          Where would you like to start?
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="flex max-w-xl flex-wrap justify-center gap-2"
      >
        {SUGGESTIONS.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.button
              key={s.text}
              type="button"
              onClick={() => onSend(s.text)}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.64 + i * 0.05 }}
              whileHover={{ scale: 1.03, y: -1 }}
              className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/80 px-4 py-2.5 text-sm font-medium text-slate-700 shadow-card backdrop-blur-sm transition hover:border-indigo-200 hover:bg-indigo-50/60 hover:text-indigo-700 dark:border-white/[0.08] dark:bg-slate-800/60 dark:text-slate-300 dark:hover:border-indigo-800 dark:hover:text-indigo-300"
            >
              <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
              {s.text}
            </motion.button>
          );
        })}
      </motion.div>
    </div>
  );
};

// ── Main component ────────────────────────────────────────────────────────────

export const AgentChatPage = () => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId]           = useState<string | null>(null);
  const [input, setInput]                 = useState("");
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [attachments, setAttachments]     = useState<AttachedFile[]>([]);
  const [attachMenuOpen, setAttachMenuOpen] = useState(false);
  const [isRecording, setIsRecording]     = useState(false);
  const bottomRef      = useRef<HTMLDivElement>(null);
  const textareaRef    = useRef<HTMLTextAreaElement>(null);
  const fileInputRef   = useRef<HTMLInputElement>(null);
  const fileKindRef    = useRef<AttachedFile["kind"]>("pdf");
  const recognitionRef = useRef<{ stop: () => void } | null>(null);
  const [agentChat, { isLoading }] = useAgentChatMutation();
  const { data: user } = useMeQuery();

  // Restore from localStorage on mount
  useEffect(() => {
    const d = loadData();
    setConversations(d.conversations);
    setActiveId(d.activeId);
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ conversations, activeId } satisfies StoredData));
    } catch { /* quota */ }
  }, [conversations, activeId]);

  // Auto-scroll to latest message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversations, activeId]);

  const activeConv = useMemo(
    () => conversations.find((c) => c.id === activeId) ?? null,
    [conversations, activeId],
  );
  const entries = activeConv?.entries ?? [];
  const history = activeConv?.history ?? [];

  const newConversation = useCallback(() => {
    setActiveId(null);
    setInput("");
    setTimeout(() => textareaRef.current?.focus(), 50);
  }, []);

  const send = useCallback(
    async (msg: string) => {
      const trimmed = msg.trim();
      if (!trimmed || isLoading) return;
      setInput("");
      const filePrefix = attachments.map((a) => `[Attached ${a.kind.toUpperCase()}: ${a.name}]`).join("\n");
      const fullMsg = filePrefix ? `${filePrefix}\n\n${trimmed}` : trimmed;
      setAttachments([]);

      let convId = activeId;
      let currentHistory = history;

      if (!convId || !activeConv) {
        convId = newId();
        const title = trimmed.length > 58 ? `${trimmed.slice(0, 55)}…` : trimmed;
        const fresh: Conversation = {
          id: convId,
          title,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          history: [],
          entries: [],
        };
        setConversations((prev) => [fresh, ...prev].slice(0, MAX_CONVERSATIONS));
        setActiveId(convId);
        currentHistory = [];
      }

      const uid = newId();
      const tid = newId();

      setConversations((prev) =>
        prev.map((c) =>
          c.id !== convId
            ? c
            : {
                ...c,
                updatedAt: new Date().toISOString(),
                entries: [
                  ...c.entries.filter((e) => e.type !== "thinking"),
                  { type: "user" as const, id: uid, content: fullMsg },
                  { type: "thinking" as const, id: tid },
                ],
              },
        ),
      );

      try {
        const res = await agentChat({ message: fullMsg, history: currentHistory }).unwrap();
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  updatedAt: new Date().toISOString(),
                  history: [
                    ...c.history,
                    { role: "user" as const, content: fullMsg },
                    { role: "model" as const, content: res.reply },
                  ],
                  entries: [
                    ...c.entries.filter((e) => e.type !== "thinking"),
                    { type: "agent" as const, id: newId(), content: res.reply, toolCalls: res.toolCalls },
                  ],
                },
          ),
        );
      } catch (err) {
        const errMsg = extractError(err);
        setConversations((prev) =>
          prev.map((c) =>
            c.id !== convId
              ? c
              : {
                  ...c,
                  entries: [
                    ...c.entries.filter((e) => e.type !== "thinking"),
                    { type: "agent" as const, id: newId(), content: `Error: ${errMsg}`, toolCalls: [] },
                  ],
                },
          ),
        );
      }
    },
    [activeId, activeConv, agentChat, history, isLoading],
  );

  const deleteConversation = useCallback(
    (id: string) => {
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) setActiveId(null);
    },
    [activeId],
  );

  const openFilePicker = (kind: AttachedFile["kind"], accept: string) => {
    fileKindRef.current = kind;
    if (fileInputRef.current) {
      fileInputRef.current.accept = accept;
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachments((prev) => [
      ...prev,
      { id: newId(), name: file.name, kind: fileKindRef.current, file },
    ]);
  };

  const toggleRecording = () => {
    if (isRecording) {
      recognitionRef.current?.stop();
      recognitionRef.current = null;
      setIsRecording(false);
      return;
    }
    type SR = { new(): { continuous: boolean; interimResults: boolean; lang: string; onresult: ((e: SpeechRecognitionEvent) => void) | null; onend: (() => void) | null; start(): void; stop(): void } };
    const SRClass =
      ((window as unknown as Record<string, unknown>).SpeechRecognition as SR | undefined) ??
      ((window as unknown as Record<string, unknown>).webkitSpeechRecognition as SR | undefined);
    if (!SRClass) {
      alert("Voice input is not supported in this browser. Try Chrome.");
      return;
    }
    const recognition = new SRClass();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = "en-US";
    recognition.onresult = (ev: SpeechRecognitionEvent) => {
      const transcript = Array.from(ev.results).map((r) => r[0].transcript).join("");
      setInput(transcript);
    };
    recognition.onend = () => setIsRecording(false);
    recognition.start();
    recognitionRef.current = { stop: () => recognition.stop() };
    setIsRecording(true);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void send(input);
    }
  };

  const isEmpty = entries.length === 0;

  return (
    <div className="flex h-full overflow-hidden rounded-2xl border border-white/30 shadow-glass backdrop-blur-2xl dark:border-white/[0.06]">
      {/* ── Left sidebar ── */}
      <ConvSidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
      />

      {/* ── Main area ── */}
      <div className="flex min-w-0 flex-1 flex-col bg-white/50 dark:bg-slate-900/60">

        {/* Top bar */}
        <div className="flex h-14 shrink-0 items-center gap-3 border-b border-white/30 bg-white/50 px-4 backdrop-blur-md dark:border-white/[0.05] dark:bg-slate-900/50">
          <button
            type="button"
            onClick={() => setSidebarOpen((v) => !v)}
            title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100/80 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-white/[0.07] dark:hover:text-slate-100"
          >
            {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
          </button>

          <div className="flex items-center gap-2.5">
            <AgentAvatar size="sm" />
            <div className="leading-tight">
              <p className="text-sm font-bold text-slate-900 dark:text-slate-50">AI Hiring Assistant</p>
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Powered by Gemini
                {" · "}
                <span className={isLoading ? "text-amber-500" : "text-emerald-500"}>
                  {isLoading ? "Working…" : "Ready"}
                </span>
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-2.5">
            <motion.span
              animate={{ scale: isLoading ? [1, 1.3, 1] : 1 }}
              transition={{ duration: 0.9, repeat: isLoading ? Infinity : 0 }}
              className={cn("h-2 w-2 rounded-full", isLoading ? "bg-amber-400" : "bg-emerald-400")}
            />
            <button
              type="button"
              onClick={newConversation}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-100/80 bg-indigo-50/60 px-3 py-1.5 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100 dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300 dark:hover:bg-indigo-900/30"
            >
              <Plus className="h-3.5 w-3.5" />
              New chat
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="flex-1 overflow-y-auto">
          {isEmpty ? (
            <WelcomeScreen onSend={(text) => void send(text)} userName={user?.name ?? "there"} />
          ) : (
            <div className="mx-auto max-w-3xl space-y-6 px-4 py-8">
              {entries.map((entry) => {
                if (entry.type === "thinking") return <ThinkingCard key={entry.id} />;
                if (entry.type === "user")     return <UserBubble   key={entry.id} entry={entry} />;
                return                                <AgentBubble  key={entry.id} entry={entry} />;
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Input area */}
        <div className="shrink-0 border-t border-white/30 bg-white/50 px-4 pb-5 pt-4 backdrop-blur-md dark:border-white/[0.05] dark:bg-slate-900/50">
          <div className="mx-auto max-w-3xl">
            <div className="rounded-2xl border border-white/60 bg-white/90 shadow-glass backdrop-blur-sm transition-all focus-within:border-indigo-300 focus-within:ring-2 focus-within:ring-indigo-400/20 dark:border-white/[0.08] dark:bg-slate-800/80 dark:focus-within:border-indigo-500/50">

              {/* Attached file pills */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-2 border-b border-slate-100/70 px-4 py-2.5 dark:border-white/[0.06]">
                  {attachments.map((a) => {
                    const Icon = ATTACH_OPTIONS.find((o) => o.kind === a.kind)?.icon ?? FileText;
                    return (
                      <span key={a.id} className="flex items-center gap-1.5 rounded-lg border border-indigo-100 bg-indigo-50/80 px-2.5 py-1 text-xs font-medium text-indigo-700 dark:border-indigo-900/40 dark:bg-indigo-950/40 dark:text-indigo-300">
                        <Icon className="h-3.5 w-3.5 shrink-0" />
                        <span className="max-w-[160px] truncate">{a.name}</span>
                        <button type="button" onClick={() => setAttachments((prev) => prev.filter((f) => f.id !== a.id))} className="ml-0.5 rounded-full text-indigo-400 hover:text-indigo-700 dark:text-indigo-500 dark:hover:text-indigo-200">
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    );
                  })}
                </div>
              )}

              {/* Textarea row */}
              <div className="flex items-end gap-2 px-3 py-3">
                {/* Attach button */}
                <div className="relative shrink-0">
                  <button
                    type="button"
                    onClick={() => setAttachMenuOpen((v) => !v)}
                    title="Attach file"
                    className={cn(
                      "flex h-9 w-9 items-center justify-center rounded-xl transition-colors duration-150",
                      attachMenuOpen
                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400"
                        : "text-slate-400 hover:bg-slate-100/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/[0.07] dark:hover:text-slate-300",
                    )}
                  >
                    <Paperclip className="h-4.5 w-4.5 h-[18px] w-[18px]" />
                  </button>
                  <AnimatePresence>
                    {attachMenuOpen && (
                      <AttachMenu
                        onSelect={openFilePicker}
                        onClose={() => setAttachMenuOpen(false)}
                      />
                    )}
                  </AnimatePresence>
                </div>

                <textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about your pipeline, candidates, or schedule an interview…"
                  rows={1}
                  className="flex-1 resize-none bg-transparent py-1 text-sm text-slate-800 placeholder-slate-400 outline-none dark:text-slate-100 dark:placeholder-slate-500"
                  style={{ maxHeight: "160px" }}
                />

                {/* Mic button */}
                <motion.button
                  type="button"
                  onClick={toggleRecording}
                  title={isRecording ? "Stop recording" : "Voice message"}
                  animate={isRecording ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                  transition={isRecording ? { duration: 1.1, repeat: Infinity } : {}}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
                    isRecording
                      ? "bg-red-500 text-white shadow-md shadow-red-500/30"
                      : "text-slate-400 hover:bg-slate-100/80 hover:text-slate-600 dark:text-slate-500 dark:hover:bg-white/[0.07] dark:hover:text-slate-300",
                  )}
                >
                  {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </motion.button>

                {/* Send button */}
                <motion.button
                  type="button"
                  onClick={() => void send(input)}
                  disabled={(!input.trim() && attachments.length === 0) || isLoading}
                  whileHover={(input.trim() || attachments.length > 0) && !isLoading ? { scale: 1.07 } : {}}
                  whileTap={(input.trim() || attachments.length > 0) && !isLoading ? { scale: 0.95 } : {}}
                  className={cn(
                    "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-40",
                    (input.trim() || attachments.length > 0) && !isLoading
                      ? "bg-gradient-to-br from-indigo-500 to-violet-600 text-white shadow-indigo-md"
                      : "bg-slate-100 text-slate-400 dark:bg-slate-700 dark:text-slate-500",
                  )}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </motion.button>
              </div>
            </div>

            {/* Hidden file input */}
            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            <p className="mt-2 text-center text-[10px] text-slate-400 dark:text-slate-500">
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[9px] dark:border-slate-700 dark:bg-slate-800">Enter</kbd>
              {" "}to send ·{" "}
              <kbd className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 text-[9px] dark:border-slate-700 dark:bg-slate-800">Shift+Enter</kbd>
              {" "}for new line · AI may make mistakes — always review critical decisions
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
