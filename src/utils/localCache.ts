// 일정/가계부/체중이 각자 거의 동일하게 구현하고 있던 "count+lastModified로 검증하는 localStorage 캐시" 패턴을 통일.
// 저장되는 값의 내부 모양(전체 목록 하나 vs 달별 Record)은 도메인마다 달라서 그대로 제네릭으로 열어둠 —
// read/write/clear는 그 모양을 몰라도 되는 순수 저장소 동작이라 문제 없음

// meta(count+lastModified) 비교가 실제로 바뀐 걸 정확히 잡아내려면 "그 변경이 lastModified에 반영된다"는
// 전제가 항상 지켜져야 함 — 스케줄 메모 캐싱 버그(메모/사진처럼 별도 테이블에 저장되는 하위 데이터를 추가해도
// 부모 엔티티의 updatedAt을 갱신하는 걸 깜빡하면, meta가 그대로라 캐시가 영영 무효화 안 됨)처럼 이 전제가
// 깨질 수 있다는 게 실사용 중 확인됨. meta 비교를 기본 메커니즘으로 계속 쓰되(대부분의 경우 즉시 정확하게
// 무효화됨), 이런 누락이 있어도 무한정 낡은 채로 남지 않도록 캐시 나이가 이 기간을 넘으면 meta 비교와
// 무관하게 무조건 만료 처리하는 최후 방어선(backstop)을 추가 — 값 자체를 감싸서 저장 시각을 같이 기록
const DEFAULT_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000; // 3일

interface CacheEnvelope<TValue> {
  value: TValue;
  cachedAt: number;
}

export function createLocalCache<TValue>(cacheKey: string, maxAgeMs: number = DEFAULT_MAX_AGE_MS) {
  function read(): TValue | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as Partial<CacheEnvelope<TValue>>;
      // cachedAt이 없는 값은 TTL 도입 이전(구 버전)에 저장된 캐시 — 그대로 신뢰하지 않고 캐시 없음과 동일하게 처리
      if (typeof parsed.cachedAt !== 'number' || parsed.value === undefined) return null;
      if (Date.now() - parsed.cachedAt > maxAgeMs) return null;
      return parsed.value;
    } catch {
      return null;
    }
  }

  function write(value: TValue) {
    try {
      const envelope: CacheEnvelope<TValue> = { value, cachedAt: Date.now() };
      localStorage.setItem(cacheKey, JSON.stringify(envelope));
    } catch {
      // 저장 실패(용량 초과, 프라이빗 모드 등)해도 기능엔 지장 없음 — 다음에 다시 서버에서 받아오면 됨
    }
  }

  function clear() {
    try {
      localStorage.removeItem(cacheKey);
    } catch {
      // 무시
    }
  }

  return { read, write, clear };
}

// count(등록/삭제 감지) + lastModified(수정 감지) 조합으로 "로컬 캐시를 그대로 써도 되는지" 판단하는 공통 규칙
export function isSameMeta<TMeta extends { count: number; lastModified: string | null }>(a: TMeta, b: TMeta): boolean {
  return a.count === b.count && a.lastModified === b.lastModified;
}
