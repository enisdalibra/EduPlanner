import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { createNote, deleteNote, updateNote } from "./api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { hasQuizContent, countQuizQuestions } from "@/lib/quizParser";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from "@/components/ui/dialog";
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

// ─── Template ──────────────────────────────────────────────────────────────────

const QUIZ_TEMPLATE = `## Soal 1
Tuliskan pertanyaan pertama Anda di sini?

* Pilihan A [*]
* Pilihan B
* Pilihan C
* Pilihan D

## Soal 2
Tuliskan pertanyaan kedua di sini?

* Opsi 1
* Opsi 2 [*]
* Opsi 3

## Soal 3
Pertanyaan dengan 5 pilihan?

* Jawaban A
* Jawaban B
* Jawaban C [*]
* Jawaban D
* Jawaban E
`;

// ─── Evaluations View ─────────────────────────────────────────────────────────

export function EvaluationsView() {
  const navigate = useNavigate();
  const notes = useLiveQuery(() => db.notes.where('type').equals('evaluasi').reverse().sortBy('createdAt'), []);
  const classes = useLiveQuery(() => db.classes.filter((cls) => !cls.archivedAt).toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());

  const { t, language } = useTranslation();
  const currentLocale = language === 'id' ? localeId : localeEn;

  // Edit/Create Dialog
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [selectedClassId, setSelectedClassId] = useState<string>("all");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const [editorMode, setEditorMode] = useState<"write" | "preview">("write");

  const enrollments = useLiveQuery(() => db.classEnrollments.toArray());

  // Filter subjects that have at least one student from the selected class assigned to them
  const availableSubjects = useMemo(() => {
    if (selectedClassId === "all" || !subjects || !enrollments) return subjects || [];
    const classStudentIds = new Set(enrollments.filter((item) => item.classId === selectedClassId && !item.endedAt).map(({ studentId }) => studentId));
    return subjects.filter(subject => {
      return (subject.assignedStudents || []).some(id => classStudentIds.has(id));
    });
  }, [subjects, selectedClassId, enrollments]);

  // Reset subject if not available for this class
  useEffect(() => {
    if (selectedClassId !== "all" && selectedSubjectId !== "none" && availableSubjects.length > 0) {
      if (!availableSubjects.some(s => s.id === selectedSubjectId)) {
        setSelectedSubjectId("none");
      }
    }
  }, [selectedClassId, availableSubjects, selectedSubjectId]);

  // View Dialog
  const [isViewOpen, setIsViewOpen] = useState(false);
  const [viewingId, setViewingId] = useState<string | null>(null);

  const openNewDialog = () => {
    setEditingId(null);
    setNewTitle("");
    setNewContent("");
    setSelectedClassId("all");
    setSelectedSubjectId("none");
    setEditorMode("write");
    setIsOpen(true);
  };

  const openEditDialog = (noteId: string) => {
    const note = notes?.find(n => n.id === noteId);
    if (note) {
      setEditingId(note.id);
      setNewTitle(note.title);
      setNewContent(note.content);
      setSelectedClassId(note.classId || "all");
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
    if (!newTitle.trim()) {
      toast.error(t('notesPage.errorEmptyTitle'));
      return;
    }
    const cId = selectedClassId === "all" ? undefined : selectedClassId;
    const sId = selectedSubjectId === "none" ? undefined : selectedSubjectId;
    
    try {
      if (editingId) {
        await updateNote(editingId, { title: newTitle, content: newContent, classId: cId, subjectId: sId });
        toast.success(t('notesPage.successUpdate'));
      } else {
        await createNote(newTitle, newContent, 'evaluasi', cId, sId);
        toast.success(t('notesPage.successSave'));
      }
      setIsOpen(false);
    } catch (e) {
      toast.error(t('notesPage.errorSave'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm(t('notesPage.confirmDelete'))) {
      await deleteNote(id);
      setIsViewOpen(false);
      toast.success(t('notesPage.successDelete'));
    }
  };

  const insertTemplate = () => {
    setNewContent(prev => prev ? prev + "\n\n" + QUIZ_TEMPLATE : QUIZ_TEMPLATE);
    setEditorMode("write");
  };

  const viewingNote = notes?.find(n => n.id === viewingId);
  const viewingCls = viewingNote?.classId ? classes?.find(c => c.id === viewingNote.classId) : null;
  const viewingSubj = viewingNote?.subjectId ? subjects?.find(s => s.id === viewingNote.subjectId) : null;
  const viewingQuizCount = viewingNote ? countQuizQuestions(viewingNote.content) : 0;

  return (
    <div className="space-y-6 view-enter pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t('evaluationsPage.title')}</h1>
          <p className="page-description">{t('evaluationsPage.desc')}</p>
        </div>
        
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger render={<Button size="lg" onClick={openNewDialog} className="shadow-lg shadow-primary/20" />}>
            <Icon name="add" className="w-5 h-5 mr-2" />
            {t('evaluationsPage.btnNew')}
          </DialogTrigger>
          <DialogContent className="sm:max-w-4xl w-full h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-6 py-4 border-b">
              <DialogTitle>{editingId ? t('evaluationsPage.modalEditTitle') : t('evaluationsPage.modalNewTitle')}</DialogTitle>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div className="space-y-2">
                <Label>{t('notesPage.labelTitle')}</Label>
                <Input value={newTitle} maxLength={INPUT_LIMITS.title} onChange={e => setNewTitle(e.target.value)} placeholder={t('evaluationsPage.placeholderTitle')} />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>{t('notesPage.labelClass')}</Label>
                  <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('notesPage.placeholderClass')}>
                        {selectedClassId === "all" 
                          ? t('notesPage.allClasses') 
                          : (classes?.find(c => c.id === selectedClassId)?.name || t('notesPage.placeholderClass'))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">{t('notesPage.allClasses')}</SelectItem>
                      {classes?.map(cls => (
                        <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>{t('notesPage.labelSubject')}</Label>
                  <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder={t('notesPage.placeholderSubject')}>
                        {selectedSubjectId === "none" 
                          ? t('notesPage.noSubject') 
                          : (subjects?.find(s => s.id === selectedSubjectId)?.name || t('notesPage.placeholderSubject'))}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">{t('notesPage.noSubject')}</SelectItem>
                      {availableSubjects.map(s => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex-1 flex flex-col bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl overflow-hidden min-h-[400px]">
                {/* Editor toolbar */}
                <div className="bg-gray-100 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700 flex px-2 py-1 items-center gap-1">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className={cn(
                      "text-xs h-7 px-4",
                      editorMode === 'write' && "bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-white"
                    )}
                    onClick={() => setEditorMode('write')}
                  >
                    {t('notesPage.btnWrite')}
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    className={cn(
                      "text-xs h-7 px-4",
                      editorMode === 'preview' && "bg-white dark:bg-gray-700 shadow-sm text-primary dark:text-white"
                    )}
                    onClick={() => setEditorMode('preview')}
                  >
                    {t('notesPage.btnPreview')}
                  </Button>

                  {/* Template insert button */}
                  <div className="ml-auto">
                    <SimpleTooltip content={t('quizView.templateBtn')}>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs h-7 px-3 text-primary hover:bg-primary/10 gap-1.5"
                        onClick={insertTemplate}
                      >
                        <Icon name="post_add" className="w-3.5 h-3.5" />
                        {t('quizView.templateBtn')}
                      </Button>
                    </SimpleTooltip>
                  </div>
                </div>
                
                {editorMode === 'write' ? (
                  <Textarea 
                    maxLength={INPUT_LIMITS.noteContent}
                    className="flex-1 resize-none border-0 focus-visible:ring-0 p-6 font-mono text-sm bg-white dark:bg-gray-800" 
                    value={newContent} 
                    onChange={e => setNewContent(e.target.value)}
                    placeholder={t('evaluationsPage.placeholderContent')}
                  />
                ) : (
                  <div className="flex-1 p-8 bg-white dark:bg-gray-800 overflow-y-auto">
                    <div className="prose prose-sm dark:prose-invert md:prose-base max-w-none markdown-body">
                      {newContent ? (
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{newContent}</ReactMarkdown>
                      ) : (
                        <span className="text-gray-400 italic">{t('notesPage.previewEmpty')}</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Format guide hint */}
              <div className="bg-primary/5 border border-primary/20 rounded-xl px-4 py-3 text-xs text-primary dark:text-primary leading-relaxed">
                <span className="font-bold">{t('evaluationsPage.quizFormatTitle')} </span>
                {t('evaluationsPage.quizFormatUse')} <code className="bg-primary/10 px-1 rounded font-mono">{t('evaluationsPage.quizFormatQuestionExample')}</code> {t('evaluationsPage.quizFormatQuestion')}
                <code className="bg-primary/10 px-1 rounded font-mono ml-1">{t('evaluationsPage.quizFormatOptionExample')}</code> {t('evaluationsPage.quizFormatOption')}
                <code className="bg-primary/10 px-1 rounded font-mono ml-1">[*]</code> {t('evaluationsPage.quizFormatCorrect')}
              </div>
            </div>
            <DialogFooter className="px-6 py-4 border-t bg-gray-50 dark:bg-gray-900 m-0 -mx-0 -mb-0">
              <Button variant="ghost" onClick={() => setIsOpen(false)}>{t('notesPage.btnCancel')}</Button>
              <Button onClick={handleSave}>{t('notesPage.btnSave')}</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* ── View Dialog ── */}
        <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
          <DialogContent className="sm:max-w-4xl w-full max-h-[90vh] flex flex-col p-0 overflow-hidden">
            <DialogHeader className="px-8 py-6 border-b bg-gray-50 dark:bg-gray-900">
              <DialogTitle className="text-2xl font-bold tracking-tight text-text dark:text-white leading-relaxed">{viewingNote?.title}</DialogTitle>
              {viewingNote && (
                <div className="flex flex-wrap gap-2 mt-4 items-center">
                  <div className="text-xs font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-3 py-1 rounded-full">
                    {format(viewingNote.createdAt, "d MMMM yyyy", { locale: currentLocale })}
                  </div>
                  {viewingCls && <div className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-3 py-1 rounded-full">{viewingCls.name}</div>}
                  {viewingSubj && <div className="text-xs font-bold uppercase tracking-wider text-success bg-success/10 px-3 py-1 rounded-full">{viewingSubj.name}</div>}
                  {viewingQuizCount > 0 && (
                    <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-white bg-primary px-3 py-1 rounded-full">
                      <Icon name="quiz" className="w-3 h-3" />
                      {t('quizView.badgeInteractive')} - {t('quizView.badgeNQuestions', { n: viewingQuizCount })}
                    </div>
                  )}
                </div>
              )}
            </DialogHeader>
            <div className="flex-1 overflow-y-auto px-8 py-8 bg-white dark:bg-gray-800">
              <div className="prose prose-slate dark:prose-invert md:prose-base max-w-none markdown-body">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {viewingNote?.content || ""}
                </ReactMarkdown>
              </div>
            </div>
            <DialogFooter className="px-8 py-4 border-t bg-gray-50 dark:bg-gray-900 flex justify-between items-center sm:justify-between m-0 -mx-0 -mb-0">
               <Button variant="ghost" className="text-danger hover:text-danger-hover hover:bg-danger/10" onClick={() => viewingNote && handleDelete(viewingNote.id)}>
                 <Icon name="delete" className="w-5 h-5 mr-2" /> {t('notesPage.btnDelete')}
               </Button>
               <div className="flex gap-2">
                 <Button variant="ghost" onClick={() => setIsViewOpen(false)}>{t('notesPage.btnClose')}</Button>
                 <Button variant="ghost" onClick={() => viewingNote && openEditDialog(viewingNote.id)}>
                   <Icon name="edit" className="w-5 h-5 mr-2" /> {t('notesPage.btnEdit')}
                 </Button>
                 {viewingQuizCount > 0 && (
                   <Button
                     className="shadow-lg shadow-primary/20"
                     onClick={() => {
                       setIsViewOpen(false);
                       navigate(`/evaluations/${viewingNote?.id}/quiz`);
                     }}
                   >
                     <Icon name="play_circle" className="w-5 h-5 mr-2" />
                     {t('quizView.startQuiz')}
                   </Button>
                 )}
               </div>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── Notes Grid ── */}
      <div className="mt-4 w-full">
        {!notes && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => (
              <div key={i} className="panel h-64 animate-pulse" />
            ))}
          </div>
        )}
        
        {notes && notes.length === 0 && (
          <div className="panel py-20 text-center border-dashed">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
              <Icon name="quiz" className="text-[48px] text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-text dark:text-white tracking-tight mb-3">{t('evaluationsPage.emptyStateTitle')}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">{t('evaluationsPage.emptyStateDesc')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes?.map(note => {
            const cls = note.classId ? classes?.find(c => c.id === note.classId) : null;
            const subj = note.subjectId ? subjects?.find(s => s.id === note.subjectId) : null;
            const isInteractive = hasQuizContent(note.content);
            const quizCount = isInteractive ? countQuizQuestions(note.content) : 0;
            
            return (
              <Card key={note.id} className="group cursor-pointer hover:border-primary/30 flex flex-col" onClick={() => openViewDialog(note.id)}>
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start gap-4">
                    <CardTitle className="text-lg font-bold leading-tight line-clamp-2 group-hover:text-primary transition-colors">
                      {note.title}
                    </CardTitle>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-3">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                      {format(note.createdAt, "d MMM yyyy", { locale: currentLocale })}
                    </div>
                    {cls && <div className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">{cls.name}</div>}
                    {subj && <div className="text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-1 rounded-full">{subj.name}</div>}
                    {isInteractive && quizCount > 0 && (
                      <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-white bg-primary px-2 py-1 rounded-full">
                        <Icon name="quiz" className="w-2.5 h-2.5" />
                        {quizCount} {t('quizView.question')}
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
                  <div className="flex gap-1">
                    <Button variant="ghost" size="xs" className="text-primary hover:text-primary-hover hover:bg-primary/10" onClick={e => { e.stopPropagation(); openViewDialog(note.id); }}>
                      <Icon name="visibility" className="w-4 h-4 mr-1.5" />
                      {t('notesPage.btnReadFull')}
                    </Button>
                    {isInteractive && quizCount > 0 && (
                      <Button
                        size="xs"
                        className="shadow-sm shadow-primary/20"
                        onClick={e => { e.stopPropagation(); navigate(`/evaluations/${note.id}/quiz`); }}
                      >
                        <Icon name="play_arrow" className="w-4 h-4 mr-1" />
                        {t('quizView.startQuiz')}
                      </Button>
                    )}
                  </div>
                  <div className="flex gap-1">
                    <SimpleTooltip content={t('notesPage.tooltipEdit')}>
                      <Button variant="ghost" size="icon-xs" className="text-gray-400 group-hover:text-primary" onClick={e => { e.stopPropagation(); openEditDialog(note.id); }}>
                        <Icon name="edit" className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                    <SimpleTooltip content={t('notesPage.tooltipDelete')}>
                      <Button variant="ghost" size="icon-xs" className="text-gray-400 hover:text-danger" onClick={e => { e.stopPropagation(); handleDelete(note.id); }}>
                        <Icon name="delete" className="w-4 h-4" />
                      </Button>
                    </SimpleTooltip>
                  </div>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
