import { ExpenseMeta, ExpenseRecord } from '@/types';
import { createLocalCache, isSameMeta } from './localCache';

// 일정 관리(scheduleCache.ts)와 동일한 패턴 — "오늘"(실제 현재 월) 기준 고정 범위만 localStorage에 캐싱하고,
// 매번 GET /api/expenses/meta(count+lastModified)로 실제로 바뀐 게 있는지 확인 후 사용
interface ExpenseLocalCache {
  meta: ExpenseMeta;
  months: Record<string, ExpenseRecord[]>;
}

const cache = createLocalCache<ExpenseLocalCache>('expense-cache-v1');

export const readExpenseCache = cache.read;
export const writeExpenseCache = cache.write;
// 로그아웃/토큰 만료 시 호출 — 같이 쓰는 컴퓨터에서 로그아웃 후에도 가계부 내역이 localStorage에 남아있지 않도록
export const clearExpenseCache = cache.clear;
export const isSameExpenseMeta = isSameMeta<ExpenseMeta>;
