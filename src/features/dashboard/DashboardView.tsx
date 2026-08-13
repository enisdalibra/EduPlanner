import { Link } from "react-router";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { toast } from "sonner";
import { Icon } from "@/components/ui/icon";
import { useDashboardStats } from "./hooks/useDashboardStats";

const TeachingStatsChart = lazy(() =>
  import("./components/TeachingStatsChart").then(({ TeachingStatsChart }) => ({ default: TeachingStatsChart })),
);

export function DashboardView() {
  const { t, language } = useTranslation();
  const [isExporting, setIsExporting] = useState(false);
  const [chartMonths, setChartMonths] = useState<6 | 12>(6);
  const [chartReady, setChartReady] = useState(false);
  const { stats, teachingStats, storageUsage } = useDashboardStats(chartMonths, language);

  useEffect(() => {
    if (!stats) return;

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => setChartReady(true), { timeout: 1_200 });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => setChartReady(true), 250);
    return () => window.clearTimeout(timeoutId);
  }, [stats]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { BackupService } = await import("@/services/BackupService");
      const jsonString = await BackupService.generateExportPayload(2);
      const blob = new Blob([jsonString], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement("a");
      a.href = url;
      a.download = `eduplanner_backup_${format(new Date(), 'yyyyMMdd_HHmm')}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      toast.success(t('settings.successExport'));
    } catch (e) {
      toast.error(t('settings.errorExport'));
    } finally {
      setIsExporting(false);
    }
  };

  const recentNotes = useMemo(
    () => stats?.notes
      ? [...stats.notes]
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 3)
      : [],
    [stats?.notes],
  );
  const activeTasks = stats?.activeTasks || 0;
  const totalClasses = stats?.classes || 0;
  const todayClasses = stats?.todayClasses || [];

  return (
    <div className="flex-1 flex flex-col h-full mx-auto w-full max-w-5xl view-enter">
      <div className="flex justify-end mb-6">
        <button 
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            "btn btn-primary btn-sm shrink-0 cursor-pointer shadow-md",
            isExporting && "opacity-70"
          )}
        >
          <Icon name={isExporting ? 'sync' : 'download'} className={cn("w-4 h-4", isExporting && "animate-spin")} />
          {isExporting ? t('dashboard.exporting') : t('dashboard.exportBtn')}
        </button>
      </div>

      {/* Row 1: Compact Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        
        {/* Metric 1: Active Classes */}
        <div className="bg-gradient-to-br from-primary to-primary-hover shadow-primary-glow rounded-3xl p-5 text-white flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">{t('dashboard.activeClasses')}</h4>
              <div className="text-4xl font-extrabold mt-1">{totalClasses}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Icon name="school" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-white/80 font-medium">
            {t('dashboard.yourTeach')}
          </div>
        </div>

        {/* Metric 2: Total Students */}
        <div className="panel flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.studentData')}</h4>
              <div className="text-4xl font-extrabold mt-1 text-text dark:text-white">{stats?.students || 0}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Icon name="groups" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium truncate">
            {stats?.students && stats.classes ? t('dashboard.studentScattered', { totalClasses }) : t('dashboard.noStudentData')}
          </div>
        </div>

        {/* Metric 3: Pending Tasks */}
        <div className="panel flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.tasksPending')}</h4>
              <div className="text-4xl font-extrabold mt-1 text-text dark:text-white">{activeTasks}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-rose-50 dark:bg-rose-950/30 flex items-center justify-center text-rose-500 dark:text-rose-400 shrink-0">
              <Icon name="assignment_late" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium">
            {activeTasks > 0 ? (language === 'id' ? 'Selesaikan tugas kalender Anda' : 'Complete your calendar tasks') : (language === 'id' ? 'Semua tugas telah selesai' : 'All tasks completed')}
          </div>
        </div>

        {/* Metric 4: Browser Storage */}
        <div className="panel flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">{t('dashboard.localStorageStr')}</h4>
              <div className="text-2xl font-bold mt-1 text-text dark:text-white">{storageUsage.used}</div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-gray-50 dark:bg-gray-700/50 flex items-center justify-center text-gray-500 shrink-0">
              <Icon name="database" className="w-5 h-5" />
            </div>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between text-[9px] font-bold text-gray-400">
              <span>{t('dashboard.browserIndexedDbStr')}</span>
              <span className="text-primary">{storageUsage.percent}%</span>
            </div>
            <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
              <div className="bg-primary h-full rounded-full transition-all duration-500" style={{ width: `${storageUsage.percent}%` }}></div>
            </div>
          </div>
        </div>

      </div>

      {/* Row 2: Today's Schedule & Quick Access */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        
        {/* Upcoming Classes Today */}
        <div className="lg:col-span-5 panel flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Icon name="calendar_today" className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('dashboard.upcomingClassesToday')}</h3>
            </div>
            {todayClasses.length > 0 && (
              <span className="text-[10px] font-extrabold bg-primary/10 text-primary px-3 py-1 rounded-full">
                {todayClasses.length} {language === 'id' ? 'Kelas' : 'Classes'}
              </span>
            )}
          </div>
          
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {todayClasses.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm py-16 text-center">
                <div className="w-16 h-16 bg-sky-50 dark:bg-sky-950/30 rounded-full flex items-center justify-center text-sky-600 dark:text-sky-400 mb-4 shrink-0">
                  <Icon name="sentiment_satisfied" className="text-[36px]" />
                </div>
                <p className="font-semibold text-gray-600 dark:text-gray-300 max-w-[240px] text-balance">
                  {t('dashboard.noUpcomingClasses')}
                </p>
              </div>
            ) : (
              <div className="relative border-l-2 border-dashed border-gray-200 dark:border-gray-700 ml-3 pl-6 py-2 space-y-6">
                {todayClasses.map(({ schedule, class: cls, subject, status }) => {
                  const isOngoing = status === 'ongoing';
                  const isFinished = status === 'finished';
                  
                  return (
                    <div key={schedule.id} className={cn(
                      "relative group transition-all",
                      isFinished && "opacity-60"
                    )}>
                      {/* Timeline Dot Indicator */}
                      <span className={cn(
                        "absolute -left-[33px] top-1.5 w-4 h-4 rounded-full border-2 border-white dark:border-gray-800 flex items-center justify-center z-10",
                        isOngoing ? "bg-emerald-500 ring-4 ring-emerald-500/20" : 
                        isFinished ? "bg-gray-400" : "bg-primary"
                      )}>
                        {isOngoing && <span className="absolute w-2 h-2 rounded-full bg-white animate-ping" />}
                      </span>

                      {/* Class Card */}
                      <div className={cn(
                        "p-4 rounded-2xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4",
                        isOngoing ? "bg-emerald-500/5 border-emerald-500/30 shadow-md shadow-emerald-500/5 ring-1 ring-emerald-500/20" : 
                        "bg-gray-50/50 dark:bg-gray-800/30 border-gray-100 dark:border-gray-700/50 hover:border-gray-200 dark:hover:border-gray-700"
                      )}>
                        <div className="flex-1 min-w-0 text-left">
                          <div className="flex flex-wrap items-center gap-2 mb-1.5">
                            {/* Time Range */}
                            <span className="text-xs font-mono font-bold text-gray-500 dark:text-gray-400 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded-md">
                              {schedule.startTime} - {schedule.endTime}
                            </span>

                            {/* Status Badge */}
                            <span className={cn(
                              "text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full border",
                              isOngoing ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20" :
                              isFinished ? "bg-gray-100 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700" :
                              "bg-primary/10 text-primary border-primary/20"
                            )}>
                              {isOngoing ? t('dashboard.ongoing') : isFinished ? t('dashboard.finished') : t('dashboard.upcoming')}
                            </span>
                          </div>

                          <h4 className="text-sm font-extrabold text-text dark:text-white truncate">
                            {cls.name}
                          </h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5 font-medium">
                            {subject?.name || t('classDetail.noSubject')}
                          </p>
                        </div>

                        {/* Action Link/Button */}
                        <div className="shrink-0 flex items-center justify-end">
                          {isFinished ? (
                            <div className="text-emerald-500 flex items-center gap-1 text-xs font-bold bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
                              <Icon name="check" className="w-3.5 h-3.5" />
                              {t('dashboard.finished')}
                            </div>
                          ) : (
                            <Link 
                              to={`/classes/${cls.id}`} 
                              className={cn(
                                "btn btn-sm text-[11px] font-bold rounded-full py-1.5 px-4 flex items-center gap-1.5 cursor-pointer",
                                isOngoing ? "btn-primary shadow-emerald-500/10" : "btn-ghost"
                              )}
                            >
                              <Icon name={isOngoing ? 'timer' : 'arrow_forward'} className="w-3.5 h-3.5" />
                              {isOngoing ? t('dashboard.openClass') : (language === 'id' ? 'Lihat' : 'View')}
                            </Link>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick Entry Access */}
        <div className="lg:col-span-7 panel flex flex-col min-h-[380px]">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Icon name="bolt" className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('dashboard.quickAccess')}</h3>
            </div>
            <div className="flex gap-4">
              <div className="flex items-center gap-1"><span className="w-2 h-2 bg-primary rounded-full"></span><span className="text-[10px] text-gray-500">{t('dashboard.main')}</span></div>
              <div className="flex items-center gap-1"><span className="w-2 h-2 bg-gray-300 rounded-full"></span><span className="text-[10px] text-gray-500">{t('dashboard.others')}</span></div>
            </div>
          </div>
          <div className="flex-1 flex items-end gap-2 sm:gap-6 px-2 sm:px-4">
            <Link to="/attendance" className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full flex gap-1 items-end h-36 group-hover:opacity-80 transition-opacity">
                <div className="bg-primary w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.attendance.main || 0, 5)}%` }}></div>
                <div className="bg-gray-200 dark:bg-gray-700 w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.attendance.other || 0, 2)}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase text-center">{t('dashboard.fillAttendance')}</span>
            </Link>
            <Link to="/grades" className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full flex gap-1 items-end h-36 group-hover:opacity-80 transition-opacity">
                <div className="bg-primary w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.grades.main || 0, 5)}%` }}></div>
                <div className="bg-gray-200 dark:bg-gray-700 w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.grades.other || 0, 2)}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase text-center">{t('dashboard.inputGrades')}</span>
            </Link>
            <Link to="/calendar" className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full flex gap-1 items-end h-36 group-hover:opacity-80 transition-opacity">
                <div className="bg-primary w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.tasks.main || 0, 5)}%` }}></div>
                <div className="bg-gray-200 dark:bg-gray-700 w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.tasks.other || 0, 2)}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase text-center">{t('dashboard.viewSchedule')}</span>
            </Link>
            <Link to="/materials" className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
              <div className="w-full flex gap-1 items-end h-36 group-hover:opacity-80 transition-opacity">
                <div className="bg-primary w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.notes.main || 0, 5)}%` }}></div>
                <div className="bg-gray-200 dark:bg-gray-700 w-full transition-all duration-500 rounded-t-xl" style={{ height: `${Math.max(stats?.bars.notes.other || 0, 2)}%` }}></div>
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase text-center">{t('sidebar.materials')}</span>
            </Link>
          </div>
        </div>

      </div>

      {/* Row 3: Teaching Hours Analytics & Quick Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pb-6">
        
        {/* Teaching Hours Analytics */}
        <div className="lg:col-span-7 panel flex flex-col min-h-[380px]">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
            <div>
              <div className="flex items-center gap-2">
                <Icon name="bar_chart" className="w-5 h-5 text-primary" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('dashboard.teachingHoursTitle')}</h3>
              </div>
              <p className="text-[11px] text-gray-500 mt-0.5 font-medium">{t('dashboard.teachingHoursDesc')}</p>
            </div>
            
            {/* Capsule period selector */}
            <div className="flex p-0.5 bg-gray-100 dark:bg-gray-800 rounded-full border border-gray-200/50 dark:border-gray-700/50 shrink-0">
              <button
                onClick={() => setChartMonths(6)}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-full font-bold transition-all duration-200 cursor-pointer",
                  chartMonths === 6
                    ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                )}
              >
                {t('dashboard.sixMonths')}
              </button>
              <button
                onClick={() => setChartMonths(12)}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-full font-bold transition-all duration-200 cursor-pointer",
                  chartMonths === 12
                    ? "bg-white dark:bg-gray-700 text-primary shadow-sm"
                    : "text-gray-500 hover:text-gray-800 dark:hover:text-gray-300"
                )}
              >
                {t('dashboard.twelveMonths')}
              </button>
            </div>
          </div>

          {/* Aggregated Hours & Sessions Summary */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                <Icon name="schedule" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-text dark:text-white leading-none">
                  {teachingStats.totalHours} <span className="text-[10px] font-bold text-gray-500 uppercase">{t('dashboard.hours')}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('dashboard.totalHours')}</span>
              </div>
            </div>

            <div className="bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-700/50 rounded-2xl p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-secondary/15 flex items-center justify-center text-secondary shrink-0">
                <Icon name="history" className="w-4 h-4" />
              </div>
              <div>
                <div className="text-lg font-black text-text dark:text-white leading-none">
                  {teachingStats.totalSessions} <span className="text-[10px] font-bold text-gray-500 uppercase">{t('dashboard.sessionsUnit')}</span>
                </div>
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{t('dashboard.totalSessions')}</span>
              </div>
            </div>
          </div>

          {/* Area Chart Container */}
          <div className="flex-1 min-h-[180px]">
            {chartReady ? (
              <Suspense fallback={<div className="h-full rounded-2xl bg-gray-100/70 dark:bg-gray-800/50 animate-pulse" />}>
                <TeachingStatsChart
                  data={teachingStats.chartData}
                  emptyLabel={t('common.empty')}
                  hoursLabel={t('dashboard.hours')}
                  titleLabel={t('dashboard.teachingHoursTitle')}
                />
              </Suspense>
            ) : (
              <div className="h-full rounded-2xl bg-gray-100/70 dark:bg-gray-800/50 animate-pulse" aria-hidden="true" />
            )}
          </div>
        </div>

        {/* Quick Notes */}
        <div className="lg:col-span-5 panel flex flex-col min-h-[380px] overflow-hidden">
          <div className="flex justify-between items-center mb-6">
            <div className="flex items-center gap-2">
              <Icon name="description" className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">{t('dashboard.recentNotes')}</h3>
            </div>
            <Link to="/materials">
              <Icon name="arrow_forward" className="w-4 h-4 text-gray-400 hover:text-primary transition-colors" />
            </Link>
          </div>
          <div className="space-y-4 flex-1 overflow-y-auto pr-1">
            {recentNotes.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm py-16 text-center">
                <div className="w-16 h-16 bg-gray-50 dark:bg-gray-700/50 rounded-full flex items-center justify-center text-gray-400 mb-4 shrink-0">
                  <Icon name="event_note" className="text-[36px]" />
                </div>
                <p className="font-semibold text-gray-500">{t('dashboard.noNotes')}</p>
              </div>
            ) : (
              recentNotes.map((note, i) => (
                <div key={note.id} className={cn(
                  "border-l-4 pl-3 py-1 text-left",
                  i === 0 ? 'border-primary' : 'border-secondary'
                )}>
                  <p className="text-sm font-semibold text-text dark:text-white">{note.title}</p>
                  <p className="text-xs text-gray-500 line-clamp-2 mt-0.5">{note.content}</p>
                </div>
              ))
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
