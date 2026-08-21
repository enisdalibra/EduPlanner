import { useState, useMemo, lazy, Suspense, useEffect } from "react";
import { Link } from "react-router";
import { useLiveQuery } from "dexie-react-hooks";
import { format, parseISO } from "date-fns";
import { id as localeId, enUS as localeEn } from "date-fns/locale";
import { toast } from "sonner";

import { db, type TeachingSession } from "@/db/database";
import { getClasses } from "@/features/classes/api";
import { recordTeachingSession, deleteTeachingSession } from "./api";
import { calculateTeachingStats } from "@/features/dashboard/hooks/useDashboardStats";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

const TeachingStatsChart = lazy(() =>
  import("@/features/dashboard/components/TeachingStatsChart").then(
    ({ TeachingStatsChart }) => ({ default: TeachingStatsChart })
  )
);

export function TeachingLogsView() {
  const { t, language } = useTranslation();
  const currentLocale = language === "id" ? localeId : localeEn;

  // Live queries
  const teachingSessions = useLiveQuery(
    () => db.teachingSessions.reverse().sortBy("startTime"),
    []
  );
  const classes = useLiveQuery(() => getClasses(), []) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray(), []) || [];
  const notes = useLiveQuery(() => db.notes.toArray(), []) || [];
  const enrollments = useLiveQuery(() => db.classEnrollments.toArray(), []) || [];

  // Chart state
  const [chartMonths, setChartMonths] = useState<6 | 12>(6);
  const [chartReady, setChartReady] = useState(false);

  useEffect(() => {
    if (!teachingSessions) return;

    if (typeof window.requestIdleCallback === "function") {
      const idleId = window.requestIdleCallback(() => setChartReady(true), {
        timeout: 1_200,
      });
      return () => window.cancelIdleCallback(idleId);
    }

    const timeoutId = window.setTimeout(() => setChartReady(true), 250);
    return () => window.clearTimeout(timeoutId);
  }, [teachingSessions]);

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedClassFilter, setSelectedClassFilter] = useState("all");
  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState("all");

  // Manual Session Dialog
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formClassId, setFormClassId] = useState("");
  const [formSubjectId, setFormSubjectId] = useState("none");
  const [formNoteId, setFormNoteId] = useState("none");
  const [formDate, setFormDate] = useState(() => format(new Date(), "yyyy-MM-dd"));
  const [formStartTime, setFormStartTime] = useState("08:00");
  const [formEndTime, setFormEndTime] = useState("09:30");

  // Delete Confirmation Dialog
  const [sessionToDelete, setSessionToDelete] = useState<TeachingSession | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Teaching Statistics
  const teachingStats = useMemo(() => {
    if (!teachingSessions) {
      return { chartData: [], totalHours: 0, totalSessions: 0 };
    }
    return calculateTeachingStats(teachingSessions, chartMonths, language);
  }, [teachingSessions, chartMonths, language]);

  // Additional calculated metrics
  const { totalMinutes, avgDurationMinutes, thisMonthCount } = useMemo(() => {
    if (!teachingSessions || teachingSessions.length === 0) {
      return { totalMinutes: 0, avgDurationMinutes: 0, thisMonthCount: 0 };
    }

    const currentMonthKey = format(new Date(), "yyyy-MM");
    let sumMinutes = 0;
    let thisMonth = 0;

    for (const session of teachingSessions) {
      sumMinutes += session.durationMinutes;
      if (session.date.startsWith(currentMonthKey)) {
        thisMonth += 1;
      }
    }

    const avg = Math.round(sumMinutes / teachingSessions.length);
    return {
      totalMinutes: sumMinutes,
      avgDurationMinutes: avg,
      thisMonthCount: thisMonth,
    };
  }, [teachingSessions]);

  // Lookup Maps
  const classesById = useMemo(
    () => new Map(classes.map((cls) => [cls.id, cls])),
    [classes]
  );
  const subjectsById = useMemo(
    () => new Map(subjects.map((s) => [s.id, s])),
    [subjects]
  );
  const notesById = useMemo(
    () => new Map(notes.map((n) => [n.id, n])),
    [notes]
  );

  // Available subjects for the selected class in manual dialog
  const availableSubjectsForForm = useMemo(() => {
    if (!formClassId || formClassId === "none") return subjects;

    const classStudentIds = new Set(
      enrollments
        .filter((item) => item.classId === formClassId && !item.endedAt)
        .map(({ studentId }) => studentId)
    );

    return subjects.filter((subject) =>
      (subject.assignedStudents || []).some((id) => classStudentIds.has(id))
    );
  }, [subjects, formClassId, enrollments]);

  // Available materials for the selected class and subject in manual dialog
  const availableMaterialsForForm = useMemo(() => {
    return notes.filter((note) => {
      if (note.type !== "materi") return false;
      if (formClassId && formClassId !== "none") {
        const matchesClass =
          note.classId === formClassId ||
          (note.classIds && note.classIds.includes(formClassId)) ||
          (!note.classId && (!note.classIds || note.classIds.length === 0));
        if (!matchesClass) return false;
      }
      if (formSubjectId && formSubjectId !== "none") {
        if (note.subjectId && note.subjectId !== formSubjectId) return false;
      }
      return true;
    });
  }, [notes, formClassId, formSubjectId]);

  // Calculated manual duration in minutes
  const manualDurationMinutes = useMemo(() => {
    if (!formStartTime || !formEndTime) return 0;
    const [startH, startM] = formStartTime.split(":").map(Number);
    const [endH, endM] = formEndTime.split(":").map(Number);
    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;
    const diff = endMinutes - startMinutes;
    return diff > 0 ? diff : 0;
  }, [formStartTime, formEndTime]);

  // Reset form subject/note when class changes
  const handleFormClassChange = (classId: string) => {
    setFormClassId(classId);
    setFormSubjectId("none");
    setFormNoteId("none");
  };

  const openAddDialog = () => {
    setFormClassId(classes[0]?.id || "");
    setFormSubjectId("none");
    setFormNoteId("none");
    setFormDate(format(new Date(), "yyyy-MM-dd"));
    setFormStartTime("08:00");
    setFormEndTime("09:30");
    setIsAddOpen(true);
  };

  const handleSaveManualSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formClassId) {
      toast.error(t("teachingLogs.errorNoClass"));
      return;
    }

    if (manualDurationMinutes <= 0) {
      toast.error(t("teachingLogs.errorInvalidTime"));
      return;
    }

    setIsSubmitting(true);
    try {
      const [startH, startM] = formStartTime.split(":").map(Number);
      const [endH, endM] = formEndTime.split(":").map(Number);
      const sessionDateObj = parseISO(formDate);

      const startTimestamp = new Date(sessionDateObj).setHours(
        startH,
        startM,
        0,
        0
      );
      const endTimestamp = new Date(sessionDateObj).setHours(
        endH,
        endM,
        0,
        0
      );

      await recordTeachingSession({
        classId: formClassId,
        subjectId: formSubjectId === "none" ? undefined : formSubjectId,
        noteId: formNoteId === "none" ? undefined : formNoteId,
        date: formDate,
        startTime: startTimestamp,
        endTime: endTimestamp,
        durationMinutes: manualDurationMinutes,
      });

      toast.success(t("teachingLogs.successCreate"));
      setIsAddOpen(false);
    } catch (err) {
      console.error("Failed to record manual session", err);
      toast.error(t("teachingLogs.errorCreate"));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteSession = async () => {
    if (!sessionToDelete) return;
    setIsDeleting(true);
    try {
      await deleteTeachingSession(sessionToDelete.id);
      toast.success(t("teachingLogs.successDelete"));
      setSessionToDelete(null);
    } catch (err) {
      console.error("Failed to delete teaching session", err);
      toast.error(t("teachingLogs.errorDelete"));
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered detailed logs
  const filteredSessions = useMemo(() => {
    if (!teachingSessions) return [];

    return teachingSessions.filter((session) => {
      // Class filter
      if (
        selectedClassFilter !== "all" &&
        session.classId !== selectedClassFilter
      ) {
        return false;
      }

      // Subject filter
      if (selectedSubjectFilter !== "all") {
        if (
          selectedSubjectFilter === "general" &&
          session.subjectId !== undefined
        ) {
          return false;
        }
        if (
          selectedSubjectFilter !== "general" &&
          session.subjectId !== selectedSubjectFilter
        ) {
          return false;
        }
      }

      // Search query
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const clsName = classesById.get(session.classId)?.name?.toLowerCase() || "";
        const subjName = session.subjectId
          ? subjectsById.get(session.subjectId)?.name?.toLowerCase() || ""
          : "";
        const noteTitle = session.noteId
          ? notesById.get(session.noteId)?.title?.toLowerCase() || ""
          : "";
        const dateStr = session.date.toLowerCase();

        const matches =
          clsName.includes(query) ||
          subjName.includes(query) ||
          noteTitle.includes(query) ||
          dateStr.includes(query);

        if (!matches) return false;
      }

      return true;
    });
  }, [
    teachingSessions,
    selectedClassFilter,
    selectedSubjectFilter,
    searchQuery,
    classesById,
    subjectsById,
    notesById,
  ]);

  const hasActiveFilters =
    searchQuery.trim() !== "" ||
    selectedClassFilter !== "all" ||
    selectedSubjectFilter !== "all";

  const handleResetFilters = () => {
    setSearchQuery("");
    setSelectedClassFilter("all");
    setSelectedSubjectFilter("all");
  };

  // Helper formatting for session dates
  const formatSessionDate = (session: TeachingSession) => {
    try {
      if (session.startTime && Number.isFinite(session.startTime)) {
        return format(new Date(session.startTime), "EEEE, d MMM yyyy", {
          locale: currentLocale,
        });
      }
      return format(parseISO(session.date), "EEEE, d MMM yyyy", {
        locale: currentLocale,
      });
    } catch {
      return session.date;
    }
  };

  // Helper formatting for session time range
  const formatSessionTimeRange = (session: TeachingSession) => {
    try {
      if (
        session.startTime &&
        session.endTime &&
        Number.isFinite(session.startTime) &&
        Number.isFinite(session.endTime)
      ) {
        return `${format(new Date(session.startTime), "HH:mm")} - ${format(
          new Date(session.endTime),
          "HH:mm"
        )}`;
      }
      return "-";
    } catch {
      return "-";
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full mx-auto w-full max-w-5xl view-enter pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-black text-text dark:text-white tracking-tight flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
              <Icon name="history" className="w-5 h-5" />
            </div>
            {t("teachingLogs.title")}
          </h1>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 font-medium">
            {t("teachingLogs.desc")}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <Button
            onClick={openAddDialog}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-md cursor-pointer"
          >
            <Icon name="add" className="w-4 h-4" />
            {t("teachingLogs.addManualBtn")}
          </Button>
        </div>
      </div>

      {/* Row 1: Teaching Statistics Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Metric 1: Total Teaching Hours */}
        <div className="bg-gradient-to-br from-primary to-primary-hover shadow-primary-glow rounded-3xl p-5 text-white flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-white/70 uppercase tracking-wider">
                {t("teachingLogs.totalHours")}
              </h4>
              <div className="text-3xl font-black mt-1">
                {teachingStats.totalHours}{" "}
                <span className="text-sm font-bold text-white/80">
                  {t("teachingLogs.hoursUnit")}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-white/10 flex items-center justify-center text-white shrink-0">
              <Icon name="schedule" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-white/80 font-medium">
            {t("teachingLogs.totalHoursDesc")}
          </div>
        </div>

        {/* Metric 2: Total Recorded Sessions */}
        <div className="panel flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {t("teachingLogs.totalSessions")}
              </h4>
              <div className="text-3xl font-black mt-1 text-text dark:text-white">
                {teachingStats.totalSessions}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 dark:bg-sky-950/30 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Icon name="history_edu" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium">
            {t("teachingLogs.totalSessionsDesc")}
          </div>
        </div>

        {/* Metric 3: Average Session Duration */}
        <div className="panel flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {t("teachingLogs.avgDuration")}
              </h4>
              <div className="text-3xl font-black mt-1 text-text dark:text-white">
                {avgDurationMinutes}{" "}
                <span className="text-sm font-bold text-gray-500">
                  {t("teachingLogs.minutesUnit")}
                </span>
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
              <Icon name="timelapse" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium">
            {t("teachingLogs.avgDurationDesc")}
          </div>
        </div>

        {/* Metric 4: Sessions This Month */}
        <div className="panel flex flex-col justify-between min-h-[120px]">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                {t("teachingLogs.thisMonthSessions")}
              </h4>
              <div className="text-3xl font-black mt-1 text-text dark:text-white">
                {thisMonthCount}
              </div>
            </div>
            <div className="w-10 h-10 rounded-2xl bg-violet-50 dark:bg-violet-950/30 flex items-center justify-center text-violet-600 dark:text-violet-400 shrink-0">
              <Icon name="calendar_month" className="w-5 h-5" />
            </div>
          </div>
          <div className="text-[11px] text-gray-500 font-medium">
            {t("teachingLogs.thisMonthSessionsDesc")}
          </div>
        </div>
      </div>

      {/* Row 2: Teaching Hours Analytics Chart */}
      <div className="panel flex flex-col min-h-[320px] mb-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <Icon name="bar_chart" className="w-5 h-5 text-primary" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-gray-400">
                {t("teachingLogs.hoursChartTitle")}
              </h3>
            </div>
            <p className="text-[11px] text-gray-500 mt-0.5 font-medium">
              {t("teachingLogs.hoursChartDesc")}
            </p>
          </div>

          {/* Capsule Period Selector */}
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
              {t("teachingLogs.sixMonths")}
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
              {t("teachingLogs.twelveMonths")}
            </button>
          </div>
        </div>

        {/* Chart View */}
        <div className="flex-1 min-h-[220px]">
          {chartReady ? (
            <Suspense
              fallback={
                <div className="h-full min-h-[220px] rounded-2xl bg-gray-100/70 dark:bg-gray-800/50 animate-pulse" />
              }
            >
              <TeachingStatsChart
                data={teachingStats.chartData}
                emptyLabel={t("common.empty")}
                hoursLabel={t("teachingLogs.hoursUnit")}
                titleLabel={t("teachingLogs.hoursChartTitle")}
              />
            </Suspense>
          ) : (
            <div
              className="h-full min-h-[220px] rounded-2xl bg-gray-100/70 dark:bg-gray-800/50 animate-pulse"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Row 3: Detailed Teaching Logs Table & Filters */}
      <div className="panel flex flex-col space-y-4">
        {/* Filter & Search Bar */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 pb-2 border-b border-gray-100 dark:border-gray-700/50">
          <div className="relative flex-1">
            <Icon
              name="search"
              className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t("teachingLogs.filterSearchPlaceholder")}
              className="pl-9 h-9 text-xs"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Class Filter */}
            <Select
              value={selectedClassFilter}
              onValueChange={setSelectedClassFilter}
            >
              <SelectTrigger className="h-9 text-xs min-w-[140px]">
                <SelectValue placeholder={t("teachingLogs.filterAllClasses")}>
                  {(value) =>
                    value === "all"
                      ? t("teachingLogs.filterAllClasses")
                      : classesById.get(value)?.name ?? t("teachingLogs.filterAllClasses")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t("teachingLogs.filterAllClasses")}</SelectItem>
                {classes.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Subject Filter */}
            <Select
              value={selectedSubjectFilter}
              onValueChange={setSelectedSubjectFilter}
            >
              <SelectTrigger className="h-9 text-xs min-w-[150px]">
                <SelectValue placeholder={t("teachingLogs.filterAllSubjects")}>
                  {(value) =>
                    value === "all"
                      ? t("teachingLogs.filterAllSubjects")
                      : value === "general"
                      ? t("teachingLogs.generalSubject")
                      : subjectsById.get(value)?.name ??
                        t("teachingLogs.filterAllSubjects")
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  {t("teachingLogs.filterAllSubjects")}
                </SelectItem>
                <SelectItem value="general">
                  {t("teachingLogs.generalSubject")}
                </SelectItem>
                {subjects.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleResetFilters}
                className="h-9 text-xs text-gray-500 hover:text-gray-800 dark:hover:text-gray-200"
              >
                <Icon name="close" className="w-3.5 h-3.5 mr-1" />
                {t("teachingLogs.resetFilter")}
              </Button>
            )}
          </div>
        </div>

        {/* Detailed Logs List / Table */}
        {filteredSessions.length === 0 ? (
          <div className="py-16 flex flex-col items-center justify-center text-center text-gray-400">
            <div className="w-16 h-16 rounded-full bg-gray-50 dark:bg-gray-800/50 flex items-center justify-center text-gray-300 dark:text-gray-600 mb-3">
              <Icon name="history_toggle_off" className="text-[36px]" />
            </div>
            <h4 className="text-base font-bold text-gray-600 dark:text-gray-300 mb-1">
              {hasActiveFilters
                ? t("teachingLogs.noLogsFiltered")
                : t("teachingLogs.noLogsTitle")}
            </h4>
            <p className="text-xs text-gray-400 max-w-md mb-4">
              {hasActiveFilters
                ? t("teachingLogs.noLogsFiltered")
                : t("teachingLogs.noLogsDesc")}
            </p>
            {hasActiveFilters ? (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="text-xs"
              >
                {t("teachingLogs.resetFilter")}
              </Button>
            ) : (
              <Button
                onClick={openAddDialog}
                size="sm"
                className="text-xs gap-1.5"
              >
                <Icon name="add" className="w-4 h-4" />
                {t("teachingLogs.addManualBtn")}
              </Button>
            )}
          </div>
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-700/60 text-gray-400 font-bold uppercase tracking-wider text-[10px] bg-gray-50/50 dark:bg-gray-800/30">
                    <th className="py-3 px-4 rounded-l-xl">
                      {t("teachingLogs.tableHeaderDate")}
                    </th>
                    <th className="py-3 px-4">
                      {t("teachingLogs.tableHeaderTime")}
                    </th>
                    <th className="py-3 px-4">
                      {t("teachingLogs.tableHeaderClass")}
                    </th>
                    <th className="py-3 px-4">
                      {t("teachingLogs.tableHeaderSubject")}
                    </th>
                    <th className="py-3 px-4">
                      {t("teachingLogs.tableHeaderMaterial")}
                    </th>
                    <th className="py-3 px-4">
                      {t("teachingLogs.tableHeaderDuration")}
                    </th>
                    <th className="py-3 px-4 text-right rounded-r-xl">
                      {t("teachingLogs.tableHeaderActions")}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredSessions.map((session) => {
                    const cls = classesById.get(session.classId);
                    const subj = session.subjectId
                      ? subjectsById.get(session.subjectId)
                      : undefined;
                    const note = session.noteId
                      ? notesById.get(session.noteId)
                      : undefined;

                    return (
                      <tr
                        key={session.id}
                        className="hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors group"
                      >
                        {/* Tanggal */}
                        <td className="py-3.5 px-4 font-bold text-text dark:text-white whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <Icon
                              name="calendar_today"
                              className="w-3.5 h-3.5 text-primary/70"
                            />
                            <span>{formatSessionDate(session)}</span>
                          </div>
                        </td>

                        {/* Waktu Mulai - Waktu Selesai */}
                        <td className="py-3.5 px-4 whitespace-nowrap font-mono text-gray-600 dark:text-gray-300">
                          <div className="flex items-center gap-1.5">
                            <Icon
                              name="schedule"
                              className="w-3.5 h-3.5 text-gray-400"
                            />
                            <span>{formatSessionTimeRange(session)}</span>
                          </div>
                        </td>

                        {/* Kelas */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                            {cls?.name || t("teachingLogs.unassigned")}
                          </span>
                        </td>

                        {/* Mata Pelajaran */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {subj ? (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
                              {subj.name}
                            </span>
                          ) : (
                            <span className="text-gray-400 italic">
                              {t("teachingLogs.generalSubject")}
                            </span>
                          )}
                        </td>

                        {/* Materi */}
                        <td className="py-3.5 px-4 max-w-[200px] truncate">
                          {note ? (
                            <Link
                              to={`/materials/${note.id}/view`}
                              className="text-primary hover:underline font-medium inline-flex items-center gap-1"
                            >
                              <Icon name="description" className="w-3.5 h-3.5 shrink-0" />
                              <span className="truncate">{note.title}</span>
                            </Link>
                          ) : (
                            <span className="text-gray-400">
                              {t("teachingLogs.unassigned")}
                            </span>
                          )}
                        </td>

                        {/* Diajar selama (n) menit */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 font-extrabold text-[11px] border border-emerald-200/60 dark:border-emerald-800/40">
                            <Icon name="pace" className="w-3.5 h-3.5" />
                            <span>
                              {t("teachingLogs.taughtForMinutes", {
                                minutes: session.durationMinutes,
                              })}
                            </span>
                          </div>
                        </td>

                        {/* Aksi */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSessionToDelete(session)}
                            title={t("teachingLogs.deleteBtn")}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-all opacity-80 group-hover:opacity-100 cursor-pointer"
                          >
                            <Icon name="delete" className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Card List View */}
            <div className="md:hidden space-y-3">
              {filteredSessions.map((session) => {
                const cls = classesById.get(session.classId);
                const subj = session.subjectId
                  ? subjectsById.get(session.subjectId)
                  : undefined;
                const note = session.noteId
                  ? notesById.get(session.noteId)
                  : undefined;

                return (
                  <div
                    key={session.id}
                    className="p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 bg-gray-50/50 dark:bg-gray-800/30 space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1">
                        <div className="font-bold text-xs text-text dark:text-white flex items-center gap-1.5">
                          <Icon
                            name="calendar_today"
                            className="w-3.5 h-3.5 text-primary"
                          />
                          <span>{formatSessionDate(session)}</span>
                        </div>
                        <div className="text-[11px] font-mono text-gray-500 flex items-center gap-1">
                          <Icon name="schedule" className="w-3.5 h-3.5" />
                          <span>{formatSessionTimeRange(session)}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => setSessionToDelete(session)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      >
                        <Icon name="delete" className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                        {cls?.name || t("teachingLogs.unassigned")}
                      </span>

                      {subj ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 border border-sky-200/60 dark:border-sky-800/40">
                          {subj.name}
                        </span>
                      ) : (
                        <span className="text-[10px] text-gray-400 italic">
                          {t("teachingLogs.generalSubject")}
                        </span>
                      )}
                    </div>

                    {note && (
                      <div className="text-xs text-gray-600 dark:text-gray-300 bg-white dark:bg-gray-800 p-2.5 rounded-xl border border-gray-100 dark:border-gray-700/50 flex items-center gap-1.5">
                        <Icon
                          name="description"
                          className="w-3.5 h-3.5 text-primary shrink-0"
                        />
                        <span className="truncate">{note.title}</span>
                      </div>
                    )}

                    <div className="pt-1 flex items-center justify-between border-t border-gray-100 dark:border-gray-700/50">
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                        {t("teachingLogs.calculatedDuration")}
                      </span>
                      <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                        {t("teachingLogs.taughtForMinutes", {
                          minutes: session.durationMinutes,
                        })}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Dialog: Record Manual Teaching Session */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSaveManualSession}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Icon name="more_time" className="w-5 h-5 text-primary" />
                {t("teachingLogs.addManualTitle")}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Kelas (Required) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t("teachingLogs.selectClass")}{" "}
                  <span className="text-rose-500">*</span>
                </Label>
                <Select
                  value={formClassId}
                  onValueChange={handleFormClassChange}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue
                      placeholder={t("teachingLogs.selectClassPlaceholder")}
                    >
                      {(value) =>
                        classesById.get(value)?.name ??
                        t("teachingLogs.selectClassPlaceholder")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Mata Pelajaran (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t("teachingLogs.selectSubject")}
                </Label>
                <Select
                  value={formSubjectId}
                  onValueChange={setFormSubjectId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue
                      placeholder={t("teachingLogs.selectSubjectPlaceholder")}
                    >
                      {(value) =>
                        value === "none"
                          ? t("teachingLogs.generalSubject")
                          : subjectsById.get(value)?.name ??
                            t("teachingLogs.selectSubjectPlaceholder")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("teachingLogs.generalSubject")}
                    </SelectItem>
                    {availableSubjectsForForm.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Materi Ajar (Optional) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t("teachingLogs.selectMaterial")}
                </Label>
                <Select
                  value={formNoteId}
                  onValueChange={setFormNoteId}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue
                      placeholder={t("teachingLogs.selectMaterialPlaceholder")}
                    >
                      {(value) =>
                        value === "none"
                          ? t("teachingLogs.noMaterial")
                          : notesById.get(value)?.title ??
                            t("teachingLogs.selectMaterialPlaceholder")
                      }
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">
                      {t("teachingLogs.noMaterial")}
                    </SelectItem>
                    {availableMaterialsForForm.map((n) => (
                      <SelectItem key={n.id} value={n.id}>
                        {n.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Tanggal Sesi */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {t("teachingLogs.sessionDate")}
                </Label>
                <Input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="h-9 text-xs"
                  required
                />
              </div>

              {/* Waktu Mulai & Selesai */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t("teachingLogs.startTime")}
                  </Label>
                  <Input
                    type="time"
                    value={formStartTime}
                    onChange={(e) => setFormStartTime(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-gray-700 dark:text-gray-300">
                    {t("teachingLogs.endTime")}
                  </Label>
                  <Input
                    type="time"
                    value={formEndTime}
                    onChange={(e) => setFormEndTime(e.target.value)}
                    className="h-9 text-xs font-mono"
                    required
                  />
                </div>
              </div>

              {/* Calculated Duration Banner */}
              <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-xl border border-gray-200/70 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Icon name="pace" className="w-4 h-4 text-primary" />
                  <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
                    {t("teachingLogs.calculatedDuration")}:
                  </span>
                </div>
                <span
                  className={cn(
                    "text-xs font-extrabold px-2.5 py-0.5 rounded-full",
                    manualDurationMinutes > 0
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300"
                  )}
                >
                  {manualDurationMinutes > 0
                    ? t("teachingLogs.taughtForMinutes", {
                        minutes: manualDurationMinutes,
                      })
                    : t("teachingLogs.errorInvalidTime")}
                </span>
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-xs"
              >
                {t("teachingLogs.cancelBtn")}
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || manualDurationMinutes <= 0}
                className="text-xs font-bold"
              >
                {isSubmitting
                  ? t("teachingLogs.savingSession")
                  : t("teachingLogs.saveSession")}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Dialog: Delete Confirmation */}
      <Dialog
        open={sessionToDelete !== null}
        onOpenChange={(open) => {
          if (!open) setSessionToDelete(null);
        }}
      >
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <Icon name="warning" className="w-5 h-5" />
              {t("teachingLogs.deleteTitle")}
            </DialogTitle>
          </DialogHeader>

          <p className="text-xs text-gray-600 dark:text-gray-300 py-2">
            {t("teachingLogs.deleteConfirm")}
          </p>

          {sessionToDelete && (
            <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs space-y-1 font-mono text-gray-500 mb-2">
              <div>
                {t("teachingLogs.tableHeaderDate")}: {sessionToDelete.date}
              </div>
              <div>
                {t("teachingLogs.tableHeaderClass")}:{" "}
                {classesById.get(sessionToDelete.classId)?.name || "-"}
              </div>
              <div>
                {t("teachingLogs.tableHeaderDuration")}:{" "}
                {sessionToDelete.durationMinutes} {t("teachingLogs.minutesUnit")}
              </div>
            </div>
          )}

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setSessionToDelete(null)}
              className="text-xs"
            >
              {t("teachingLogs.cancelBtn")}
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={isDeleting}
              onClick={handleDeleteSession}
              className="text-xs font-bold"
            >
              {t("teachingLogs.deleteBtn")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
export default TeachingLogsView;
