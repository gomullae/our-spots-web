'use client';

import { useEffect, useRef, useState } from 'react';
import PhotoLightbox from './PhotoLightbox';
import RetryImage from './RetryImage';
import { CloseIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { ApiError, photoApi } from '@/services/api';
import { Photo, PhotoEntityType } from '@/types';
import { extractImageFiles, uploadPhotoWithThumbnail } from '@/utils/photoUpload';
import { clearScheduleCache } from '@/utils/scheduleCache';

// confirm 안 된 새 업로드 하나를 나타냄 — 원본/썸네일 objectKey를 둘 다 들고 있어야 confirm() 호출 가능
export interface PendingPhoto {
  objectKey: string;
  thumbnailObjectKey: string;
}

interface PhotoUploadSectionProps {
  entityType: PhotoEntityType;
  // 수정 모드에서 이미 저장돼있는 사진들 — 신규 등록 폼은 빈 배열로 시작
  initialPhotos: Photo[];
  // 아직 confirm 안 된(=아직 어떤 장소/일정에도 안 묶인) 새 업로드 목록 — 바뀔 때마다 호출됨.
  // 부모 폼이 저장(등록/수정) 성공 시 이 값들로 photoApi.confirm()을 호출해 실제 엔티티에 연결함
  onPendingChange: (pending: PendingPhoto[]) => void;
  // 업로드 중인 사진이 하나라도 있는지 — 부모 폼이 저장 버튼을 막는 용도. 업로드가 안 끝난 사진은
  // pending 목록에 아직 안 잡혀서, 이걸 안 막으면 저장 타이밍에 따라 그 사진만 조용히 누락될 수 있음
  onUploadingChange?: (isUploading: boolean) => void;
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

type UploadItem =
  | { status: 'uploading'; tempId: string; previewUrl: string }
  | { status: 'pending'; tempId: string; objectKey: string; thumbnailObjectKey: string; url: string; thumbnailUrl: string }
  | { status: 'confirmed'; id: number; url: string; thumbnailUrl: string };

const THUMB_CLASS = 'relative w-16 h-16 shrink-0 rounded-lg overflow-hidden border border-gray-200';

export default function PhotoUploadSection({
  entityType,
  initialPhotos,
  onPendingChange,
  onUploadingChange,
  showToast,
  showConfirm,
}: PhotoUploadSectionProps) {
  const [items, setItems] = useState<UploadItem[]>(
    () => initialPhotos.map((p) => ({ status: 'confirmed', id: p.id, url: p.url, thumbnailUrl: p.thumbnailUrl }))
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 저장 전(신규 등록)/저장 중(수정) 단계라 confirm 안 된 항목만 부모에게 계속 알려줌
  useEffect(() => {
    const pending = items
      .filter((it): it is Extract<UploadItem, { status: 'pending' }> => it.status === 'pending')
      .map((it) => ({ objectKey: it.objectKey, thumbnailObjectKey: it.thumbnailObjectKey }));
    onPendingChange(pending);
    onUploadingChange?.(items.some((it) => it.status === 'uploading'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const addFiles = (files: File[]) => {
    const imageFiles = files.filter((f) => f.type.startsWith('image/'));
    if (imageFiles.length === 0) return;

    imageFiles.forEach((file) => {
      const tempId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const previewUrl = URL.createObjectURL(file);
      setItems((prev) => [...prev, { status: 'uploading', tempId, previewUrl }]);

      uploadPhotoWithThumbnail(entityType, file)
        .then(({ objectKey, url, thumbnailObjectKey, thumbnailUrl }) => {
          setItems((prev) =>
            prev.map((it) => (it.status === 'uploading' && it.tempId === tempId
              ? { status: 'pending', tempId, objectKey, url, thumbnailObjectKey, thumbnailUrl }
              : it))
          );
        })
        .catch(() => {
          showToast('사진 업로드에 실패했습니다', 'error');
          setItems((prev) => prev.filter((it) => !(it.status === 'uploading' && it.tempId === tempId)));
        })
        .finally(() => URL.revokeObjectURL(previewUrl));
    });
  };

  // 폼이 열려있는 동안 어디에 포커스가 있든 이미지 붙여넣기가 되도록 전역으로 리스닝(마운트 중에만)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = extractImageFiles(e.clipboardData?.items);
      if (files.length > 0) addFiles(files);
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) addFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const handleDelete = (item: UploadItem) => {
    if (item.status === 'uploading') return;
    if (item.status === 'confirmed') {
      showConfirm('이 사진을 삭제하시겠습니까?', async () => {
        try {
          await photoApi.delete(item.id);
          setItems((prev) => prev.filter((it) => it !== item));
          showToast('삭제했습니다', 'success');
        } catch (err) {
          if (err instanceof ApiError && err.status === 404) {
            // 이미 지워진 사진(다른 기기에서 먼저 삭제 등) — 로컬에 낡은 상태로 남아있던 것뿐이니 화면에서도 지워서 정리.
            // 일정은 로컬 스토리지 캐시(schedule-cache-v2)에도 이 낡은 사진 목록이 박혀있을 수 있어 통째로 비움
            setItems((prev) => prev.filter((it) => it !== item));
            if (entityType === 'SCHEDULE_EVENT') clearScheduleCache();
            showToast('이미 삭제된 사진이에요', 'info');
          } else {
            showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
          }
        }
      }, true);
    } else {
      // 아직 DB에 기록 안 된 사진이라 그냥 목록에서만 제거(R2에는 남지만 개인 프로젝트 규모에서 감내 가능한 트레이드오프)
      setItems((prev) => prev.filter((it) => it !== item));
    }
  };

  const viewableUrls = items
    .filter((it): it is Extract<UploadItem, { status: 'pending' | 'confirmed' }> => it.status !== 'uploading')
    .map((it) => it.url);

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">사진</label>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {items.map((item) => {
          const isViewable = item.status !== 'uploading';
          const viewableIndex = isViewable ? viewableUrls.indexOf((item as { url: string }).url) : -1;
          return (
            <div key={item.status === 'confirmed' ? `c${item.id}` : item.tempId} className={THUMB_CLASS}>
              {item.status === 'uploading' ? (
                // eslint-disable-next-line @next/next/no-img-element -- 로컬 blob 미리보기, 재시도 필요 없음
                <img src={item.previewUrl} alt="" className="w-full h-full object-cover opacity-40" />
              ) : (
                <RetryImage
                  src={item.thumbnailUrl || item.url}
                  alt=""
                  onClick={() => setLightboxIndex(viewableIndex)}
                  className="w-full h-full object-cover cursor-pointer"
                />
              )}
              {item.status === 'uploading' && (
                <div className="absolute inset-0 flex items-center justify-center text-[10px] text-gray-500 bg-white/40">
                  업로드 중
                </div>
              )}
              <button
                type="button"
                onClick={() => handleDelete(item)}
                className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition-colors"
                aria-label="사진 삭제"
              >
                <CloseIcon className="w-2.5 h-2.5" />
              </button>
            </div>
          );
        })}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="w-16 h-16 shrink-0 rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-2xl text-gray-300 hover:text-gray-400 hover:border-gray-400 transition-colors"
          aria-label="사진 추가"
        >
          +
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInputChange}
          className="hidden"
        />
      </div>
      <p className="text-[11px] text-gray-400 mt-1">클립보드에 복사한 사진을 Ctrl+V(⌘+V)로 붙여넣을 수도 있어요</p>

      {lightboxIndex !== null && (
        <PhotoLightbox urls={viewableUrls} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
