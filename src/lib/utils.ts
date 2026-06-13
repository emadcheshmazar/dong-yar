import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { ExpenseSplitMode } from "@prisma/client";
import {
  gregorianToJalaliParts,
  jalaliPartsToGregorianISO,
  parseInputDate,
} from "@/lib/jalali";

export { parseInputDate };

const SHARE_ROUND_UNIT = 5000;

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatToman(amount: number) {
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`;
}

export function formatDate(date: Date | string) {
  const { jy, jm, jd } = gregorianToJalaliParts(date);
  const month = [
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
  ][jm - 1];
  const number = new Intl.NumberFormat("fa-IR", { useGrouping: false });
  return `${number.format(jd)} ${month} ${number.format(jy)}`;
}

export function toInputDate(date: Date | string) {
  return jalaliPartsToGregorianISO(gregorianToJalaliParts(date));
}

/** سهم هر بدهکار، رند به بالا تا ۵۰۰۰ تومان */
export function calculateShare(amount: number, participantsCount: number) {
  if (participantsCount <= 0) return 0;
  if (participantsCount === 1) return amount;
  const fairShare = amount / participantsCount;
  return Math.ceil(fairShare / SHARE_ROUND_UNIT) * SHARE_ROUND_UNIT;
}

/** سهم پرداخت‌کننده (باقیمانده به نفع او) */
export function calculatePayerShare(amount: number, participantsCount: number) {
  if (participantsCount <= 0) return 0;
  if (participantsCount === 1) return amount;
  const debtShare = calculateShare(amount, participantsCount);
  return amount - debtShare * (participantsCount - 1);
}

/** مجموع دریافتی پرداخت‌کننده از بقیه */
export function calculateReceivable(amount: number, participantsCount: number) {
  if (participantsCount <= 1) return 0;
  return calculateShare(amount, participantsCount) * (participantsCount - 1);
}

export function isCustomSplit(splitMode: ExpenseSplitMode) {
  return splitMode === ExpenseSplitMode.CUSTOM;
}

export function countEnteredShares(participants: { shareAmount: number | null }[]) {
  return participants.filter((participant) => participant.shareAmount != null).length;
}

export function isCustomExpenseComplete(participants: { shareAmount: number | null }[]) {
  return participants.length > 0 && participants.every((participant) => participant.shareAmount != null);
}

export function sumParticipantShares(participants: { shareAmount: number | null }[]) {
  return participants.reduce((sum, participant) => sum + (participant.shareAmount ?? 0), 0);
}

export function formatExpenseAmount(expense: {
  splitMode: ExpenseSplitMode;
  amount: number;
  participants: { shareAmount: number | null }[];
}) {
  if (!isCustomSplit(expense.splitMode)) return formatToman(expense.amount);
  const entered = countEnteredShares(expense.participants);
  const total = expense.participants.length;
  if (isCustomExpenseComplete(expense.participants)) return formatToman(expense.amount);
  return `${formatToman(expense.amount)} (${entered}/${total} سهم)`;
}

export const splitModeLabels: Record<ExpenseSplitMode, string> = {
  [ExpenseSplitMode.EQUAL]: "مساوی",
  [ExpenseSplitMode.CUSTOM]: "سفارشی",
};
