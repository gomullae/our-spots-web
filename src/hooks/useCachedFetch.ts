import { useCallback, useEffect, useRef, useState } from 'react';
import { useLatestRequestGuard } from './useLatestRequestGuard';

interface CacheEntry<TData, TMeta> {
  meta: TMeta;
  data: TData;
}

interface UseCachedFetchOptions<TData, TMeta> {
  // false면 refetch를 호출해도 아무 일도 안 함 (예: 로그인 안 된 상태) — 기본 true
  enabled?: boolean;
  initialData: TData;
  readCache: () => CacheEntry<TData, TMeta> | null;
  writeCache: (entry: CacheEntry<TData, TMeta>) => void;
  isSameMeta: (a: TMeta, b: TMeta) => boolean;
  fetchMeta: () => Promise<TMeta>;
  fetchData: () => Promise<TData>;
  onError: (message: string) => void;
}

// 체중/가계 현황처럼 "전체 데이터를 한 번에 localStorage에 캐싱 + count/lastModified(meta)로 유효성 검증"
// 패턴을 공유하는 페이지들의 fetchAll(마운트 시 조회 + visibilitychange 재검증 + CRUD 성공 후 재조회)을
// 하나로 통일 — HouseholdBudgetTab/admin/weight 페이지에 거의 동일하게 복붙돼 있던 코드를 대체.
// (일정 관리는 캐시가 달별로 나뉘고 조회 범위 자체가 움직이는 등 모양이 달라 별도 유지)
//
// opts를 매 렌더 최신값으로 ref에 담아두고 refetch는 beginRequest에만 의존하는 안정된 콜백으로 유지 —
// 호출부가 넘기는 readCache/fetchData 등이 렌더마다 새로 생성되는 인라인 함수여도 refetch가 매번
// 재생성되며 effect가 다시 도는 걸 막기 위함(항상 ref를 통해 최신 함수를 사용하므로 stale closure 문제도 없음)
export function useCachedFetch<TData, TMeta extends { count: number; lastModified: string | null }>(
  opts: UseCachedFetchOptions<TData, TMeta>
) {
  const optsRef = useRef(opts);
  // 렌더 도중이 아니라 커밋 이후(effect)에 갱신 — 이 hook의 다른 effect(마운트 조회/visibilitychange)보다
  // 먼저 선언돼 있어야 그 effect들이 실행되는 시점엔 이미 최신 opts로 갱신된 뒤임(같은 커밋 내 effect는
  // 선언 순서대로 실행됨)
  useEffect(() => {
    optsRef.current = opts;
  });

  const [data, setData] = useState<TData>(() => opts.readCache()?.data ?? opts.initialData);
  const [isLoading, setIsLoading] = useState(false);
  const beginRequest = useLatestRequestGuard();

  const refetch = useCallback(() => {
    const { enabled = true, readCache, writeCache, isSameMeta, fetchMeta, fetchData, onError } = optsRef.current;
    if (!enabled) return;
    const isStale = beginRequest();

    const cache = readCache();
    // 캐시가 없는 진짜 첫 조회일 때만 로딩 표시 — 캐시가 있으면 이미 화면엔 그 데이터가 보이고 있어서 백그라운드에서 조용히 검증만 함
    setIsLoading(!cache);

    const fetchFromServer = (meta: TMeta | null) => {
      fetchData()
        .then((result) => {
          if (isStale()) return;
          setData(result);
          if (meta) writeCache({ meta, data: result });
        })
        // 배경 재조회 실패로 화면 전체를 비우지 않고(캐시 데이터는 계속 표시) 토스트로만 알림
        .catch((err) => { if (!isStale()) onError(err instanceof Error ? err.message : '불러오기에 실패했습니다'); })
        .finally(() => { if (!isStale()) setIsLoading(false); });
    };

    fetchMeta()
      .then((meta) => {
        if (isStale()) return;
        const cacheValid = !!cache && isSameMeta(cache.meta, meta);
        // 캐시가 이미 정확한 걸로 확인됨 — 화면엔 이미 그 데이터가 보이고 있으므로 더 할 일 없음
        if (cacheValid) { setIsLoading(false); return; }
        fetchFromServer(meta);
      })
      // meta 확인 자체가 실패하면(오프라인 등) 캐시 검증을 포기하고 그냥 서버에서 직접 불러옴
      .catch(() => { if (!isStale()) fetchFromServer(null); });
  }, [beginRequest]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  // 모바일에서 홈 화면 앱을 백그라운드로 보냈다가 다시 보는 것만으로는(완전 종료 후 재실행과 달리)
  // 컴포넌트가 다시 마운트되지 않아 위 useEffect가 재실행되지 않음 — 그래서 화면이 다시 보이는 시점마다
  // (visibilitychange) 별도로 meta를 재검증
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') refetch();
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [refetch]);

  return { data, setData, isLoading, refetch };
}
