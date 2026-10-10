// 링크 공유 미리보기(카톡/아이메시지 등)는 크롤러가 서버가 응답한 HTML의 메타태그만 읽고 만듦(JS 실행 안 함) —
// 그래서 Next.js 서버(page.tsx의 generateMetadata, og 이미지 라우트)가 백엔드에서 그 장소를 직접 조회함.
// 백엔드와 Next.js가 같은 서버(Oracle)에 떠 있으므로 nginx를 거치지 않고 localhost로 직접 호출 — 운영에서
// NEXT_PUBLIC_API_BASE_URL은 "/api"(상대경로, 브라우저 전용)라 서버사이드에서는 못 씀. INTERNAL_API_BASE_URL
// 미설정 시에도 이 기본값으로 정상 동작하므로 운영 .env에 반드시 추가해야 하는 건 아님(설정하면 override만 가능)
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || 'http://localhost:8080/api';

export interface PlaceSharePhoto {
  url: string;
  thumbnailUrl: string;
  isPublic: boolean;
}

export interface PlaceShareData {
  name: string;
  address: string;
  photos?: PlaceSharePhoto[];
}

interface PlaceApiResponse {
  success: boolean;
  data?: PlaceShareData;
}

export async function fetchPlaceForShare(placeId: string, timeoutMs?: number): Promise<PlaceShareData | null> {
  // 쿼리스트링에서 그대로 온 값이라 백엔드 경로에 끼워 넣기 전에 숫자만 허용
  if (!/^\d+$/.test(placeId)) return null;
  try {
    // 비인증 조회 — 개인 카테고리(나의 발자취 등)는 백엔드가 이미 404로 막아주므로 자동으로 공유 카드에도 안 나옴
    const res = await fetch(`${INTERNAL_API_BASE_URL}/places/${placeId}`, {
      cache: 'no-store',
      signal: timeoutMs ? AbortSignal.timeout(timeoutMs) : undefined,
    });
    if (!res.ok) return null;
    const json: PlaceApiResponse = await res.json();
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

// 비인증 조회라 백엔드가 비공개 사진은 응답에서 이미 빼주지만(공개 계약), 공유 카드는 외부에 그대로 노출되는
// 자리라 isPublic을 한 번 더 확인함. 목록은 displayOrder 순이라 첫 번째가 "가장 첫 공개 사진".
// 원본(수 MB 가능) 대신 축소본(480px)을 우선 쓰는 이유: 받는 쪽(og 이미지 라우트)의 다운로드 시간을 짧게 유지하기
// 위함. 축소본이 없는 옛날 사진만 원본으로 폴백
export function pickSharePhotoUrl(photos?: PlaceSharePhoto[]): string | null {
  const photo = photos?.find((p) => p.isPublic);
  if (!photo) return null;
  return photo.thumbnailUrl || photo.url || null;
}
