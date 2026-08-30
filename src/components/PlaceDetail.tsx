'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import PhotoLightbox from '@/components/PhotoLightbox';
import RetryImage from '@/components/RetryImage';
import { PlaceDetail as PlaceDetailType, PlaceType } from '@/types';
import { TYPE_CONFIG, getGradeLabel, PANEL_DIMENSIONS } from '@/constants/placeConfig';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { clampPosition } from '@/utils/position';
import { openNaverDirections } from '@/utils/naverMap';
import { CloseIcon, CopyIcon, CheckIcon, SearchIcon, ArrowRightIcon, CurrentLocationIcon, LockIcon } from '@/components/icons';

interface PlaceDetailProps {
  place: PlaceDetailType | null;
  isLoading: boolean;
  onClose: () => void;
  onEdit?: (place: PlaceDetailType) => void;
  onDelete?: (placeId: number) => Promise<void>;
  position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } } | null;
  isAuthenticated: boolean;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
  showConfirm?: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function PlaceDetail({ place, isLoading, onClose, onEdit, onDelete, position, isAuthenticated, onToast, showConfirm }: PlaceDetailProps) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isLinkCopied, setIsLinkCopied] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  const linkTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // 모바일 드래그 시트 상태
  const [translateY, setTranslateY] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const startYRef = useRef(0);
  const sheetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => { clearTimeout(copyTimerRef.current); clearTimeout(linkTimerRef.current); };
  }, []);

  // 패널이 열릴 때 모바일 드래그 위치 초기화
  useEffect(() => {
    if (position) setTranslateY(0);
  }, [position]);

  // PC에서 Esc로 닫기 — 패널이 실제로 열려있을 때만 리스닝
  useEscapeKey(onClose, !!position);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    setIsDragging(true);
    startYRef.current = e.clientY - translateY;
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [translateY]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return;
    const dy = e.clientY - startYRef.current;
    setTranslateY(Math.max(0, dy));
  }, [isDragging]);

  const handlePointerUp = useCallback(() => {
    if (!isDragging) return;
    setIsDragging(false);

    const sheetHeight = sheetRef.current?.offsetHeight || 0;
    if (translateY > sheetHeight * 0.5) {
      onClose();
      setTranslateY(0);
    } else {
      setTranslateY(0);
    }
  }, [isDragging, translateY, onClose]);

  const handleCopyAddress = async () => {
    if (!place?.address) return;
    try {
      await navigator.clipboard.writeText(place.address);
      setIsCopied(true);
      clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy address:', err);
    }
  };

  const handleCopyLink = async () => {
    if (!place) return;
    const url = `${window.location.origin}?place=${place.id}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
    }
    setIsLinkCopied(true);
    clearTimeout(linkTimerRef.current);
    linkTimerRef.current = setTimeout(() => setIsLinkCopied(false), 2000);
  };

  const handleEdit = () => {
    if (!place) return;
    onEdit?.(place);
  };

  const handleDelete = async () => {
    if (!place) return;
    if (!isAuthenticated) {
      onToast?.('로그인 후 이용해주세요', 'error');
      return;
    }
    const doDelete = async () => {
      setIsDeleting(true);
      try {
        await onDelete?.(place.id);
      } catch (err) {
        onToast?.(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      } finally {
        setIsDeleting(false);
      }
    };
    if (showConfirm) {
      showConfirm(`"${place.name}" 장소를 삭제하시겠습니까?`, doDelete, true);
    } else {
      await doDelete();
    }
  };

  if ((!place && !isLoading) || !position) return null;

  const adjusted = clampPosition(position, {
    width: PANEL_DIMENSIONS.DETAIL_WIDTH,
    height: PANEL_DIMENSIONS.DETAIL_HEIGHT,
    markerCenter: position.markerCenter,
  });

  // 공통 헤더
  const header = (
    <div className="flex items-center justify-between p-3 border-b bg-white">
      <div className="flex flex-col gap-1 flex-1 min-w-0">
        {isLoading ? (
          <div className="h-5 w-24 bg-gray-200 animate-pulse rounded" />
        ) : (
          <>
            <span className="text-sm font-bold">{place?.name}</span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {place?.type && TYPE_CONFIG[place.type] && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TYPE_CONFIG[place.type].color}`}>
                  {TYPE_CONFIG[place.type].emoji} {TYPE_CONFIG[place.type].label}
                </span>
              )}
              {/* 비로그인 시 노출되는 장소는 이제 항상 1등급이라(공개 타입 전부 1등급만 노출) 등급 배지가
                  중복 정보 — 로그인 시에만 표시 */}
              {isAuthenticated && (
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  getGradeLabel(place?.type as PlaceType, place?.grade).color
                }`}>
                  {getGradeLabel(place?.type as PlaceType, place?.grade).label}
                </span>
              )}
            </div>
          </>
        )}
      </div>
      <button
        onClick={onClose}
        className="p-1 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0 ml-2"
        aria-label="닫기"
      >
        <CloseIcon />
      </button>
    </div>
  );

  // 공통 콘텐츠
  const content = (
    <div className="overflow-y-auto p-3 flex-1" style={{ overscrollBehavior: 'contain' }}>
      {isLoading ? (
        <div className="space-y-3">
          <div className="h-3 w-full bg-gray-200 animate-pulse rounded" />
          <div className="h-3 w-3/4 bg-gray-200 animate-pulse rounded" />
        </div>
      ) : place ? (
        <div className="space-y-3">
          {/* Address */}
          <div className="flex items-start gap-1.5 text-xs text-gray-600">
            <CurrentLocationIcon className="w-3 h-3 mt-0.5 flex-shrink-0" />
            <span className="flex-1">{place.address}</span>
            <button
              onClick={handleCopyAddress}
              className="p-0.5 hover:bg-gray-100 rounded transition-colors flex-shrink-0"
              aria-label="주소 복사"
            >
              {isCopied ? (
                <CheckIcon className="w-3.5 h-3.5 text-green-500" />
              ) : (
                <CopyIcon className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              )}
            </button>
          </div>

          {/* Review Links */}
          <div className="rounded-lg border border-gray-200 divide-y divide-gray-200 overflow-hidden">
            <a
              href={place.googlePlaceId
                ? `https://www.google.com/maps/place/?q=place_id:${place.googlePlaceId}`
                : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place.name + ' ' + place.address)}`
              }
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 p-2 hover:bg-gray-50 transition-colors"
            >
              <span className="text-sm">🔵</span>
              <span className="text-xs font-medium text-blue-700">Google</span>
              {place.googleRating ? (
                <div className="flex items-center gap-1 ml-auto">
                  <span className="text-yellow-500 text-xs">★</span>
                  <span className="text-xs font-semibold text-gray-700">{place.googleRating.toFixed(1)}</span>
                  {place.googleRatingsTotal && (
                    <span className="text-[10px] text-gray-400">({place.googleRatingsTotal.toLocaleString()})</span>
                  )}
                </div>
              ) : (
                <span className="text-[10px] text-gray-400 ml-auto">리뷰 없음</span>
              )}
            </a>
            <div className="flex items-center gap-2 p-2">
              <a
                href={`https://search.naver.com/search.naver?query=${encodeURIComponent(
                  place.address.split(' ').slice(0, 2).join(' ') + ' ' + place.name
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-2 flex-1 min-w-0"
              >
                <span className="text-sm">🟢</span>
                <span className="text-xs font-medium text-green-700">Naver</span>
                <span className="flex items-center gap-1 text-[10px] font-medium text-gray-500 group-hover:text-gray-700 transition-colors ml-auto">
                  <SearchIcon className="w-3 h-3" />
                  검색
                </span>
              </a>
              <span className="w-px h-3 bg-gray-300 shrink-0" />
              <button
                onClick={() => openNaverDirections(place.latitude, place.longitude, place.name)}
                className="flex items-center gap-1 text-[10px] font-medium text-gray-500 hover:text-gray-700 transition-colors cursor-pointer shrink-0"
              >
                <ArrowRightIcon className="w-3 h-3" />
                길찾기
              </button>
            </div>
          </div>

          {/* Description */}
          {place.description ? (
            <p className="text-xs text-gray-700 py-2">
              {place.description}
            </p>
          ) : (
            <p className="text-xs text-gray-400 text-center py-2">
              등록된 설명이 없습니다
            </p>
          )}

          {/* Photos */}
          {place.photos.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-1.5">사진 {place.photos.length}장</p>
              <div className="flex gap-1.5 overflow-x-auto -mx-3 px-3 pb-0.5">
                {place.photos.map((photo, i) => (
                  <div key={photo.id} className="relative shrink-0">
                    <RetryImage
                      src={photo.thumbnailUrl || photo.url}
                      alt=""
                      onClick={() => setLightboxIndex(i)}
                      className="w-16 h-16 rounded-lg object-cover cursor-pointer border border-gray-200"
                    />
                    {/* 비공개 사진임을 썸네일에서 바로 알 수 있게 작은 자물쇠 배지 — 비로그인 조회는 서버가
                        애초에 비공개 사진을 응답에서 빼기 때문에 이 배지는 로그인 상태에서만 실제로 보임 */}
                    {!photo.isPublic && (
                      <div className="absolute top-1 right-1 w-4 h-4 rounded-full bg-black/60 flex items-center justify-center">
                        <LockIcon className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons — 비로그인 시 수정/삭제는 아예 안 보이고 공유만 flex-1이라 자동으로 칸 전체를 차지함 */}
          <div className="flex gap-2 pt-2 border-t mt-3">
            {isAuthenticated && (
              <>
                <button
                  onClick={handleEdit}
                  className="flex-1 py-1.5 px-3 text-xs font-medium text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
                >
                  수정
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="flex-1 py-1.5 px-3 text-xs font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors disabled:opacity-50"
                >
                  {isDeleting ? '삭제 중...' : '삭제'}
                </button>
              </>
            )}
            <button
              onClick={handleCopyLink}
              className="flex-1 py-1.5 px-3 text-xs font-medium text-gray-600 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
            >
              {isLinkCopied ? '복사됨' : '공유'}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );

  return (
    <>
      {/* 모바일: 하단 드래그 시트 */}
      <div
        ref={sheetRef}
        className="sm:hidden fixed bottom-0 left-0 right-0 z-50 bg-white shadow-[0_-4px_12px_rgba(0,0,0,0.15)] rounded-t-xl max-h-[55dvh] flex flex-col overflow-hidden"
        style={{
          transform: `translateY(${translateY}px)`,
          transition: isDragging ? 'none' : 'transform 0.25s ease-out',
        }}
      >
        {/* 드래그 핸들 */}
        <div
          className="flex justify-center pt-2.5 pb-1 shrink-0 cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
        >
          <div className="w-10 h-1 bg-gray-300 rounded-full" />
        </div>
        {header}
        {content}
      </div>

      {/* 데스크탑: 플로팅 패널 */}
      <div
        className="hidden sm:block fixed z-50 w-72 max-h-80"
        style={{
          left: `${adjusted.x}px`,
          top: `${adjusted.y}px`,
        }}
      >
        <div className="bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-80">
          {header}
          {content}
        </div>
      </div>

      {place && lightboxIndex !== null && (
        <PhotoLightbox
          urls={place.photos.map((p) => p.url)}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </>
  );
}
