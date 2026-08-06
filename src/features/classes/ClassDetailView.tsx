import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "@/db/database";
import { addStudentsBulk, createStudent } from "@/features/students/api";
import { endEnrollment, getStudentsByClass } from "./api";
import { completeTeachingTimer } from "@/features/teaching/timer";
import { updateNote } from "@/features/notes/api";
import { ScheduleEditorDialog } from "./components/ScheduleEditorDialog";
import { useScheduleEditor } from "./hooks/useScheduleEditor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { toast } from "sonner";
import { format } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useTimerStore } from "@/store/timerStore";
import { INPUT_LIMITS } from "@/lib/validation";

export function ClassDetailView() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t, language } = useTranslation();
  const currentLocale = language === 'id' ? localeId : localeEn;
  
  const cls = useLiveQuery(() => db.classes.get(id!), [id]);
  const students = useLiveQuery(() => getStudentsByClass(id!, Boolean(cls?.archivedAt)), [id, cls?.archivedAt]);
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const teachingSessions = useLiveQuery(() => db.teachingSessions.where('classId').equals(id!).reverse().sortBy('startTime'), [id]);
  const materials = useLiveQuery(() => db.notes.where('[classId+type]').equals([id!, 'materi']).reverse().sortBy('createdAt'), [id]);
  const schedules = useLiveQuery(() => db.schedules.where('classId').equals(id!).toArray(), [id]);

  const { activeTimer, startTimer, stopTimer, clearTimer } = useTimerStore();
  const [elapsed, setElapsed] = useState(0);

  const scheduleEditor = useScheduleEditor(id!, language);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer && activeTimer.classId === id && activeTimer.noteId) {
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      }, 1000);
      setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer, id]);

  const handleStopMaterial = async () => {
    if (!activeTimer) return;
    try {
      const durationMinutes = await completeTeachingTimer(activeTimer);
      clearTimer();
      toast.success(t('timeTracker.successSave', { minutes: durationMinutes }));
    } catch (e) {
      console.error('Failed to record teaching time', e);
      toast.error(t('timeTracker.errorSave'), {
        description: t('timeTracker.errorSaveHint'),
        duration: 10_000,
        action: {
          label: t('timeTracker.cancelTimer'),
          onClick: () => {
            stopTimer();
            toast.info(t('timeTracker.timerCancelled'));
          },
        },
      });
    }
  };

  const handleToggleTaught = async (noteId: string, currentStatus?: boolean) => {
    try {
      await updateNote(noteId, { isTaught: !currentStatus });
      toast.success(t('notesPage.successUpdate'));
    } catch (e) {
      toast.error(t('timeTracker.errorSave'));
    }
  };

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [newStudentName, setNewStudentName] = useState("");
  const [newStudentNis, setNewStudentNis] = useState("");

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [bulkText, setBulkText] = useState("");

  if (cls === undefined) return <div className="p-10 text-center animate-pulse">{t('common.loading')}</div>;
  if (cls === null) return <div className="p-10 text-center">{t('classDetail.notFound')}</div>;

  const handleAdd = async () => {
    if (!newStudentName.trim()) {
      toast.error(t('classDetail.errorEmptyName'));
      return;
    }
    await createStudent(id!, newStudentName.trim(), newStudentNis.trim() || "-");
    toast.success(t('classDetail.successAdd'));
    setNewStudentName("");
    setNewStudentNis("");
    setIsAddOpen(false);
  };

  const handleBulkAdd = async () => {
    if (!bulkText.trim()) return;
    const lines = bulkText.split('\n').map(l => l.trim()).filter(l => l);
    const studentsList = lines.map(line => {
      const parts = line.split(/[,\t]/);
      if (parts.length >= 2) {
        return { name: parts[0].trim(), nis: parts[1].trim() };
      }
      return { name: line, nis: "-" };
    });

    if (studentsList.length > 0) {
      await addStudentsBulk(id!, studentsList);
      toast.success(t('classDetail.successBulk', { count: studentsList.length }));
      setBulkText("");
      setIsBulkOpen(false);
    }
  };

  const totalMinutes = teachingSessions?.reduce((sum, s) => sum + s.durationMinutes, 0) || 0;
  const minutesPerSubject = teachingSessions?.reduce((acc, s) => {
    const key = s.subjectId || 'umum';
    acc[key] = (acc[key] || 0) + s.durationMinutes;
    return acc;
  }, {} as Record<string, number>) || {};

  const sortedMaterials = materials ? [...materials].sort((a, b) => {
    const aVal = a.isTaught ? 1 : 0;
    const bVal = b.isTaught ? 1 : 0;
    return aVal - bVal;
  }) : [];

  const formatHours = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  return (
    <div className="space-y-6 view-enter pb-8">
      {cls.archivedAt && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm font-medium text-amber-800">{language === 'id' ? 'Kelas ini telah diarsipkan. Seluruh data akademik hanya dapat dilihat.' : 'This class is archived. All academic data is read-only.'}</div>}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate('/classes')} className="rounded-xl bg-gray-100 dark:bg-gray-800">
          <Icon name="arrow_back" className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="page-title">{cls.name}</h1>
          <p className="page-description">{t('classDetail.management')}</p>
        </div>
      </div>

      <Tabs defaultValue="materials" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="materials">
            <Icon name="menu_book" className="w-4 h-4" /> {t('classDetail.tabMaterials')}
          </TabsTrigger>
          <TabsTrigger value="schedules">
            <Icon name="calendar_today" className="w-4 h-4 mr-1" /> {t('scheduling.tabSchedules')}
          </TabsTrigger>
          <TabsTrigger value="students">
            <Icon name="person" className="w-4 h-4" /> {t('classDetail.tabStudents')}
          </TabsTrigger>
          <TabsTrigger value="timelog">
            <Icon name="schedule" className="w-4 h-4" /> {t('classDetail.tabLog')}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="students" className="space-y-6">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="text-xs font-bold uppercase tracking-wider text-primary bg-primary/10 px-4 py-2 rounded-full border border-primary/20">
               {t('classDetail.totalStudents', { count: students?.length || 0 })}
            </div>
            <div className="flex flex-wrap gap-3">
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger render={<Button disabled={Boolean(cls.archivedAt)} className="shadow-lg shadow-primary/20" />}>
                  <Icon name="person_add" className="w-4 h-4 mr-2" />
                  {t('classDetail.newStudent')}
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>{t('classDetail.addStudentTitle')}</DialogTitle>
                    <DialogDescription>{t('classDetail.addStudentDesc')}</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="sname">{t('classDetail.nameLabel')}</Label>
                      <Input id="sname" value={newStudentName} maxLength={INPUT_LIMITS.personName} onChange={e => setNewStudentName(e.target.value)} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="snis">{t('classDetail.nisLabel')}</Label>
                      <Input id="snis" value={newStudentNis} maxLength={INPUT_LIMITS.identifier} onChange={e => setNewStudentNis(e.target.value)} />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsAddOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleAdd}>{t('common.save')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>

              <Dialog open={isBulkOpen} onOpenChange={setIsBulkOpen}>
                <DialogTrigger render={<Button variant="secondary" disabled={Boolean(cls.archivedAt)} />}>
                  <Icon name="upload" className="w-4 h-4 mr-2" />
                  {t('classDetail.pasteBulk')}
                </DialogTrigger>
                <DialogContent className="max-w-md">
                  <DialogHeader>
                    <DialogTitle>{t('classDetail.bulkTitle')}</DialogTitle>
                    <DialogDescription>
                      {t('classDetail.bulkDesc')}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                    <Textarea 
                      rows={10} 
                      className="font-mono text-sm leading-relaxed whitespace-pre rounded-2xl"
                      placeholder={t('classDetail.bulkPlaceholder')} 
                      value={bulkText} 
                      maxLength={INPUT_LIMITS.noteContent}
                      onChange={e => setBulkText(e.target.value)} 
                    />
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setIsBulkOpen(false)}>{t('common.cancel')}</Button>
                    <Button onClick={handleBulkAdd}>{t('classDetail.btnProcess')}</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16 text-center">{t('classDetail.thNo')}</TableHead>
                <TableHead className="w-32">{t('classDetail.thNis')}</TableHead>
                <TableHead>{t('classDetail.thName')}</TableHead>
                <TableHead className="w-24 text-right">{t('classDetail.thAction')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(!students || students.length === 0) && (
                <TableRow>
                  <TableCell colSpan={4} className="h-40 text-center text-gray-500">
                    <Icon name="person_off" className="w-12 h-12 text-gray-200 dark:text-gray-700 mx-auto mb-3" />
                    {t('classDetail.emptyStudents')}
                  </TableCell>
                </TableRow>
              )}
              {students?.map((student, index) => (
                <TableRow key={student.id}>
                  <TableCell className="text-center font-medium text-gray-400">{index + 1}</TableCell>
                  <TableCell className="font-mono text-xs text-gray-500">{student.nis}</TableCell>
                  <TableCell className="font-semibold text-text dark:text-white">
                    {student.name}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <SimpleTooltip content={t('classDetail.tooltipProfile')}>
                        <Link to={`/students/${student.id}`}>
                          <Button 
                            variant="ghost" 
                            size="icon-xs" 
                          >
                            <Icon name="visibility" className="h-4 w-4 text-gray-400 group-hover:text-primary" />
                          </Button>
                        </Link>
                      </SimpleTooltip>
                      <SimpleTooltip content={t('classDetail.tooltipRemove')}>
                        <Button 
                          variant="ghost" 
                          size="icon-xs" 
                          className="hover:text-danger"
                          onClick={async () => {
                            if(confirm(t('classDetail.confirmRemove', { name: student.name }))) {
                              await endEnrollment(id!, student.id);
                              toast.success(t('classDetail.removedAlert'));
                            }
                          }}
                        >
                          <Icon name="delete" className="h-4 w-4" />
                        </Button>
                      </SimpleTooltip>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TabsContent>

        <TabsContent value="timelog" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <Card className="bg-gradient-to-br from-primary to-primary-hover shadow-primary-glow text-white border-none">
               <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-bold uppercase tracking-wider text-white/70">{t('classDetail.totalHours')}</CardTitle>
               </CardHeader>
               <CardContent>
                 <div className="text-4xl font-bold mb-1">
                    {formatHours(totalMinutes)}
                 </div>
                 <p className="text-xs text-white/60">{t('classDetail.overallIn', { className: cls.name })}</p>
               </CardContent>
             </Card>

             <Card className="md:col-span-2">
               <CardHeader className="pb-2">
                 <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('classDetail.bySubject')}</CardTitle>
               </CardHeader>
               <CardContent>
                  <div className="flex flex-wrap gap-4 mt-2">
                     {Object.entries(minutesPerSubject).map(([key, mins]) => {
                       const subjName = key === 'umum' ? t('classDetail.noSubject') : subjects?.find(s => s.id === key)?.name || t('classDetail.deletedSubject');
                       return (
                         <div key={key} className="flex flex-col panel p-4 min-w-[140px] text-center hover:border-primary/20 transition-all">
                           <div className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{subjName}</div>
                           <div className="text-xl font-bold text-text dark:text-white">{formatHours(mins)}</div>
                         </div>
                       )
                     })}
                     {Object.keys(minutesPerSubject).length === 0 && (
                       <p className="text-sm text-gray-400 p-2 italic">{t('classDetail.emptyLogText')}</p>
                     )}
                  </div>
               </CardContent>
             </Card>
          </div>

          <div className="panel p-0 overflow-hidden">
             <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
               <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                 <Icon name="history" className="w-5 h-5 text-primary" /> {t('classDetail.teachingHistory')}
               </h3>
             </div>
             {(!teachingSessions || teachingSessions.length === 0) ? (
                <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                  <Icon name="schedule" className="text-[48px] mb-4 text-gray-200 dark:text-gray-700" />
                  <p className="text-sm">{t('classDetail.useTrackerHint')}</p>
                </div>
             ) : (
                <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                  {teachingSessions.map(session => {
                    const subjName = session.subjectId ? subjects?.find(s => s.id === session.subjectId)?.name : null;
                    return (
                      <li key={session.id} className="p-5 flex items-center justify-between hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-text dark:text-white">
                              {format(session.startTime, "EEEE, d MMM yyyy", { locale: currentLocale })}
                            </span>
                            {subjName && <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">{subjName}</span>}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1">
                            <Icon name="pace" className="w-3.5 h-3.5" />
                            {format(session.startTime, "HH:mm")} - {format(session.endTime, "HH:mm")}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-bold text-text dark:text-white">{session.durationMinutes}</div>
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">{t('classDetail.minutes')}</div>
                        </div>
                      </li>
                    )
                  })}
                </ul>
             )}
          </div>
        </TabsContent>

        <TabsContent value="materials" className="space-y-6">
          {/* Progress Card */}
          {sortedMaterials && sortedMaterials.length > 0 && (() => {
            const total = sortedMaterials.length;
            const taught = sortedMaterials.filter(m => m.isTaught).length;
            const percent = Math.round((taught / total) * 100);
            return (
              <Card className="border border-gray-100 dark:border-gray-800 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-bold uppercase tracking-wider text-gray-400">
                    {t('classDetail.taughtProgress')}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-sm font-bold">
                    <span className="text-text dark:text-white">{percent}% ({taught} / {total} {t('sidebar.materials').toLowerCase()})</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-gray-800 rounded-full h-3 overflow-hidden border border-gray-200/50 dark:border-gray-700/50">
                    <div 
                      className="bg-gradient-to-r from-primary to-primary-hover h-full transition-all duration-500 ease-out rounded-full" 
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                </CardContent>
              </Card>
            );
          })()}

          {/* Materials To-Do List */}
          <div className="panel p-0 overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
              <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                <Icon name="menu_book" className="w-5 h-5 text-primary" /> {t('classDetail.tabMaterials')}
              </h3>
            </div>

            {(!sortedMaterials || sortedMaterials.length === 0) ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <Icon name="menu_book" className="text-[48px] mb-4 text-gray-200 dark:text-gray-700 mx-auto" />
                <p className="text-sm font-semibold mb-1 text-text dark:text-white">{t('classDetail.emptyMaterials')}</p>
                <p className="text-xs text-gray-400 max-w-sm text-center px-4">{t('classDetail.createMaterialPrompt')}</p>
              </div>
            ) : (
              <ul className="divide-y divide-gray-100 dark:divide-gray-700">
                {sortedMaterials.map(material => {
                  const subjName = material.subjectId ? subjects?.find(s => s.id === material.subjectId)?.name : null;
                  const materialSessions = teachingSessions?.filter(s => s.noteId === material.id) || [];
                  const materialMins = materialSessions.reduce((sum, s) => sum + s.durationMinutes, 0);
                  const isCurrentTimer = activeTimer?.noteId === material.id;

                  return (
                    <li key={material.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {/* Checkbox */}
                        <button
                          onClick={() => handleToggleTaught(material.id, material.isTaught)}
                          className={cn(
                            "flex-shrink-0 w-6 h-6 mt-0.5 rounded-lg border-2 flex items-center justify-center transition-all",
                            material.isTaught 
                              ? "bg-emerald-500 border-emerald-500 text-white" 
                              : "border-gray-300 dark:border-gray-600 hover:border-primary"
                          )}
                        >
                          {material.isTaught && <Icon name="check" className="w-4 h-4 text-white" />}
                        </button>

                        <div className="space-y-1 flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={cn(
                              "font-bold text-text dark:text-white break-words",
                              material.isTaught ? "text-gray-400 dark:text-gray-500 line-through decoration-gray-400/50" : ""
                            )}>
                              {material.title}
                            </span>
                            {subjName && (
                              <span className="text-[10px] font-bold tracking-wider uppercase text-primary bg-primary/10 border border-primary/20 px-2 py-0.5 rounded-full">
                                {subjName}
                              </span>
                            )}
                            {material.isTaught ? (
                              <span className="text-[9px] font-extrabold tracking-wider uppercase text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200/50 px-2 py-0.5 rounded-full">
                                {t('classDetail.materialTaught')}
                              </span>
                            ) : (
                              <span className="text-[9px] font-extrabold tracking-wider uppercase text-gray-500 bg-gray-100 dark:bg-gray-800 border border-gray-200/50 px-2 py-0.5 rounded-full">
                                {t('classDetail.materialNotTaught')}
                              </span>
                            )}
                          </div>
                          {material.content && (
                            <p className="text-xs text-gray-400 line-clamp-1 break-words">
                              {material.content}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 flex-shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-gray-100 dark:border-gray-700">
                        {/* Time Taught info */}
                        <div className="text-left sm:text-right">
                          <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">{t('classDetail.durationTaught')}</div>
                          <div className="text-sm font-bold text-text dark:text-white flex items-center gap-1 sm:justify-end mt-0.5">
                            <Icon name="schedule" className="w-3.5 h-3.5 text-gray-400" />
                            {formatHours(materialMins)}
                          </div>
                        </div>

                        {/* Inline Timer Controls */}
                        <div>
                          {isCurrentTimer ? (
                            <Button 
                              variant="destructive" 
                              size="sm" 
                              onClick={handleStopMaterial}
                              className="gap-1.5 shadow-md shadow-rose-500/20 bg-rose-500 hover:bg-rose-600 animate-pulse rounded-xl h-8"
                            >
                              <Icon name="square" className="w-3.5 h-3.5 fill-current" />
                              <span className="font-mono text-xs">{formatElapsed(elapsed)}</span>
                              <span className="text-xs">{t('classDetail.btnStopTeaching')}</span>
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={material.isTaught}
                              onClick={() => {
                                if (activeTimer) {
                                  toast.error(t('classDetail.toastAnotherTimerActive'));
                                  return;
                                }
                                startTimer(id!, material.subjectId || 'none', material.id);
                                toast.success(t('timeTracker.successStart'));
                              }}
                              className={cn(
                                "gap-1 rounded-xl h-8 text-xs",
                                material.isTaught ? "opacity-50 cursor-not-allowed" : "hover:border-emerald-500 hover:text-emerald-500 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20"
                              )}
                            >
                              <Icon name="play_arrow" className="w-3.5 h-3.5 fill-current text-emerald-500" />
                              {t('classDetail.btnStartTeaching')}
                            </Button>
                          )}
                        </div>
                      </div>
                    </li>
                  )
                })}
              </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="schedules" className="space-y-6">
          <div className="panel p-5">
            {(!schedules || schedules.length === 0) ? (
              <div className="py-20 flex flex-col items-center justify-center text-gray-400">
                <Icon name="calendar_today" className="text-[48px] mb-4 text-gray-200 dark:text-gray-700 mx-auto" />
                <p className="text-sm font-semibold mb-1 text-text dark:text-white">{t('scheduling.noSchedules')}</p>
                <p className="text-xs text-gray-400 max-w-sm text-center px-4">{t('scheduling.createSchedulePrompt')}</p>
                <Button className="mt-4 shadow-md shadow-primary/10" onClick={scheduleEditor.openAdd}>
                  <Icon name="add" className="w-4 h-4 mr-2" />
                  {t('scheduling.addSchedule')}
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex justify-between items-center border-b pb-4 mb-4 border-slate-100 dark:border-slate-800">
                  <h3 className="text-sm font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
                    <Icon name="history" className="w-5 h-5 text-primary" /> {t('scheduling.tabSchedules')}
                  </h3>
                  <Button onClick={scheduleEditor.openAdd} className="shadow-lg shadow-primary/20">
                    <Icon name="add" className="w-4 h-4 mr-2" />
                    {t('scheduling.addSchedule')}
                  </Button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {schedules.map(schedule => {
                    const subj = subjects?.find(s => s.id === schedule.subjectId);
                    return (
                      <Card key={schedule.id} className="border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-md transition-all duration-200 rounded-2xl">
                        <CardHeader className="pb-2 pt-4 px-4">
                          <div className="flex justify-between items-start">
                            <div>
                              <CardTitle className="text-sm font-bold text-slate-800 dark:text-white">
                                {subj ? subj.name : t('classDetail.noSubject')}
                              </CardTitle>
                              <CardDescription className="text-[11px] mt-1 font-medium bg-primary/5 text-primary w-max px-2 py-0.5 rounded-md border border-primary/10">
                                {schedule.recurrenceType === 'daily' && t('scheduling.recurrenceDaily')}
                                {schedule.recurrenceType === 'weekly' && `${t('scheduling.recurrenceWeekly')} (${scheduleEditor.getDayName(schedule.dayOfWeek ?? 1)})`}
                                {schedule.recurrenceType === 'monthly' && `${t('scheduling.recurrenceMonthly')} (${t('common.date')} ${schedule.dayOfMonth ?? 1})`}
                              </CardDescription>
                            </div>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg" onClick={() => scheduleEditor.openEdit(schedule)}>
                                <Icon name="edit" className="w-4 h-4 text-slate-400" />
                              </Button>
                              <Button variant="ghost" size="icon" className="w-7 h-7 rounded-lg hover:text-danger hover:bg-danger/5" onClick={() => scheduleEditor.remove(schedule.id)}>
                                <Icon name="delete" className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="text-xs text-slate-500 dark:text-slate-400 space-y-2 pb-4 px-4 pt-1">
                          <div className="flex items-center gap-1.5 font-bold text-slate-700 dark:text-slate-200">
                            <Icon name="schedule" className="w-3.5 h-3.5 text-primary" />
                            {schedule.startTime} - {schedule.endTime}
                          </div>
                          <div className="flex items-center gap-1.5 font-medium">
                            <Icon name="event" className="w-3.5 h-3.5 text-slate-400" />
                            {t('scheduling.startDateLabel')}: {format(new Date(schedule.startDate), "d MMM yyyy", { locale: currentLocale })}
                          </div>
                          {(schedule.recurrenceCount || schedule.endDate) && (
                            <div className="flex items-center gap-1.5 font-medium">
                              <Icon name="sync" className="w-3.5 h-3.5 text-slate-400" />
                              {schedule.recurrenceCount 
                                ? `${t('scheduling.countLabel')}: ${schedule.recurrenceCount}x`
                                : `${t('scheduling.endDateLabel')}: ${format(new Date(schedule.endDate!), "d MMM yyyy", { locale: currentLocale })}`
                              }
                            </div>
                          )}
                          <div className="flex items-center gap-1.5 font-medium">
                            <Icon name="notifications" className="w-3.5 h-3.5 text-slate-400" />
                            {t('scheduling.reminderLabel')}: {
                              schedule.notificationEarlyMinutes === 0 ? t('scheduling.reminderOff') :
                              schedule.notificationEarlyMinutes === 5 ? t('scheduling.reminder5Min') :
                              schedule.notificationEarlyMinutes === 15 ? t('scheduling.reminder15Min') :
                              schedule.notificationEarlyMinutes === 30 ? t('scheduling.reminder30Min') :
                              t('scheduling.reminder1Hour')
                            }
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>

      <ScheduleEditorDialog editor={scheduleEditor} subjects={subjects} />
    </div>
  );
}
