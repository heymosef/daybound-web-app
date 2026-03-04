import React, { useState, useRef, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { usePostHog } from "@posthog/react";
import { motion, AnimatePresence } from "motion/react";
import { EASE_OUT, EASE_IN } from "../../utils/animation";
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  getDay,
  format,
  addMonths,
  subMonths,
  isBefore,
  startOfDay,
  isSameDay,
  isSameMonth,
  differenceInCalendarDays,
  addDays,
} from "date-fns";
import { toZonedTime } from "date-fns-tz";

interface CalendarDropdownProps {
  isOpen: boolean;
  onClose: (
    method:
      | "outside_click"
      | "escape"
      | "date_selected"
      | "today_button",
  ) => void;
  onSelectDate: (offset: number) => void;
  selectedDateOffset: number;
  containerRef?: React.RefObject<HTMLDivElement | null>;
  homeTimezone: string;
  now: Date;
}

const DAY_HEADERS = ["M", "T", "W", "T", "F", "S", "S"];

export const CalendarDropdown: React.FC<CalendarDropdownProps> = ({
  isOpen,
  onClose,
  onSelectDate,
  selectedDateOffset,
  containerRef,
  homeTimezone,
  now,
}) => {
  const posthog = usePostHog();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [viewingMonth, setViewingMonth] = useState(
    startOfMonth(new Date()),
  );

  const homeNow = toZonedTime(now, homeTimezone);
  const today = startOfDay(homeNow);
  const selectedDate = addDays(today, selectedDateOffset);
  const isViewingCurrentMonth = isSameMonth(viewingMonth, today);

  useEffect(() => {
    if (isOpen) {
      setViewingMonth(startOfMonth(startOfDay(toZonedTime(now, homeTimezone))));
    }
  }, [isOpen, homeTimezone, now]);

  useEffect(() => {
    if (!isOpen) return;
    const outsideRef = containerRef || wrapperRef;
    function handleClickOutside(event: MouseEvent) {
      if (
        outsideRef.current &&
        !outsideRef.current.contains(event.target as Node)
      ) {
        onClose("outside_click");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () =>
      document.removeEventListener(
        "mousedown",
        handleClickOutside,
      );
  }, [isOpen, onClose, containerRef]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose("escape");
      }
    }
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
    }
    return () =>
      document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  const monthStart = startOfMonth(viewingMonth);
  const monthEnd = endOfMonth(viewingMonth);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
  const leadingBlanks = (getDay(monthStart) + 6) % 7;

  const handleDayClick = (day: Date) => {
    if (isBefore(day, today) && !isSameDay(day, today)) return;
    const offset = differenceInCalendarDays(day, today);
    onSelectDate(offset);
    onClose("date_selected");
  };

  const handleTodayClick = () => {
    onSelectDate(0);
    onClose("today_button");
  };

  const monthsFromToday = (month: Date) =>
    (month.getFullYear() - today.getFullYear()) * 12 +
    month.getMonth() -
    today.getMonth();

  const handlePrevMonth = () => {
    const newMonth = subMonths(viewingMonth, 1);
    setViewingMonth(newMonth);
    posthog?.capture("calendar_month_navigated", {
      direction: "backward",
      months_from_today: monthsFromToday(newMonth),
    });
  };

  const handleNextMonth = () => {
    const newMonth = addMonths(viewingMonth, 1);
    setViewingMonth(newMonth);
    posthog?.capture("calendar_month_navigated", {
      direction: "forward",
      months_from_today: monthsFromToday(newMonth),
    });
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={wrapperRef}
          className="absolute top-full right-0 mt-[0.5em] bg-[var(--dt-search-dropdown)] rounded-lg drop-shadow-xl border border-[var(--dt-border)] overflow-hidden z-50 ring-1 ring-black/5 min-w-[18em]"
          style={{ transformOrigin: "top" }}
          initial={{ opacity: 0, scaleY: 0.96, y: -4 }}
          animate={{
            opacity: 1,
            scaleY: 1,
            y: 0,
            transition: { duration: 0.2, ease: EASE_OUT },
          }}
          exit={{
            opacity: 0,
            scaleY: 0.96,
            y: -4,
            transition: { duration: 0.12, ease: EASE_IN },
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-[0.75em] py-[0.5em] border-b border-[var(--dt-border)]">
            <button
              onClick={handlePrevMonth}
              disabled={isViewingCurrentMonth}
              className={`p-[0.25em] rounded transition-colors ${
                isViewingCurrentMonth
                  ? "text-[var(--dt-text-muted)] opacity-40 cursor-not-allowed"
                  : "text-[var(--dt-text-secondary)] hover:bg-[var(--dt-bg-hover)]"
              }`}
              aria-label="Previous month"
            >
              <ChevronLeft size="1em" />
            </button>
            <span className="text-[clamp(12px,0.6vw+8px,14px)] font-medium text-[var(--dt-text)]">
              {format(viewingMonth, "MMMM yyyy")}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-[0.25em] rounded text-[var(--dt-text-secondary)] hover:bg-[var(--dt-bg-hover)] transition-colors"
              aria-label="Next month"
            >
              <ChevronRight size="1em" />
            </button>
          </div>

          {/* Day grid */}
          <div className="px-[0.5em] py-[0.375em]">
            <div className="grid grid-cols-7 mb-[0.25em]">
              {DAY_HEADERS.map((d, i) => (
                <div
                  key={i}
                  className="flex items-center justify-center w-[2.5em] h-[2em] text-[clamp(10px,0.5vw+7px,12px)] font-medium text-[var(--dt-text-muted)]"
                >
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {Array.from({ length: leadingBlanks }).map((_, i) => (
                <div key={`blank-${i}`} className="w-[2.5em] h-[2.5em]" />
              ))}

              {days.map((day) => {
                const isPast =
                  isBefore(day, today) && !isSameDay(day, today);
                const isDayToday = isSameDay(day, today);
                const isSelected =
                  !isDayToday && isSameDay(day, selectedDate);

                let cellClass =
                  "flex items-center justify-center w-[2.5em] h-[2.5em] text-[clamp(12px,0.6vw+8px,14px)] transition-colors ";

                if (isPast) {
                  cellClass +=
                    "text-[var(--dt-text-muted)] opacity-40 cursor-not-allowed";
                } else if (isDayToday) {
                  cellClass +=
                    "bg-[var(--dt-accent)] dark:bg-[color-mix(in_oklch,var(--dt-accent),black_30%)] text-[var(--dt-text-inverse)] rounded font-medium";
                } else if (isSelected) {
                  cellClass +=
                    "bg-[var(--dt-control-active)] text-[var(--dt-text)] drop-shadow-sm rounded font-medium ring-1 ring-[var(--dt-accent-70)] ring-inset";
                } else {
                  cellClass +=
                    "text-[var(--dt-text-secondary)] hover:bg-[var(--dt-bg-hover)] rounded cursor-pointer";
                }

                return (
                  <button
                    key={day.toISOString()}
                    className={cellClass}
                    onClick={() => handleDayClick(day)}
                    aria-disabled={isPast}
                    aria-label={format(day, "EEEE, MMMM d, yyyy")}
                    tabIndex={isPast ? -1 : 0}
                  >
                    {format(day, "d")}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-center px-[0.75em] py-[0.5em] border-t border-[var(--dt-border)]">
            <button
              onClick={handleTodayClick}
              className="text-[var(--dt-accent)] text-[clamp(11px,0.5vw+8px,13px)] font-medium hover:underline"
            >
              Today
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
