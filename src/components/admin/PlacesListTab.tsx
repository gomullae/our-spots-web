'use client';

import { useCallback, useEffect, useState } from 'react';
import PlaceFilterBar from '@/components/admin/PlaceFilterBar';
import PlaceForm, { PlaceFormData } from '@/components/PlaceForm';
import { Toast } from '@/hooks/useToast';
import { placeApi } from '@/services/api';
import { Place, PlaceType } from '@/types';
import { TYPE_CONFIG, getGradeLabel } from '@/constants/placeConfig';
import { toDateString, todayString } from '@/utils/weightDate';
import { LocationPinIcon, RefreshIcon, RestoreIcon } from '@/components/icons';

const PAGE_SIZE = 10;
const EARLIEST_DATE = '2020-01-01';

function defaultFromDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() - 3);
  return toDateString(d);
}

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;
}

interface PlacesListTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function PlacesListTab({ showToast, showConfirm }: PlacesListTabProps) {
  const [fromDate, setFromDate] = useState(defaultFromDate);
  const [toDate, setToDate] = useState(todayString);
  const [keywordInput, setKeywordInput] = useState('');
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<PlaceType | ''>('');
  const [gradeFilter, setGradeFilter] = useState<number | ''>('');
  const [includeDeleted, setIncludeDeleted] = useState(true);
  const [page, setPage] = useState(0);
  const [places, setPlaces] = useState<Place[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [editingPlace, setEditingPlace] = useState<Place | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkSyncing, setIsBulkSyncing] = useState(false);
  const [syncingIds, setSyncingIds] = useState<Set<number>>(new Set());

  const fetchPlaces = useCallback(() => {
    setIsLoading(true);
    setError(null);
    setSelectedIds(new Set());
    return placeApi.getRecent({
      startDate: fromDate,
      endDate: toDate,
      keyword: keyword || undefined,
      type: typeFilter || undefined,
      grade: gradeFilter === '' ? undefined : gradeFilter,
      includeDeleted,
      page,
      size: PAGE_SIZE,
    })
      .then((res) => {
        setPlaces(res.content);
        setTotalPages(res.totalPages);
        setTotalElements(res.totalElements);
      })
      .catch((err) => setError(err instanceof Error ? err.message : '불러오기에 실패했습니다'))
      .finally(() => setIsLoading(false));
  }, [fromDate, toDate, keyword, typeFilter, gradeFilter, includeDeleted, page]);

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // 필터 값 변경은 전부 "값 설정 + 1페이지로 리셋"을 함께 하므로 한 곳에 모음
  const applyFilter = <T,>(setter: (value: T) => void, value: T) => {
    setter(value);
    setPage(0);
  };

  const handleFromDateChange = (value: string) => applyFilter(setFromDate, value);
  const handleToDateChange = (value: string) => applyFilter(setToDate, value);
  const handleShowAll = () => { setFromDate(EARLIEST_DATE); setToDate(todayString()); setPage(0); };
  const handleKeywordSearch = () => applyFilter(setKeyword, keywordInput.trim());
  const handleTypeFilterChange = (value: PlaceType | '') => applyFilter(setTypeFilter, value);
  const handleGradeFilterChange = (value: number | '') => applyFilter(setGradeFilter, value);
  const handleIncludeDeletedChange = (value: boolean) => applyFilter(setIncludeDeleted, value);

  const handleUpdatePlace = async (data: PlaceFormData) => {
    if (!editingPlace) return;
    const updated = await placeApi.update(editingPlace.id, data);
    setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
  };

  const handleRestore = async (place: Place) => {
    try {
      const restored = await placeApi.restore(place.id);
      setPlaces((prev) => prev.map((p) => (p.id === restored.id ? restored : p)));
      showToast('복구했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '복구에 실패했습니다', 'error');
    }
  };

  const handleViewOnMap = (place: Place) => {
    window.open(`/?place=${place.id}`, '_blank');
  };

  // 개별 버튼과 일괄 동기화가 공유 — 어느 쪽에서 호출되든 syncingIds에 반영되어 해당 행 버튼도 함께 비활성화/스피너 표시됨
  const syncOnePlace = async (id: number): Promise<Place | null> => {
    setSyncingIds((prev) => new Set(prev).add(id));
    try {
      const updated = await placeApi.syncGoogleRating(id);
      setPlaces((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      return updated;
    } catch (err) {
      console.error('구글 평점 동기화 실패:', err);
      return null;
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  };

  const handleSyncGoogle = async (place: Place) => {
    if (syncingIds.has(place.id)) return;
    const updated = await syncOnePlace(place.id);
    if (!updated) {
      showToast('동기화에 실패했습니다', 'error');
      return;
    }
    showToast(
      updated.googleRating != null
        ? `평점 ${updated.googleRating.toFixed(1)}점으로 갱신했습니다`
        : '구글에서 이 장소를 찾지 못했습니다',
      updated.googleRating != null ? 'success' : 'info'
    );
  };

  const handleBulkSyncGoogle = async () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || isBulkSyncing || isBulkDeleting) return;

    setIsBulkSyncing(true);
    let successCount = 0;
    let notFoundCount = 0;
    let failCount = 0;

    for (let i = 0; i < ids.length; i++) {
      const updated = await syncOnePlace(ids[i]);
      if (!updated) failCount++;
      else if (updated.googleRating != null) successCount++;
      else notFoundCount++;

      // nginx API rate limit(초당 2회)과 Google API 부담을 피하기 위해 순차 처리 + 간격
      if (i < ids.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 300));
      }
    }

    setIsBulkSyncing(false);
    setSelectedIds(new Set());
    const parts = [`성공 ${successCount}개`];
    if (notFoundCount > 0) parts.push(`미발견 ${notFoundCount}개`);
    if (failCount > 0) parts.push(`실패 ${failCount}개`);
    showToast(`구글 평점 동기화 완료: ${parts.join(', ')}`, failCount > 0 ? 'error' : 'success');
  };

  const selectableIds = places.filter((p) => !p.deletedAt).map((p) => p.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || isBulkDeleting || isBulkSyncing) return;

    showConfirm(`선택한 ${ids.length}개 장소를 삭제하시겠습니까?`, async () => {
      setIsBulkDeleting(true);
      try {
        await Promise.all(ids.map((id) => placeApi.delete(id)));
        showToast(`${ids.length}개 삭제했습니다`, 'success');
        await fetchPlaces();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      } finally {
        setIsBulkDeleting(false);
      }
    }, true);
  };

  return (
    <>
      <PlaceFilterBar
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={handleFromDateChange}
        onToDateChange={handleToDateChange}
        onShowAll={handleShowAll}
        today={todayString()}
        keywordInput={keywordInput}
        onKeywordInputChange={setKeywordInput}
        onKeywordSearch={handleKeywordSearch}
        typeFilter={typeFilter}
        onTypeFilterChange={handleTypeFilterChange}
        gradeFilter={gradeFilter}
        onGradeFilterChange={handleGradeFilterChange}
        includeDeleted={includeDeleted}
        onIncludeDeletedChange={handleIncludeDeletedChange}
      />

      {!isLoading && places.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-gray-50">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-3.5 h-3.5" />
            전체선택
          </label>
          {selectedIds.size > 0 ? (
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleBulkSyncGoogle}
                disabled={isBulkSyncing || isBulkDeleting}
                className="text-xs font-medium text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 transition-colors"
              >
                {isBulkSyncing ? '동기화 중...' : `구글 평점 동기화 (${selectedIds.size})`}
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={isBulkDeleting || isBulkSyncing}
                className="text-xs font-medium text-red-600 hover:text-red-700 disabled:text-gray-300 transition-colors"
              >
                {isBulkDeleting ? '삭제 중...' : `선택 삭제 (${selectedIds.size})`}
              </button>
            </div>
          ) : (
            <span className="ml-auto text-xs text-gray-400">총 {totalElements}건</span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-10">{error}</p>
        ) : places.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">조건에 맞는 장소가 없습니다</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {places.map((place) => {
              const typeConfig = TYPE_CONFIG[place.type];
              const gradeInfo = getGradeLabel(place.type, place.grade);
              return (
                <li
                  key={place.id}
                  onClick={() => { if (!place.deletedAt) setEditingPlace(place); }}
                  className={`flex items-start gap-2 px-4 py-3 ${
                    place.deletedAt ? 'bg-red-50/50' : 'cursor-pointer hover:bg-gray-50 transition-colors'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedIds.has(place.id)}
                    disabled={!!place.deletedAt}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(place.id)}
                    className="w-3.5 h-3.5 mt-1 shrink-0 disabled:opacity-30"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{typeConfig.emoji}</span>
                      <span className="text-[10px] text-gray-400 shrink-0">{typeConfig.label}</span>
                      <span className={`text-sm font-medium truncate ${place.deletedAt ? 'line-through text-gray-400' : ''}`}>
                        {place.name}
                      </span>
                      <div className="flex items-center gap-1 shrink-0 ml-auto">
                        {place.deletedAt ? (
                          <>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                              삭제됨
                            </span>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRestore(place); }}
                              title="복구"
                              className="text-blue-600 hover:text-blue-700 transition-colors"
                            >
                              <RestoreIcon className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${gradeInfo.color}`}>
                            {gradeInfo.label}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <p className="text-xs text-gray-500 truncate flex-1 min-w-0">{place.address}</p>
                      {place.googleRating != null && (
                        <span className="text-[10px] text-gray-400 shrink-0">
                          ⭐{place.googleRating.toFixed(1)} ({place.googleRatingsTotal ?? 0})
                        </span>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); handleViewOnMap(place); }}
                        title="지도에서 보기"
                        className="text-blue-500 hover:text-blue-600 transition-colors shrink-0"
                      >
                        <LocationPinIcon className="w-3.5 h-3.5" />
                      </button>
                      {!place.deletedAt && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSyncGoogle(place); }}
                          disabled={syncingIds.has(place.id)}
                          title="구글 평점 동기화"
                          className="text-emerald-600 hover:text-emerald-700 disabled:text-gray-300 transition-colors shrink-0"
                        >
                          <RefreshIcon className={`w-3.5 h-3.5 ${syncingIds.has(place.id) ? 'animate-spin' : ''}`} />
                        </button>
                      )}
                      <span className="text-[10px] text-gray-400 shrink-0">{formatDate(place.createdAt)}</span>
                    </div>
                  </div>
                </li>
              );
            })}
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
          isEditMode
          isAuthenticated
          onSubmit={handleUpdatePlace}
          onClose={() => setEditingPlace(null)}
        />
      )}
    </>
  );
}
