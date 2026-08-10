import { useCallback, useState, useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { format } from "date-fns";
import type { Locale } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { db } from "@/db/database";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid } from "recharts";
import { useTranslation } from "@/hooks/useTranslation";
import { Skeleton } from "@/components/ui/skeleton";

import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Icon } from "@/components/ui/icon";
import { useAttendanceEditor } from "./hooks/useAttendanceEditor";

export function AttendanceView() {
  const [date, setDate] = useState<Date>(new Date());
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("none");
  const { t, language } = useTranslation();
  const currentLocale = language === 'id' ? localeId : localeEn;
  const [activeTab, setActiveTab] = useState<'presensi' | 'rekap'>('presensi');
  
  const classes = useLiveQuery(() => db.classes.filter((cls) => !cls.archivedAt).toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const enrollments = useLiveQuery(() => db.classEnrollments.toArray());
  const formattedDate = format(date, 'yyyy-MM-dd');

  // Query all attendance records for the selected class to build the recap table
  const allClassAttendances = useLiveQuery(async () => {
    if (!selectedClassId) return [];
    if (selectedSubjectId !== "none") {
      return await db.attendances
        .where('classId').equals(selectedClassId)
        .filter(a => a.subjectId === selectedSubjectId)
        .toArray();
    } else {
      const records = await db.attendances
        .where('classId').equals(selectedClassId)
        .toArray();
      return records.filter(a => !a.subjectId);
    }
  }, [selectedClassId, selectedSubjectId]);

  // Extract unique teaching dates that have attendance records
  const uniqueDates = useMemo(() => {
    if (!allClassAttendances) return [];
    const dates = Array.from(new Set(allClassAttendances.map(a => a.date)));
    return dates.sort(); // Sort chronologically (ascending)
  }, [allClassAttendances]);
  
  // Filter subjects that have at least one student from the selected class assigned to them
  const availableSubjects = useMemo(() => {
    if (!selectedClassId || !subjects || !enrollments) return [];
    
    // IDs of students in the currently selected class
    const classStudentIds = new Set(enrollments.filter((item) => item.classId === selectedClassId && !item.endedAt).map(({ studentId }) => studentId));
    
    return subjects.filter(subject => {
      // Check if any student assigned to this subject is in the selected class
      return (subject.assignedStudents || []).some(id => classStudentIds.has(id));
    });
  }, [subjects, selectedClassId, enrollments]);

  const onSubjectUnavailable = useCallback(() => setSelectedSubjectId('none'), []);
  const {
    drafts,
    students,
    isLoading,
    setStatus: handleStatusChange,
    setAllStatus,
    save: handleSave,
    chartData,
  } = useAttendanceEditor({
    classId: selectedClassId,
    subjectId: selectedSubjectId,
    date: formattedDate,
    availableSubjects,
    onSubjectUnavailable,
  });

  return (
    <div className="space-y-6 view-enter">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="page-title">{t('attendancePage.title')}</h1>
          <p className="page-description">
            {activeTab === 'presensi' 
              ? t('attendancePage.desc') 
              : t('attendancePage.recapDesc')}
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'presensi' | 'rekap')} className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="presensi">
            <Icon name="check_circle" className="w-4 h-4" />
            {t('attendancePage.tabAttendance')}
          </TabsTrigger>
          <TabsTrigger value="rekap">
            <Icon name="event_note" className="w-4 h-4" />
            {t('attendancePage.tabRecap')}
          </TabsTrigger>
        </TabsList>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 panel">
        <div className="space-y-2">
          <label className="block text-sm font-medium text-text dark:text-gray-300">{t('attendancePage.selectClass')}</label>
          <Select value={selectedClassId} onValueChange={setSelectedClassId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('attendancePage.classPlaceholder')}>
                {(value) => classes?.find(cls => cls.id === value)?.name ?? t('attendancePage.classPlaceholder')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {classes?.map(cls => (
                <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
              ))}
              {classes?.length === 0 && <SelectItem value="none" disabled>{t('attendancePage.noClass')}</SelectItem>}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text dark:text-gray-300">{t('attendancePage.subjectLabel')}</label>
          <Select value={selectedSubjectId} onValueChange={setSelectedSubjectId}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={t('attendancePage.subjectPlaceholder')}>
                {(value) => value === 'none'
                  ? t('attendancePage.generalSubject')
                  : availableSubjects.find(subject => subject.id === value)?.name ?? t('attendancePage.subjectPlaceholder')}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">{t('attendancePage.generalSubject')}</SelectItem>
              {availableSubjects.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium text-text dark:text-gray-300">{t('attendancePage.dateLabel')}</label>
          <DatePicker
            value={format(date, 'yyyy-MM-dd')}
            onChange={(value) => value && setDate(new Date(`${value}T00:00:00`))}
            placeholder={t('attendancePage.datePlaceholder')}
            clearable={false}
          />
        </div>
      </div>

      {isLoading && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          <Skeleton className="lg:col-span-1 h-[320px] rounded-3xl" />
          <Skeleton className="lg:col-span-2 h-[400px] rounded-3xl" />
        </div>
      )}

      {selectedClassId && !isLoading && students.length === 0 && (
        <div className="text-center p-20 panel bg-gray-50/50 dark:bg-gray-800/50 border-dashed">
          <div className="w-20 h-20 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-4">
            <Icon name="groups" className="text-[40px] text-gray-400" />
          </div>
          <p className="text-gray-500 dark:text-gray-400">{t('attendancePage.emptyStudents')}</p>
        </div>
      )}

      {selectedClassId && students.length > 0 && (
        <div className="space-y-6">
          {activeTab === 'presensi' ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <div className="panel h-[340px] flex flex-col">
                  <div className="flex items-center gap-2 mb-6">
                    <Icon name="pie_chart" className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400">{t('attendancePage.chartTitle')}</h3>
                  </div>
                  <div className="flex-1 min-h-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} dy={10} />
                        <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: '#64748b', fontSize: 12 }} />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }} 
                          contentStyle={{ borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value: number) => [`${value} ${t('attendancePage.totalStudents')}`, t('attendancePage.chartCountLabel')]}
                        />
                        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={40}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700 flex justify-between text-xs text-gray-500">
                    <span>{t('attendancePage.totalStudents')}: <strong>{students.length}</strong></span>
                    <span>{t('attendancePage.scheduled')}: <strong>{format(date, 'd MMM yyyy', {locale: currentLocale})}</strong></span>
                  </div>
                </div>
              </div>
              
              <div className="lg:col-span-2">
                <div className="panel p-0 overflow-hidden flex flex-col h-full border-none shadow-none">
                  <div className="px-5 py-4 bg-gray-50/50 dark:bg-gray-800/50 flex flex-wrap gap-2 items-center justify-between border border-gray-100 dark:border-gray-700 rounded-t-3xl border-b-0">
                    <div className="text-sm font-bold uppercase tracking-wider text-gray-400">{t('attendancePage.setAll')}</div>
                    <div className="flex gap-2">
                      <Button variant="success" size="xs" onClick={() => setAllStatus('hadir')}>
                        <Icon name="check_circle" className="w-3.5 h-3.5" />
                        {t('attendancePage.setAllPresent')}
                      </Button>
                    </div>
                  </div>
                  
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-16 text-center">{t('attendancePage.thNo')}</TableHead>
                        <TableHead>{t('attendancePage.thName')}</TableHead>
                        <TableHead className="min-w-[280px]">{t('attendancePage.thStatus')}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {students.map((student, idx) => {
                        const status = drafts[student.id]?.status || 'hadir';
                        return (
                          <TableRow key={student.id}>
                            <TableCell className="text-center text-gray-400 font-medium">{idx + 1}</TableCell>
                            <TableCell className="font-semibold text-text dark:text-white">{student.name}</TableCell>
                            <TableCell>
                              <div className="flex gap-1.5 sm:gap-2">
                                <StatusButton 
                                  active={status === 'hadir'} 
                                  color="success" 
                                  label={t('attendancePage.statusPresent')}
                                  onClick={() => handleStatusChange(student.id, 'hadir')} 
                                />
                                <StatusButton 
                                  active={status === 'sakit'} 
                                  color="warning" 
                                  label={t('attendancePage.statusSick')}
                                  onClick={() => handleStatusChange(student.id, 'sakit')} 
                                />
                                <StatusButton 
                                  active={status === 'izin'} 
                                  color="primary" 
                                  label={t('attendancePage.statusExcused')}
                                  onClick={() => handleStatusChange(student.id, 'izin')} 
                                />
                                <StatusButton 
                                  active={status === 'alpa'} 
                                  color="danger" 
                                  label={t('attendancePage.statusAbsent')}
                                  onClick={() => handleStatusChange(student.id, 'alpa')} 
                                />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                  
                  <div className="p-5 flex justify-end">
                    <Button onClick={handleSave} disabled={isLoading} size="lg" className="w-full sm:w-auto">
                      <Icon name={isLoading ? 'sync' : 'save'} className={cn("w-5 h-5 mr-2", isLoading && "animate-spin")} />
                      {isLoading ? t('attendancePage.btnSaving') : t('attendancePage.btnSave')}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Rekap Presensi Section */
            <div className="panel p-0 overflow-hidden flex flex-col border border-gray-100 dark:border-gray-700">
              <div className="px-5 py-4 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                <h3 className="text-sm font-bold uppercase tracking-wider text-gray-400 flex items-center gap-2">
                  <Icon name="event_note" className="w-5 h-5 text-primary" />
                  {t('attendancePage.recapTitle')}
                </h3>
                <div className="text-xs text-gray-500 font-medium">
                  {t('attendancePage.totalTeaching')}: <strong className="text-primary">{uniqueDates.length} {t('attendancePage.days')}</strong>
                </div>
              </div>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-16 text-center">No</TableHead>
                      <TableHead className="min-w-[180px]">{t('attendancePage.thName')}</TableHead>
                      {uniqueDates.map(dStr => (
                        <TableHead key={dStr} className="text-center min-w-[90px] font-mono text-[10px] uppercase tracking-wider text-gray-400">
                          {formatHeaderDate(dStr, currentLocale)}
                        </TableHead>
                      ))}
                      <TableHead className="text-center min-w-[240px]">{t('attendancePage.recapTotal')}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {uniqueDates.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="h-40 text-center text-gray-400 italic">
                          <div className="w-12 h-12 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-3">
                            <Icon name="event_busy" className="w-6 h-6 text-gray-400" />
                          </div>
                          {t('attendancePage.emptyRecap')}
                        </TableCell>
                      </TableRow>
                    ) : (
                      students.map((student, idx) => {
                        const studentAttendances = allClassAttendances?.filter(a => a.studentId === student.id) || [];
                        let hadir = 0;
                        let sakit = 0;
                        let izin = 0;
                        let alpa = 0;

                        studentAttendances.forEach(a => {
                          if (a.status === 'hadir') hadir++;
                          else if (a.status === 'sakit') sakit++;
                          else if (a.status === 'izin') izin++;
                          else if (a.status === 'alpa') alpa++;
                        });

                        return (
                          <TableRow key={student.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/30">
                            <TableCell className="text-center text-gray-400 font-medium">{idx + 1}</TableCell>
                            <TableCell className="font-semibold text-text dark:text-white">{student.name}</TableCell>
                            
                            {uniqueDates.map(dStr => {
                              const att = studentAttendances.find(a => a.date === dStr);
                              return (
                                <TableCell key={dStr} className="text-center">
                                  <MiniStatusBadge status={att?.status} />
                                </TableCell>
                              );
                            })}

                            <TableCell>
                              <div className="flex gap-1.5 justify-center">
                                <span className={cn(
                                  "px-2.5 py-0.5 text-[10px] rounded-full border font-bold transition-all",
                                  hadir > 0 
                                    ? "bg-success/15 dark:bg-success/10 text-emerald-700 dark:text-emerald-300 border-success/20 dark:border-success/10" 
                                    : "bg-gray-50/50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600 border-transparent opacity-40"
                                )}>
                                  H: {hadir}
                                </span>
                                <span className={cn(
                                  "px-2.5 py-0.5 text-[10px] rounded-full border font-bold transition-all",
                                  sakit > 0 
                                    ? "bg-warning/15 dark:bg-warning/10 text-amber-700 dark:text-amber-300 border-warning/20 dark:border-warning/10" 
                                    : "bg-gray-50/50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600 border-transparent opacity-40"
                                )}>
                                  S: {sakit}
                                </span>
                                <span className={cn(
                                  "px-2.5 py-0.5 text-[10px] rounded-full border font-bold transition-all",
                                  izin > 0 
                                    ? "bg-primary/15 dark:bg-primary/10 text-primary dark:text-indigo-300 border-primary/20 dark:border-primary/10" 
                                    : "bg-gray-50/50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600 border-transparent opacity-40"
                                )}>
                                  I: {izin}
                                </span>
                                <span className={cn(
                                  "px-2.5 py-0.5 text-[10px] rounded-full border font-bold transition-all",
                                  alpa > 0 
                                    ? "bg-danger/15 dark:bg-danger/10 text-danger-hover dark:text-red-300 border-danger/20 dark:border-danger/10" 
                                    : "bg-gray-50/50 text-gray-300 dark:bg-gray-800/30 dark:text-gray-600 border-transparent opacity-40"
                                )}>
                                  A: {alpa}
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </div>
      )}
      </Tabs>
    </div>
  );
}

function StatusButton({ 
  active, 
  color, 
  label, 
  onClick 
}: { 
  active: boolean, 
  color: 'success' | 'warning' | 'primary' | 'danger', 
  label: string, 
  onClick: () => void 
}) {
  const colorMap = {
    success: "bg-success/10 text-success hover:bg-success/20 border-success/20",
    warning: "bg-warning/10 text-warning hover:bg-warning/20 border-warning/20",
    primary: "bg-primary/10 text-primary hover:bg-primary/20 border-primary/20",
    danger: "bg-danger/10 text-danger hover:bg-danger/20 border-danger/20",
  };
  
  const activeMap = {
    success: "bg-success text-gray-800 border-success shadow-lg shadow-success/40",
    warning: "bg-warning text-gray-800 border-warning shadow-lg shadow-warning/40",
    primary: "bg-primary text-white border-primary shadow-lg shadow-primary/30",
    danger: "bg-danger text-white border-danger shadow-lg shadow-danger/30",
  };

  return (
    <button
      onClick={onClick}
      className={cn(
        "px-4 py-1.5 text-[10px] sm:text-xs font-bold uppercase tracking-wider rounded-full transition-all border active:scale-95",
        active ? activeMap[color] : colorMap[color]
      )}
    >
      {label}
    </button>
  );
}

const formatHeaderDate = (dateStr: string, locale: Locale) => {
  const parts = dateStr.split('-');
  if (parts.length === 3) {
    return format(new Date(Number(parts[0]), Number(parts[1]) - 1, Number(parts[2])), "d MMM", { locale });
  }
  return dateStr;
};

function MiniStatusBadge({ status }: { status?: 'hadir' | 'sakit' | 'izin' | 'alpa' }) {
  if (!status) return <span className="text-gray-300 dark:text-gray-600 font-medium">-</span>;
  
  const config = {
    hadir: { 
      text: "H", 
      className: "bg-success/15 dark:bg-success/10 text-emerald-700 dark:text-emerald-300 border-success/20 dark:border-success/10" 
    },
    sakit: { 
      text: "S", 
      className: "bg-warning/15 dark:bg-warning/10 text-amber-700 dark:text-amber-300 border-warning/20 dark:border-warning/10" 
    },
    izin: { 
      text: "I", 
      className: "bg-primary/15 dark:bg-primary/10 text-primary dark:text-indigo-300 border-primary/20 dark:border-primary/10" 
    },
    alpa: { 
      text: "A", 
      className: "bg-danger/15 dark:bg-danger/10 text-danger-hover dark:text-red-300 border-danger/20 dark:border-danger/10" 
    },
  };

  return (
    <span className={cn(
      "inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold border transition-all",
      config[status].className
    )}>
      {config[status].text}
    </span>
  );
}
