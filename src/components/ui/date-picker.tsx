import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { enUS, id as localeId } from "date-fns/locale";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Icon } from "@/components/ui/icon";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value: string; // Format "yyyy-MM-dd"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  clearable?: boolean;
  className?: string;
}

function parseLocalDate(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return undefined;
  const year = Number(match[1]);
  const month = Number(match[2]) - 1;
  const day = Number(match[3]);
  const date = new Date(year, month, day);
  return date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
    ? date
    : undefined;
}

export function DatePicker({
  value,
  onChange,
  placeholder,
  disabled,
  clearable = true,
  className,
}: DatePickerProps) {
  const { t, language } = useTranslation();
  const locale = language === "id" ? localeId : enUS;
  const [isOpen, setIsOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>();
  const [visibleMonth, setVisibleMonth] = useState(new Date());
  const selectedDate = useMemo(() => parseLocalDate(value), [value]);
  const displayValue = selectedDate ? format(selectedDate, "PP", { locale }) : "";

  useEffect(() => {
    if (!isOpen) return;
    const initialDate = selectedDate ?? new Date();
    setDraftDate(selectedDate);
    setVisibleMonth(initialDate);
  }, [isOpen, selectedDate]);

  const handleConfirm = () => {
    if (draftDate) onChange(format(draftDate, "yyyy-MM-dd"));
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            aria-label={displayValue || placeholder || t("datePicker.selectDate")}
            className={cn(
              "relative h-10 w-full justify-start rounded-xl border border-slate-200 bg-gray-50 pl-9 pr-3 text-left font-normal text-slate-800 dark:border-gray-600 dark:bg-gray-700 dark:text-slate-200",
              !value && "text-slate-400 dark:text-slate-500",
              className,
            )}
          />
        }
      >
        <Icon name="calendar_today" className="absolute left-3 top-3 h-4 w-4 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <span className="truncate">{displayValue || placeholder || t("datePicker.selectDate")}</span>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-[328px] max-w-[calc(100vw-2rem)] gap-0 overflow-hidden rounded-[28px] border-0 bg-slate-50 p-0 shadow-2xl dark:bg-slate-800 z-[110]"
      >
        <div className="bg-primary/15 px-6 pb-5 pt-5 dark:bg-primary/25">
          <p className="mb-2 text-sm font-semibold text-slate-600 dark:text-slate-300">
            {t("datePicker.selectDate")}
          </p>
          <p className="text-[30px] font-medium leading-tight tracking-tight text-primary dark:text-white">
            {draftDate
              ? format(draftDate, "EEE, d MMM", { locale })
              : t("datePicker.noDateSelected")}
          </p>
          {draftDate && (
            <p className="mt-1 text-sm font-medium text-slate-500 dark:text-slate-300">
              {format(draftDate, "yyyy")}
            </p>
          )}
        </div>

        <Calendar
          mode="single"
          selected={draftDate}
          onSelect={setDraftDate}
          month={visibleMonth}
          onMonthChange={setVisibleMonth}
          captionLayout="dropdown"
          startMonth={new Date(2000, 0)}
          endMonth={new Date(2100, 11)}
          locale={locale}
          className="w-full rounded-none border-0 bg-transparent px-4 pb-2 pt-4 shadow-none dark:bg-transparent [--cell-size:--spacing(9)]"
        />

        <div className="flex items-center gap-1 px-4 pb-4 pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="text-slate-600 dark:text-slate-300"
            onClick={() => {
              const today = new Date();
              setDraftDate(today);
              setVisibleMonth(today);
            }}
          >
            {t("datePicker.today")}
          </Button>
          {clearable && (
            <Button type="button" variant="ghost" size="sm" className="text-slate-500" onClick={handleClear}>
              {t("common.clear")}
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" className="ml-auto text-primary" onClick={() => setIsOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-primary" disabled={!draftDate} onClick={handleConfirm}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
