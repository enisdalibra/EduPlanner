import { useEffect, useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
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

type ClockSelection = "hour" | "minute";
type PickerMode = "clock" | "keyboard";

const CLOCK_SIZE = 248;
const CLOCK_CENTER = CLOCK_SIZE / 2;
const NUMBER_RADIUS = 96;
const HAND_RADIUS = 76;

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseTime(value: string): [number, number] | null {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour <= 23 && minute <= 59 ? [hour, minute] : null;
}

function formatTime(hour: number, minute: number) {
  return `${hour.toString().padStart(2, "0")}:${minute.toString().padStart(2, "0")}`;
}

function polarPosition(index: number, count: number, radius = NUMBER_RADIUS) {
  const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
  return {
    x: CLOCK_CENTER + Math.cos(angle) * radius,
    y: CLOCK_CENTER + Math.sin(angle) * radius,
  };
}

interface ClockFaceProps {
  selection: ClockSelection;
  hour: number;
  minute: number;
  onHourChange: (hour12: number) => void;
  onMinuteChange: (minute: number) => void;
  onSelectionComplete: () => void;
}

function ClockFace({ selection, hour, minute, onHourChange, onMinuteChange, onSelectionComplete }: ClockFaceProps) {
  const labels = selection === "hour"
    ? Array.from({ length: 12 }, (_, index) => index === 0 ? "12" : String(index))
    : Array.from({ length: 12 }, (_, index) => (index * 5).toString().padStart(2, "0"));
  const selectedIndex = selection === "hour" ? hour % 12 : minute / 5;
  const handIndex = selection === "hour" ? hour % 12 : minute;
  const handCount = selection === "hour" ? 12 : 60;
  const hand = polarPosition(handIndex, handCount, HAND_RADIUS);

  const updateFromPointer = (event: ReactPointerEvent<SVGSVGElement>) => {
    const bounds = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - bounds.left - bounds.width / 2;
    const y = event.clientY - bounds.top - bounds.height / 2;
    const angle = (Math.atan2(x, -y) + Math.PI * 2) % (Math.PI * 2);
    if (selection === "hour") {
      const hour12 = Math.round(angle / (Math.PI * 2) * 12) % 12;
      onHourChange(hour12 === 0 ? 12 : hour12);
    } else {
      onMinuteChange(Math.round(angle / (Math.PI * 2) * 60) % 60);
    }
  };

  return (
    <svg
      viewBox={`0 0 ${CLOCK_SIZE} ${CLOCK_SIZE}`}
      className="w-[248px] h-[248px] touch-none select-none"
      role="group"
      aria-label={selection === "hour" ? "Clock hours" : "Clock minutes"}
      onPointerDown={(event) => {
        event.currentTarget.setPointerCapture(event.pointerId);
        updateFromPointer(event);
      }}
      onPointerMove={(event) => {
        if (event.buttons === 1) updateFromPointer(event);
      }}
      onPointerUp={() => {
        if (selection === "hour") onSelectionComplete();
      }}
    >
      <circle cx={CLOCK_CENTER} cy={CLOCK_CENTER} r={CLOCK_CENTER} className="fill-slate-100 dark:fill-slate-700/70" />
      <line
        x1={CLOCK_CENTER}
        y1={CLOCK_CENTER}
        x2={hand.x}
        y2={hand.y}
        className="stroke-primary"
        strokeWidth="2.5"
      />
      <circle cx={CLOCK_CENTER} cy={CLOCK_CENTER} r="4" className="fill-primary" />
      {labels.map((label, index) => {
        const position = polarPosition(index, 12);
        const isSelected = Math.abs(selectedIndex - index) < 0.5 || Math.abs(selectedIndex - index) > 11.5;
        return (
          <g
            key={label}
            role="button"
            tabIndex={0}
            aria-label={selection === "hour" ? `${label} hour` : `${label} minutes`}
            className="cursor-pointer outline-none"
            onClick={(event) => {
              event.stopPropagation();
              if (selection === "hour") {
                onHourChange(index === 0 ? 12 : index);
                onSelectionComplete();
              }
              else onMinuteChange(index * 5);
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              if (selection === "hour") {
                onHourChange(index === 0 ? 12 : index);
                onSelectionComplete();
              }
              else onMinuteChange(index * 5);
            }}
          >
            {isSelected && <circle cx={position.x} cy={position.y} r="20" className="fill-primary" />}
            <text
              x={position.x}
              y={position.y}
              textAnchor="middle"
              dominantBaseline="central"
              className={cn(
                "text-[14px] font-semibold pointer-events-none",
                isSelected ? "fill-white" : "fill-slate-700 dark:fill-slate-100",
              )}
            >
              {label}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export function TimePicker({ value, onChange, placeholder = "--:--", disabled, className }: TimePickerProps) {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [hour, setHour] = useState(0);
  const [minute, setMinute] = useState(0);
  const [selection, setSelection] = useState<ClockSelection>("hour");
  const [mode, setMode] = useState<PickerMode>("clock");

  const hour12 = hour % 12 || 12;
  const period = hour >= 12 ? "PM" : "AM";

  useEffect(() => {
    if (!isOpen) return;
    const parsed = parseTime(value);
    const now = new Date();
    setHour(parsed?.[0] ?? now.getHours());
    setMinute(parsed?.[1] ?? now.getMinutes());
    setSelection("hour");
    setMode("clock");
  }, [isOpen, value]);

  const selectedTimeLabel = useMemo(() => formatTime(hour, minute), [hour, minute]);

  const setHour12 = (nextHour12: number) => {
    const normalized = clamp(nextHour12, 1, 12) % 12;
    setHour(normalized + (period === "PM" ? 12 : 0));
  };

  const setPeriod = (nextPeriod: "AM" | "PM") => {
    setHour((current) => nextPeriod === "PM" ? current % 12 + 12 : current % 12);
  };

  const handleConfirm = () => {
    onChange(selectedTimeLabel);
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
            variant="outline"
            disabled={disabled}
            aria-label={value || placeholder}
            className={cn(
              "w-full justify-start text-left font-normal h-10 rounded-xl px-3 border border-slate-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 relative pl-9 text-slate-800 dark:text-slate-200 cursor-pointer",
              !value && "text-slate-400 dark:text-slate-500",
              className,
            )}
          />
        }
      >
        <Icon name="schedule" className="w-4 h-4 absolute left-3 top-3 text-slate-400 dark:text-slate-500 pointer-events-none" />
        <span>{value || placeholder}</span>
      </PopoverTrigger>

      <PopoverContent
        align="center"
        sideOffset={8}
        className="w-[328px] max-w-[calc(100vw-2rem)] gap-0 rounded-[28px] border-0 bg-slate-50 dark:bg-slate-800 p-0 shadow-2xl overflow-hidden z-[110]"
      >
        <div className="px-6 pt-5 pb-4">
          <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-3">
            {mode === "clock" ? t("timePicker.selectTime") : t("timePicker.enterTime")}
          </p>

          <div className="flex items-center gap-2">
            {mode === "clock" ? (
              <>
                <button
                  type="button"
                  onClick={() => setSelection("hour")}
                  className={cn(
                    "h-[72px] min-w-0 flex-1 rounded-2xl text-[42px] leading-none font-medium tabular-nums transition-colors",
                    selection === "hour"
                      ? "bg-primary/25 text-primary dark:bg-primary/35 dark:text-white"
                      : "bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-white",
                  )}
                >
                  {hour12.toString().padStart(2, "0")}
                </button>
                <span className="text-4xl font-semibold text-slate-800 dark:text-white">:</span>
                <button
                  type="button"
                  onClick={() => setSelection("minute")}
                  className={cn(
                    "h-[72px] min-w-0 flex-1 rounded-2xl text-[42px] leading-none font-medium tabular-nums transition-colors",
                    selection === "minute"
                      ? "bg-primary/25 text-primary dark:bg-primary/35 dark:text-white"
                      : "bg-slate-200/80 text-slate-800 dark:bg-slate-700 dark:text-white",
                  )}
                >
                  {minute.toString().padStart(2, "0")}
                </button>
              </>
            ) : (
              <>
                <label className="min-w-0 flex-1">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={hour12}
                    aria-label={t("common.hour")}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setHour12(Number(event.target.value) || 1)}
                    className="h-[72px] w-full rounded-2xl border-2 border-primary bg-primary/20 text-center text-[40px] font-medium tabular-nums text-slate-900 outline-none dark:text-white"
                  />
                  <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("common.hour")}</span>
                </label>
                <span className="mb-5 text-4xl font-semibold text-slate-800 dark:text-white">:</span>
                <label className="min-w-0 flex-1">
                  <input
                    type="number"
                    min={0}
                    max={59}
                    value={minute}
                    aria-label={t("common.minute")}
                    onFocus={(event) => event.currentTarget.select()}
                    onChange={(event) => setMinute(clamp(Number(event.target.value) || 0, 0, 59))}
                    className="h-[72px] w-full rounded-2xl border-0 bg-slate-200/80 text-center text-[40px] font-medium tabular-nums text-slate-900 outline-none focus:ring-2 focus:ring-primary dark:bg-slate-700 dark:text-white"
                  />
                  <span className="mt-1 block text-xs font-medium text-slate-500 dark:text-slate-400">{t("common.minute")}</span>
                </label>
              </>
            )}

            <div className={cn("flex w-[54px] shrink-0 flex-col overflow-hidden rounded-xl border border-slate-400 dark:border-slate-500", mode === "keyboard" && "mb-5")}>
              {(["AM", "PM"] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  onClick={() => setPeriod(item)}
                  className={cn(
                    "h-9 text-sm font-bold transition-colors first:border-b first:border-slate-400 dark:first:border-slate-500",
                    period === item
                      ? "bg-primary/25 text-primary dark:bg-primary/40 dark:text-white"
                      : "bg-transparent text-slate-600 hover:bg-slate-200 dark:text-slate-300 dark:hover:bg-slate-700",
                  )}
                >
                  {item}
                </button>
              ))}
            </div>
          </div>
        </div>

        {mode === "clock" && (
          <div className="flex justify-center px-10 pb-2">
            <ClockFace
              selection={selection}
              hour={hour}
              minute={minute}
              onHourChange={setHour12}
              onMinuteChange={setMinute}
              onSelectionComplete={() => setSelection("minute")}
            />
          </div>
        )}

        <div className="flex items-center gap-1 px-4 pb-4 pt-2">
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="rounded-full text-slate-600 dark:text-slate-300"
            onClick={() => setMode((current) => current === "clock" ? "keyboard" : "clock")}
            title={mode === "clock" ? t("timePicker.switchToKeyboard") : t("timePicker.switchToClock")}
            aria-label={mode === "clock" ? t("timePicker.switchToKeyboard") : t("timePicker.switchToClock")}
          >
            <Icon name={mode === "clock" ? "keyboard" : "schedule"} className="w-5 h-5" />
          </Button>
          <Button type="button" variant="ghost" size="sm" className="ml-1 text-slate-500" onClick={handleClear}>
            {t("common.clear")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="ml-auto text-primary" onClick={() => setIsOpen(false)}>
            {t("common.cancel")}
          </Button>
          <Button type="button" variant="ghost" size="sm" className="text-primary" onClick={handleConfirm}>
            OK
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
