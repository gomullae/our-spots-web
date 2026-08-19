const NAVER_MAP_PACKAGE = 'com.nhn.android.nmap';
const APP_STORE_URL = 'https://apps.apple.com/app/id311867728';
const PLAY_STORE_URL = `https://play.google.com/store/apps/details?id=${NAVER_MAP_PACKAGE}`;

/** 이 시간 안에 화면 전환(앱 실행)이 감지되지 않으면 스토어로 대신 보낸다 */
const APP_SWITCH_CHECK_DELAY_MS = 1500;
/** 페이지가 백그라운드로 간 지 이보다 오래 지났으면 이미 다른 조작이 있었던 것으로 보고 폴백을 건너뜀 */
const APP_SWITCH_MAX_ELAPSED_MS = 2500;

/** 네이버지도 앱으로 자동차 길찾기를 연다. 앱이 없으면 스토어로, 데스크탑은 네이버맵 웹으로 이동. */
export function openNaverDirections(lat: number, lng: number, name: string) {
  const ua = navigator.userAgent;
  const isIOS = /iPhone|iPad|iPod/i.test(ua);
  const isAndroid = /Android/i.test(ua);

  const params = `dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}&appname=${encodeURIComponent(window.location.origin)}`;

  if (isAndroid) {
    // intent:// 는 브라우저가 자체적으로 앱 설치 여부를 판단해 fallback_url로 보내주므로 별도 타이머 불필요
    window.location.href = `intent://route/car?${params}#Intent;scheme=nmap;package=${NAVER_MAP_PACKAGE};S.browser_fallback_url=${encodeURIComponent(PLAY_STORE_URL)};end`;
    return;
  }

  if (isIOS) {
    const start = Date.now();
    window.location.href = `nmap://route/car?${params}`;
    // iOS는 스킴 실패를 감지할 방법이 없어 일정 시간 페이지가 그대로면(=앱 전환 안 됨) 스토어로 보냄
    setTimeout(() => {
      if (document.hidden || Date.now() - start >= APP_SWITCH_MAX_ELAPSED_MS) return;
      window.location.href = APP_STORE_URL;
    }, APP_SWITCH_CHECK_DELAY_MS);
    return;
  }

  // 데스크탑: 네이버맵 웹 길찾기 페이지로 바로 연결 (비공식 URL 구조라 네이버 개편 시 깨질 수 있음)
  window.open(`https://map.naver.com/p/directions/-/${lng},${lat},${encodeURIComponent(name)}/-/car?c=15.00,0,0,0,dh`, '_blank', 'noopener,noreferrer');
}
