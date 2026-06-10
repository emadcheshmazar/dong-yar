import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatToman(amount: number) {
  return `${new Intl.NumberFormat("fa-IR").format(amount)} تومان`;
}

export function formatDate(date: Date | string) {
  return new Intl.DateTimeFormat("fa-IR", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function toInputDate(date: Date | string) {
  return new Date(date).toISOString().slice(0, 10);
}

export function calculateShare(amount: number, participantsCount: number) {
  if (participantsCount <= 0) return 0;
  return Math.floor(amount / participantsCount);
}
