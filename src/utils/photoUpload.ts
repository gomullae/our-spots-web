import { photoApi } from '@/services/api';
import { PhotoEntityType } from '@/types';

// 썸네일 긴 변 최대 길이 — 업로드 폼/장소 상세/일정 목록 어디서든 64~120px 정도로만 쓰이므로
// 2배 화질 여유를 둬도 480px면 충분(그 이상은 화면에 보이지도 않는 해상도를 낭비하는 것)
const THUMBNAIL_MAX_DIMENSION = 480;
const THUMBNAIL_QUALITY = 0.8;
// 원본을 JPEG로 재인코딩해야 할 때(아래 ALLOWED_UPLOAD_TYPES 참고)의 화질 — 축소는 안 하므로 손실을 최소화
const ORIGINAL_JPEG_QUALITY = 0.92;

// 서버(PhotoPresignRequest)가 실제로 허용하는 포맷 — 이 밖의 타입(대표적으로 아이폰 카메라 기본 저장 포맷인 HEIC)은
// presign 단계에서 400으로 거부되므로, 업로드 전에 클라이언트에서 JPEG로 변환해야 함
const ALLOWED_UPLOAD_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

// 브라우저가 R2에 직접 PUT — presigned URL만 우리 서버에서 발급받고, 실제 파일 바이트는 서버를 거치지 않음(서버 부담 최소화)
async function uploadFileToR2(
  entityType: PhotoEntityType,
  file: File | Blob,
  contentType: string
): Promise<{ objectKey: string; publicUrl: string }> {
  const { uploadUrl, objectKey, publicUrl } = await photoApi.presign(entityType, contentType);
  const res = await fetch(uploadUrl, {
    method: 'PUT',
    body: file,
    headers: { 'Content-Type': contentType },
  });
  if (!res.ok) throw new Error('사진 업로드에 실패했습니다');
  return { objectKey, publicUrl };
}

interface ImageSource {
  source: CanvasImageSource;
  width: number;
  height: number;
  dispose: () => void;
}

// 파일을 캔버스에 그릴 수 있는 소스로 디코딩 — createImageBitmap이 기본 경로지만, 사파리 계열은 HEIC 등 일부
// 포맷을 이 경로로 못 읽는 경우가 있어(반면 <img> 렌더링 파이프라인은 더 관대하게 읽음) <img> 디코딩으로 한 번 더 시도함
async function decodeImageSource(file: File): Promise<ImageSource> {
  try {
    const bitmap = await createImageBitmap(file);
    return { source: bitmap, width: bitmap.width, height: bitmap.height, dispose: () => bitmap.close() };
  } catch {
    const objectUrl = URL.createObjectURL(file);
    try {
      const img = await new Promise<HTMLImageElement>((resolve, reject) => {
        const el = new Image();
        el.onload = () => resolve(el);
        el.onerror = () => reject(new Error('이미지를 읽을 수 없습니다'));
        el.src = objectUrl;
      });
      return { source: img, width: img.naturalWidth, height: img.naturalHeight, dispose: () => URL.revokeObjectURL(objectUrl) };
    } catch (err) {
      URL.revokeObjectURL(objectUrl);
      throw err;
    }
  }
}

function drawToCanvas(image: ImageSource, maxDimension?: number): HTMLCanvasElement {
  const scale = maxDimension ? Math.min(1, maxDimension / Math.max(image.width, image.height)) : 1;
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('이미지 변환에 실패했습니다');
  ctx.drawImage(image.source, 0, 0, canvas.width, canvas.height);
  return canvas;
}

function canvasToJpegBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('이미지 변환에 실패했습니다'))),
      'image/jpeg',
      quality
    );
  });
}

// 원본 + 축소본을 R2에 동시 업로드 — 목록/썸네일은 축소본, 라이트박스(크게보기)는 원본을 쓰기 위함.
// 서버가 허용 안 하는 포맷(HEIC 등)이면 원본도 JPEG로 변환해서 올림 — 애니메이션 GIF는 이미 허용 포맷이라
// 원본은 그대로(애니메이션 유지) 두고 썸네일만 첫 프레임으로 캡처됨
export async function uploadPhotoWithThumbnail(
  entityType: PhotoEntityType,
  file: File
): Promise<{ objectKey: string; url: string; thumbnailObjectKey: string; thumbnailUrl: string }> {
  const image = await decodeImageSource(file);
  try {
    const needsConversion = !ALLOWED_UPLOAD_TYPES.has(file.type);
    const originalFile: File | Blob = needsConversion
      ? await canvasToJpegBlob(drawToCanvas(image), ORIGINAL_JPEG_QUALITY)
      : file;
    const originalContentType = needsConversion ? 'image/jpeg' : file.type;
    const thumbnailBlob = await canvasToJpegBlob(drawToCanvas(image, THUMBNAIL_MAX_DIMENSION), THUMBNAIL_QUALITY);

    const [original, thumbnail] = await Promise.all([
      uploadFileToR2(entityType, originalFile, originalContentType),
      uploadFileToR2(entityType, thumbnailBlob, 'image/jpeg'),
    ]);
    return {
      objectKey: original.objectKey,
      url: original.publicUrl,
      thumbnailObjectKey: thumbnail.objectKey,
      thumbnailUrl: thumbnail.publicUrl,
    };
  } finally {
    image.dispose();
  }
}

// 클립보드/드롭 데이터 중 이미지 파일만 추출
export function extractImageFiles(items: DataTransferItemList | undefined | null): File[] {
  if (!items) return [];
  return Array.from(items)
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file !== null);
}
