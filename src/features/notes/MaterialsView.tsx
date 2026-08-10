import React, { useMemo } from "react";
import { useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { deleteNote } from "./api";
import { format } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { useTranslation } from "@/hooks/useTranslation";
import { NoteService } from "@/services/NoteService";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function MaterialsView() {
  const navigate = useNavigate();
  const notes = useLiveQuery(() => db.notes.where('type').equals('materi').reverse().sortBy('createdAt'), []);
  const classes = useLiveQuery(() => db.classes.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());

  const { t, language } = useTranslation();
  const currentLocale = language === 'id' ? localeId : localeEn;

  const handleDelete = async (id: string) => {
    if (confirm(t('notesPage.confirmDelete'))) {
      await deleteNote(id);
      toast.success(t('notesPage.successDelete'));
    }
  };

  return (
    <div className="space-y-6 view-enter pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t('materialsPage.title')}</h1>
          <p className="page-description">{t('materialsPage.desc')}</p>
        </div>
        
        <Button size="lg" onClick={() => navigate('/materials/new')} className="shadow-lg shadow-primary/20">
            <Icon name="add" className="w-5 h-5 mr-2" />
            {t('materialsPage.btnNew')}
          </Button>
      </div>

      <div>
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
              <Icon name="book" className="text-[48px] text-primary" />
            </div>
            <h3 className="text-2xl font-bold text-text dark:text-white tracking-tight mb-3">{t('materialsPage.emptyStateTitle')}</h3>
            <p className="text-gray-500 dark:text-gray-400 max-w-md mx-auto leading-relaxed">{t('materialsPage.emptyStateDesc')}</p>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {notes?.map(note => {
            const assignedClasses = (note.classIds ?? (note.classId ? [note.classId] : []))
              .map(classId => classes?.find(c => c.id === classId))
              .filter(Boolean);
            const subj = note.subjectId ? subjects?.find(s => s.id === note.subjectId) : null;
            
            return (
              <Card key={note.id} className="group cursor-pointer hover:border-primary/30" onClick={() => navigate(`/materials/${note.id}/view`)}>
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
                    {assignedClasses.map(cls => cls && (
                      <div key={cls.id} className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 px-2 py-1 rounded-full">{cls.name}</div>
                    ))}
                    {assignedClasses.length === 0 && (
                      <div className="text-[10px] font-bold uppercase tracking-wider text-gray-500 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded-full">
                        {t('materialsPage.generalAccess')}
                      </div>
                    )}
                    {subj && <div className="text-[10px] font-bold uppercase tracking-wider text-success bg-success/10 px-2 py-1 rounded-full">{subj.name}</div>}
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
                    <Button variant="ghost" size="xs" className="text-primary hover:text-primary-hover hover:bg-primary/10" onClick={(e) => { e.stopPropagation(); navigate(`/materials/${note.id}/view`); }}>
                      <Icon name="visibility" className="w-4 h-4 mr-1.5" />
                      {t('notesPage.btnReadFull')}
                    </Button>
                    <Button
                      size="xs"
                      className="shadow-sm shadow-primary/20"
                      onClick={e => { e.stopPropagation(); navigate(`/materials/${note.id}/present`); }}
                    >
                      <Icon name="slideshow" className="w-4 h-4 mr-1" />
                      {t('materialsPage.presentBtn')}
                    </Button>
                  </div>
                  <div className="flex gap-1">
                      <SimpleTooltip content={t('notesPage.tooltipEdit')}>
                        <Button variant="ghost" size="icon-xs" className="text-gray-400 group-hover:text-primary" onClick={(e) => { e.stopPropagation(); navigate(`/materials/${note.id}/edit`); }}>
                           <Icon name="edit" className="w-4 h-4" />
                        </Button>
                      </SimpleTooltip>
                      <SimpleTooltip content={t('notesPage.tooltipDelete')}>
                        <Button variant="ghost" size="icon-xs" className="text-gray-400 hover:text-danger" onClick={(e) => { e.stopPropagation(); handleDelete(note.id); }}>
                           <Icon name="delete" className="w-4 h-4" />
                        </Button>
                      </SimpleTooltip>
                  </div>
                </CardFooter>
              </Card>
            )
          })}
        </div>
      </div>
    </div>
  );
}
