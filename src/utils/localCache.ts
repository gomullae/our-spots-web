// 일정/가계부/체중이 각자 거의 동일하게 구현하고 있던 "count+lastModified로 검증하는 localStorage 캐시" 패턴을 통일.
// 저장되는 값의 내부 모양(전체 목록 하나 vs 달별 Record)은 도메인마다 달라서 그대로 제네릭으로 열어둠 —
// read/write/clear는 그 모양을 몰라도 되는 순수 저장소 동작이라 문제 없음
export function createLocalCache<TValue>(cacheKey: string) {
  function read(): TValue | null {
    try {
      const raw = localStorage.getItem(cacheKey);
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  }

  function write(value: TValue) {
    try {
      localStorage.setItem(cacheKey, JSON.stringify(value));
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
