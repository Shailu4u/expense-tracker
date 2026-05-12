import { addMilliseconds, format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

export type ISODateTime = string; // ISO-8601, UTC

export function nowISO(): ISODateTime {
  return new Date().toISOString();
}

export function toISO(d: Date): ISODateTime {
  return d.toISOString();
}

export function fromISO(iso: ISODateTime): Date {
  return parseISO(iso);
}

export function monthRange(d: Date = new Date()): { start: ISODateTime; end: ISODateTime } {
  return { start: toISO(startOfMonth(d)), end: toISO(endOfMonth(d)) };
}

function cycleAnchor(year: number, monthIndex: number, monthStartDay: number): Date {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  const clampedDay = Math.min(Math.max(monthStartDay, 1), lastDay);
  return new Date(year, monthIndex, clampedDay, 0, 0, 0, 0);
}

export function budgetCycleRange(
  d: Date = new Date(),
  monthStartDay = 1,
): { start: ISODateTime; end: ISODateTime } {
  const currentMonthAnchor = cycleAnchor(d.getFullYear(), d.getMonth(), monthStartDay);
  const startDate = d >= currentMonthAnchor
    ? currentMonthAnchor
    : cycleAnchor(d.getFullYear(), d.getMonth() - 1, monthStartDay);
  const nextDate = cycleAnchor(startDate.getFullYear(), startDate.getMonth() + 1, monthStartDay);
  return {
    start: toISO(startDate),
    end: toISO(addMilliseconds(nextDate, -1)),
  };
}

export function formatDayLabel(iso: ISODateTime): string {
  return format(fromISO(iso), 'EEE, d MMM');
}

export function formatTimeLabel(iso: ISODateTime): string {
  return format(fromISO(iso), 'h:mm a');
}

export function formatMonthLabel(d: Date): string {
  return format(d, 'MMMM yyyy');
}
