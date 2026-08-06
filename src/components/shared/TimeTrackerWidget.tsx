import { useState, useEffect } from 'react';
import { useTimerStore } from '@/store/timerStore';
import { db } from '@/db/database';
import { useLiveQuery } from 'dexie-react-hooks';
;
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SimpleTooltip } from '@/components/ui/simple-tooltip';
import { toast } from 'sonner';
import { useTranslation } from '@/hooks/useTranslation';
import { Icon } from "@/components/ui/icon";
import { completeTeachingTimer, isClassAvailableForTimer } from '@/features/teaching/timer';

export function TimeTrackerWidget() {
  const { activeTimer, startTimer, stopTimer, clearTimer } = useTimerStore();
  const classes = useLiveQuery(() => db.classes.filter(isClassAvailableForTimer).toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];
  const { t } = useTranslation();

  const [isOpen, setIsOpen] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('none');
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (activeTimer) {
      // Update every second
      interval = setInterval(() => {
        setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
      }, 1000);
      setElapsed(Math.floor((Date.now() - activeTimer.startTime) / 1000));
    } else {
      setElapsed(0);
    }
    return () => clearInterval(interval);
  }, [activeTimer]);

  const handleStart = () => {
    if (!selectedClass) {
      toast.error(t('timeTracker.errorNoClass'));
      return;
    }
    startTimer(selectedClass, selectedSubject);
    setIsOpen(false);
    toast.success(t('timeTracker.successStart'));
  };

  const handleStop = async () => {
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

  const formatElapsed = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  if (activeTimer) {
    return (
      <div className="flex items-center bg-rose-50 border border-rose-200 rounded-md shadow-sm h-9">
        <div className="flex items-center px-3 text-rose-600 font-mono text-sm font-semibold gap-2 border-r border-rose-200">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
          {formatElapsed(elapsed)}
        </div>
        <SimpleTooltip content={t('timeTracker.tooltipStop')}>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={handleStop} 
            className="h-full px-3 text-rose-700 hover:text-rose-800 hover:bg-rose-100 rounded-l-none"
          >
            <Icon name="square" className="w-4 h-4 mr-1.5 fill-current" />
            {t('timeTracker.btnStop')}
          </Button>
        </SimpleTooltip>
      </div>
    );
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger render={<Button variant="outline" size="sm" className="h-9 gap-2 shadow-sm" />}>
        <Icon name="timer" className="w-4 h-4 text-slate-500" />
        <span className="text-sm font-medium">{t('timeTracker.btnStart')}</span>
        <Icon name="expand_more" className="w-3 h-3 text-slate-400" />
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div>
            <h4 className="font-semibold text-sm mb-1">{t('timeTracker.title')}</h4>
            <p className="text-xs text-slate-500">{t('timeTracker.desc')}</p>
          </div>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('timeTracker.selectClass')}</label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('timeTracker.selectClassPlaceholder')}>
                    {(value) => classes.find(c => c.id === value)?.name ?? t('timeTracker.selectClassPlaceholder')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-700">{t('timeTracker.selectSubject')}</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger className="h-8 text-sm">
                  <SelectValue placeholder={t('timeTracker.selectSubjectPlaceholder')}>
                    {(value) => value === 'none'
                      ? t('timeTracker.general')
                      : subjects.find(s => s.id === value)?.name ?? t('timeTracker.selectSubjectPlaceholder')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('timeTracker.general')}</SelectItem>
                  {subjects.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full h-8 flex items-center justify-center gap-2" onClick={handleStart}>
            <Icon name="play_arrow" className="w-3 h-3 fill-current" />
            {t('timeTracker.startTimer')}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
