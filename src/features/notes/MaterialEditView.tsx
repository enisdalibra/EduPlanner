import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { createNote, updateNote } from "./api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { preprocessMarkdown } from "@/lib/preprocessMarkdown";
import { MarkdownImage } from "@/components/ui/MarkdownImage";
import { useTheme } from "@/hooks/useTheme";
import { useTranslation } from "@/hooks/useTranslation";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { countQuizQuestions } from "@/lib/quizParser";
import { INPUT_LIMITS } from "@/lib/validation";

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

// ─── Word counter ─────────────────────────────────────────────────────────────

function countWords(text: string): number {
  return text.trim() ? text.trim().split(/\s+/).length : 0;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function MaterialEditView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const isDark = useIsDark();
  const { t } = useTranslation();

  const isNew = !id || id === "new";

  // ── DB data ─────────────────────────────────────────────────────────────────
  const existingNote = useLiveQuery(
    () => (isNew ? Promise.resolve(undefined) : db.notes.get(id!)),
    [id, isNew]
  );
  const classes = useLiveQuery(() => db.classes.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const allStudents = useLiveQuery(() => db.students.toArray());

  // ── Form state ───────────────────────────────────────────────────────────────
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [classId, setClassId] = useState("all");
  const [subjectId, setSubjectId] = useState("none");
  const [mode, setMode] = useState<"write" | "preview">("write");
  const [initialized, setInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const contentRef = useRef<HTMLTextAreaElement>(null);

  const insertQuizTemplate = () => {
    const textarea = contentRef.current;
    const start = textarea?.selectionStart ?? content.length;
    const end = textarea?.selectionEnd ?? start;
    const questionNumber = countQuizQuestions(content) + 1;
    const prefix = start > 0 && !content.slice(0, start).endsWith("\n\n") ? "\n\n" : "";
    const template = `${prefix}## ${t("materialsPage.quizTemplateQuestion", { n: questionNumber })}\n\n${t("materialsPage.quizTemplatePrompt")}\n\n* ${t("materialsPage.quizTemplateCorrect")} [*]\n* ${t("materialsPage.quizTemplateOther")}\n* ${t("materialsPage.quizTemplateOther")}\n`;

    setContent(`${content.slice(0, start)}${template}${content.slice(end)}`);
    setMode("write");
    requestAnimationFrame(() => {
      const cursor = start + template.length;
      contentRef.current?.focus();
      contentRef.current?.setSelectionRange(cursor, cursor);
    });
  };

  // Populate form when editing existing note
  useEffect(() => {
    if (!initialized && existingNote) {
      setTitle(existingNote.title);
      setContent(existingNote.content);
      setClassId(existingNote.classId || "all");
      setSubjectId(existingNote.subjectId || "none");
      setInitialized(true);
    }
    if (!initialized && isNew) {
      setInitialized(true);
    }
  }, [existingNote, isNew, initialized]);

  // ── Available subjects for selected class ───────────────────────────────────
  const availableSubjects = useMemo(() => {
    if (classId === "all" || !subjects || !allStudents) return subjects || [];
    const classStudentIds = new Set(
      allStudents.filter((s) => s.classId === classId).map((s) => s.id)
    );
    return subjects.filter((subj) =>
      (subj.assignedStudents || []).some((sid) => classStudentIds.has(sid))
    );
  }, [subjects, classId, allStudents]);

  // Reset subject if no longer available
  useEffect(() => {
    if (
      classId !== "all" &&
      subjectId !== "none" &&
      availableSubjects.length > 0 &&
      !availableSubjects.some((s) => s.id === subjectId)
    ) {
      setSubjectId("none");
    }
  }, [classId, availableSubjects, subjectId]);

  // ── Save ─────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!title.trim()) {
      toast.error(t("notesPage.errorEmptyTitle"));
      return;
    }
    const cId = classId === "all" ? undefined : classId;
    const sId = subjectId === "none" ? undefined : subjectId;

    setIsSaving(true);
    try {
      if (!isNew && id) {
        await updateNote(id, { title, content, classId: cId, subjectId: sId });
        toast.success(t("notesPage.successUpdate"));
      } else {
        // createNote returns the full note object with the generated ID.
        // After the first save we immediately replace the URL with the real
        // edit route so that every subsequent Ctrl+S calls updateNote instead
        // of createNote — preventing duplicate entries.
        const newNote = await createNote(title, content, "materi", cId, sId);
        toast.success(t("notesPage.successSave"));
        navigate(`/materials/${newNote.id}/edit`, { replace: true });
      }
    } catch {
      toast.error(t("notesPage.errorSave"));
    } finally {
      setIsSaving(false);
    }
  }, [title, content, classId, subjectId, isNew, id, t, navigate]);

  // ── Keyboard shortcuts ──────────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "s") {
        e.preventDefault();
        handleSave();
      }
      if (e.key === "Escape") {
        navigate("/materials");
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSave, navigate]);

  // ── Theme tokens ─────────────────────────────────────────────────────────────
  const bg        = isDark ? "bg-gray-950" : "bg-white";
  const text      = isDark ? "text-white" : "text-gray-900";
  const textMuted = isDark ? "text-white/40" : "text-gray-400";
  const border    = isDark ? "border-white/10" : "border-gray-200";
  const toolbarBg = isDark ? "bg-gray-900 border-white/10" : "bg-gray-50 border-gray-200";
  const selectBg  = isDark ? "bg-gray-900 border-white/10 text-white" : "bg-white border-gray-200 text-gray-900";
  const tabActive = isDark ? "bg-white/10 text-white" : "bg-white shadow-sm text-primary";
  const tabInactive = isDark ? "text-white/40 hover:text-white/70" : "text-gray-400 hover:text-gray-600";
  const btnGhost  = isDark ? "text-white/60 hover:text-white hover:bg-white/10" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100";
  const btnSave   = isSaving
    ? "bg-primary/60 text-white cursor-not-allowed"
    : "bg-primary hover:bg-primary/90 text-white shadow-sm shadow-primary/30";
  const statusBg  = isDark ? "bg-gray-900/80 border-white/10" : "bg-gray-50/90 border-gray-100";

  const wordCount = countWords(content);

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (!initialized) {
    return (
      <div className={cn("min-h-screen flex items-center justify-center", bg)}>
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className={cn("h-screen flex flex-col overflow-hidden", bg, text)}>

      {/* ── Toolbar ── */}
      <header className={cn("flex-none flex items-center gap-3 px-4 py-2.5 border-b", toolbarBg)}>
        {/* Back */}
        <button
          onClick={() => navigate("/materials")}
          className={cn("flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all", btnGhost)}
          title={t("materialsPage.backShortcut")}
        >
          <Icon name="arrow_back" className="w-4 h-4" />
          <span className="hidden sm:inline">{t("materialsPage.title")}</span>
        </button>

        <div className={cn("w-px h-5 flex-none", isDark ? "bg-white/10" : "bg-gray-200")} />

        {/* Title input — takes remaining space */}
        <input
          maxLength={INPUT_LIMITS.title}
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={t("materialsPage.placeholderTitle")}
          className={cn(
            "flex-1 min-w-0 bg-transparent border-0 outline-none focus:outline-none focus:ring-0 font-semibold text-base",
            text,
            "placeholder:font-normal",
            isDark ? "placeholder:text-white/25" : "placeholder:text-gray-300"
          )}
        />

        {/* Write | Preview tabs */}
        <div className={cn("flex rounded-lg p-0.5 gap-0.5 flex-none", isDark ? "bg-white/5" : "bg-gray-200/60")}>
          {(["write", "preview"] as const).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className={cn(
                "px-3 py-1 rounded-md text-xs font-semibold transition-all",
                mode === m ? tabActive : tabInactive
              )}
            >
              {m === "write" ? t("notesPage.btnWrite") : t("notesPage.btnPreview")}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={insertQuizTemplate}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all flex-none",
            btnGhost
          )}
          title={t("materialsPage.insertQuiz")}
        >
          <Icon name="quiz" className="w-4 h-4" />
          <span className="hidden md:inline">{t("materialsPage.insertQuiz")}</span>
        </button>

        <div className={cn("w-px h-5 flex-none", isDark ? "bg-white/10" : "bg-gray-200")} />

        {/* Save button */}
        <button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all flex-none",
            btnSave
          )}
          title={t("materialsPage.saveShortcut")}
        >
          <Icon name={isSaving ? "sync" : "save"} className={cn("w-4 h-4", isSaving && "animate-spin")} />
          <span className="hidden sm:inline">
            {isSaving ? t("materialsPage.saving") : t("notesPage.btnSave")}
          </span>
        </button>
      </header>

      {/* ── Metadata bar ── */}
      <div className={cn("flex-none flex items-center gap-3 px-4 py-2 border-b", border, isDark ? "bg-gray-900/50" : "bg-gray-50/80")}>
        <span className={cn("text-xs font-medium flex-none", textMuted)}>
          {t("notesPage.labelClass")}
        </span>
        <select
          value={classId}
          onChange={(e) => setClassId(e.target.value)}
          className={cn(
            "text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50 transition-all",
            selectBg
          )}
        >
          <option value="all">{t("notesPage.allClasses")}</option>
          {classes?.map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>

        <span className={cn("text-xs font-medium flex-none", textMuted)}>
          {t("notesPage.labelSubject")}
        </span>
        <select
          value={subjectId}
          onChange={(e) => setSubjectId(e.target.value)}
          className={cn(
            "text-xs border rounded-lg px-2 py-1 outline-none focus:ring-1 focus:ring-primary/50 transition-all",
            selectBg
          )}
        >
          <option value="none">{t("notesPage.noSubject")}</option>
          {availableSubjects.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>
      </div>

      {/* ── Editor / Preview ── */}
      {/* Both modes share the same centered container; write gets more width for comfortable editing */}
      <div className="flex-1 overflow-y-auto">
        <div className={cn(
          "mx-auto px-6 sm:px-10 py-10 min-h-full flex flex-col",
          mode === "write" ? "max-w-4xl" : "max-w-3xl"
        )}>
          {mode === "write" ? (
            <textarea
              maxLength={INPUT_LIMITS.noteContent}
              ref={contentRef}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t("materialsPage.placeholderContent")}
              className={cn(
                "flex-1 w-full resize-none border-0 outline-none focus:outline-none focus:ring-0 font-mono text-sm leading-relaxed bg-transparent",
                "min-h-[60vh]",
                isDark
                  ? "text-white/90 placeholder:text-white/20 caret-primary"
                  : "text-gray-800 placeholder:text-gray-300 caret-primary"
              )}
              spellCheck={false}
              autoFocus
            />
          ) : (
            <>
              {content ? (
                <div className={cn(
                  "prose md:prose-lg dark:prose-invert max-w-none markdown-body flow-root",
                  isDark && "prose-invert"
                )}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={makeMarkdownComponents(isDark)}
                  >
                    {preprocessMarkdown(content)}
                  </ReactMarkdown>
                </div>
              ) : (
                <div className={cn("text-center py-24 text-sm", textMuted)}>
                  <Icon name="edit_note" className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p>{t("notesPage.previewEmpty")}</p>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ── Status bar ── */}
      <footer className={cn(
        "flex-none flex items-center justify-between gap-4 px-4 py-1.5 border-t backdrop-blur-sm",
        statusBg
      )}>
        {/* Image format hint */}
        <div className={cn("text-[10px] hidden md:flex items-center gap-1 font-mono", textMuted)}>
          <Icon name="image" className="w-3 h-3 mr-0.5" />
          <code className="opacity-80">![kiri|alt](url)</code>
          <span className="opacity-50 mx-1">-</span>
          <code className="opacity-80">![kanan|40%|alt](url)</code>
          <span className="opacity-50 mx-1">-</span>
          <code className="opacity-80">![[url|left]]</code>
        </div>

        {/* Right: shortcuts + word count */}
        <div className={cn("flex items-center gap-4 text-[10px] ml-auto", textMuted)}>
          <span className="hidden sm:inline opacity-60">{t("materialsPage.shortcutsHint")}</span>
          <span className="font-mono tabular-nums">
            {wordCount.toLocaleString()} {t("materialsPage.words")}
          </span>
        </div>
      </footer>
    </div>
  );
}
