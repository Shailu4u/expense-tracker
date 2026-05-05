import { format, parseISO, startOfMonth, endOfMonth } from 'date-fns';

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

export function formatDayLabel(iso: ISODateTime): string {
  return format(fromISO(iso), 'EEE, d MMM');
}

export function formatTimeLabel(iso: ISODateTime): string {
  return format(fromISO(iso), 'h:mm a');
}

export function formatMonthLabel(d: Date): string {
  return format(d, 'MMMM yyyy');
}
