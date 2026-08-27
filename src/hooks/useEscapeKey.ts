import { useEffect, useRef } from 'react';

// Esc로 모달/팝업 닫기 — 여러 개가 겹쳐 열려있어도(예: 일정 상세보기 위에 뜬 사진 크게보기)
// 가장 최근에 열린(=가장 위에 있는) 것만 닫히도록 스택으로 관리. window에 리스너를 하나만 등록해두고
// 실제 처리는 스택 맨 위 콜백에만 위임 — 컴포넌트마다 각자 리스너를 다는 것보다 안전함
const stack: (() => void)[] = [];
let listenerAttached = false;

function ensureListener() {
  if (listenerAttached) return;
  listenerAttached = true;
  window.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    stack[stack.length - 1]?.();
  });
}

export function useEscapeKey(onEscape: () => void, enabled = true) {
  // onEscape가 매 렌더마다 새로 만들어지는 함수여도(흔한 인라인 콜백) 매번 스택을 다시 쌓지 않도록 ref로 고정 —
  // 렌더 중 ref를 직접 mutate하지 않고 effect 안에서 갱신(deps 없이 매 렌더 후 실행)
  const callbackRef = useRef(onEscape);
  useEffect(() => {
    callbackRef.current = onEscape;
  });

  useEffect(() => {
    if (!enabled) return;
    ensureListener();
    const entry = () => callbackRef.current();
    stack.push(entry);
    return () => {
      const index = stack.lastIndexOf(entry);
      if (index !== -1) stack.splice(index, 1);
    };
  }, [enabled]);
}
