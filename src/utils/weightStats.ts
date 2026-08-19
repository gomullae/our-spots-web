import { WeightRecord } from '@/types';
import { toDateString } from '@/utils/weightDate';

export type Period = '3m' | '6m' | '1y' | '2y' | '3y' | 'all';

export const PERIODS: { key: Period; label: string }[] = [
  { key: '3m', label: '3개월' },
  { key: '6m', label: '6개월' },
  { key: '1y', label: '1년' },
  { key: '2y', label: '2년' },
  { key: '3y', label: '3년' },
  { key: 'all', label: '전체' },
];

/** 이 기간들은 원본 데이터를 그대로 보여준다 (그 외 기간은 월별로 집계) */
export const RAW_PERIODS: Period[] = ['3m', '6m'];

export function cutoffDate(period: Period): string | null {
  if (period === 'all') return null;
  const cutoff = new Date();
  if (period === '3m') cutoff.setMonth(cutoff.getMonth() - 3);
  else if (period === '6m') cutoff.setMonth(cutoff.getMonth() - 6);
  else if (period === '1y') cutoff.setFullYear(cutoff.getFullYear() - 1);
  else if (period === '2y') cutoff.setFullYear(cutoff.getFullYear() - 2);
  else if (period === '3y') cutoff.setFullYear(cutoff.getFullYear() - 3);
  return toDateString(cutoff);
}

export function formatYearMonth(dateStr: string): string {
  const [y, m] = dateStr.split('-');
  return `${y}년 ${Number(m)}월`;
}

export function formatMonthTick(dateStr: string): string {
  const [, m] = dateStr.split('-');
  return `${Number(m)}월`;
}

/** 원본(일 단위) 기간의 툴팁 라벨 — "2026년 4월 13일" */
export function formatFullDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-');
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

/** 원본(일 단위) 기간의 X축 눈금 — "4/13" */
export function formatDayTick(dateStr: string): string {
  const [, m, d] = dateStr.split('-');
  return `${Number(m)}/${Number(d)}`;
}

function addMonths(monthKey: string, delta: number): string {
  const [y, m] = monthKey.split('-').map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function monthRange(startMonth: string, endMonth: string): string[] {
  const months: string[] = [];
  let cur = startMonth;
  while (cur <= endMonth) {
    months.push(cur);
    cur = addMonths(cur, 1);
  }
  return months;
}

/** 월별 원본 평균 (해당 월에 입력된 기록들만의 단순 평균) */
export function rawMonthlyAverages(records: WeightRecord[]): Map<string, number> {
  const groups = new Map<string, number[]>();
  for (const r of records) {
    const month = r.recordedDate.slice(0, 7);
    const bucket = groups.get(month) ?? [];
    bucket.push(r.weightKg);
    groups.set(month, bucket);
  }
  const result = new Map<string, number>();
  for (const [month, weights] of groups) {
    result.set(month, weights.reduce((sum, w) => sum + w, 0) / weights.length);
  }
  return result;
}

/**
 * 기록이 없는 달은 가장 가까운 달(직전 또는 다음, 거리가 같으면 직전 우선)의 값으로 채운다.
 * 한 달에 몇 번을 쟀는지와 무관하게 달마다 동일한 비중을 갖게 하기 위함.
 */
export function fillMonthlySeries(
  monthKeys: string[],
  rawAverages: Map<string, number>
): { month: string; weightKg: number }[] {
  const n = monthKeys.length;
  const values = monthKeys.map(m => rawAverages.get(m) ?? null);

  // 왼쪽(직전) 방향으로 가장 가까운 기록까지의 값/거리
  const leftValue: (number | null)[] = new Array(n).fill(null);
  const leftDist: number[] = new Array(n).fill(Infinity);
  let lastVal: number | null = null;
  let lastIdx = -Infinity;
  for (let i = 0; i < n; i++) {
    if (values[i] !== null) { lastVal = values[i]; lastIdx = i; }
    leftValue[i] = lastVal;
    leftDist[i] = lastVal === null ? Infinity : i - lastIdx;
  }

  // 오른쪽(다음) 방향으로 가장 가까운 기록까지의 값/거리
  const rightValue: (number | null)[] = new Array(n).fill(null);
  const rightDist: number[] = new Array(n).fill(Infinity);
  let nextVal: number | null = null;
  let nextIdx = Infinity;
  for (let i = n - 1; i >= 0; i--) {
    if (values[i] !== null) { nextVal = values[i]; nextIdx = i; }
    rightValue[i] = nextVal;
    rightDist[i] = nextVal === null ? Infinity : nextIdx - i;
  }

  const result: { month: string; weightKg: number }[] = [];
  for (let i = 0; i < n; i++) {
    if (values[i] !== null) {
      result.push({ month: monthKeys[i], weightKg: values[i]! });
      continue;
    }
    // 거리가 같으면(양옆 1달씩 등) 직전 달을 우선
    const filled = leftDist[i] <= rightDist[i] ? leftValue[i] : rightValue[i];
    if (filled !== null) result.push({ month: monthKeys[i], weightKg: filled });
  }
  return result;
}
