'use client';

import { useState } from 'react';

interface RetryImageProps {
  src: string;
  alt: string;
  className?: string;
  // 호출부가 이벤트를 받아 stopPropagation 등을 해야 하는 경우가 있어(예: 목록 항목 클릭과 겹치는 썸네일) 원시 이벤트를 그대로 전달
  onClick?: (e: React.MouseEvent<HTMLImageElement | HTMLDivElement>) => void;
}

// 모바일 네트워크 순간 끊김 등으로 사진 로드가 한 번 실패해도 곧바로 깨진 아이콘을 보여주지 않고 1회 자동 재시도 —
// 그래도 실패하면 그제서야 안내 문구로 대체. className은 <img>와 대체 문구 박스가 동일하게 받아써서 레이아웃이 안 흔들리게 함
export default function RetryImage({ src, alt, className, onClick }: RetryImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleError = () => {
    if (attempt < 1) {
      setTimeout(() => setAttempt((a) => a + 1), 1000);
    } else {
      setFailed(true);
    }
  };

  if (failed) {
    return (
      <div
        className={`${className ?? ''} flex items-center justify-center bg-gray-100 text-gray-400 text-[10px] text-center`}
        onClick={onClick}
      >
        불러오기 실패
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- R2 공개 URL 원본을 그대로 표시, Next 이미지 최적화 불필요
    <img key={attempt} src={src} alt={alt} className={className} onClick={onClick} onError={handleError} />
  );
}
