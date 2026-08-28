'use client';

import { useEffect, useState } from 'react';

const KAKAO_APP_KEY = process.env.NEXT_PUBLIC_KAKAO_MAP_APP_KEY || '';

// 모듈 레벨 싱글톤: 여러 컴포넌트에서 호출해도 SDK는 단 한 번만 로드
type LoadState = 'idle' | 'loading' | 'loaded' | 'error';
let loadState: LoadState = 'idle';
let errorMessage: string | null = null;
const callbacks: Set<() => void> = new Set();

function initKakaoSDK() {
  if (loadState !== 'idle') return;
  loadState = 'loading';

  const script = document.createElement('script');
  script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${KAKAO_APP_KEY}&autoload=false&libraries=services`;
  script.async = true;

  script.onload = () => {
    if (window.kakao?.maps) {
      window.kakao.maps.load(() => {
        loadState = 'loaded';
        callbacks.forEach((cb) => cb());
        callbacks.clear();
      });
    } else {
      loadState = 'error';
      errorMessage = '카카오맵 SDK 로드 실패';
      callbacks.forEach((cb) => cb());
      callbacks.clear();
    }
  };

  script.onerror = () => {
    loadState = 'error';
    errorMessage = '카카오맵 스크립트 로드 실패';
    callbacks.forEach((cb) => cb());
    callbacks.clear();
  };

  document.head.appendChild(script);
}

export function useKakaoSDK() {
  const [isLoaded, setIsLoaded] = useState(() => loadState === 'loaded');
  const [error, setError] = useState<string | null>(() =>
    loadState === 'error' ? errorMessage : null
  );

  useEffect(() => {
    // 모듈 레벨 싱글톤(loadState)을 구독하는 형태라 "prop에서 파생 가능한 state를 effect에서 세팅"하는
    // 안티패턴이 아님 — 초기 렌더 이후(useState 지연 초기화 실행 시점)와 이 effect가 커밋되는 시점 사이에
    // 다른 컴포넌트가 SDK 로드를 먼저 끝내버리는 경우를 따라잡기 위한 것(react-hooks/set-state-in-effect가
    // 이런 외부 스토어 동기화 케이스까지 함께 잡아냄)
    if (loadState === 'loaded') {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setIsLoaded(true);
      return;
    }
    if (loadState === 'error') {
      setError(errorMessage);
      return;
    }

    const onDone = () => {
      if (loadState === 'loaded') setIsLoaded(true);
      else setError(errorMessage);
    };
    callbacks.add(onDone);

    initKakaoSDK();

    return () => { callbacks.delete(onDone); };
  }, []);

  return { isLoaded, error };
}
