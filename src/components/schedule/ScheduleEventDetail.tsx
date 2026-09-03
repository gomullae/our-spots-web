'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import PhotoLightbox from '@/components/PhotoLightbox';
import RetryImage from '@/components/RetryImage';
import { ArrowRightIcon, CloseIcon } from '@/components/icons';
import { SCHEDULE_CATEGORY_COLORS, SCHEDULE_CATEGORY_LABELS } from '@/constants/scheduleConfig';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Toast } from '@/hooks/useToast';
import { photoApi, scheduleApi } from '@/services/api';
import { Photo, ScheduleEvent, ScheduleMemo } from '@/types';
import { formatDayHeader, formatEventTime } from '@/utils/scheduleDate';
import { deletePhotoWithRecovery } from '@/utils/photoDelete';
import { extractImageFiles, uploadPhotoWithThumbnail } from '@/utils/photoUpload';

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

// 백엔드 ScheduleService.MAX_MEMOS_PER_EVENT와 동일한 값 — 상한 도달 시 입력을 미리 막아서
// 굳이 400 에러를 받아보고 나서야 알게 되는 걸 방지
const MAX_MEMOS = 10;

// 메모 한 건 — 카카오톡/타임트리처럼 우측 정렬 말풍선 + 우측에 "⋮" 메뉴(수정/삭제).
// 메뉴 열림 상태를 부모가 memo id별로 관리하지 않도록(hooks-in-loop 문제 회피 목적도 겸함)
// 각 말풍선이 자기 메뉴 상태를 직접 들고 있는 독립 컴포넌트로 분리.
// 드롭다운은 document.body에 포탈로 렌더링 — 이 목록이 담긴 모달 본문이 overflow-y-auto라(스크롤
// 영역 지정 시 overflow-x도 암묵적으로 auto가 돼 넘치는 콘텐츠를 잘라버림) 마지막 메모처럼 스크롤 영역
// 경계에 가까운 위치에서 메뉴를 absolute로 띄우면 모바일에서 잘려 보이는 문제가 있었음
function MemoBubble({ memo, onEdit, onDelete }: { memo: ScheduleMemo; onEdit: () => void; onDelete: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 열려있는 동안: 버튼/메뉴 바깥 클릭 시 닫기(버튼 자체 클릭은 onClick 토글이 처리하므로 여기서 무시),
  // 스크롤/리사이즈 시 닫기(포탈이라 위치를 fixed 좌표로 한 번만 계산해서, 스크롤되면 버튼과 어긋나 보임)
  useEffect(() => {
    if (!isMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (buttonRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      setIsMenuOpen(false);
    };
    const close = () => setIsMenuOpen(false);
    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('scroll', close, true);
    window.addEventListener('resize', close);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('scroll', close, true);
      window.removeEventListener('resize', close);
    };
  }, [isMenuOpen]);

  const toggleMenu = () => {
    if (!isMenuOpen) {
      const rect = buttonRef.current?.getBoundingClientRect();
      if (rect) setMenuPos({ top: rect.bottom + 4, left: rect.right - 80 });
    }
    setIsMenuOpen((v) => !v);
  };

  return (
    <div className="flex items-start justify-end gap-1">
      <div className="max-w-[75%] bg-white border border-gray-200 rounded-2xl rounded-tr-sm px-3 py-2">
        <p className="text-sm text-gray-700 whitespace-pre-wrap break-words">{memo.content}</p>
      </div>
      <button
        ref={buttonRef}
        onClick={toggleMenu}
        className="shrink-0 mt-0.5 p-1 hover:bg-gray-200 rounded-full transition-colors"
        aria-label="메모 메뉴"
      >
        <span className="text-gray-500 text-base leading-none tracking-widest">⋮</span>
      </button>
      {isMenuOpen && menuPos && createPortal(
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
          className="w-20 bg-white border rounded-lg shadow-lg py-1 z-[100]"
        >
          <button
            onClick={() => { setIsMenuOpen(false); onEdit(); }}
            className="w-full text-left px-3 py-1.5 text-xs hover:bg-gray-50 transition-colors"
          >
            수정
          </button>
          <button
            onClick={() => { setIsMenuOpen(false); onDelete(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        </div>,
        document.body
      )}
    </div>
  );
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
  // 메모는 스레드형(여러 건 추가/수정/삭제) — memoInput은 새로 입력(또는 수정) 중인 값,
  // editingMemoId가 있으면 "수정 모드"(하단 입력창을 그 메모의 기존 내용으로 채우고 전송 시 addMemo 대신 updateMemo 호출)
  const [memos, setMemos] = useState<ScheduleMemo[]>(() => event.memos ?? []);
  const [memoInput, setMemoInput] = useState('');
  const [editingMemoId, setEditingMemoId] = useState<number | null>(null);
  const [isSavingMemo, setIsSavingMemo] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useClickOutside(menuRef, () => setIsMenuOpen(false));
  useEscapeKey(onClose);

  const colors = SCHEDULE_CATEGORY_COLORS[event.category];

  // 이 화면이 열려있는 동안 어디에 포커스가 있든 사진 붙여넣기가 되도록 전역으로 리스닝(마운트 중에만) —
  // 신규 등록 폼과 달리 이미 존재하는 일정이라 업로드 즉시 confirm까지 끝내서 바로 반영함.
  // 한 번의 붙여넣기(여러 장을 한 번에 붙여넣을 수도 있음)에 포함된 파일들은 전부 끝난 뒤 성공한 개수를
  // 묶어서 텔레그램 알림 1건만 보냄(폼 저장 시 "사진 N장 추가됨"과 동일하게 사진마다 알림이 따로 나가는 스팸을 피함)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = extractImageFiles(e.clipboardData?.items);
      if (files.length === 0) return;
      setIsUploadingPhoto(true);
      Promise.allSettled(
        files.map((file) =>
          uploadPhotoWithThumbnail('SCHEDULE_EVENT', file).then(({ objectKey, thumbnailObjectKey }) =>
            photoApi.confirm('SCHEDULE_EVENT', event.id, objectKey, thumbnailObjectKey)
          )
        )
      )
        .then((results) => {
          const confirmed = results
            .filter((r): r is PromiseFulfilledResult<Photo> => r.status === 'fulfilled')
            .map((r) => r.value);
          if (confirmed.length > 0) {
            setPhotos((prev) => [...prev, ...confirmed]);
            onChanged();
            // 알림 발송 실패가 사진 업로드 자체를 실패로 만들면 안 됨(백엔드도 텔레그램 실패를 삼키는 것과 동일 원칙)
            scheduleApi.notifyPhotosAdded(event.id, confirmed.length).catch(() => {});
          }
          if (results.some((r) => r.status === 'rejected')) {
            showToast('사진 업로드에 실패했습니다', 'error');
          }
        })
        .finally(() => setIsUploadingPhoto(false));
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
    showConfirm('이 사진을 삭제하시겠습니까?', () => deletePhotoWithRecovery({
      photoId: photo.id,
      entityType: 'SCHEDULE_EVENT',
      onRemoved: () => {
        setPhotos((prev) => prev.filter((p) => p.id !== photo.id));
        onChanged();
      },
      showToast,
    }), true);
  };

  // 추가/수정 공용 — editingMemoId 유무로 분기(수정은 개수 상한과 무관하고 텔레그램 알림도 없음, 백엔드와 동일 규칙)
  const handleSendMemo = async () => {
    const trimmed = memoInput.trim();
    if (!trimmed) return;
    if (!editingMemoId && memos.length >= MAX_MEMOS) return;

    setIsSavingMemo(true);
    try {
      if (editingMemoId) {
        const saved = await scheduleApi.updateMemo(event.id, editingMemoId, trimmed);
        setMemos((prev) => prev.map((m) => (m.id === saved.id ? saved : m)));
        setEditingMemoId(null);
      } else {
        const saved = await scheduleApi.addMemo(event.id, trimmed);
        setMemos((prev) => [...prev, saved]);
      }
      setMemoInput('');
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : (editingMemoId ? '메모 수정에 실패했습니다' : '메모 추가에 실패했습니다'), 'error');
    } finally {
      setIsSavingMemo(false);
    }
  };

  const handleStartEditMemo = (memo: ScheduleMemo) => {
    setEditingMemoId(memo.id);
    setMemoInput(memo.content);
  };

  const handleCancelEditMemo = () => {
    setEditingMemoId(null);
    setMemoInput('');
  };

  const handleDeleteMemo = (memo: ScheduleMemo) => {
    showConfirm('이 메모를 삭제하시겠습니까?', async () => {
      try {
        await scheduleApi.deleteMemo(event.id, memo.id);
        setMemos((prev) => prev.filter((m) => m.id !== memo.id));
        if (editingMemoId === memo.id) {
          setEditingMemoId(null);
          setMemoInput('');
        }
        onChanged();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      }
    }, true);
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

          {memos.length > 0 && (
            <div>
              <p className="text-[11px] font-medium text-gray-400 mb-1.5">메모 {memos.length}건</p>
              <div className="space-y-2">
                {memos.map((memo) => (
                  <MemoBubble
                    key={memo.id}
                    memo={memo}
                    onEdit={() => handleStartEditMemo(memo)}
                    onDelete={() => handleDeleteMemo(memo)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 메모 입력 — 타임트리 댓글창처럼 상시 노출, 여기서 붙여넣기하면 사진도 바로 첨부됨.
            수정 모드가 아니면 누를 때마다 새 메모 1건 추가(교체 아님), 수정 모드면 그 메모 내용만 교체 */}
        <div className="border-t p-3 shrink-0">
          {!editingMemoId && memos.length >= MAX_MEMOS ? (
            <p className="text-xs text-gray-400 text-center">메모는 일정당 최대 {MAX_MEMOS}개까지만 추가할 수 있습니다</p>
          ) : (
            <div>
              {editingMemoId && (
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] text-gray-400">메모 수정 중</span>
                  <button onClick={handleCancelEditMemo} className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors">
                    취소
                  </button>
                </div>
              )}
              <div className="flex items-end gap-2">
                <textarea
                  value={memoInput}
                  onChange={(e) => setMemoInput(e.target.value.slice(0, 500))}
                  placeholder="메모를 입력해주세요"
                  rows={2}
                  className="flex-1 resize-none border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendMemo}
                  disabled={!memoInput.trim() || isSavingMemo}
                  className="shrink-0 w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center disabled:bg-gray-300 transition-colors"
                  aria-label={editingMemoId ? '메모 수정' : '메모 추가'}
                >
                  <ArrowRightIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
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
