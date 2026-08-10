import type { Subject } from '@/db/database';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Icon } from '@/components/ui/icon';
import { Label } from '@/components/ui/label';
import { TimePicker } from '@/components/ui/time-picker';
import { DatePicker } from '@/components/ui/date-picker';
import { useTranslation } from '@/hooks/useTranslation';
import type { ScheduleEditor } from '../hooks/useScheduleEditor';

interface ScheduleEditorDialogProps {
  editor: ScheduleEditor;
  subjects?: Subject[];
}

const selectClass = 'flex h-10 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring';

export function ScheduleEditorDialog({ editor, subjects }: ScheduleEditorDialogProps) {
  const { t } = useTranslation();
  const { draft } = editor;

  return (
    <Dialog open={editor.isOpen} onOpenChange={editor.setIsOpen}>
      <DialogContent className="sm:max-w-[480px] max-h-[90vh] overflow-y-auto w-[95vw] rounded-3xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-white">
            <Icon name="calendar_today" className="w-5 h-5 text-primary" />
            {editor.editingSchedule ? t('scheduling.editDialogTitle') : t('scheduling.addDialogTitle')}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {editor.editingSchedule ? t('scheduling.editDialogDesc') : t('scheduling.addDialogDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-1.5">
            <Label htmlFor="schedSubj" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.subjectLabel')}</Label>
            <select id="schedSubj" className={selectClass} value={draft.subjectId} onChange={(event) => editor.setField('subjectId', event.target.value)}>
              <option value="none">{t('classDetail.noSubject')}</option>
              {subjects?.map((subject) => <option key={subject.id} value={subject.id}>{subject.name}</option>)}
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schedRec" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.recurrenceLabel')}</Label>
            <select id="schedRec" className={selectClass} value={draft.recurrenceType} onChange={(event) => editor.setField('recurrenceType', event.target.value as typeof draft.recurrenceType)}>
              <option value="daily">{t('scheduling.recurrenceDaily')}</option>
              <option value="weekly">{t('scheduling.recurrenceWeekly')}</option>
              <option value="monthly">{t('scheduling.recurrenceMonthly')}</option>
            </select>
          </div>

          {draft.recurrenceType === 'weekly' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.daysOfWeekLabel')}</Label>
              <select className={selectClass} value={draft.dayOfWeek} onChange={(event) => editor.setField('dayOfWeek', Number(event.target.value))}>
                {[0, 1, 2, 3, 4, 5, 6].map((day) => <option key={day} value={day}>{editor.getDayName(day)}</option>)}
              </select>
            </div>
          )}

          {draft.recurrenceType === 'monthly' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.daysOfWeekLabel')}</Label>
              <input type="number" min={1} max={31} className={selectClass} value={draft.dayOfMonth} onChange={(event) => editor.setField('dayOfMonth', Number(event.target.value))} />
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.startTimeLabel')}</Label>
              <TimePicker value={draft.startTime} onChange={(value) => editor.setField('startTime', value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.endTimeLabel')}</Label>
              <TimePicker value={draft.endTime} onChange={(value) => editor.setField('endTime', value)} />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.startDateLabel')}</Label>
            <DatePicker value={draft.startDate} onChange={(value) => editor.setField('startDate', value)} clearable={false} />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="schedEndCrit" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.endCriteriaLabel')}</Label>
            <select id="schedEndCrit" className={selectClass} value={draft.endCriteria} onChange={(event) => editor.setField('endCriteria', event.target.value as typeof draft.endCriteria)}>
              <option value="none">{t('scheduling.endCriteriaNone')}</option>
              <option value="count">{t('scheduling.endCriteriaCount')}</option>
              <option value="date">{t('scheduling.endCriteriaDate')}</option>
            </select>
          </div>

          {draft.endCriteria === 'count' && (
            <div className="space-y-1.5">
              <Label htmlFor="schedCount" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.countLabel')}</Label>
              <input type="number" id="schedCount" min={1} className={selectClass} value={draft.recurrenceCount} onChange={(event) => editor.setField('recurrenceCount', Number(event.target.value))} />
            </div>
          )}

          {draft.endCriteria === 'date' && (
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.endDateLabel')}</Label>
              <DatePicker value={draft.endDate} onChange={(value) => editor.setField('endDate', value)} clearable={false} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="schedReminder" className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('scheduling.reminderLabel')}</Label>
            <select id="schedReminder" className={selectClass} value={draft.notificationEarlyMinutes} onChange={(event) => editor.setField('notificationEarlyMinutes', Number(event.target.value))}>
              <option value={0}>{t('scheduling.reminderOff')}</option>
              <option value={5}>{t('scheduling.reminder5Min')}</option>
              <option value={15}>{t('scheduling.reminder15Min')}</option>
              <option value={30}>{t('scheduling.reminder30Min')}</option>
              <option value={60}>{t('scheduling.reminder1Hour')}</option>
            </select>
          </div>
        </div>

        <DialogFooter className="gap-2 border-t pt-4 border-slate-100 dark:border-slate-800">
          <Button variant="outline" onClick={() => editor.setIsOpen(false)}>{t('common.cancel')}</Button>
          <Button onClick={editor.save}>{t('common.save')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
