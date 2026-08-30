'use client';

import { useCallback, useEffect, useState } from 'react';
import PlaceForm, { PlaceFormData } from '@/components/PlaceForm';
import RetryImage from '@/components/RetryImage';
import { LocationPinIcon, LockIcon, UnlockIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { photoApi, placeApi } from '@/services/api';
import { PhotoAdminEntry, PlaceDetail } from '@/types';

const PAGE_SIZE = 20;

type VisibilityFilter = 'ALL' | 'PUBLIC' | 'PRIVATE';

const FILTERS: { key: VisibilityFilter; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'PUBLIC', label: '공개' },
  { key: 'PRIVATE', label: '비공개' },
];

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

interface PhotoHistoryTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

// 관리자 "등록 사진 이력" — 어느 장소에 어떤 사진이 언제 등록됐고 전체공개/비공개인지 보여주고
// 클릭 한 번으로 전환. 정렬은 등록일시 내림차순 고정(백엔드도 정렬 옵션 없이 이 순서로만 응답)
export default function PhotoHistoryTab({ showToast, showConfirm }: PhotoHistoryTabProps) {
  const [filter, setFilter] = useState<VisibilityFilter>('ALL');
  const [page, setPage] = useState(0);
  const [photos, setPhotos] = useState<PhotoAdminEntry[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [togglingIds, setTogglingIds] = useState<Set<number>>(new Set());
  const [loadingPlaceId, setLoadingPlaceId] = useState<number | null>(null);
  const [editingPlace, setEditingPlace] = useState<PlaceDetail | null>(null);

  const isPublicParam = filter === 'ALL' ? undefined : filter === 'PUBLIC';

  const fetchPhotos = useCallback(() => {
    setIsLoading(true);
    setError(null);
    return placeApi.getPhotoHistory({ isPublic: isPublicParam, page, size: PAGE_SIZE })
      .then((res) => {
        setPhotos(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '불러오기에 실패했습니다'))
      .finally(() => setIsLoading(false));
  }, [isPublicParam, page]);

  useEffect(() => {
    fetchPhotos();
  }, [fetchPhotos]);

  const handleFilterChange = (value: VisibilityFilter) => {
    setFilter(value);
    setPage(0);
  };

  const handleToggleVisibility = async (photo: PhotoAdminEntry) => {
    if (togglingIds.has(photo.id)) return;
    const nextIsPublic = !photo.isPublic;

    setTogglingIds((prev) => new Set(prev).add(photo.id));
    try {
      await photoApi.updateVisibility(photo.id, nextIsPublic);
      // 필터가 걸려있으면 전환 즉시 목록에서 빠져야 하므로(예: "공개"만 보는 중 비공개로 전환) 다시 조회
      if (filter === 'ALL') {
        setPhotos((prev) => prev.map((p) => (p.id === photo.id ? { ...p, isPublic: nextIsPublic } : p)));
      } else {
        await fetchPhotos();
      }
      showToast(nextIsPublic ? '전체공개로 전환했습니다' : '비공개로 전환했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '전환에 실패했습니다', 'error');
    } finally {
      setTogglingIds((prev) => {
        const next = new Set(prev);
        next.delete(photo.id);
        return next;
      });
    }
  };

  const handleViewOnMap = (placeId: number) => {
    window.open(`/?place=${placeId}`, '_blank');
  };

  // 장소명 클릭 → 그 장소의 전체 정보(주소/유형/등급 등)를 조회해서 수정 폼을 엶
  // (PhotoAdminEntry는 사진 이력 표시용 최소 정보만 있어서 PlaceForm에 그대로 못 씀)
  const handleOpenEdit = async (placeId: number) => {
    if (loadingPlaceId != null) return;
    setLoadingPlaceId(placeId);
    try {
      const place = await placeApi.getById(placeId);
      setEditingPlace(place);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '장소 정보를 불러오지 못했습니다', 'error');
    } finally {
      setLoadingPlaceId(null);
    }
  };

  const handleUpdatePlace = async (data: PlaceFormData) => {
    if (!editingPlace) throw new Error('수정할 장소를 찾을 수 없습니다');
    const updated = await placeApi.update(editingPlace.id, data);
    // 사진 이력 목록엔 장소명이 스냅샷으로 실려있어서, 수정으로 이름이 바뀌면 여기서도 같이 갱신
    setPhotos((prev) => prev.map((p) => (p.placeId === updated.id ? { ...p, placeName: updated.name } : p)));
    return updated;
  };

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              filter === f.key ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
        {!isLoading && <span className="ml-auto text-xs text-gray-400">총 {totalElements}건</span>}
      </div>

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-10">{error}</p>
        ) : photos.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">등록된 사진이 없습니다</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {photos.map((photo) => (
              <li key={photo.id} className="flex items-center gap-3 px-4 py-3">
                <RetryImage
                  src={photo.thumbnailUrl || photo.url}
                  alt=""
                  className="w-20 h-20 rounded-lg object-cover shrink-0 border border-gray-200"
                />
                <button
                  onClick={() => handleOpenEdit(photo.placeId)}
                  disabled={loadingPlaceId === photo.placeId}
                  className="flex-1 min-w-0 text-left disabled:opacity-50"
                >
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-medium truncate">{photo.placeName}</span>
                    <span
                      role="button"
                      onClick={(e) => { e.stopPropagation(); handleViewOnMap(photo.placeId); }}
                      title="지도에서 보기"
                      className="text-blue-500 hover:text-blue-600 transition-colors shrink-0"
                    >
                      <LocationPinIcon className="w-3.5 h-3.5" />
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-400 mt-0.5">{formatDateTime(photo.createdAt)}</p>
                </button>
                <button
                  onClick={() => handleToggleVisibility(photo)}
                  disabled={togglingIds.has(photo.id)}
                  title={photo.isPublic ? '클릭 시 비공개로 전환' : '클릭 시 전체공개로 전환'}
                  className={`shrink-0 flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium transition-colors disabled:opacity-50 ${
                    photo.isPublic ? 'bg-blue-50 text-blue-600 hover:bg-blue-100' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                  }`}
                >
                  {photo.isPublic ? <UnlockIcon className="w-3 h-3" /> : <LockIcon className="w-3 h-3" />}
                  {photo.isPublic ? '공개' : '비공개'}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 px-4 py-3 border-t shrink-0">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="text-sm font-medium text-gray-600 disabled:text-gray-300 transition-colors"
          >
            이전
          </button>
          <span className="text-xs text-gray-500">{page + 1} / {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="text-sm font-medium text-gray-600 disabled:text-gray-300 transition-colors"
          >
            다음
          </button>
        </div>
      )}

      {editingPlace && (
        <PlaceForm
          latitude={editingPlace.latitude}
          longitude={editingPlace.longitude}
          initialAddress={editingPlace.address}
          initialName={editingPlace.name}
          initialType={editingPlace.type}
          initialDescription={editingPlace.description}
          initialGrade={editingPlace.grade}
          initialPhotos={editingPlace.photos}
          isEditMode
          isAuthenticated
          onSubmit={handleUpdatePlace}
          onClose={() => setEditingPlace(null)}
          showToast={showToast}
          showConfirm={showConfirm}
        />
      )}
    </>
  );
}
