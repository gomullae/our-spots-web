import { useRef } from 'react';

// 이 거리 이상 가로로 움직여야 스와이프로 인정 — 세로 스크롤과 헷갈리지 않도록
const SWIPE_THRESHOLD = 60;

// 모바일 좌우 스와이프로 월 이동 — 세로 이동이 더 크면(스크롤 의도) 무시. 일정/가계부 달력 탭이 공유
export function useSwipeMonthNav(onNavigate: (direction: 1 | -1) => void) {
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    onNavigate(dx < 0 ? 1 : -1);
  };

  return { handleTouchStart, handleTouchEnd };
}
