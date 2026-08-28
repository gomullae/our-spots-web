import { useRef } from 'react';

// 이 거리 이상 아래로 쓸어내려야 닫힘으로 인정 — 위로 스크롤하려는 의도와 헷갈리지 않도록
const SWIPE_DOWN_THRESHOLD = 60;

// 하단 시트(일정/가계부의 일별 목록·상세)를 손잡이+헤더 영역에서 아래로 쓸어내려 닫는 제스처 감지 —
// 목록 스크롤 영역까지 포함하면 내역이 많을 때 스크롤하려다 닫히는 오작동이 생기므로, 호출부가 이 핸들러를
// 손잡이/헤더에만 붙여야 함(DayEventsSheet/DayExpensesSheet 참고)
export function useSwipeDownToClose(onClose: () => void) {
  const touchStartYRef = useRef<number | null>(null);

  const handleDragStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };

  const handleDragEnd = (e: React.TouchEvent) => {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (startY === null) return;
    if (e.changedTouches[0].clientY - startY > SWIPE_DOWN_THRESHOLD) onClose();
  };

  return { handleDragStart, handleDragEnd };
}
