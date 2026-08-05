import React, { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { format } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { useTranslation } from "@/hooks/useTranslation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Icon } from "@/components/ui/icon";
import { addStudentNote, deleteStudentNote } from "./api";
import { INPUT_LIMITS } from "@/lib/validation";

export function StudentDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const currentLocale = language === 'id' ? localeId : localeEn;

  const student = useLiveQuery(() => db.students.get(id || ""));
  const studentClasses = useLiveQuery(async () => {
    if (!student) return [];
    const enrollments = await db.classEnrollments.where('studentId').equals(student.id).toArray();
    return (await db.classes.bulkGet(enrollments.map(({ classId }) => classId)))
      .filter((cls): cls is NonNullable<typeof cls> => Boolean(cls));
  }, [student]);
  
  const attendances = useLiveQuery(() => db.attendances.where("studentId").equals(id || "").toArray());
  const grades = useLiveQuery(() => db.grades.where("studentId").equals(id || "").toArray());
  const notes = useLiveQuery(() => db.studentNotes.where("studentId").equals(id || "").toArray());
  const periods = useLiveQuery(() => db.academicPeriods.toArray());

  const [newNote, setNewNote] = useState("");

  if (!id || student === undefined) return <div className="p-8 text-center text-slate-500">{t('common.loading')}</div>;
  if (student === null) return <div className="p-8 text-center text-slate-500">{t('studentDetail.notFound')}</div>;

  // Calculate attendance
  let hadir = 0, sakit = 0, izin = 0, alpa = 0;
  if (attendances) {
    attendances.forEach(a => {
      if (a.status === 'hadir') hadir++;
      else if (a.status === 'sakit') sakit++;
      else if (a.status === 'izin') izin++;
      else if (a.status === 'alpa') alpa++;
    });
  }

  const handleAddNote = async () => {
    if (!newNote.trim()) return;
    await addStudentNote(id, newNote);
    setNewNote("");
  };

  const handleDeleteNote = async (noteId: string) => {
    if (confirm(t('common.delete') + "?")) {
      await deleteStudentNote(noteId);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="shrink-0">
          <Icon name="arrow_back" className="w-5 h-5" />
        </Button>
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Icon name="person" className="w-6 h-6 text-blue-500" />
            {t('studentDetail.studentProfile')}
          </h1>
          <p className="page-description">{t('studentDetail.profileDesc')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Kolom Kiri: Info & Kehadiran */}
        <div className="space-y-6 md:col-span-1">
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm text-center">
            <div className="w-20 h-20 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl font-bold">
              {student.name.charAt(0).toUpperCase()}
            </div>
            <h2 className="text-lg font-bold text-slate-800">{student.name}</h2>
            <p className="text-slate-500 font-medium">{student.nis}</p>
            <div className="mt-4 pt-4 border-t border-slate-100 flex flex-col gap-2">
              <div className="flex flex-wrap justify-center gap-1">
                {studentClasses?.length ? studentClasses.map((cls) => (
                  <span key={cls.id} className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/10">
                    {cls.name} · {periods?.find((period) => period.id === cls.academicPeriodId)?.name ?? '-'}
                  </span>
                )) : <span className="text-xs text-slate-400">{t('studentsPage.deletedClass')}</span>}
              </div>
            </div>
          </div>

          <div className="panel p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="fact_check" className="w-4 h-4 text-emerald-500" />
              {t('studentDetail.tabStats')}
            </h3>
            <div className="grid grid-cols-4 gap-2 text-center text-sm mb-4">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <div className="font-bold text-emerald-600 text-lg">{hadir}</div>
                <div className="text-emerald-700 text-xs">{t('attendancePage.statusPresent')}</div>
              </div>
              <div className="bg-amber-50 p-2 rounded-lg">
                <div className="font-bold text-amber-600 text-lg">{sakit}</div>
                <div className="text-amber-700 text-xs">{t('attendancePage.statusSick')}</div>
              </div>
              <div className="bg-blue-50 p-2 rounded-lg">
                <div className="font-bold text-blue-600 text-lg">{izin}</div>
                <div className="text-blue-700 text-xs">{t('attendancePage.statusExcused')}</div>
              </div>
              <div className="bg-rose-50 p-2 rounded-lg">
                <div className="font-bold text-rose-600 text-lg">{alpa}</div>
                <div className="text-rose-700 text-xs">{t('attendancePage.statusAbsent')}</div>
              </div>
            </div>
            <div className="text-center font-mono text-slate-400 text-sm bg-slate-50 py-2 rounded-lg border border-slate-100">
              {t('studentDetail.attendanceFormat')}: {hadir}/{sakit}/{izin}/{alpa}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Nilai & Catatan */}
        <div className="space-y-6 md:col-span-2">
          
          <div className="panel p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="school" className="w-4 h-4 text-purple-500" />
              {t('studentDetail.tabGrades')}
            </h3>
            {grades && grades.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="table-header">
                    <tr>
                      <th className="px-4 py-2 rounded-l-md">{t('studentDetail.gradeTitle')}</th>
                      <th className="px-4 py-2">{t('studentsPage.classLabel')}</th>
                      <th className="px-4 py-2 rounded-r-md text-right">{t('studentDetail.gradeScore')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {grades.map(grade => (
                      <tr key={grade.id}>
                        <td className="px-4 py-3 text-slate-900">{grade.evaluationName}</td>
                        <td className="px-4 py-3 text-slate-500">{studentClasses?.find((cls) => cls.id === grade.classId)?.name ?? '-'}</td>
                        <td className="px-4 py-3 text-right">
                          <span className="font-mono font-medium bg-slate-100 px-2 py-1 rounded">
                            {grade.score}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                {t('studentDetail.gradeEmpty')}
              </div>
            )}
          </div>

          <div className="panel p-5">
            <h3 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Icon name="assignment" className="w-4 h-4 text-orange-500" />
              {t('studentDetail.noteLabel')}
            </h3>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Textarea 
                  maxLength={INPUT_LIMITS.studentNote}
                  placeholder={t('studentDetail.notePlaceholder')} 
                  className="min-h-[80px] resize-none"
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                />
              </div>
              <div className="flex justify-end">
                <Button onClick={handleAddNote} disabled={!newNote.trim()} size="sm">
                  <Icon name="add" className="w-4 h-4 mr-2" /> {t('common.save')}
                </Button>
              </div>

              <div className="space-y-3 mt-6">
                {!notes || notes.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-sm bg-slate-50 rounded-lg border border-dashed border-slate-200">
                    {t('studentDetail.logEmpty')}
                  </div>
                ) : (
                  notes.sort((a,b) => b.createdAt.getTime() - a.createdAt.getTime()).map(note => (
                     <div key={note.id} className="bg-orange-50/50 p-4 rounded-lg border border-orange-100 flex gap-4">
                      <div className="flex-1">
                        <p className="text-sm text-slate-800 whitespace-pre-wrap">{note.content}</p>
                        <p className="text-xs text-slate-400 mt-2">
                          {format(note.createdAt, "d MMM yyyy, HH:mm", { locale: currentLocale })}
                        </p>
                      </div>
                      <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-600 hover:bg-white h-8 w-8 shrink-0" onClick={() => handleDeleteNote(note.id)}>
                        <Icon name="delete" className="w-4 h-4" />
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>

          </div>

        </div>

      </div>
    </div>
  );
}
