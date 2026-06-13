"use client";

import { useMemo, useState } from "react";
import {
  JALALI_MONTHS,
  daysInJalaliMonth,
  formatJalaliNumber,
  gregorianISOToJalaliParts,
  gregorianToJalaliParts,
  jalaliPartsToGregorianISO,
  todayJalaliParts,
  type JalaliParts,
} from "@/lib/jalali";
import { Select } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const YEAR_START = 1400;
const YEAR_END = 1415;

type JalaliDatePickerProps = {
  name: string;
  defaultValue?: string;
  required?: boolean;
  optional?: boolean;
  className?: string;
};

function clampDay(parts: JalaliParts) {
  const maxDay = daysInJalaliMonth(parts.jy, parts.jm);
  return parts.jd > maxDay ? { ...parts, jd: maxDay } : parts;
}

function resolveInitialParts(defaultValue?: string) {
  if (!defaultValue) return null;
  return gregorianISOToJalaliParts(defaultValue) ?? gregorianToJalaliParts(defaultValue) ?? todayJalaliParts();
}

export function JalaliDatePicker({ name, defaultValue = "", required, optional, className }: JalaliDatePickerProps) {
  const [parts, setParts] = useState<JalaliParts | null>(() => {
    const initial = resolveInitialParts(defaultValue);
    return initial ? clampDay(initial) : null;
  });

  const hiddenValue = useMemo(() => (parts ? jalaliPartsToGregorianISO(parts) : ""), [parts]);
  const dayOptions = useMemo(
    () => (parts ? Array.from({ length: daysInJalaliMonth(parts.jy, parts.jm) }, (_, i) => i + 1) : []),
    [parts],
  );
  const yearOptions = useMemo(() => Array.from({ length: YEAR_END - YEAR_START + 1 }, (_, i) => YEAR_START + i), []);

  if (optional && !parts) {
    return (
      <div className={cn("space-y-2", className)}>
        <input type="hidden" name={name} value="" />
        <button
          type="button"
          className="h-10 w-full rounded-xl border border-dashed border-slate-300 bg-white px-3 text-sm font-bold text-slate-600 hover:border-emerald-300 hover:text-emerald-800"
          onClick={() => setParts(todayJalaliParts())}
        >
          انتخاب تاریخ
        </button>
      </div>
    );
  }

  if (!parts) return null;

  return (
    <div className={cn("space-y-2", className)}>
      <input type="hidden" name={name} value={hiddenValue} required={required} />
      <div className="grid grid-cols-3 gap-2">
        <Select
          aria-label="روز"
          value={String(parts.jd)}
          onChange={(event) => setParts((current) => (current ? { ...current, jd: Number(event.target.value) } : current))}
        >
          {dayOptions.map((day) => (
            <option key={day} value={day}>
              {formatJalaliNumber(day)}
            </option>
          ))}
        </Select>
        <Select
          aria-label="ماه"
          value={String(parts.jm)}
          onChange={(event) =>
            setParts((current) => (current ? clampDay({ ...current, jm: Number(event.target.value) }) : current))
          }
        >
          {JALALI_MONTHS.map((month, index) => (
            <option key={month} value={index + 1}>
              {month}
            </option>
          ))}
        </Select>
        <Select
          aria-label="سال"
          value={String(parts.jy)}
          onChange={(event) =>
            setParts((current) => (current ? clampDay({ ...current, jy: Number(event.target.value) }) : current))
          }
        >
          {yearOptions.map((year) => (
            <option key={year} value={year}>
              {formatJalaliNumber(year)}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold text-slate-500">
          {formatJalaliNumber(parts.jd)} {JALALI_MONTHS[parts.jm - 1]} {formatJalaliNumber(parts.jy)}
        </p>
        {optional ? (
          <button type="button" className="text-xs font-bold text-rose-600" onClick={() => setParts(null)}>
            پاک کردن
          </button>
        ) : null}
      </div>
    </div>
  );
}
