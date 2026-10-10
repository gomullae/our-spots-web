import type { Metadata } from 'next';
import { fetchPlaceForShare, pickSharePhotoUrl } from '@/utils/placeShare';
import HomeClient from './HomeClient';

// ?place= 링크 공유 시 미리보기 카드(제목/설명/이미지) — 서버가 그 장소를 직접 조회해서 메타태그를 바꿔치기함
// (이유와 백엔드 호출 방식은 utils/placeShare.ts 참고)
const DEFAULT_SHARE_IMAGE = { url: '/icon-512x512.png', width: 512, height: 512 };

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}): Promise<Metadata> {
  const params = await searchParams;
  const placeId = params.place;
  if (!placeId || Array.isArray(placeId)) return {};

  const place = await fetchPlaceForShare(placeId);
  if (!place) return {};

  const { name, address } = place;
  const url = `https://ourspots.life/?place=${placeId}`;
  // 공개 사진이 있으면 그 사진을 2:1 캔버스에 통째로 넣어 만들어주는 라우트(og/place/[id])를 이미지로 지정 —
  // 사진을 그대로 지정하면 카카오가 카드 비율에 맞춰 잘라버림. 없으면 기존 로고
  const hasPhoto = pickSharePhotoUrl(place.photos) !== null;
  const shareImage = hasPhoto ? { url: `/og/place/${placeId}`, width: 800, height: 400 } : DEFAULT_SHARE_IMAGE;

  return {
    title: name,
    description: address,
    openGraph: {
      title: name,
      description: address,
      url,
      siteName: 'Our Spots',
      images: [shareImage],
      locale: 'ko_KR',
      type: 'website',
    },
    twitter: {
      card: hasPhoto ? 'summary_large_image' : 'summary',
      title: name,
      description: address,
      images: [shareImage.url],
    },
  };
}

export default function Page() {
  return <HomeClient />;
}
