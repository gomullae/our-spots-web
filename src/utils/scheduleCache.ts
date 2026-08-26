import { ScheduleEvent, ScheduleMeta } from '@/types';

// 홈 화면 바로가기(standalone 웹앱)는 앱 전환기에서 종료 후 재실행하면 완전히 새로 로드돼서
// 인메모리 캐시는 매번 초기화됨 — localStorage로 껐다 켜도 유지되게 하고, 대신 진짜로 바뀐 게 있는지는
// /api/schedules/meta(count+lastModified)로 매번 확인해서 신뢰(배우자가 다른 기기에서 수정해도 놓치지 않음)
interface ScheduleLocalCache {
  meta: ScheduleMeta;
  months: Record<string, ScheduleEvent[]>;
}

const CACHE_KEY = 'schedule-cache-v1';

export function readScheduleCache(): ScheduleLocalCache | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function writeScheduleCache(cache: ScheduleLocalCache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // 저장 실패(용량 초과, 프라이빗 모드 등)해도 기능엔 지장 없음 — 다음에 다시 서버에서 받아오면 됨
  }
}

// 로그아웃 시 호출 — 같이 쓰는 컴퓨터에서 로그아웃 후에도 일정 내용이 localStorage에 남아있지 않도록
export function clearScheduleCache() {
  try {
    localStorage.removeItem(CACHE_KEY);
  } catch {
    // 무시
  }
}

export function isSameScheduleMeta(a: ScheduleMeta, b: ScheduleMeta): boolean {
  return a.count === b.count && a.lastModified === b.lastModified;
}
