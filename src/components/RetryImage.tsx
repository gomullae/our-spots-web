'use client';

import { useState } from 'react';

interface RetryImageProps {
  src: string;
  alt: string;
  className?: string;
  // 호출부가 이벤트를 받아 stopPropagation 등을 해야 하는 경우가 있어(예: 목록 항목 클릭과 겹치는 썸네일) 원시 이벤트를 그대로 전달
  onClick?: (e: React.MouseEvent<HTMLImageElement | HTMLDivElement>) => void;
}

// R2 공개 URL(.r2.dev)은 업로드 직후 전파 지연이 있는데(Cloudflare 커뮤니티에도 보고된 r2.dev 특유의 현상 —
// 수 초에서 길게는 수 분까지 걸릴 수 있고 정확한 시간을 알 수 없음) 자동 재시도로는 그 시간을 예측해서
// 커버할 수 없음 — 그래서 실패하면 바로 빈 칸 + 수동 "다시 시도" 버튼으로 표시하고, 언제 다시 볼지는
// 사용자에게 맡김(한 번 전파되면 그 뒤로는 계속 정상 로드됨 — R2 저장 자체는 영구적이고 만료가 없음)
export default function RetryImage({ src, alt, className, onClick }: RetryImageProps) {
  const [attempt, setAttempt] = useState(0);
  const [failed, setFailed] = useState(false);

  const handleError = () => setFailed(true);

  const handleManualRetry = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFailed(false);
    setAttempt((a) => a + 1);
  };

  if (failed) {
    return (
      <div
        className={`${className ?? ''} flex flex-col items-center justify-center gap-1 bg-gray-100 text-gray-400 text-[10px] text-center`}
        onClick={onClick}
      >
        <span>불러오기 실패</span>
        <button type="button" onClick={handleManualRetry} className="text-blue-500 hover:underline">
          다시 시도
        </button>
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element -- R2 공개 URL 원본을 그대로 표시, Next 이미지 최적화 불필요
    <img key={attempt} src={src} alt={alt} className={className} onClick={onClick} onError={handleError} />
  );
}
