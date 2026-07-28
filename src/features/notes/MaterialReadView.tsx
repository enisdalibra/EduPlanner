import React, { useEffect } from "react";
import { useParams, useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { deleteNote } from "./api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessMarkdown } from "@/lib/preprocessMarkdown";
import { MarkdownImage } from "@/components/ui/MarkdownImage";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { format } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";

// ─── Theme ────────────────────────────────────────────────────────────────────

function useIsDark(): boolean {
  const { theme } = useTheme();
  if (theme === "dark") return true;
  if (theme === "light") return false;
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

// ─── Shared markdown components ───────────────────────────────────────────────

function makeMarkdownComponents(isDark: boolean) {
  return {
    p: ({ node, children, ...props }: any) => {
      const onlyImage =
        node?.children?.length === 1 &&
        node.children[0].type === "element" &&
        node.children[0].tagName === "img";
      return onlyImage ? <>{children}</> : <p {...props}>{children}</p>;
    },
    img: ({ src, alt }: any) => <MarkdownImage src={src} alt={alt} isDark={isDark} />,
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialReadView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDark = useIsDark();
  const { t, language } = useTranslation();
  const currentLocale = language === "id" ? localeId : localeEn;

  const note = useLiveQuery(
    () => (id ? db.notes.get(id) : Promise.resolve(undefined)),
    [id]
  );
  const classes = useLiveQuery(() => db.classes.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());

  // Redirect if note not found after load
  useEffect(() => {
    if (note === null) navigate("/materials", { replace: true });
  }, [note, navigate]);

  // Keyboard: Esc → back
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") navigate("/materials");
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [navigate]);

  const cls = note?.classId ? classes?.find((c) => c.id === note.classId) : null;
  const subj = note?.subjectId ? subjects?.find((s) => s.id === note.subjectId) : null;

  const handleDelete = async () => {
    if (!note) return;
    if (confirm(t("notesPage.confirmDelete"))) {
      await deleteNote(note.id);
      toast.success(t("notesPage.successDelete"));
      navigate("/materials");
    }
  };

  // ── Theme tokens ────────────────────────────────────────────────────────────
  const bg      = isDark ? "bg-gray-950" : "bg-white";
  const text     = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/50" : "text-gray-400";
  const border   = isDark ? "border-white/10" : "border-gray-100";
  const hudBg    = isDark ? "bg-gray-900/80 border-white/10" : "bg-white/80 border-gray-200";
  const btnGhost = isDark
    ? "hover:bg-white/10 text-white/70 hover:text-white"
    : "hover:bg-gray-100 text-gray-500 hover:text-gray-800";
  const btnPrimary = "bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/30";
  const footerBg = isDark ? "bg-gray-900/90 border-white/10" : "bg-white/90 border-gray-100";
  const dangerBtn = isDark
    ? "text-red-400 hover:text-red-300 hover:bg-red-500/10"
    : "text-red-500 hover:text-red-600 hover:bg-red-50";

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (note === undefined) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", bg)}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!note) return null;

  return (
    <div className={cn("min-h-screen flex flex-col", bg, text)}>

      {/* ── Top HUD ── */}
      <header className={cn(
        "sticky top-0 z-40 flex items-center justify-between px-4 py-2.5 backdrop-blur-md border-b",
        hudBg
      )}>
        {/* Back */}
        <button
          onClick={() => navigate("/materials")}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
            btnGhost
          )}
        >
          <Icon name="arrow_back" className="w-4 h-4" />
          <span>{t("materialsPage.title")}</span>
        </button>

        {/* Center: title */}
        <span className={cn("text-sm font-semibold truncate max-w-xs text-center hidden md:block", isDark ? "text-white/50" : "text-gray-400")}>
          {note.title}
        </span>

        {/* Right: Edit + Presentasikan (single source of truth) */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(`/materials/${note.id}/edit`)}
            className={cn(
              "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
              btnGhost
            )}
          >
            <Icon name="edit" className="w-4 h-4" />
            <span className="hidden sm:inline">{t("notesPage.btnEdit")}</span>
          </button>
          <button
            onClick={() => navigate(`/materials/${note.id}/present`)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all",
              btnPrimary
            )}
          >
            <Icon name="slideshow" className="w-4 h-4" />
            <span className="hidden sm:inline">{t("materialsPage.presentBtn")}</span>
          </button>
        </div>
      </header>

      {/* ── Main content ── */}
      <main className="flex-1 overflow-y-auto">
        <article className="max-w-3xl mx-auto px-6 sm:px-10 py-12">

          {/* Meta badges */}
          <div className="flex flex-wrap gap-2 mb-8 items-center">
            <span className={cn(
              "text-xs font-bold uppercase tracking-wider px-3 py-1 rounded-full",
              isDark ? "bg-white/10 text-white/50" : "bg-gray-100 text-gray-400"
            )}>
              {format(note.createdAt, "d MMMM yyyy", { locale: currentLocale })}
            </span>
            {cls && (
              <span className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                {cls.name}
              </span>
            )}
            {subj && (
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 bg-emerald-500/10 px-3 py-1 rounded-full">
                {subj.name}
              </span>
            )}
          </div>

          {/* Title */}
          <h1 className={cn("text-3xl sm:text-4xl font-black leading-tight tracking-tight mb-10", text)}>
            {note.title}
          </h1>

          {/* Divider */}
          <div className={cn("w-16 h-0.5 bg-primary rounded-full mb-10")} />

          {/* Markdown content */}
          <div className={cn(
            "prose md:prose-lg dark:prose-invert max-w-none markdown-body flow-root",
            isDark && "prose-invert"
          )}>
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={makeMarkdownComponents(isDark)}
            >
              {preprocessMarkdown(note.content || "")}
            </ReactMarkdown>
          </div>

          {/* Bottom padding */}
          <div className="h-24" />
        </article>
      </main>

      {/* ── Footer — only destructive + back; primary actions live in header ── */}
      <footer className={cn(
        "sticky bottom-0 z-40 flex items-center justify-between px-4 py-2.5 backdrop-blur-md border-t",
        footerBg
      )}>
        {/* Delete */}
        <button
          onClick={handleDelete}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all",
            dangerBtn
          )}
        >
          <Icon name="delete" className="w-4 h-4" />
          <span className="hidden sm:inline">{t("notesPage.btnDelete")}</span>
        </button>

        {/* Close */}
        <button
          onClick={() => navigate("/materials")}
          className={cn(
            "px-3 py-1.5 rounded-lg text-sm font-medium transition-all",
            btnGhost
          )}
        >
          {t("notesPage.btnClose")}
        </button>
      </footer>
    </div>
  );
}
