import { useState, useEffect } from "react";
import type React from "react";
import { format } from "date-fns";
import { useLiveQuery } from "dexie-react-hooks";
import { db, type Task } from "@/db/database";
import { createTask, updateTask } from "./api";
import { toast } from "sonner";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/hooks/useTranslation";
import { Icon } from "@/components/ui/icon";
import { TimePicker } from "@/components/ui/time-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { INPUT_LIMITS } from "@/lib/validation";

interface TaskDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultDate?: Date;
  onSuccess?: () => void;
  taskToEdit?: Task; // Optional for Edit mode
}

export function TaskDialog({ open, onOpenChange, defaultDate, onSuccess, taskToEdit }: TaskDialogProps) {
  const { t, language } = useTranslation();

  const [title, setTitle] = useState("");
  const [date, setDate] = useState<Date | undefined>(defaultDate);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [deadlineDate, setDeadlineDate] = useState<Date | undefined>();
  const [deadlineTime, setDeadlineTime] = useState("");
  const [classId, setClassId] = useState<string>("none");
  const [subjectId, setSubjectId] = useState<string>("none");
  const [description, setDescription] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);

  const classes = useLiveQuery(() => db.classes.toArray()) || [];
  const subjects = useLiveQuery(() => db.subjects.toArray()) || [];

  const isClassMissing = classId !== "none" && classes.length > 0 && !classes.some(c => c.id === classId);
  const isSubjectMissing = subjectId !== "none" && subjects.length > 0 && !subjects.some(s => s.id === subjectId);

  useEffect(() => {
    if (open) {
      if (taskToEdit) {
        setTitle(taskToEdit.title);
        setDate(taskToEdit.date ? new Date(taskToEdit.date) : defaultDate);
        setStartTime(taskToEdit.startTime || "");
        setEndTime(taskToEdit.endTime || "");
        
        let dDate = undefined;
        let dTime = "";
        if (taskToEdit.deadline) {
           const parts = taskToEdit.deadline.split("T");
           if (parts[0]) dDate = new Date(parts[0]);
           if (parts[1]) dTime = parts[1];
        }
        setDeadlineDate(dDate);
        setDeadlineTime(dTime);
        setClassId(taskToEdit.classId || "none");
        setSubjectId(taskToEdit.subjectId || "none");
        setDescription(taskToEdit.description || "");
        setTags(taskToEdit.tags || []);
      } else {
        // Reset
        setTitle("");
        setDate(defaultDate);
        setStartTime("");
        setEndTime("");
        setDeadlineDate(undefined);
        setDeadlineTime("");
        setClassId("none");
        setSubjectId("none");
        setDescription("");
        setTags([]);
        setTagInput("");
      }
    }
  }, [open, defaultDate, taskToEdit]);

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/,$/, '');
      if (
        val &&
        !tags.includes(val) &&
        tags.length < INPUT_LIMITS.tagsPerTask
      ) {
        setTags([...tags, val]);
      }
      setTagInput("");
    }
  };

  const removeTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error(t('calendarPage.errorEmptyTitle'));
      return;
    }
    if (!date) {
      toast.error(t('calendarPage.errorEmptyDate'));
      return;
    }

    let deadlineStr = undefined;
    if (deadlineDate) {
      deadlineStr = format(deadlineDate, 'yyyy-MM-dd') + (deadlineTime ? `T${deadlineTime}` : "");
    }

    const payload = {
      title: title.trim(),
      date: format(date, 'yyyy-MM-dd'),
      startTime: startTime || undefined,
      endTime: endTime || undefined,
      deadline: deadlineStr,
      description: description.trim() || undefined,
      tags: tags.length > 0 ? tags : undefined,
      classId: classId !== "none" ? classId : undefined,
      subjectId: subjectId !== "none" ? subjectId : undefined,
      status: taskToEdit ? taskToEdit.status : 'pending' as const
    };

    try {
      if (taskToEdit) {
        await updateTask(taskToEdit.id, payload);
        toast.success(t('calendarPage.successSaveEdit'));
      } else {
        await createTask(payload);
        toast.success(t('calendarPage.successSaveNew'));
      }
      onOpenChange(false);
      if (onSuccess) onSuccess();
    } catch (err) {
      toast.error(t('calendarPage.errorSave'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto w-[90vw]">
        <DialogHeader>
          <DialogTitle>{taskToEdit ? t('calendarPage.modalEditTitle') : t('calendarPage.modalNewTitle')}</DialogTitle>
          <DialogDescription>
            {t('calendarPage.modalDesc')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="title">{t('calendarPage.labelTitle')}</Label>
            <Input 
              id="title" 
              placeholder={t('calendarPage.placeholderTitle')} 
              value={title} 
              maxLength={INPUT_LIMITS.title}
              onChange={e => setTitle(e.target.value)} 
              autoFocus
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('calendarPage.labelDate')}</Label>
              <DatePicker
                value={date ? format(date, 'yyyy-MM-dd') : ''}
                onChange={(value) => setDate(value ? new Date(`${value}T00:00:00`) : undefined)}
                placeholder={t('calendarPage.selectBtn')}
                clearable={false}
              />
            </div>
            
            <div className="space-y-2">
              <Label>{t('calendarPage.labelClass')}</Label>
              <Select value={classId} onValueChange={setClassId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder={t('calendarPage.placeholderClass')}>
                    {(value) => value === 'none'
                      ? t('calendarPage.noClass')
                      : classes.find(c => c.id === value)?.name ?? (language === 'id' ? 'Kelas tidak ditemukan' : 'Class not found')}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">{t('calendarPage.noClass')}</SelectItem>
                  {isClassMissing && (
                    <SelectItem value={classId} disabled className="text-muted-foreground italic text-xs">
                      {language === 'id' ? 'Kelas tidak ditemukan' : 'Class not found'}
                    </SelectItem>
                  )}
                  {classes.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t('calendarPage.labelSubject')}</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder={t('calendarPage.placeholderSubject')}>
                  {(value) => value === 'none'
                    ? t('calendarPage.noSubject')
                    : subjects.find(s => s.id === value)?.name ?? (language === 'id' ? 'Mata pelajaran tidak ditemukan' : 'Subject not found')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">{t('calendarPage.noSubject')}</SelectItem>
                {isSubjectMissing && (
                  <SelectItem value={subjectId} disabled className="text-muted-foreground italic text-xs">
                    {language === 'id' ? 'Mata pelajaran tidak ditemukan' : 'Subject not found'}
                  </SelectItem>
                )}
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>{t('calendarPage.labelStartTime')}</Label>
              <TimePicker 
                value={startTime} 
                onChange={setStartTime} 
              />
            </div>
            <div className="space-y-2">
              <Label>{t('calendarPage.labelEndTime')}</Label>
              <TimePicker 
                value={endTime} 
                onChange={setEndTime} 
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t pt-4 mt-2 border-slate-100">
            <div className="space-y-2">
              <Label>{t('calendarPage.labelDeadlineDate')}</Label>
              <DatePicker
                value={deadlineDate ? format(deadlineDate, 'yyyy-MM-dd') : ''}
                onChange={(value) => setDeadlineDate(value ? new Date(`${value}T00:00:00`) : undefined)}
                placeholder={t('calendarPage.selectBtn')}
              />
            </div>
            <div className="space-y-2">
              <Label>{t('calendarPage.labelDeadlineTime')}</Label>
              <TimePicker 
                value={deadlineTime} 
                onChange={setDeadlineTime} 
                disabled={!deadlineDate}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="desc">{t('calendarPage.labelDesc')}</Label>
            <Textarea 
              id="desc" 
              placeholder={t('calendarPage.placeholderDesc')} 
              value={description}
              maxLength={INPUT_LIMITS.description}
              onChange={e => setDescription(e.target.value)}
              className="resize-none h-20"
            />
          </div>

          <div className="space-y-2">
            <Label>{t('calendarPage.labelTags')}</Label>
            <div className="flex items-center border rounded-md px-3 py-1 bg-white focus-within:ring-1 focus-within:ring-ring flex-wrap gap-2">
              <Icon name="sell" className="w-4 h-4 text-slate-400 shrink-0" />
              {tags.map(tag => (
                <Badge key={tag} variant="secondary" className="flex items-center gap-1 hover:bg-slate-200">
                  {tag}
                  <button onClick={() => removeTag(tag)} className="text-slate-500 hover:text-slate-800 ml-1 rounded-full p-0.5">
                    &times;
                  </button>
                </Badge>
              ))}
              <input 
                type="text" 
                value={tagInput}
                maxLength={INPUT_LIMITS.tag}
                disabled={tags.length >= INPUT_LIMITS.tagsPerTask}
                onChange={e => setTagInput(e.target.value)}
                onKeyDown={handleAddTag}
                placeholder={tags.length === 0 ? t('calendarPage.placeholderTags') : ""}
                className="flex-1 bg-transparent min-w-[100px] outline-none text-sm py-1"
              />
            </div>
            <p className="text-[10px] text-slate-500">{t('calendarPage.tagHelper')}</p>
          </div>

        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{t('calendarPage.btnCancel')}</Button>
          <Button onClick={handleSave}>{t('calendarPage.btnSave')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
