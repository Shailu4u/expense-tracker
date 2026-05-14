import {
  addMilliseconds,
  format,
  parseISO,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfDay,
  endOfDay,
  startOfYear,
} from 'date-fns';

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

export type ReportRangeKey =
  | 'last7'
  | 'thisMonth'
  | 'lastMonth'
  | 'last3'
  | 'last6'
  | 'ytd'
  | 'last12'
  | 'all';

export interface ReportRange {
  key: ReportRangeKey;
  label: string;
  start: ISODateTime;
  end: ISODateTime;
  /** approximate number of days in the range, used for averages */
  days: number;
}

export function reportRangeFor(key: ReportRangeKey, now: Date = new Date()): ReportRange {
  const endIso = toISO(endOfDay(now));
  switch (key) {
    case 'last7': {
      const start = startOfDay(subDays(now, 6));
      return { key, label: 'Last 7 days', start: toISO(start), end: endIso, days: 7 };
    }
    case 'thisMonth': {
      const start = startOfMonth(now);
      const days = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000) + 1);
      return { key, label: 'This month', start: toISO(start), end: endIso, days };
    }
    case 'lastMonth': {
      const prev = subMonths(now, 1);
      const start = startOfMonth(prev);
      const end = endOfMonth(prev);
      return {
        key,
        label: 'Last month',
        start: toISO(start),
        end: toISO(end),
        days: Math.round((end.getTime() - start.getTime()) / 86400000) + 1,
      };
    }
    case 'last3': {
      const start = startOfDay(subMonths(now, 3));
      return { key, label: 'Last 3 months', start: toISO(start), end: endIso, days: 90 };
    }
    case 'last6': {
      const start = startOfDay(subMonths(now, 6));
      return { key, label: 'Last 6 months', start: toISO(start), end: endIso, days: 180 };
    }
    case 'ytd': {
      const start = startOfYear(now);
      const days = Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000) + 1);
      return { key, label: 'Year to date', start: toISO(start), end: endIso, days };
    }
    case 'last12': {
      const start = startOfDay(subMonths(now, 12));
      return { key, label: 'Last 12 months', start: toISO(start), end: endIso, days: 365 };
    }
    case 'all': {
      // Open-ended in practice. Use a far-past anchor so SQL range filters still apply cheaply.
      const start = new Date(2000, 0, 1);
      return {
        key,
        label: 'All time',
        start: toISO(start),
        end: endIso,
        days: Math.max(1, Math.round((now.getTime() - start.getTime()) / 86400000)),
      };
    }
  }
}

export const REPORT_RANGE_KEYS: ReportRangeKey[] = [
  'last7',
  'thisMonth',
  'lastMonth',
  'last3',
  'last6',
  'ytd',
  'last12',
  'all',
];
