/**
 * Date and Time utilities for Magic Mug POS.
 * Accurately parses UTC and SQLite timestamps and formats them in local cafe time.
 */

export function parseBackendDate(dateInput: string | Date | undefined | null): Date | null {
  if (!dateInput) return null;
  if (dateInput instanceof Date) return isNaN(dateInput.getTime()) ? null : dateInput;

  let s = String(dateInput).trim();
  if (!s) return null;

  // If date is pure YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y, m - 1, d);
  }

  // If the backend sent SQLite or ISO string without timezone (e.g. "2026-10-04 18:26:06" or "2026-10-04T18:26:06")
  // treat it as UTC since all backend database timestamps are recorded in UTC
  if (!s.endsWith('Z') && !s.includes('+') && !s.slice(10).includes('-')) {
    s = s.replace(' ', 'T') + 'Z';
  }

  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

export function formatDateTime(
  dateInput: string | Date | undefined | null,
  options?: { includeSeconds?: boolean; includeDay?: boolean }
): string {
  const d = parseBackendDate(dateInput);
  if (!d) return '-';

  const includeSeconds = options?.includeSeconds ?? true;
  const includeDay = options?.includeDay ?? false;

  const datePart = d.toLocaleDateString(undefined, {
    weekday: includeDay ? 'short' : undefined,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  const timePart = d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: includeSeconds ? '2-digit' : undefined,
    hour12: true,
  });

  return `${datePart}, ${timePart}`;
}

export function formatDateOnly(dateInput: string | Date | undefined | null): string {
  const d = parseBackendDate(dateInput);
  if (!d) return '-';

  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function formatTimeOnly(dateInput: string | Date | undefined | null): string {
  const d = parseBackendDate(dateInput);
  if (!d) return '-';

  return d.toLocaleTimeString(undefined, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  });
}
