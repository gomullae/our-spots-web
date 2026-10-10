import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchPlaceForShare, pickSharePhotoUrl } from '@/utils/placeShare';

// 링크 공유 미리보기용 이미지 — 카카오톡 카드의 이미지 칸이 고정 비율(약 2:1)이라 사진 비율이 다르면 카카오가
// 가운데 기준으로 잘라버림. 그래서 사진을 2:1 캔버스 가운데에 비율 유지로 통째로 넣고 남는 자리는 배경색으로
// 채운 이미지를 요청 시점에 만들어 내려줌(저장 안 함 — R2/DB/디스크에 아무것도 안 남고, 비공개로 바꾸면 다음
// 요청부터 바로 반영됨). 카드 비율이 2:1에서 약간 다르면 WIDTH/HEIGHT만 조정하면 됨
export const dynamic = 'force-dynamic';

const WIDTH = 800;
const HEIGHT = 400;
const BACKGROUND = '#f3f4f6';
// 사진 다운로드(본문 읽기까지)에 허용하는 최대 시간 — 크롤러가 오래 기다려주지 않고, 카카오는 실패한 미리보기도
// 캐시하므로 이 시간 안에 못 받으면 오류 대신 기본 로고로 응답함
const PHOTO_FETCH_TIMEOUT_MS = 2000;
const PLACE_FETCH_TIMEOUT_MS = 1000;
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

async function fallbackLogo(): Promise<Response> {
  const logo = await readFile(path.join(process.cwd(), 'public', 'icon-512x512.png'));
  return new Response(new Uint8Array(logo), {
    // 일시적인 실패가 오래 캐시되지 않도록 짧게
    headers: { 'Content-Type': 'image/png', 'Cache-Control': 'public, max-age=60' },
  });
}

async function renderLetterboxed(photoUrl: string): Promise<Uint8Array<ArrayBuffer> | null> {
  const res = await fetch(photoUrl, { signal: AbortSignal.timeout(PHOTO_FETCH_TIMEOUT_MS) });
  if (!res.ok) return null;
  if (Number(res.headers.get('content-length') ?? 0) > MAX_PHOTO_BYTES) return null;

  const input = Buffer.from(await res.arrayBuffer());
  if (input.length > MAX_PHOTO_BYTES) return null;

  // sharp는 next가 optionalDependency로 끌고 오는 걸 그대로 씀 — 없으면 이 import가 던져서 로고로 폴백됨
  const { default: sharp } = await import('sharp');
  const output = await sharp(input)
    .rotate() // 옛날 사진(원본 폴백)은 EXIF 회전 정보가 남아있을 수 있음
    .resize(WIDTH, HEIGHT, { fit: 'contain', background: BACKGROUND })
    .jpeg({ quality: 82 })
    .toBuffer();
  return new Uint8Array(output);
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const place = await fetchPlaceForShare(id, PLACE_FETCH_TIMEOUT_MS);
    const photoUrl = pickSharePhotoUrl(place?.photos);
    if (photoUrl) {
      const jpeg = await renderLetterboxed(photoUrl);
      if (jpeg) {
        return new Response(jpeg, {
          headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=3600' },
        });
      }
    }
  } catch (err) {
    console.warn(`og image for place ${id} failed, falling back to logo:`, err);
  }
  return fallbackLogo();
}
