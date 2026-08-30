import type { Metadata } from 'next';
import HomeClient from './HomeClient';

// 링크 공유 시(카톡/아이메시지 등) 미리보기 카드는 크롤러가 서버가 응답한 HTML의 메타태그만 읽고
// 만듦(JS 실행 안 함) — 그래서 ?place= 쿼리가 있으면 서버(Next.js)가 백엔드에서 그 장소를 직접 조회해
// 제목/설명을 그 장소 걸로 바꿔치기함. 백엔드와 Next.js가 같은 서버(Oracle)에 떠 있으므로 nginx를
// 거치지 않고 localhost로 직접 호출 — 운영에서 NEXT_PUBLIC_API_BASE_URL은 "/api"(상대경로, 브라우저 전용)라
// 서버사이드에서는 못 씀. INTERNAL_API_BASE_URL 미설정 시에도 이 기본값으로 정상 동작하므로 운영 .env에
// 반드시 추가해야 하는 건 아님(설정하면 override만 가능)
const INTERNAL_API_BASE_URL = process.env.INTERNAL_API_BASE_URL || 'http://localhost:8080/api';

interface PlaceMetaData {
  name: string;
  address: string;
}

interface PlaceApiResponse {
  success: boolean;
  data?: PlaceMetaData;
}

async function fetchPlaceForMetadata(placeId: string): Promise<PlaceMetaData | null> {
  try {
    // 비인증 조회 — 개인 카테고리(나의 발자취 등)는 백엔드가 이미 404로 막아주므로 자동으로 공유 카드에도 안 나옴
    const res = await fetch(`${INTERNAL_API_BASE_URL}/places/${placeId}`, { cache: 'no-store' });
    if (!res.ok) return null;
    const json: PlaceApiResponse = await res.json();
    return json.success && json.data ? json.data : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const placeId = params.place;
  if (!placeId || Array.isArray(placeId)) return {};

  const place = await fetchPlaceForMetadata(placeId);
  if (!place) return {};

  const { name, address } = place;
  const url = `https://ourspots.life/?place=${placeId}`;

  return {
    title: name,
    description: address,
    openGraph: {
      title: name,
      description: address,
      url,
      siteName: 'Our Spots',
      images: [{ url: '/icon-512x512.png', width: 512, height: 512 }],
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title: name,
      description: address,
      images: ['/icon-512x512.png'],
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
