'use client';

import { useEffect, useRef, useState } from 'react';
import PhotoLightbox from '@/components/PhotoLightbox';
import RetryImage from '@/components/RetryImage';
import { ArrowRightIcon, CloseIcon } from '@/components/icons';
import { SCHEDULE_CATEGORY_COLORS, SCHEDULE_CATEGORY_LABELS } from '@/constants/scheduleConfig';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Toast } from '@/hooks/useToast';
import { ApiError, photoApi, scheduleApi } from '@/services/api';
import { Photo, ScheduleEvent } from '@/types';
import { formatDayHeader, formatEventTime } from '@/utils/scheduleDate';
import { extractImageFiles, uploadPhotoWithThumbnail } from '@/utils/photoUpload';
import { clearScheduleCache } from '@/utils/scheduleCache';

interface ScheduleEventDetailProps {
  event: ScheduleEvent;
  onClose: () => void;
  onEdit: () => void;
  onDeleted: () => void;
  // 메모 저장/사진 추가·삭제처럼 이 화면 안에서 바로 처리되는 변경 후 호출 — 부모가 달력 목록을
  // 백그라운드에서 새로고침(이 상세보기는 안 닫힘, 화면 자체는 이 컴포넌트의 로컬 상태로 이미 최신 반영됨)
  onChanged: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

function formatEventDateLine(event: ScheduleEvent): string {
  const startDate = event.startAt.slice(0, 10);
  const endDate = event.endAt.slice(0, 10);
  if (!event.allDay) {
    return `${formatDayHeader(startDate)} ${formatEventTime(event.startAt)}`;
  }
  return startDate === endDate ? formatDayHeader(startDate) : `${formatDayHeader(startDate)} ~ ${formatDayHeader(endDate)}`;
}

// 읽기 전용 상세보기 — 타임트리처럼 일정을 눌렀을 때 바로 수정 폼이 아니라 이 화면이 먼저 뜨고,
// 제목/날짜/구분처럼 자주 안 바뀌는 건 "⋯" 메뉴의 편집에서, 메모/사진처럼 자주 건드리는 건 이 화면에서 바로 처리
export default function ScheduleEventDetail({ event, onClose, onEdit, onDeleted, onChanged, showToast, showConfirm }: ScheduleEventDetailProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const [photos, setPhotos] = useState<Photo[]>(() => event.photos ?? []);
  // memo: 실제로 저장된 현재 메모(읽기 전용으로 표시), memoInput: 새로 입력 중인 값(항상 빈 칸에서 시작 — 교체 방식이라 기존 내용을 다시 보여줄 필요 없음)
  const [memo, setMemo] = useState(event.memo ?? '');
  const [memoInput, setMemoInput] = useState('');
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsMenuOpen(false));
  useEscapeKey(onClose);

  const colors = SCHEDULE_CATEGORY_COLORS[event.category];

  // 이 화면이 열려있는 동안 어디에 포커스가 있든 사진 붙여넣기가 되도록 전역으로 리스닝(마운트 중에만) —
  // 신규 등록 폼과 달리 이미 존재하는 일정이라 업로드 즉시 confirm까지 끝내서 바로 반영함
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = extractImageFiles(e.clipboardData?.items);
      if (files.length === 0) return;
      files.forEach((file) => {
        setIsUploadingPhoto(true);
        uploadPhotoWithThumbnail('SCHEDULE_EVENT', file)
          .then(({ objectKey, thumbnailObjectKey }) => photoApi.confirm('SCHEDULE_EVENT', event.id, objectKey, thumbnailObjectKey))
          .then((confirmed) => {
            setPhotos((prev) => [...prev, confirmed]);
            onChanged();
          })
          .catch(() => showToast('사진 업로드에 실패했습니다', 'error'))
          .finally(() => setIsUploadingPhoto(false));
      });
    };
    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id]);

  const handleDeleteEvent = () => {
    setIsMenuOpen(false);
    showConfirm('이 일정을 삭제할까요?', async () => {
      try {
        await scheduleApi.delete(event.id);
        showToast('일정을 삭제했습니다', 'success');
        onDeleted();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      }
    }, true);
  };

  const handleDeletePhoto = (photo: Photo) => {
    showConfirm('이 사진을 삭제하시겠습니까?', async () => {
      try {
        await photoApi.delete(photo.id);
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        showToast('삭제했습니다', 'success');
        onChanged();
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          // 이미 지워진 사진(다른 기기에서 먼저 삭제 등) — 로컬 스토리지 캐시(schedule-cache-v2)가 낡아 남아있던 것뿐이니
          // 화면에서 지우고 캐시도 통째로 비워서 다음에 다시 이 낡은 목록이 뜨지 않게 함
          setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
          clearScheduleCache();
          showToast('이미 삭제된 사진이에요', 'info');
          onChanged();
        } else {
          showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
        }
      }
    }, true);
  };

  const handleSaveMemo = () => {
    const trimmed = memoInput.trim();
    if (!trimmed) return;

    const doSave = async () => {
      setIsSavingMemo(true);
      try {
        await scheduleApi.update(event.id, {
          title: event.title,
          category: event.category,
          startAt: event.startAt,
          endAt: event.endAt,
          allDay: event.allDay,
          memo: trimmed,
        });
        setMemo(trimmed);
        setMemoInput('');
        showToast('메모를 저장했습니다', 'success');
        onChanged();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '저장에 실패했습니다', 'error');
      } finally {
        setIsSavingMemo(false);
      }
    };

    // 메모는 여러 개 쌓이는 게 아니라 하나만 교체되는 방식이라, 기존 메모가 있으면 덮어써도 되는지 먼저 확인
    if (memo.trim()) {
      showConfirm('기존 메모는 삭제됩니다. 저장하시겠습니까?', doSave);
    } else {
      doSave();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-[calc(100vw-2rem)] sm:w-[28rem] max-h-[85vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* 헤더 — 스크롤 영역 밖에 둬서 "⋯" 드롭다운이 튀어나와도 스크롤바가 안 생기게 함 */}
        <div className="flex items-start justify-between gap-2 p-4 border-b shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${colors.bg}`} />
            <h2 className="text-lg font-bold truncate">{event.title}</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setIsMenuOpen((v) => !v)}
                className="p-1.5 hover:bg-gray-100 rounded-full transition-colors"
                aria-label="더보기"
              >
                <span className="text-gray-500 text-lg leading-none tracking-widest">⋯</span>
              </button>
              {isMenuOpen && (
                <div className="absolute top-full right-0 mt-1 w-28 bg-white border rounded-lg shadow-lg py-1 z-10">
                  <button
                    onClick={() => { setIsMenuOpen(false); onEdit(); }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 transition-colors"
                  >
                    편집
                  </button>
                  <button
                    onClick={handleDeleteEvent}
                    className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                  >
                    삭제
                  </button>
                </div>
              )}
            </div>
            <button onClick={onClose} className="p-1.5 hover:bg-gray-100 rounded-full transition-colors" aria-label="닫기">
              <CloseIcon className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 본문 — 이 영역만 스크롤됨 */}
        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm text-gray-700">{formatEventDateLine(event)}</span>
            <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${colors.bg} ${colors.text}`}>
              {SCHEDULE_CATEGORY_LABELS[event.category]}
            </span>
          </div>

          {memo && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-1">메모</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap">{memo}</p>
            </div>
          )}

          {(photos.length > 0 || isUploadingPhoto) && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-1.5">사진 {photos.length}장</p>
              <div className="grid grid-cols-3 gap-1.5">
                {photos.map((photo, i) => (
                  <div key={photo.id} className="relative group">
                    <RetryImage
                      src={photo.thumbnailUrl || photo.url}
                      alt=""
                      onClick={() => setLightboxIndex(i)}
                      className="w-full aspect-square rounded-lg object-cover cursor-pointer border border-gray-200"
                    />
                    <button
                      onClick={() => handleDeletePhoto(photo)}
                      className="absolute top-0.5 right-0.5 w-4 h-4 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      aria-label="사진 삭제"
                    >
                      <CloseIcon className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
                {isUploadingPhoto && (
                  <div className="w-full aspect-square rounded-lg border border-dashed border-gray-300 flex items-center justify-center text-[10px] text-gray-400">
                    업로드 중
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* 메모 입력 — 타임트리 댓글창처럼 상시 노출, 여기서 붙여넣기하면 사진도 바로 첨부됨 */}
        <div className="border-t p-3 shrink-0">
          <div className="flex items-end gap-2">
            <textarea
              value={memoInput}
              onChange={(e) => setMemoInput(e.target.value)}
              placeholder="메모를 입력해주세요"
              rows={2}
              className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSaveMemo}
              disabled={!memoInput.trim() || isSavingMemo}
              className="shrink-0 w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:bg-gray-300 transition-colors"
              aria-label="메모 저장"
            >
              <ArrowRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {lightboxIndex !== null && (
        <PhotoLightbox
          urls={photos.map((p) => p.url)}
          startIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      )}
    </div>
  );
}
