import { getWeekEnd, getWeekStart } from './expenseDate';
import { parseDateString, shiftDate, toDateString } from './weightDate';

// 월요일 시작(Mon~Sun) 달력 그리드 — 이 달 1일이 속한 주의 월요일부터 마지막 날이 속한 주의 일요일까지, 앞뒤 달 날짜도 채워서 항상 7의 배수 개수로 반환
// (가계부 달력 탭과 동일한 월요일 시작 기준이라 주 경계 계산도 그쪽의 getWeekStart/getWeekEnd를 그대로 재사용)
export function getCalendarGridDays(yearMonth: string): string[] {
  const [year, month] = yearMonth.split('-').map(Number);
  const firstDay = toDateString(new Date(year, month - 1, 1));
  const lastDay = toDateString(new Date(year, month, 0));

  const gridStart = getWeekStart(firstDay);
  let gridEnd = getWeekEnd(getWeekStart(lastDay));

  const days: string[] = [];
  let cursor = gridStart;
  while (cursor <= gridEnd) {
    days.push(cursor);
    cursor = shiftDate(cursor, 1);
  }

  // 달력 그리드가 필요로 하는 행 수는 최대 6주(42일) — 이미 6주가 아니면(5주 이하)
  // 다음 달 1주를 통째로 더 보여줌. 이미 6주(상한)면 추가하지 않아서, 마지막 줄에 다음달 날짜가
  // 이미 몇 개 섞여 있는 달(예: 2026년 8월)에도 7주째가 생기지 않고 항상 최대 6주로 유지됨
  if (days.length < 42) {
    for (let i = 0; i < 7; i++) {
      gridEnd = shiftDate(gridEnd, 1);
      days.push(gridEnd);
    }
  }

  return days;
}

export function chunkIntoWeeks(days: string[]): string[][] {
  const weeks: string[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }
  return weeks;
}

export interface LaneAssigned<T> {
  item: T;
  lane: number;
}

// 겹치는 구간(여러 날에 걸친 일정)끼리 줄(lane)을 나눠 배정 — 달 전체에서 한 번만 계산해서
// 같은 일정이 주가 바뀌어도 같은 줄에 그려지도록 함(구글 캘린더/TimeTree와 동일한 방식의 interval partitioning)
export function assignLanes<T>(items: T[], getStart: (item: T) => string, getEnd: (item: T) => string): LaneAssigned<T>[] {
  const sorted = [...items].sort((a, b) => {
    const startCmp = getStart(a).localeCompare(getStart(b));
    if (startCmp !== 0) return startCmp;
    return getEnd(b).localeCompare(getEnd(a));
  });

  const laneEndDates: string[] = [];
  const result: LaneAssigned<T>[] = [];

  for (const item of sorted) {
    const start = getStart(item);
    const end = getEnd(item);
    let lane = laneEndDates.findIndex((endDate) => endDate < start);
    if (lane === -1) {
      lane = laneEndDates.length;
      laneEndDates.push(end);
    } else {
      laneEndDates[lane] = end;
    }
    result.push({ item, lane });
  }
  return result;
}

// ISO datetime("2026-08-10T10:00:00") → "오전 10:00" / "오후 8:00"
export function formatEventTime(isoDateTime: string): string {
  const hour = Number(isoDateTime.slice(11, 13));
  const minute = isoDateTime.slice(14, 16);
  const period = hour < 12 ? '오전' : '오후';
  const displayHour = hour % 12 === 0 ? 12 : hour % 12;
  return `${period} ${displayHour}:${minute}`;
}

const WEEKDAY_NAMES = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일'];

// "2026-08-15" → "8월 15일 토요일"
export function formatDayHeader(dateStr: string): string {
  const date = parseDateString(dateStr);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 ${WEEKDAY_NAMES[date.getDay()]}`;
}
