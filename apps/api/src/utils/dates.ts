import type { DateRange } from "../types/domain.js";

export function startOfRange(range: DateRange | undefined, now = new Date()): Date | null {
  if (!range || range === "all") return null;

  const start = new Date(now);
  start.setHours(0, 0, 0, 0);

  if (range === "today") return start;

  if (range === "week") {
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - day + 1);
    return start;
  }

  start.setDate(1);
  return start;
}

export function startOfMonth(month: string): Date {
  const match = /^(\d{4})-(\d{2})$/.exec(month);
  if (!match) throw new Error("month must use YYYY-MM format");
  const year = Number(match[1]);
  const monthIndex = Number(match[2]) - 1;
  return new Date(Date.UTC(year, monthIndex, 1));
}

export function nextMonth(month: string): Date {
  const start = startOfMonth(month);
  return new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 1));
}

export function dateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  return date.toISOString().slice(0, 10);
}
