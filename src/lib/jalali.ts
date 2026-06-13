import { jalaaliMonthLength, toGregorian, toJalaali } from "jalaali-js";

export const JALALI_MONTHS = [
  "فروردین",
  "اردیبهشت",
  "خرداد",
  "تیر",
  "مرداد",
  "شهریور",
  "مهر",
  "آبان",
  "آذر",
  "دی",
  "بهمن",
  "اسفند",
] as const;

export type JalaliParts = { jy: number; jm: number; jd: number };

export function pad2(value: number) {
  return String(value).padStart(2, "0");
}

export function gregorianToJalaliParts(date: Date | string): JalaliParts {
  const value = new Date(date);
  return toJalaali(value.getFullYear(), value.getMonth() + 1, value.getDate());
}

export function jalaliPartsToGregorianISO(parts: JalaliParts) {
  const { gy, gm, gd } = toGregorian(parts.jy, parts.jm, parts.jd);
  return `${gy}-${pad2(gm)}-${pad2(gd)}`;
}

export function gregorianISOToJalaliParts(iso: string): JalaliParts | null {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, y, m, d] = match;
  return gregorianToJalaliParts(new Date(Number(y), Number(m) - 1, Number(d)));
}

export function todayJalaliParts(): JalaliParts {
  return gregorianToJalaliParts(new Date());
}

export function daysInJalaliMonth(jy: number, jm: number) {
  return jalaaliMonthLength(jy, jm);
}

export function parseInputDate(value: string): Date {
  const jalali = value.match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/);
  if (jalali) {
    const [, jy, jm, jd] = jalali;
    const { gy, gm, gd } = toGregorian(Number(jy), Number(jm), Number(jd));
    return new Date(gy, gm - 1, gd);
  }
  const iso = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (iso) {
    const [, y, m, d] = iso;
    return new Date(Number(y), Number(m) - 1, Number(d));
  }
  return new Date(value);
}

export function formatJalaliInput(parts: JalaliParts) {
  return `${parts.jy}/${pad2(parts.jm)}/${pad2(parts.jd)}`;
}

export function formatJalaliNumber(value: number) {
  return new Intl.NumberFormat("fa-IR", { useGrouping: false }).format(value);
}
