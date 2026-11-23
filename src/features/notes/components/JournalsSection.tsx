import { useState, useEffect, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { createNote, deleteNote, getNotes, getNotesByClass, updateNote } from "../api";
import { MarkdownRenderer } from "@/components/ui/MarkdownRenderer";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { useTranslation } from "@/hooks/useTranslation";
import { NoteService } from "@/services/NoteService";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { INPUT_LIMITS } from "@/lib/validation";

interface JournalsSectionProps {
  /** When set, scopes displayed journals and new/edited journals strictly to this class. */
  classId?: string;
  /** When true, disables creating, editing, and deleting journals (e.g. archived class). */
  readOnly?: boolean;
  /** When true, renders a compact tab-friendly layout instead of a full page header. */
  embedded?: boolean;
}

export function JournalsSection({ classId, readOnly = false, embedded = false }: JournalsSectionProps) {
  const notes = useLiveQuery(
    () => (classId ? getNotesByClass(classId, "guru") : getNotes("guru")),
    [classId]
  );
  const classes = useLiveQuery(() => db.classes.filter((cls) => !cls.archivedAt).toArray());
  const scopedClass = useLiveQuery(() => (classId ? db.classes.get(classId) : undefined), [classId]);
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const enrollments = useLiveQuery(() => db.classEnrollments.toArray());

  const { t, language } = useTranslation();
  const currentLocale = language === "id" ? localeId : localeEn;

  // Edit/Create Dialog
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>(classId ?? "all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");

  const activeClassId = classId ?? selectedClassId;

  // Filter subjects that have at least one student from the selected class assigned to them
  const availableSubjects = useMemo(() => {
    if (activeClassId === "all" || !subjects || !enrollments) return subjects || [];

    const classStudentIds = new Set(
      enrollments
        .filter((item) => item.classId === activeClassId && !item.endedAt)
        .map(({ studentId }) => studentId)
    );

    return subjects.filter((subject) =>
      (subject.assignedStudents || []).some((studentId) => classStudentIds.has(studentId))
    );
  }, [subjects, activeClassId, enrollments]);

  // Reset subject if not available for this class
  useEffect(() => {
    if (activeClassId !== "all" && selectedSubjectId !== "none" && availableSubjects.length > 0) {
      if (!availableSubjects.some((s) => s.id === selectedSubjectId)) {
        setSelectedSubjectId("none");
      }
    }
  }, [activeClassId, availableSubjects, selectedSubjectId]);

  // View Dialog
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const openNewDialog = () => {
    if (readOnly) return;
    setEditingId(null);
    setNewTitle("");
    setNewContent("");
    setSelectedClassId(classId ?? "all");
    setSelectedSubjectId("none");
    setEditorMode("write");
    setIsOpen(true);
  };

  const openEditDialog = (noteId: string) => {
    if (readOnly) return;
    const note = notes?.find((n) => n.id === noteId);
    if (note) {
      setEditingId(note.id);
      setNewTitle(note.title);
      setNewContent(note.content);
      setSelectedClassId(classId ?? note.classId ?? "all");
      setSelectedSubjectId(note.subjectId || "none");
      setEditorMode("write");

      setIsViewOpen(false);
      setIsOpen(true);
    }
  };

  const openViewDialog = (noteId: string) => {
    setViewingId(noteId);
    setIsViewOpen(true);
  };

  const handleSave = async () => {
    if (readOnly) return;
    if (!newTitle.trim()) {
      toast.error(t("notesPage.errorEmptyTitle"));
      return;
    }
    const cId = classId ?? (selectedClassId === "all" ? undefined : selectedClassId);
    const sId = selectedSubjectId === "none" ? undefined : selectedSubjectId;

    try {
      if (editingId) {
        await updateNote(editingId, { title: newTitle, content: newContent, classId: cId, subjectId: sId });
        toast.success(t("notesPage.successUpdate"));
      } else {
        await createNote(newTitle, newContent, "guru", cId, sId);
        toast.success(t("notesPage.successSave"));
      }
      setIsOpen(false);
    } catch {
      toast.error(t("notesPage.errorSave"));
    }
  };

  const handleDelete = async (id: string) => {
    if (readOnly) return;
    if (confirm(t("notesPage.confirmDelete"))) {
      await deleteNote(id);
      setIsViewOpen(false);
      toast.success(t("notesPage.successDelete"));
    }
  };

  const resolveClassName = (noteClassId?: string) => {
    if (!noteClassId) return null;
    if (classId && noteClassId === classId && scopedClass) return scopedClass.name;
    return classes?.find((c) => c.id === noteClassId)?.name ?? null;
  };

  const viewingNote = notes?.find((n) => n.id === viewingId);
  const viewingClsName = resolveClassName(viewingNote?.classId);
  const viewingSubj = viewingNote?.subjectId ? subjects?.find((s) => s.id === viewingNote.subjectId) : null;

  return (
    <div className={cn("space-y-6", !embedded && "view-enter pb-8")}>
      {embedded ? (
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
            <Icon name="edit_note" className="w-5 h-5 text-primary" /> {t("classDetail.tabJournals")}
          </h3>
          <Button onClick={openNewDialog} disabled={readOnly} className="shadow-lg shadow-primary/20">
            <Icon name="add" className="w-4 h-4 mr-2" />
            {t("journalsPage.btnNew")}
          </Button>
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-title">{t("journalsPage.title")}</h1>
            <p className="page-description">{t("journalsPage.desc")}</p>
          </div>
          <Button size="lg" onClick={openNewDialog} disabled={readOnly} className="shadow-lg shadow-primary/20">
            <Icon name="add" className="w-5 h-5 mr-2" />
            {t("journalsPage.btnNew")}
          </Button>
        </div>
      )}

      {/* Create / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-6 py-4 border-b">
            <DialogTitle>{editingId ? t("journalsPage.modalEditTitle") : t("journalsPage.modalNewTitle")}</DialogTitle>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
            <div className="space-y-2">
              <Label>{t("notesPage.labelTitle")}</Label>
              <Input
                value={newTitle}
                maxLength={INPUT_LIMITS.title}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder={t("journalsPage.placeholderTitle")}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{t("notesPage.labelClass")}</Label>
                {classId ? (
                  <Input value={scopedClass?.name || ""} disabled />
                ) : (
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t("notesPage.placeholderClass")}>
                        {selectedClassId === "all"
                          ? t("notesPage.allClasses")
                          : classes?.find((c) => c.id === selectedClassId)?.name || t("notesPage.placeholderClass")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t("notesPage.allClasses")}</SelectItem>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-2">
                <Label>{t("notesPage.labelSubject")}</Label>
                <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder={t("notesPage.placeholderSubject")}>
                      {selectedSubjectId === "none"
                        ? t("notesPage.noSubject")
                        : subjects?.find((s) => s.id === selectedSubjectId)?.name || t("notesPage.placeholderSubject")}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("notesPage.noSubject")}</SelectItem>
                    {availableSubjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden min-h-[400px]">
              <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex px-2 py-1 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs h-7 px-4",
                    editorMode === "write" && "bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-white"
                  )}
                  onClick={() => setEditorMode("write")}
                >
                  {t("notesPage.btnWrite")}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className={cn(
                    "text-xs h-7 px-4",
                    editorMode === "preview" && "bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-white"
                  )}
                  onClick={() => setEditorMode("preview")}
                >
                  {t("notesPage.btnPreview")}
                </Button>
              </div>

              {editorMode === "write" ? (
                <Textarea
                  maxLength={INPUT_LIMITS.noteContent}
                  className="flex-1 resize-none border-0 focus-visible:ring-0 p-6 font-mono text-sm bg-white dark:bg-gray-800"
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={t("journalsPage.placeholderContent")}
                />
              ) : (
                <div className="flex-1 p-8 bg-white dark:bg-gray-800 overflow-y-auto">
                  <div className="prose prose-sm dark:prose-invert md:prose-base max-w-none markdown-body">
                    {newContent ? (
                      <MarkdownRenderer>{newContent}</MarkdownRenderer>
                    ) : (
                      <span className="text-gray-400 italic">{t("notesPage.previewEmpty")}</span>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900 m-0 -mx-0 -mb-0">
            <Button variant="ghost" onClick={() => setIsOpen(false)}>
              {t("notesPage.btnCancel")}
            </Button>
            <Button onClick={handleSave}>{t("notesPage.btnSave")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="px-8 py-6 border-b bg-gray-50 dark:bg-gray-900">
            <DialogTitle className="text-2xl font-bold tracking-tight text-text dark:text-white leading-relaxed">
              {viewingNote?.title}
            </DialogTitle>
            {viewingNote && (
              <div className="flex flex-wrap gap-2 mt-4 items-center">
                <div className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                  {format(viewingNote.createdAt, "d MMMM yyyy", { locale: currentLocale })}
                </div>
                {viewingClsName && (
                  <div className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {viewingClsName}
                  </div>
                )}
                {viewingSubj && (
                  <div className="text-xs font-bold uppercase tracking-wider text-success bg-success/10 px-3 py-1 rounded-full">
                    {viewingSubj.name}
                  </div>
                )}
              </div>
            )}
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-8 py-8 bg-white dark:bg-gray-800">
            <div className="prose prose-slate dark:prose-invert md:prose-base max-w-none markdown-body">
              <MarkdownRenderer>{viewingNote?.content || ""}</MarkdownRenderer>
            </div>
          </div>
          <DialogFooter className="px-8 py-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-between items-center sm:justify-between m-0 -mx-0 -mb-0">
            {!readOnly ? (
              <Button
                variant="ghost"
                className="text-danger hover:text-danger-hover hover:bg-danger/10"
                onClick={() => viewingNote && handleDelete(viewingNote.id)}
              >
                <Icon name="delete" className="w-5 h-5 mr-2" /> {t("notesPage.btnDelete")}
              </Button>
            ) : (
              <div />
            )}
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setIsViewOpen(false)}>
                {t("notesPage.btnClose")}
              </Button>
              {!readOnly && (
                <Button onClick={() => viewingNote && openEditDialog(viewingNote.id)}>
                  <Icon name="edit" className="w-5 h-5 mr-2" /> {t("notesPage.btnEdit")}
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <div className={cn("w-full", !embedded && "mt-4")}>
        {!notes && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="panel h-64 animate-pulse" />
            ))}
          </div>
        )}

        {notes && notes.length === 0 && (
          <div className="panel py-20 text-center border-dashed">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name={embedded ? "edit_note" : "book"} className="text-[48px] text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-text dark:text-white tracking-tight mb-3">
              {embedded ? t("classDetail.emptyJournals") : t("journalsPage.emptyStateTitle")}
            </h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">
              {embedded ? t("classDetail.createJournalPrompt") : t("journalsPage.emptyStateDesc")}
            </p>
            {embedded && !readOnly && (
              <Button className="mt-6 shadow-md shadow-primary/10" onClick={openNewDialog}>
                <Icon name="add" className="w-4 h-4 mr-2" />
                {t("journalsPage.btnNew")}
              </Button>
            )}
          </div>
        )}

        {notes && notes.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {notes.map((note) => {
              const clsName = resolveClassName(note.classId);
              const subj = note.subjectId ? subjects?.find((s) => s.id === note.subjectId) : null;

              return (
                <Card
                  key={note.id}
                  className="group cursor-pointer hover:border-primary/30"
                  onClick={() => openViewDialog(note.id)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start gap-4">
                      <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                        {note.title}
                      </CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                        {format(note.createdAt, "d MMM yyyy", { locale: currentLocale })}
                      </div>
                      {!classId && clsName && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">
                          {clsName}
                        </div>
                      )}
                      {subj && (
                        <div className="text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-1 rounded-full">
                          {subj.name}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 relative pb-10">
                    <div className="text-sm text-gray-500 dark:text-gray-400 line-clamp-4 leading-relaxed">
                      {NoteService.getExcerpt(note.content, 200)}
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-12 bg-gradient-to-t from-white dark:from-gray-800 to-transparent pointer-events-none" />
                  </CardContent>
                  <CardFooter className="pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between gap-2">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="text-primary hover:text-primary-hover hover:bg-primary/10"
                      onClick={(e) => {
                        e.stopPropagation();
                        openViewDialog(note.id);
                      }}
                    >
                      <Icon name="visibility" className="w-4 h-4 mr-1.5" />
                      {t("notesPage.btnReadFull")}
                    </Button>
                    {!readOnly && (
                      <div className="flex gap-1">
                        <SimpleTooltip content={t("notesPage.tooltipEdit")}>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-gray-400 group-hover:text-primary"
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditDialog(note.id);
                            }}
                          >
                            <Icon name="edit" className="w-4 h-4" />
                          </Button>
                        </SimpleTooltip>
                        <SimpleTooltip content={t("notesPage.tooltipDelete")}>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-gray-400 hover:text-danger"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(note.id);
                            }}
                          >
                            <Icon name="delete" className="w-4 h-4" />
                          </Button>
                        </SimpleTooltip>
                      </div>
                    )}
                  </CardFooter>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
