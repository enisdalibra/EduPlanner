import { useState } from "react";
import type React from "react";
import { useNavigate } from "react-router";
import { 
  format, 
  isSameDay, 
  addMonths, 
  subMonths, 
  isToday,
  isSameMonth
} from "date-fns";
import { id as localeId } from "date-fns/locale";
import { useLiveQuery } from "dexie-react-hooks";

import { db, type Task } from "@/db/database";

import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { SimpleTooltip } from "@/components/ui/simple-tooltip";
import { cn } from "@/lib/utils";
import { TaskDialog } from "./TaskDialog";
import { deleteTask, toggleTaskStatus } from "./api";
import { useCalendarModel } from "./hooks/useCalendarModel";
import { useTranslation } from "@/hooks/useTranslation";
import { enUS as localeEn } from "date-fns/locale";
import { Icon } from "@/components/ui/icon";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { toast } from "sonner";

export function CalendarView() {
  const navigate = useNavigate();
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  const [completedColor, setCompletedColor] = useState<'violet' | 'emerald'>('emerald');
  const [isDayTasksOpen, setIsDayTasksOpen] = useState(false);
  
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [taskToEdit, setTaskToEdit] = useState<Task | undefined>(undefined);

  const { t, language } = useTranslation();
  const currentLocale = language === 'id' ? localeId : localeEn;

  const tasks = useLiveQuery(() => db.tasks.toArray());
  const classes = useLiveQuery(() => db.classes.toArray());
  const subjects = useLiveQuery(() => db.subjects.toArray());
  const schedules = useLiveQuery(() => db.schedules.toArray());

  const [permissionStatus, setPermissionStatus] = useState<string>(
    typeof window !== "undefined" && "Notification" in window
      ? Notification.permission
      : "denied"
  );

  const requestNotificationPermission = async () => {
    if (typeof window !== "undefined" && "Notification" in window) {
      const res = await Notification.requestPermission();
      setPermissionStatus(res);
      if (res === "granted") {
        toast.success(
          language === "id"
            ? "Notifikasi berhasil diaktifkan!"
            : "Notifications enabled successfully!"
        );
      } else if (res === "denied") {
        toast.warning(
          language === "id"
            ? "Notifikasi ditolak. Anda tidak akan menerima pengingat."
            : "Notifications denied. You won't receive reminders."
        );
      }
    }
  };

  const { weekdays, gridDays, schedulesByDateStr, selectedDateTasks } = useCalendarModel({
    currentMonth,
    selectedDate: date,
    language,
    tasks,
    classes,
    subjects,
    schedules,
  });

  const openNewTaskDialog = () => {
    setTaskToEdit(undefined);
    setIsDialogOpen(true);
  }

  const openEditTaskDialog = (task: Task) => {
    setTaskToEdit(task);
    setIsDialogOpen(true);
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Premium Notification Permission Banner */}
      {permissionStatus === 'default' && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-5 rounded-3xl bg-sky-50 dark:bg-sky-950/20 border border-sky-100 dark:border-sky-900/50 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="w-10 h-10 rounded-2xl bg-sky-500/10 flex items-center justify-center text-sky-600 dark:text-sky-400 shrink-0">
              <Icon name="notifications" className="w-5 h-5 text-sky-500" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white leading-relaxed">
                {t('scheduling.notificationBanner')}
              </h4>
            </div>
          </div>
          <Button 
            onClick={requestNotificationPermission} 
            className="w-full sm:w-auto bg-sky-500 hover:bg-sky-600 dark:bg-sky-600 dark:hover:bg-sky-700 text-white font-bold rounded-2xl shadow-md shadow-sky-500/20 h-10 px-6 shrink-0 cursor-pointer"
          >
            {t('scheduling.btnEnableNotification')}
          </Button>
        </div>
      )}

      <div className="flex justify-between items-center">
        <div>
          <h1 className="page-title">{t('calendarPage.title')}</h1>
          <p className="page-description">{t('calendarPage.desc')}</p>
        </div>
        <Button onClick={openNewTaskDialog} disabled={!date}>
          <Icon name="add" className="w-4 h-4 mr-2" />
          {t('calendarPage.btnAdd')}
        </Button>
      </div>

      <Card className="w-full bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 shadow-sm rounded-3xl p-4 sm:p-5 md:p-6 overflow-hidden">
        {/* Month Navigation Header */}
        <div className="flex items-center justify-between mb-4 sm:mb-5">
          <div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-800 dark:text-white capitalize tracking-tight">
              {format(currentMonth, "MMMM yyyy", { locale: currentLocale })}
            </h2>
            <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {language === 'id' 
                ? "Klik tanggal mana saja untuk melihat dan mengelola tugas." 
                : "Click any date to view and manage tasks for that day."
              }
            </p>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-9 h-9" 
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
            >
              <Icon name="chevron_left" className="w-4 h-4" />
            </Button>
            <Button 
              variant="outline" 
              size="icon" 
              className="rounded-full w-9 h-9" 
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
            >
              <Icon name="chevron_right" className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Weekday Headers */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5 mb-1.5 sm:mb-2">
          {weekdays.map((dayLabel, idx) => (
            <div key={idx} className="text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 py-1">
              {dayLabel}
            </div>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 md:gap-2.5">
          {gridDays.map((day, idx) => {
            const isSelected = date && isSameDay(day, date);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const dateStr = format(day, 'yyyy-MM-dd');
            
            const dayTasks = tasks?.filter(t => t.date === dateStr) || [];
            const totalTasks = dayTasks.length;
            const completedTasks = dayTasks.filter(t => t.status === 'completed').length;
            const isAllDone = totalTasks > 0 && completedTasks === totalTasks;
            const isTodayDay = isToday(day);
            const isFutureDay = day > new Date();
            
            // Get classes scheduled for this specific day
            const dayClasses = schedulesByDateStr[dateStr] || [];

            return (
              <div
                key={idx}
                onClick={() => {
                  setDate(day);
                  setIsDayTasksOpen(true);
                }}
                className={cn(
                  "relative h-14 sm:h-[72px] md:h-[80px] flex flex-col justify-between p-1.5 sm:p-2.5 rounded-xl sm:rounded-2xl border cursor-pointer select-none transition-all duration-200",
                  
                  // Selection Ring
                  isSelected && "ring-2 ring-primary ring-offset-2 dark:ring-offset-gray-900 z-10 scale-[1.02]",
                  
                  // Styles based on current/outside month and task status
                  !isCurrentMonth 
                    ? "text-slate-300 dark:text-slate-700 bg-slate-50/10 dark:bg-slate-900/10 border-transparent hover:bg-slate-50/20 dark:hover:bg-slate-900/20" 
                    : totalTasks === 0
                      ? "bg-slate-50/50 dark:bg-slate-800/20 border-slate-100 dark:border-slate-800/80 hover:bg-slate-50 dark:hover:bg-slate-800/40 text-slate-800 dark:text-slate-200"
                      : isAllDone
                        ? completedColor === 'emerald'
                          ? "bg-emerald-500 text-white border-emerald-500 hover:bg-emerald-600 shadow-md shadow-emerald-500/10"
                          : "bg-primary text-white border-primary hover:bg-primary-hover shadow-md shadow-primary/10"
                        : cn(
                            "bg-white dark:bg-gray-800 border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:shadow-sm text-slate-800 dark:text-slate-200",
                            isFutureDay && "border-dashed"
                          )
                )}
              >
                {/* Date Number and Today indicator */}
                <div className="flex justify-between items-start w-full">
                  <span className={cn(
                    "text-xs sm:text-sm md:text-base font-extrabold tracking-tight",
                    isTodayDay && !isAllDone && "text-primary dark:text-primary-foreground font-black bg-primary/10 dark:bg-primary/20 px-1.5 py-0.5 rounded-md text-[10px] sm:text-xs"
                  )}>
                    {format(day, 'd')}
                  </span>
                  
                  {isTodayDay && (
                    <span className={cn(
                      "w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full shrink-0",
                      isAllDone ? "bg-white" : "bg-primary"
                    )} />
                  )}
                </div>

                {/* Class Schedules Badges */}
                {dayClasses.length > 0 && (
                  <div className="flex flex-col gap-0.5 w-full mt-0.5 sm:mt-1 overflow-hidden">
                    {dayClasses.slice(0, 2).map(({ schedule, cls }) => (
                      <div
                        key={schedule.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/classes/${cls.id}`);
                        }}
                        className={cn(
                          "text-[8px] sm:text-[9px] md:text-[10px] font-bold px-1 py-0.5 sm:py-1 rounded transition-colors truncate w-full flex items-center justify-between z-10",
                          isAllDone
                            ? "bg-white/20 text-white hover:bg-white/30 border border-white/10"
                            : "bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 hover:bg-sky-100 dark:hover:bg-sky-900/60 border border-sky-100 dark:border-sky-900/50"
                        )}
                      >
                        <span className="truncate">{cls.name}</span>
                        <span className={cn(
                          "shrink-0 opacity-80 text-[7px] sm:text-[8px] font-normal ml-1 font-mono",
                          isAllDone ? "text-white/90" : "text-sky-500 dark:text-sky-400"
                        )}>
                          {schedule.startTime}
                        </span>
                      </div>
                    ))}
                    {dayClasses.length > 2 && (
                      <span className={cn(
                        "text-[7px] sm:text-[8px] font-bold self-end pr-1",
                        isAllDone ? "text-white/80" : "text-slate-400 dark:text-slate-500"
                      )}>
                        +{dayClasses.length - 2} {language === 'id' ? 'lainnya' : 'more'}
                      </span>
                    )}
                  </div>
                )}

                {/* Task Indicators */}
                {totalTasks > 0 && (
                  <div className="flex flex-col items-center gap-0.5 sm:gap-1 mt-auto w-full">
                    {/* Completion Fraction */}
                    <span className={cn(
                      "text-[9px] sm:text-[10px] font-bold tracking-wide",
                      isAllDone ? "text-white/90" : "text-slate-500 dark:text-slate-400"
                    )}>
                      {completedTasks}/{totalTasks}
                    </span>

                    {/* Dots Indicators */}
                    <div className="flex flex-wrap gap-0.5 sm:gap-1 justify-center max-w-full">
                      {dayTasks.map((task) => (
                        <span
                          key={task.id}
                          className={cn(
                            "w-1 h-1 sm:w-1.25 sm:h-1.25 md:w-1.5 md:h-1.5 rounded-full transition-colors duration-200",
                            task.status === 'completed'
                              ? isAllDone 
                                ? "bg-white"
                                : completedColor === 'emerald'
                                  ? "bg-emerald-500"
                                  : "bg-primary"
                              : "bg-danger"
                          )}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Legend and Completed Color Selector */}
        <div className="flex flex-col sm:flex-row justify-between items-center mt-4 sm:mt-5 pt-3 sm:pt-4 border-t border-slate-100 dark:border-slate-800 gap-3">
          {/* Completed Color Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {language === 'id' ? "Warna Selesai:" : "Completed Color:"}
            </span>
            <div className="flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
              <button
                onClick={() => setCompletedColor('violet')}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-full font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                  completedColor === 'violet'
                    ? "bg-white dark:bg-slate-700 text-primary shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-primary shrink-0" />
                Violet
              </button>
              <button
                onClick={() => setCompletedColor('emerald')}
                className={cn(
                  "text-xs px-3.5 py-1.5 rounded-full font-bold transition-all duration-200 flex items-center gap-1.5 cursor-pointer",
                  completedColor === 'emerald'
                    ? "bg-white dark:bg-slate-700 text-emerald-600 shadow-sm"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-300"
                )}
              >
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                Emerald
              </button>
            </div>
          </div>

          {/* Legend */}
          <div className="flex flex-wrap justify-center gap-5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <div className="flex items-center gap-2">
              <span className={cn(
                "w-3 h-3 rounded-full shadow-sm shrink-0",
                completedColor === 'emerald' ? "bg-emerald-500" : "bg-primary"
              )} />
              <span>{language === 'id' ? "Semua Selesai" : "All Done"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-danger shadow-sm shrink-0" />
              <span>{language === 'id' ? "Belum Selesai" : "Uncompleted"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full border border-dashed border-slate-300 dark:border-slate-600 shrink-0" />
              <span>{language === 'id' ? "Mendatang" : "Future"}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 shrink-0" />
              <span>{language === 'id' ? "Tanpa Tugas" : "No Tasks"}</span>
            </div>
          </div>
        </div>
      </Card>

      {/* Day Tasks Manager Dialog */}
      <Dialog open={isDayTasksOpen} onOpenChange={setIsDayTasksOpen}>
        <DialogContent className="sm:max-w-[500px] max-h-[85vh] overflow-y-auto w-[90vw]">
          <DialogHeader>
            <DialogTitle className="flex items-center text-lg">
              <Icon name="calendar_today" className="w-5 h-5 mr-2 text-primary" />
              {date ? format(date, "EEEE, d MMMM yyyy", { locale: currentLocale }) : t('calendarPage.selectDateText')}
            </DialogTitle>
            <DialogDescription>
              {t('calendarPage.listDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {selectedDateTasks.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-slate-400 dark:text-slate-500 text-sm py-10">
                <Icon name="event_busy" className="w-12 h-12 mb-3 text-slate-200 dark:text-slate-700" />
                {t('calendarPage.emptyState')}
              </div>
            ) : (
              <ul className="space-y-3 max-h-[50vh] overflow-y-auto pr-1">
                {selectedDateTasks.map(task => {
                  const cls = task.classId ? classes?.find(c => c.id === task.classId) : null;
                  const subj = task.subjectId ? subjects?.find(s => s.id === task.subjectId) : null;
                  
                  return (
                    <li 
                      key={task.id} 
                      className={cn(
                        "flex items-start justify-between p-4 rounded-2xl border transition-all cursor-pointer",
                        task.status === 'completed' 
                          ? "bg-gray-50/30 dark:bg-gray-900/10 border-gray-100 dark:border-gray-800 opacity-60" 
                          : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 shadow-sm hover:border-primary/30 hover:shadow-md"
                      )}
                      onClick={() => openEditTaskDialog(task)}
                    >
                      <div className="flex items-start flex-1 text-left w-full">
                        <SimpleTooltip content={task.status === 'completed' ? t('calendarPage.tooltipMarkUndone') : t('calendarPage.tooltipMarkDone')}>
                          <button 
                            className="mt-0.5 mr-3 shrink-0 cursor-pointer"
                            onClick={(e) => {
                               e.stopPropagation();
                               toggleTaskStatus(task.id);
                            }}
                          >
                            {task.status === 'completed' 
                              ? <Icon name="check_circle" className="w-5 h-5 text-emerald-500 hover:text-emerald-600" />
                              : <Icon name="radio_button_unchecked" className="w-5 h-5 text-gray-300 dark:text-gray-600 hover:text-primary" />
                            }
                          </button>
                        </SimpleTooltip>
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap gap-1 mb-1 items-center">
                            <span className={cn(
                              "text-sm font-bold block mr-2",
                              task.status === 'completed' ? "text-gray-400 line-through" : "text-text dark:text-white"
                            )}>
                              {task.title}
                            </span>
                            {cls && <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-primary/20 text-primary bg-primary/5 rounded-lg">{cls.name}</Badge>}
                            {subj && <Badge variant="outline" className="text-[10px] px-2 py-0 h-5 border-secondary/20 text-secondary bg-secondary/5 rounded-lg">{subj.name}</Badge>}
                          </div>
                          
                          {(task.startTime || task.endTime) && (
                            <div className="flex items-center text-[11px] text-gray-500 dark:text-gray-400 mb-1.5 font-medium">
                              <Icon name="schedule" className="w-3.5 h-3.5 mr-1 text-primary/60" />
                              {task.startTime || "?"} {task.endTime ? `- ${task.endTime}` : ""}
                            </div>
                          )}

                          {task.description && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 mb-2 leading-relaxed">
                              {task.description}
                            </p>
                          )}
                          
                          {task.deadline && (
                            <div className="flex items-center text-[10px] text-danger mb-2 font-bold bg-danger/5 px-2 py-0.5 w-max rounded-lg capitalize border border-danger/10">
                               <span>{t('calendarPage.deadlinePrefix')} {format(new Date(task.deadline), "d MMM yyyy, HH:mm", { locale: currentLocale }).replace(", 00:00", "")}</span>
                            </div>
                          )}

                          {(task.tags && task.tags.length > 0) && (
                            <div className="flex flex-wrap gap-1 mt-2">
                               {task.tags.map(tag => (
                                 <Badge key={tag} variant="secondary" className="text-[9px] bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-bold px-2 py-0 rounded-md">
                                   {tag}
                                 </Badge>
                               ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <SimpleTooltip content={t('calendarPage.tooltipDelete')}>
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTask(task.id);
                          }}
                          className="p-2 ml-2 text-slate-300 dark:text-slate-600 hover:text-danger hover:bg-danger/5 rounded-xl transition-colors shrink-0 cursor-pointer"
                        >
                          <Icon name="delete" className="w-4 h-4" />
                        </button>
                      </SimpleTooltip>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <DialogFooter className="flex flex-row justify-between items-center w-full gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
            <Button variant="outline" className="cursor-pointer" onClick={() => setIsDayTasksOpen(false)}>
              {t('common.close')}
            </Button>
            <Button className="cursor-pointer" onClick={() => {
              setIsDayTasksOpen(false);
              openNewTaskDialog();
            }}>
              <Icon name="add" className="w-4 h-4 mr-2" />
              {t('calendarPage.btnAdd')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TaskDialog 
        open={isDialogOpen} 
        onOpenChange={setIsDialogOpen} 
        defaultDate={date} 
        taskToEdit={taskToEdit}
      />
    </div>
  );
}

