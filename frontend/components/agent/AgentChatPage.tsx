"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
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
  MessagesSquare,
  Mic,
  MicOff,
  MoreHorizontal,
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
  Wrench,
  X,
  Zap,
} from "lucide-react";
import type { ComponentType } from "react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import toast from "react-hot-toast";
import type { AgentMessage, ToolCall } from "../../store/api/agentApi";
import { useAgentChatMutation } from "../../store/api/agentApi";
import { useMeQuery } from "../../store/api/authApi";
import { getToken } from "../../lib/auth";
import { resolveApiBaseUrl } from "../../lib/resolveApiBaseUrl";
import { cn } from "../../lib/utils";
import { HeronLogo } from "../layout/HeronLogo";

// ── Types ─────────────────────────────────────────────────────────────────────

type EntryUser  = { type: "user";     id: string; content: string; displayContent?: string };
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

const STORAGE_KEY = "heron_agent_v2";
const STORAGE_KEY_LEGACY = "umurava_agent_v2";
const MAX_CONVERSATIONS = 30;

function loadData(): StoredData {
  if (typeof window === "undefined") return { conversations: [], activeId: null };
  try {
    // One-time migration: preserve history from old brand key
    if (!localStorage.getItem(STORAGE_KEY)) {
      const legacy = localStorage.getItem(STORAGE_KEY_LEGACY);
      if (legacy) {
        localStorage.setItem(STORAGE_KEY, legacy);
        localStorage.removeItem(STORAGE_KEY_LEGACY);
      }
    }
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
  approve_candidate:          { label: "Saved HR decision",        icon: CheckCircle2 },
  ingest_resume:              { label: "Ingested resume",          icon: FileUp       },
  run_screening:              { label: "Ran AI screening",         icon: Brain        },
  get_applicant_details:      { label: "Fetched candidate profile", icon: Users       },
  search_applicants_by_skill: { label: "Searched by skill",        icon: Search      },
  update_job:                 { label: "Updated job posting",      icon: RefreshCw   },
  cancel_interview:           { label: "Cancelled interview",      icon: X           },
};

function inferToolMeta(name: string): { label: string; icon: ComponentType<{ className?: string }> } {
  const words = name.split("_");
  const verb = words[0];
  const label = words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
  let icon: ComponentType<{ className?: string }> = Wrench;
  if (verb === "list" || verb === "get" || verb === "search") icon = Search;
  else if (verb === "create" || verb === "add") icon = PlusCircle;
  else if (verb === "update" || verb === "cancel" || verb === "approve") icon = RefreshCw;
  else if (verb === "run" || verb === "schedule" || verb === "ingest") icon = Zap;
  return { label, icon };
}

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
  const r = err as { data?: unknown; error?: unknown };
  if (typeof r?.data === "string") return r.data;
  if (r?.data && typeof r.data === "object") {
    const d = r.data as Record<string, unknown>;
    if (typeof d.message === "string") return d.message;
    if (typeof d.error   === "string") return d.error;
  }
  return "Request failed — is the backend running and GEMINI_API_KEY set?";
}

// ── Markdown renderer ─────────────────────────────────────────────────────────

const Markdown = ({ text }: { text: string }) => {
  const lines  = text.split("\n");
  const nodes: React.ReactNode[] = [];
  let listBuf: Array<{ kind: "bullet" | "num"; text: string }> = [];
  let inCode = false;
  let codeLang = "";
  let codeBuf: string[] = [];

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

  const flushCode = (key: string) => {
    if (!codeBuf.length && !codeLang) return;
    nodes.push(
      <div key={key} className="my-2 overflow-hidden rounded-lg border border-slate-200/80 bg-slate-50/80 dark:border-slate-700/50 dark:bg-slate-800/60">
        {codeLang && (
          <div className="border-b border-slate-200/60 px-3 py-1 font-mono text-[10px] text-slate-400 dark:border-slate-700/40 dark:text-slate-500">
            {codeLang}
          </div>
        )}
        <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed">
          <code className="font-mono text-slate-700 dark:text-slate-300">{codeBuf.join("\n")}</code>
        </pre>
      </div>,
    );
    codeBuf = [];
    codeLang = "";
  };

  const inline = (raw: string): React.ReactNode =>
    raw.split(/(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)]+\))/g).map((p, i) => {
      if (p.startsWith("**") && p.endsWith("**")) return <strong key={i}>{p.slice(2, -2)}</strong>;
      if (p.startsWith("`")  && p.endsWith("`"))
        return <code key={i} className="rounded bg-slate-200/70 px-1 py-0.5 font-mono text-[11px] dark:bg-slate-700/60">{p.slice(1, -1)}</code>;
      const link = p.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (link) return <a key={i} href={link[2]} target="_blank" rel="noopener noreferrer" className="text-indigo-600 underline decoration-indigo-300 underline-offset-2 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-200">{link[1]}</a>;
      return p;
    });

  lines.forEach((line, i) => {
    if (line.startsWith("```")) {
      if (!inCode) {
        flushList(`fl-pre-${i}`);
        inCode = true;
        codeLang = line.slice(3).trim();
      } else {
        inCode = false;
        flushCode(`code-${i}`);
      }
      return;
    }
    if (inCode) { codeBuf.push(line); return; }

    const bullet   = line.match(/^[-*•]\s+(.*)/);
    const numbered = line.match(/^\d+\.\s+(.*)/);
    const heading  = line.match(/^#{1,3}\s+(.*)/);
    if (bullet)   { listBuf.push({ kind: "bullet", text: bullet[1] });   return; }
    if (numbered) { listBuf.push({ kind: "num",    text: numbered[1] }); return; }
    flushList(`fl-${i}`);
    if (heading)          nodes.push(<p key={i} className="mt-2 font-semibold">{inline(heading[1])}</p>);
    else if (!line.trim()) nodes.push(<div key={i} className="h-1.5" />);
    else                  nodes.push(<p key={i} className="leading-relaxed">{inline(line)}</p>);
  });
  flushList("fl-end");
  if (inCode) flushCode("code-end");
  return <div className="space-y-0.5 text-sm">{nodes}</div>;
};

// ── Agent avatar (HERON gradient-bordered logo box) ──────────────────────────

const AgentAvatar = ({ size = "md" }: { size?: "sm" | "md" }) => {
  const box = size === "sm" ? 30 : 36;
  const logo = size === "sm" ? 16 : 20;
  return (
    <span
      className="flex shrink-0 items-center justify-center"
      style={{
        width: box,
        height: box,
        borderRadius: 10,
        background: "linear-gradient(135deg, rgba(99,102,241,.25), rgba(217,70,239,.18))",
        border: "1px solid rgba(99,102,241,.4)",
      }}
    >
      <HeronLogo size={logo} />
    </span>
  );
};

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
      style={{ marginBottom: 18 }}
    >
      <AgentAvatar />
      <div
        className="inline-flex items-center gap-3"
        style={{
          padding: "12px 16px",
          borderRadius: "4px 18px 18px 18px",
          background: "rgba(255,255,255,.04)",
          border: "1px solid var(--line)",
        }}
      >
        <span className="flex items-end gap-1">
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{ width: 7, height: 7, borderRadius: "50%", background: "#c7d2fe" }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ duration: 1, delay: i * 0.15, repeat: Infinity, ease: "easeInOut" }}
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
            className="text-sm"
            style={{ color: "var(--ink-3)" }}
          >
            HERON · {THINKING_MSGS[idx]}
          </motion.span>
        </AnimatePresence>
      </div>
    </motion.div>
  );
};

// ── Tool activity card (Heron action row) ────────────────────────────────────

const ToolCard = ({ toolCall, delay }: { toolCall: ToolCall; delay: number }) => {
  const [open, setOpen] = useState(false);
  const meta = TOOL_META[toolCall.name as keyof typeof TOOL_META] ?? inferToolMeta(toolCall.name);
  const Icon = meta.icon;
  const isErr = toolCall.result != null && typeof toolCall.result === "object" && "error" in (toolCall.result as object);

  return (
    <motion.div
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.22 }}
      className="overflow-hidden"
      style={{
        borderRadius: 10,
        background: "rgba(99,102,241,.08)",
        border: "1px solid rgba(99,102,241,.25)",
      }}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="grid w-full items-center text-left"
        style={{ gridTemplateColumns: "auto auto 1fr auto auto", gap: 10, padding: "10px 14px" }}
      >
        <span
          className="flex items-center justify-center"
          style={{
            width: 22,
            height: 22,
            borderRadius: "50%",
            background: isErr ? "rgba(244,63,94,.18)" : "rgba(52,211,153,.18)",
            color: isErr ? "#fb7185" : "#34d399",
          }}
        >
          {isErr ? <AlertCircle className="h-3 w-3" /> : <CheckCircle2 className="h-3 w-3" />}
        </span>
        <span className="flex" style={{ color: "var(--indigo-2)" }}>
          <Icon className="h-3.5 w-3.5" />
        </span>
        <span className="text-[13px]" style={{ color: "#fff" }}>{meta.label}</span>
        {open ? (
          <ChevronDown className="h-3.5 w-3.5" style={{ color: "var(--ink-4)" }} />
        ) : (
          <ChevronRight className="h-3.5 w-3.5" style={{ color: "var(--ink-4)" }} />
        )}
        <span />
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
            <pre
              className="mono overflow-x-auto p-3 text-[10px] leading-relaxed"
              style={{ borderTop: "1px solid rgba(99,102,241,.2)", color: "var(--ink-3)" }}
            >
              {JSON.stringify({ args: toolCall.args, result: toolCall.result }, null, 2)}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// ── Message bubbles ───────────────────────────────────────────────────────────

const UserBubble = ({ entry, initials }: { entry: EntryUser; initials: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="grid items-start"
    style={{ gridTemplateColumns: "1fr auto", gap: 12, marginBottom: 18 }}
  >
    <div
      className="text-sm leading-relaxed"
      style={{
        justifySelf: "end",
        maxWidth: 720,
        padding: "14px 18px",
        borderRadius: "18px 18px 4px 18px",
        background: "linear-gradient(135deg, rgba(99,102,241,.85), rgba(217,70,239,.7))",
        boxShadow: "0 10px 30px -10px rgba(217,70,239,.45)",
        color: "#fff",
      }}
    >
      {entry.displayContent ?? entry.content}
    </div>
    <span className="avatar" style={{ width: 36, height: 36, fontSize: 13 }}>
      {initials}
    </span>
  </motion.div>
);

const AgentBubble = ({ entry }: { entry: EntryAgent }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="grid items-start"
    style={{ gridTemplateColumns: "auto 1fr", gap: 12, marginBottom: 18 }}
  >
    <AgentAvatar />
    <div
      className="min-w-0"
      style={{
        maxWidth: 720,
        padding: "14px 18px",
        borderRadius: "4px 18px 18px 18px",
        background: "rgba(255,255,255,.04)",
        border: "1px solid var(--line)",
        color: "#fff",
      }}
    >
      <Markdown text={entry.content} />
      {entry.toolCalls.length > 0 ? (
        <div className="mt-3.5">
          <div className="eyebrow mb-2">Actions taken</div>
          <div className="space-y-2">
            {entry.toolCalls.map((tc, i) => (
              <ToolCard key={i} toolCall={tc} delay={i * 0.07} />
            ))}
          </div>
        </div>
      ) : null}
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
  const preview =
    conv.entries.find((e) => e.type === "user" || e.type === "agent") as EntryUser | EntryAgent | undefined;
  const previewText = preview?.type === "user" ? preview.displayContent ?? preview.content : preview?.content;
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      className="group flex w-full text-left transition-colors"
      style={{
        padding: "10px 12px",
        borderRadius: 10,
        background: active
          ? "linear-gradient(135deg, rgba(99,102,241,.16), rgba(217,70,239,.10))"
          : hovering
            ? "rgba(255,255,255,.03)"
            : "transparent",
        border: `1px solid ${active ? "rgba(99,102,241,.32)" : "transparent"}`,
      }}
    >
      <div className="flex w-full min-w-0 flex-col gap-1">
        <div className="flex items-center gap-2">
          <Sparkles
            className="h-3 w-3 shrink-0"
            style={{ color: active ? "#c7d2fe" : "var(--ink-3)" }}
          />
          <span className="flex-1 truncate text-[13px] font-medium" style={{ color: "#fff" }}>
            {conv.title}
          </span>
          {hovering ? (
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => { e.stopPropagation(); onDelete(); }}
              onKeyDown={(e) => { if (e.key === "Enter") { e.stopPropagation(); onDelete(); } }}
              className="ml-1 rounded p-0.5 transition"
              style={{ color: "var(--ink-4)" }}
            >
              <Trash2 className="h-3 w-3" />
            </span>
          ) : null}
        </div>
        {previewText ? (
          <div
            className="truncate text-[11px]"
            style={{ color: "var(--ink-4)" }}
          >
            {previewText.slice(0, 80)}
          </div>
        ) : null}
        <div className="mono text-[10px]" style={{ color: "var(--ink-4)" }}>
          {new Date(conv.updatedAt).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" })}
        </div>
      </div>
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
        <div className="eyebrow mb-2 px-2">{label}</div>
        <div className="flex flex-col gap-1">
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
          animate={{ width: 300, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
          className="panel flex h-full shrink-0 flex-col overflow-hidden"
        >
          <div className="shrink-0 p-4">
            <button
              type="button"
              onClick={onNew}
              className="btn btn-primary w-full justify-center"
            >
              <Plus className="h-3.5 w-3.5" />
              New conversation
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
            {conversations.length === 0 ? (
              <div className="flex flex-col items-center gap-3 px-4 py-12 text-center">
                <MessagesSquare className="h-10 w-10" style={{ color: "var(--ink-4)" }} />
                <p className="text-xs" style={{ color: "var(--ink-3)" }}>
                  No conversations yet.
                  <br />
                  Start by asking something below.
                </p>
              </div>
            ) : (
              <>
                <Section label="Today" convs={groups.today} />
                <Section label="Yesterday" convs={groups.yesterday} />
                <Section label="Last 7 days" convs={groups.week} />
                <Section label="Older" convs={groups.older} />
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
      className="panel absolute bottom-full left-0 z-20 mb-2 w-52 overflow-hidden"
    >
      {ATTACH_OPTIONS.map(({ kind, label, icon: Icon, accept }) => (
        <button
          key={kind}
          type="button"
          onClick={() => { onSelect(kind, accept); onClose(); }}
          className="flex w-full items-center gap-3 px-4 py-3 text-sm transition-colors hover:bg-white/[0.06]"
          style={{ color: "var(--ink-2)" }}
        >
          <span
            className="flex h-7 w-7 shrink-0 items-center justify-center"
            style={{
              borderRadius: 8,
              background: "rgba(99,102,241,.14)",
              border: "1px solid rgba(99,102,241,.28)",
              color: "var(--indigo-2)",
            }}
          >
            <Icon className="h-4 w-4" />
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

const QuickStarter = ({
  icon: Icon,
  text,
  onClick,
}: {
  icon: ComponentType<{ className?: string }>;
  text: string;
  onClick: () => void;
}) => {
  const [hover, setHover] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="text-left transition-all"
      style={{
        padding: "12px 14px",
        borderRadius: 12,
        background: hover ? "rgba(99,102,241,.10)" : "rgba(255,255,255,.025)",
        border: `1px solid ${hover ? "rgba(99,102,241,.32)" : "var(--line)"}`,
        color: hover ? "#fff" : "var(--ink-2)",
        fontSize: 13,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span>{text}</span>
    </button>
  );
};

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
        <span
          className="flex items-center justify-center"
          style={{
            width: 88,
            height: 88,
            borderRadius: 22,
            background: "linear-gradient(135deg, rgba(99,102,241,.25), rgba(217,70,239,.18))",
            border: "1px solid rgba(99,102,241,.4)",
          }}
        >
          <HeronLogo size={48} />
        </span>
        <motion.span
          animate={{ rotate: 360 }}
          transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
          className="absolute -right-2 -top-2 flex items-center justify-center"
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: "linear-gradient(135deg, #fbbf24, #f97316)",
            boxShadow: "0 8px 20px -8px rgba(251,191,36,.7)",
          }}
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
        <h2 className="display" style={{ fontSize: 30 }}>
          Welcome back, <span className="gradient-text-warm">{firstName}</span>.
        </h2>
        <p className="mt-2 text-sm" style={{ color: "var(--ink-3)" }}>
          I&apos;m your AI Hiring Assistant — here&apos;s what I can do for you.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {CAPABILITIES.map(({ icon: Icon, text }, i) => (
            <motion.span
              key={text}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.18 + i * 0.06 }}
              className="pill pill-indigo"
            >
              <Icon className="h-3 w-3 shrink-0" />
              {text}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="w-full max-w-2xl"
      >
        <div className="eyebrow mb-3 text-center">Try asking</div>
        <div className="grid gap-2 sm:grid-cols-2">
          {SUGGESTIONS.map((s) => (
            <QuickStarter key={s.text} icon={s.icon} text={s.text} onClick={() => onSend(s.text)} />
          ))}
        </div>
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
  const [agentChat, { isLoading, reset: resetMutation }] = useAgentChatMutation();
  const pendingMutationRef = useRef<{ abort: () => void } | null>(null);
  const wasAbortedRef = useRef(false);
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

  // Auto-resize textarea to content (min 1 row, max ~8 rows)
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 240)}px`;
  }, [input]);

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
      if ((!trimmed && attachments.length === 0) || isLoading) return;
      setInput("");
      const currentAttachments = attachments;
      setAttachments([]);

      // Upload resume/pdf files to extract text before sending to agent
      const parts: string[] = [];
      const displayParts: string[] = [];
      let extractionFailed = false;
      for (const a of currentAttachments) {
        if (a.kind === "pdf" || a.kind === "resume") {
          const toastId = toast.loading(`Extracting text from ${a.name}…`);
          try {
            const form = new FormData();
            form.append("file", a.file, a.name);
            const res = await fetch(`${resolveApiBaseUrl()}/agent/extract-text`, {
              method: "POST",
              headers: { Authorization: `Bearer ${getToken()}` },
              body: form,
            });
            const data = await res.json() as { rawText?: string; name?: string | null; email?: string | null; title?: string | null; error?: string };
            if (res.ok && data.rawText && data.rawText.trim().length > 20) {
              toast.dismiss(toastId);
              const meta = [
                data.name  && `Name: ${data.name}`,
                data.email && `Email: ${data.email}`,
                data.title && `Title: ${data.title}`,
              ].filter(Boolean).join(" | ");
              const header = `[Resume uploaded: ${a.name}${meta ? `\nExtracted: ${meta}` : ""}]`;
              const instruction = `\n\nPlease do the following automatically:\n1. Briefly introduce this candidate (name, current role, top 3–5 skills) in 2–3 sentences.\n2. Call list_jobs to find the right job, then call ingest_resume to add them as an applicant.\n3. Call run_screening to rank all candidates for that job.\n4. Present the top candidates from the screening results.`;
              parts.push(`${header}\n${data.rawText}${instruction}`);
              // Compact display shown in the user bubble
              const displayLabel = data.name ? `${a.name} — ${data.name}` : a.name;
              displayParts.push(`📎 Uploaded resume: ${displayLabel}${data.title ? ` (${data.title})` : ""}`);
            } else {
              toast.error(`Could not extract text from ${a.name}. ${data.error ?? "Please paste the resume text directly in the chat."}`, { id: toastId, duration: 6000 });
              extractionFailed = true;
            }
          } catch {
            toast.error(`Could not read ${a.name} — check your connection and try again, or paste the resume text directly.`, { id: toastId, duration: 6000 });
            extractionFailed = true;
          }
        } else {
          parts.push(`[Attached ${a.kind.toUpperCase()}: ${a.name}]`);
          displayParts.push(`📎 Attached: ${a.name}`);
        }
      }
      if (extractionFailed && parts.length === 0) return;

      const filePrefix = parts.join("\n\n");
      const fullMsg = filePrefix && trimmed ? `${filePrefix}\n\n${trimmed}` : filePrefix || trimmed;
      const displayPrefix = displayParts.join("\n");
      const displayMsg = displayPrefix && trimmed ? `${displayPrefix}\n${trimmed}` : displayPrefix || trimmed;

      let convId = activeId;
      let currentHistory = history;

      if (!convId || !activeConv) {
        convId = newId();
        const titleBase = trimmed || displayParts[0] || "Resume upload";
        const title = titleBase.length > 58 ? `${titleBase.slice(0, 55)}…` : titleBase;
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
                  { type: "user" as const, id: uid, content: fullMsg, displayContent: displayMsg !== fullMsg ? displayMsg : undefined },
                  { type: "thinking" as const, id: tid },
                ],
              },
        ),
      );

      wasAbortedRef.current = false;
      try {
        const mutation = agentChat({ message: fullMsg, history: currentHistory });
        pendingMutationRef.current = mutation;
        const res = await mutation.unwrap();
        pendingMutationRef.current = null;
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
        pendingMutationRef.current = null;
        // If the user clicked Stop, silently remove the thinking card — don't show an error
        if (wasAbortedRef.current) {
          wasAbortedRef.current = false;
          setConversations((prev) =>
            prev.map((c) =>
              c.id !== convId ? c : { ...c, entries: c.entries.filter((e) => e.type !== "thinking") },
            ),
          );
          return;
        }
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
    [activeId, activeConv, agentChat, history, isLoading, attachments],
  );

  const handleStop = useCallback(() => {
    wasAbortedRef.current = true;
    pendingMutationRef.current?.abort();
    pendingMutationRef.current = null;
    resetMutation();
  }, [resetMutation]);

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
  const userInitials = (user?.name ?? "JD")
    .split(" ")
    .slice(0, 2)
    .map((s) => s.charAt(0).toUpperCase())
    .join("") || "JD";
  const hasInput = input.trim().length > 0 || attachments.length > 0;

  return (
    <div className="flex h-full gap-[18px] overflow-hidden">
      {/* ── Conversations sidebar ── */}
      <ConvSidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={newConversation}
        onDelete={deleteConversation}
      />

      {/* ── Chat panel ── */}
      <div className="panel flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Chat header */}
        <div
          className="flex shrink-0 items-center justify-between"
          style={{ padding: "14px 20px", borderBottom: "1px solid var(--line)" }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen((v) => !v)}
              title={sidebarOpen ? "Close sidebar" : "Open sidebar"}
              className="btn-icon"
            >
              {sidebarOpen ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
            </button>
            <AgentAvatar />
            <div className="leading-tight">
              <p className="text-[14px] font-semibold" style={{ color: "#fff" }}>AI Hiring Assistant</p>
              <p className="text-[11px]" style={{ color: "var(--ink-3)" }}>
                <span style={{ color: isLoading ? "#fbbf24" : "#34d399" }}>● {isLoading ? "Working…" : "Ready"}</span>
                {" · Memory · Tools · Powered by HERON"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button type="button" onClick={newConversation} className="btn btn-ghost" style={{ height: 32, fontSize: 12 }}>
              <Plus className="h-3 w-3" />
              New chat
            </button>
            <button type="button" className="btn-icon" title="Suggestions">
              <Sparkles className="h-4 w-4" />
            </button>
            <button type="button" className="btn-icon" title="More">
              <MoreHorizontal className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Messages area */}
        <div className="min-h-0 flex-1 overflow-y-auto" style={{ padding: "24px 28px" }}>
          {isEmpty ? (
            <WelcomeScreen onSend={(text) => void send(text)} userName={user?.name ?? "there"} />
          ) : (
            <div className="mx-auto max-w-3xl">
              {entries.map((entry, idx) => {
                if (entry.type === "thinking") return <ThinkingCard key={entry.id} />;
                if (entry.type === "user") return <UserBubble key={entry.id} entry={entry} initials={userInitials} />;
                const isLastEntry = idx === entries.length - 1;
                const lastUserEntry = isLastEntry
                  ? (entries.slice(0, idx).reverse().find((e) => e.type === "user") as EntryUser | undefined)
                  : undefined;
                return (
                  <div key={entry.id} className="group relative">
                    <AgentBubble entry={entry} />
                    {isLastEntry && !isLoading && lastUserEntry ? (
                      <div className="mb-3 flex justify-start pl-12 opacity-0 transition-opacity group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => void send(lastUserEntry.content)}
                          className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition-colors hover:bg-white/[0.06]"
                          style={{ color: "var(--ink-3)" }}
                        >
                          <RefreshCw className="h-3 w-3" />
                          Regenerate
                        </button>
                      </div>
                    ) : null}
                  </div>
                );
              })}
              <div ref={bottomRef} />
            </div>
          )}
        </div>

        {/* Composer */}
        <div className="shrink-0" style={{ padding: "14px 20px 18px", borderTop: "1px solid var(--line)" }}>
          <div className="mx-auto max-w-3xl">
            <div
              style={{
                borderRadius: 16,
                padding: 1,
                background: hasInput
                  ? "linear-gradient(135deg, #6366f1, #d946ef)"
                  : "var(--line-strong)",
                transition: "background .25s ease",
                boxShadow: hasInput ? "0 0 0 4px rgba(99,102,241,.12)" : "none",
              }}
            >
              <div style={{ borderRadius: 15, background: "#0c0c1a" }}>
                {attachments.length > 0 ? (
                  <div
                    className="flex flex-wrap gap-2 px-4 py-2.5"
                    style={{ borderBottom: "1px solid var(--line)" }}
                  >
                    {attachments.map((a) => {
                      const Icon = ATTACH_OPTIONS.find((o) => o.kind === a.kind)?.icon ?? FileText;
                      return (
                        <span key={a.id} className="pill pill-indigo">
                          <Icon className="h-3 w-3 shrink-0" />
                          <span className="max-w-[160px] truncate">{a.name}</span>
                          <button
                            type="button"
                            onClick={() => setAttachments((prev) => prev.filter((f) => f.id !== a.id))}
                            className="ml-0.5"
                            style={{ color: "var(--indigo-2)" }}
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      );
                    })}
                  </div>
                ) : null}

                <div className="flex items-end gap-2 px-3 py-3">
                  <div className="relative shrink-0">
                    <button
                      type="button"
                      onClick={() => setAttachMenuOpen((v) => !v)}
                      title="Attach file"
                      className="btn-icon"
                      style={attachMenuOpen ? { background: "rgba(99,102,241,0.18)", borderColor: "rgba(99,102,241,0.4)", color: "#fff" } : undefined}
                    >
                      <Paperclip className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {attachMenuOpen ? <AttachMenu onSelect={openFilePicker} onClose={() => setAttachMenuOpen(false)} /> : null}
                    </AnimatePresence>
                  </div>

                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask about your pipeline, candidates, or schedule an interview…"
                    rows={1}
                    className="flex-1 resize-none overflow-y-auto bg-transparent py-2 text-sm leading-relaxed outline-none"
                    style={{ color: "#fff", border: 0 }}
                  />

                  <motion.button
                    type="button"
                    onClick={toggleRecording}
                    title={isRecording ? "Stop recording" : "Voice message"}
                    animate={isRecording ? { scale: [1, 1.12, 1] } : { scale: 1 }}
                    transition={isRecording ? { duration: 1.1, repeat: Infinity } : {}}
                    className="btn-icon"
                    style={
                      isRecording
                        ? { background: "linear-gradient(135deg, #f43f5e, #be123c)", color: "#fff", borderColor: "rgba(244,63,94,.5)" }
                        : undefined
                    }
                  >
                    {isRecording ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                  </motion.button>

                  {isLoading ? (
                    <motion.button
                      type="button"
                      onClick={handleStop}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.8, opacity: 0 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="btn"
                      style={{
                        height: 38,
                        paddingLeft: 14,
                        paddingRight: 16,
                        background: "linear-gradient(135deg, #f43f5e, #be123c)",
                        color: "#fff",
                        boxShadow: "0 8px 24px -10px rgba(244,63,94,.6)",
                      }}
                      title="Stop"
                    >
                      <X className="h-4 w-4" />
                      Stop
                    </motion.button>
                  ) : (
                    <motion.button
                      type="button"
                      onClick={() => void send(input)}
                      disabled={!hasInput}
                      whileHover={hasInput ? { scale: 1.03 } : {}}
                      whileTap={hasInput ? { scale: 0.97 } : {}}
                      className={cn("btn", hasInput ? "btn-primary" : "btn-ghost")}
                      style={{ height: 38, paddingLeft: 14, paddingRight: 16 }}
                    >
                      <Send className="h-4 w-4" />
                      Send
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />

            <div className="mt-2.5 flex items-center justify-between text-[11px]" style={{ color: "var(--ink-4)" }}>
              <div className="flex flex-wrap gap-3">
                <span>
                  <kbd
                    className="mono rounded text-[10px]"
                    style={{ background: "rgba(255,255,255,.06)", padding: "2px 6px" }}
                  >
                    Enter
                  </kbd>{" "}
                  to send
                </span>
                <span>
                  <kbd
                    className="mono rounded text-[10px]"
                    style={{ background: "rgba(255,255,255,.06)", padding: "2px 6px" }}
                  >
                    Shift+Enter
                  </kbd>{" "}
                  for new line
                </span>
              </div>
              <span>AI may make mistakes — always review critical decisions.</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @media (max-width: 1100px) {
          :global(.asst-grid) {
            grid-template-columns: 1fr !important;
            height: auto !important;
          }
        }
      `}</style>
    </div>
  );
};
