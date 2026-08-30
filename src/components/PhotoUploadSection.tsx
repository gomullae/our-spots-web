'use client';

import { useEffect, useRef, useState } from 'react';
import PhotoLightbox from './PhotoLightbox';
import RetryImage from './RetryImage';
import { CloseIcon, LockIcon, UnlockIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { photoApi } from '@/services/api';
import { Photo, PhotoEntityType } from '@/types';
import { deletePhotoWithRecovery } from '@/utils/photoDelete';
import { extractImageFiles, uploadPhotoWithThumbnail } from '@/utils/photoUpload';

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
  | { status: 'confirmed'; id: number; url: string; thumbnailUrl: string; isPublic: boolean };

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
    () => initialPhotos.map((p) => ({ status: 'confirmed', id: p.id, url: p.url, thumbnailUrl: p.thumbnailUrl, isPublic: p.isPublic }))
  );
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  // dragenter/dragleave는 자식 엘리먼트를 넘나들 때마다도 발생해서 단순 boolean으로는 깜빡임 —
  // 진입/이탈 횟수를 세서 0으로 돌아올 때만 실제로 영역을 벗어난 것으로 판단
  const dragCounterRef = useRef(0);

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

  // PC에서 파일 탐색기의 이미지를 이 영역에 바로 드래그&드롭으로 올릴 수 있게 함
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (!e.dataTransfer.types.includes('Files')) return;
    dragCounterRef.current += 1;
    setIsDraggingOver(true);
  };

  const handleDragOver = (e: React.DragEvent) => {
    // 브라우저 기본 동작(드롭 시 이미지를 새 탭으로 여는 것)을 막아야 onDrop이 발생함
    e.preventDefault();
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current -= 1;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    const files = extractImageFiles(e.dataTransfer.items);
    if (files.length > 0) addFiles(files);
  };

  const handleDelete = (item: UploadItem) => {
    if (item.status === 'uploading') return;
    if (item.status === 'confirmed') {
      showConfirm('이 사진을 삭제하시겠습니까?', () => deletePhotoWithRecovery({
        photoId: item.id,
        entityType,
        onRemoved: () => setItems((prev) => prev.filter((it) => it !== item)),
        showToast,
      }), true);
    } else {
      // 아직 DB에 기록 안 된 사진이라 그냥 목록에서만 제거(R2에는 남지만 개인 프로젝트 규모에서 감내 가능한 트레이드오프)
      setItems((prev) => prev.filter((it) => it !== item));
    }
  };

  // 장소 사진만 공개/비공개 전환 가능(entityType === 'PLACE') — 일정 사진은 이 개념 자체가 없음
  const handleToggleVisibility = async (item: Extract<UploadItem, { status: 'confirmed' }>) => {
    if (togglingIds.has(item.id)) return;
    const nextIsPublic = !item.isPublic;

    setTogglingIds((prev) => new Set(prev).add(item.id));
    try {
      await photoApi.updateVisibility(item.id, nextIsPublic);
      setItems((prev) =>
        prev.map((it) => (it.status === 'confirmed' && it.id === item.id ? { ...it, isPublic: nextIsPublic } : it))
      );
    } catch (err) {
      showToast(err instanceof Error ? err.message : '전환에 실패했습니다', 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  };

  const viewableUrls = items
    .filter((it): it is Extract<UploadItem, { status: 'pending' | 'confirmed' }> => it.status !== 'uploading')
    .map((it) => it.url);

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <label className="block text-sm font-medium text-gray-700 mb-1.5">사진</label>
      <div
        className={`flex items-start gap-2 overflow-x-auto pb-1 rounded-lg transition-colors ${
          isDraggingOver ? 'ring-2 ring-blue-400 bg-blue-50' : ''
        }`}
      >
        {items.map((item) => {
          const isViewable = item.status !== 'uploading';
          const viewableIndex = isViewable ? viewableUrls.indexOf((item as { url: string }).url) : -1;
          return (
            <div key={item.status === 'confirmed' ? `c${item.id}` : item.tempId} className="flex flex-col items-center gap-1 shrink-0">
              <div className={THUMB_CLASS}>
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
              {/* 장소 사진만 공개/비공개 전환 가능 — 썸네일 위에 겹치는 배지 대신 사진 바로 아래 pill 버튼으로 배치
                  ("등록 사진 이력" 화면의 pill과 같은 스타일) 해서 눌러서 바꾸는 동작이 더 명확하게 드러나게 함 */}
              {item.status === 'confirmed' && entityType === 'PLACE' && (
                <button
                  type="button"
                  onClick={() => handleToggleVisibility(item)}
                  disabled={togglingIds.has(item.id)}
                  className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-medium transition-colors disabled:opacity-50 ${
                    item.isPublic ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {item.isPublic ? <UnlockIcon className="w-2.5 h-2.5" /> : <LockIcon className="w-2.5 h-2.5" />}
                  {item.isPublic ? '공개' : '비공개'}
                </button>
              )}
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
      <p className="text-[11px] text-gray-400 mt-1">클립보드에 복사한 사진을 Ctrl+V(⌘+V)로 붙여넣거나, 파일을 이 영역에 끌어다 놓을 수도 있어요</p>

      {lightboxIndex !== null && (
        <PhotoLightbox urls={viewableUrls} startIndex={lightboxIndex} onClose={() => setLightboxIndex(null)} />
      )}
    </div>
  );
}
