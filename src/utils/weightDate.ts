const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

export function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function parseDateString(dateStr: string): Date {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function shiftDate(dateStr: string, days: number): string {
  const date = parseDateString(dateStr);
  date.setDate(date.getDate() + days);
  return toDateString(date);
}

export function formatDisplayDate(dateStr: string): string {
  const date = parseDateString(dateStr);
  return `${date.getFullYear()}. ${date.getMonth() + 1}. ${date.getDate()} (${WEEKDAYS[date.getDay()]})`;
}

export function todayString(): string {
  return toDateString(new Date());
}
