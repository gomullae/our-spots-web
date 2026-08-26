import { ExpenseMeta, ExpenseRecord } from '@/types';

// 일정 관리(scheduleCache.ts)와 동일한 패턴 — "오늘"(실제 현재 월) 기준 고정 범위만 localStorage에 캐싱하고,
// 매번 GET /api/expenses/meta(count+lastModified)로 실제로 바뀐 게 있는지 확인 후 사용
interface ExpenseLocalCache {
  meta: ExpenseMeta;
  months: Record<string, ExpenseRecord[]>;
}

const CACHE_KEY = 'expense-cache-v1';

export function readExpenseCache(): ExpenseLocalCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeExpenseCache(cache: ExpenseLocalCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 저장 실패(용량 초과, 프라이빗 모드 등)해도 기능엔 지장 없음 — 다음에 다시 서버에서 받아오면 됨
  }
}

// 로그아웃/토큰 만료 시 호출 — 같이 쓰는 컴퓨터에서 로그아웃 후에도 가계부 내역이 localStorage에 남아있지 않도록
export function clearExpenseCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // 무시
  }
}

export function isSameExpenseMeta(a: ExpenseMeta, b: ExpenseMeta): boolean {
  return a.count === b.count && a.lastModified === b.lastModified;
}
