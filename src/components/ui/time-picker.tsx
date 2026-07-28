import { useState, useEffect } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";

interface TimePickerProps {
  value: string; // Format "HH:MM"
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function TimePicker({ value, onChange, placeholder = "--:--", disabled, className }: TimePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  const [selectedHour, setSelectedHour] = useState("");
  const [selectedMin, setSelectedMin] = useState("");

  useEffect(() => {
    if (value && value.includes(":")) {
      const [h, m] = value.split(":");
      setSelectedHour(h || "");
      setSelectedMin(m || "");
    } else {
      setSelectedHour("");
      setSelectedMin("");
    }
  }, [value]);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, '0'));
  const minutes = Array.from({ length: 60 }, (_, i) => i.toString().padStart(2, '0'));

  const handleHourSelect = (h: string) => {
    setSelectedHour(h);
    const m = selectedMin || "00";
    setSelectedMin(m);
    onChange(`${h}:${m}`);
  };

  const handleMinSelect = (m: string) => {
    setSelectedMin(m);
    const h = selectedHour || "00";
    setSelectedHour(h);
    onChange(`${h}:${m}`);
  };

  const handleClear = () => {
    setSelectedHour("");
    setSelectedMin("");
    onChange("");
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger
        render={
          <Button
            variant="outline"
            disabled={disabled}
            className={cn(
              "w-full justify-start text-left font-normal h-10 rounded-xl px-3 border border-slate-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 relative pl-9 text-slate-800 dark:text-slate-200 cursor-pointer",
              !value && "text-slate-400 dark:text-slate-500",
              className
            )}
          />
        }
      >
        <Icon name="schedule" className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <span>{value || placeholder}</span>
      </PopoverTrigger>
      <PopoverContent className="w-44 p-0 rounded-2xl shadow-xl border border-slate-100 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-hidden z-[110]">
        <div className="flex h-48 divide-x divide-slate-100 dark:divide-slate-800 text-sm">
          <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center py-1 sticky top-0 bg-white dark:bg-gray-800 z-10">
              {t('common.hour')}
            </div>
            {hours.map(h => (
              <button
                key={h}
                onClick={() => handleHourSelect(h)}
                className={cn(
                  "w-full text-center py-1.5 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors font-medium rounded-lg text-xs cursor-pointer",
                  selectedHour === h && "bg-primary/10 text-primary dark:text-white dark:bg-primary font-bold hover:bg-primary/20"
                )}
              >
                {h}
              </button>
            ))}
          </div>
          <div className="flex-1 overflow-y-auto py-1 scrollbar-thin">
            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider text-center py-1 sticky top-0 bg-white dark:bg-gray-800 z-10">
              {t('common.minute')}
            </div>
            {minutes.map(m => (
              <button
                key={m}
                onClick={() => handleMinSelect(m)}
                className={cn(
                  "w-full text-center py-1.5 hover:bg-slate-50 dark:hover:bg-gray-700/50 transition-colors font-medium rounded-lg text-xs cursor-pointer",
                  selectedMin === m && "bg-primary/10 text-primary dark:text-white dark:bg-primary font-bold hover:bg-primary/20"
                )}
              >
                {m}
              </button>
            ))}
          </div>
        </div>
        <div className="border-t border-slate-100 dark:border-slate-800 p-1.5 flex justify-between bg-slate-50/50 dark:bg-slate-900/20">
          <Button size="sm" variant="ghost" className="text-xs h-7 px-2 cursor-pointer text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" onClick={handleClear}>
            {t('common.clear')}
          </Button>
          <Button size="sm" className="text-xs h-7 px-2 cursor-pointer" onClick={() => setIsOpen(false)}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
