import { parseDateString, shiftDate, toDateString } from './weightDate';

export interface WeekRange {
  start: string;
  end: string;
}

// 월요일 시작 기준 그 날짜가 속한 주의 월요일
export function getWeekStart(dateStr: string): string {
  const date = parseDateString(dateStr);
  const day = date.getDay(); // 0=일 ~ 6=토
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  return toDateString(date);
}

export function getWeekEnd(weekStartStr: string): string {
  return shiftDate(weekStartStr, 6);
}

// 이 달의 1일이 속한 주(월요일)부터 마지막 날이 속한 주(일요일)까지 — 월 경계에 걸친 주도 통째로 포함
export function getMonthWeeks(yearMonth: string): WeekRange[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const firstDay = toDateString(new Date(year, month - 1, 1));
  const lastDay = toDateString(new Date(year, month, 0));
  const lastWeekStart = getWeekStart(lastDay);

  const weeks: WeekRange[] = [];
  let cursor = getWeekStart(firstDay);
  while (cursor <= lastWeekStart) {
    weeks.push({ start: cursor, end: getWeekEnd(cursor) });
    cursor = shiftDate(cursor, 7);
  }
  return weeks;
}

export function shiftMonth(yearMonth: string, delta: number): string {
  const [year, month] = yearMonth.split('-').map(Number);
  const date = new Date(year, month - 1 + delta, 1);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

export function currentYearMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export function formatMonthLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${year}년 ${month}월`;
}

// 요약 카드 등 좁은 공간용 축약 표기 (예: "26년 8월")
export function formatMonthShortLabel(yearMonth: string): string {
  const [year, month] = yearMonth.split('-').map(Number);
  return `${String(year).slice(2)}년 ${month}월`;
}

export function formatWeekLabel(week: WeekRange): string {
  const s = parseDateString(week.start);
  const e = parseDateString(week.end);
  return `${s.getMonth() + 1}/${s.getDate()} ~ ${e.getMonth() + 1}/${e.getDate()}`;
}
