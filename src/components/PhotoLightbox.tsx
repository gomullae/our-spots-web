'use client';

import { useRef, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import RetryImage from '@/components/RetryImage';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface PhotoLightboxProps {
  urls: string[];
  startIndex: number;
  onClose: () => void;
}

// 스와이프 판정 임계값 — 짧은 터치/탭과 헷갈리지 않도록
const SWIPE_THRESHOLD = 50;

// 표준 라이트박스 패턴(인스타그램/구글포토 등) — 화면 꽉 채운 어두운 배경, 좌우 스와이프/화살표로 넘기기,
// 아래로 스와이프하거나 배경/X 클릭으로 닫기. 핀치줌은 1차 버전에서 제외(구현 난이도 대비 효용 낮음)
export default function PhotoLightbox({ urls, startIndex, onClose }: PhotoLightboxProps) {
  const [index, setIndex] = useState(startIndex);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  useEscapeKey(onClose);

  const goTo = (next: number) => setIndex((next + urls.length) % urls.length);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartRef.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const start = touchStartRef.current;
    touchStartRef.current = null;
    if (!start) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - start.x;
    const dy = touch.clientY - start.y;
    if (Math.abs(dy) > Math.abs(dx) && dy > SWIPE_THRESHOLD) {
      onClose();
      return;
    }
    if (Math.abs(dx) < SWIPE_THRESHOLD || Math.abs(dx) < Math.abs(dy)) return;
    goTo(dx < 0 ? index + 1 : index - 1);
  };

  return (
    <div
      className="fixed inset-0 z-[70] bg-black/95 flex items-center justify-center"
      onClick={onClose}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        onClick={onClose}
        className="absolute top-4 right-4 text-white/70 hover:text-white transition-colors z-10"
        aria-label="닫기"
      >
        <CloseIcon className="w-6 h-6" />
      </button>

      {urls.length > 1 && (
        <span className="absolute top-4 left-4 text-white/70 text-sm">
          {index + 1} / {urls.length}
        </span>
      )}

      {urls.length > 1 && (
        <>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(index - 1); }}
            className="hidden sm:flex absolute left-4 text-white/50 hover:text-white text-3xl leading-none transition-colors"
            aria-label="이전 사진"
          >
            ‹
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); goTo(index + 1); }}
            className="hidden sm:flex absolute right-4 text-white/50 hover:text-white text-3xl leading-none transition-colors"
            aria-label="다음 사진"
          >
            ›
          </button>
        </>
      )}

      {/* key로 사진이 바뀔 때마다 재시도 state(attempt/failed)를 리셋 — 안 그러면 이전 사진의 실패 상태가 다음 사진에 그대로 남음 */}
      <RetryImage
        key={urls[index]}
        src={urls[index]}
        alt=""
        className="max-w-full max-h-full object-contain"
        onClick={(e) => e.stopPropagation()}
      />
    </div>
  );
}
