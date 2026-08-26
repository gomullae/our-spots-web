import { useCallback, useRef } from 'react';

// 여러 비동기 요청이 겹칠 때 "가장 최근에 시작된 요청"의 응답만 유효하다고 판단하는 가드.
// 월 문자열 같은 값 기준 비교와 달리, 같은 대상(예: 같은 달)을 향한 요청끼리 순서가 뒤바뀌어 도착해도
// (예: 초기 조회 도중 저장 후 재조회가 먼저 끝나는 경우) 정확히 처리됨 — 매 호출마다 ID를 새로 발급하기 때문
// (일정/가계부 달력 탭이 공유)
export function useLatestRequestGuard() {
  const latestIdRef = useRef(0);

  const beginRequest = useCallback(() => {
    const id = ++latestIdRef.current;
    return () => latestIdRef.current !== id;
  }, []);

  return beginRequest;
}
