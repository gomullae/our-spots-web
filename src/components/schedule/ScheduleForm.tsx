'use client';

import { useState } from 'react';
import FormModal from '@/components/FormModal';
import PhotoUploadSection, { PendingPhoto } from '@/components/PhotoUploadSection';
import { SCHEDULE_CATEGORIES, SCHEDULE_CATEGORY_COLORS, SCHEDULE_CATEGORY_LABELS } from '@/constants/scheduleConfig';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { Toast } from '@/hooks/useToast';
import { photoApi, scheduleApi } from '@/services/api';
import { ScheduleCategory, ScheduleEvent } from '@/types';

interface ScheduleFormProps {
  event?: ScheduleEvent;
  defaultDate?: string;
  onClose: () => void;
  onSaved: () => void;
  onDeleted: () => void;
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function ScheduleForm({ event, defaultDate, onClose, onSaved, onDeleted, showToast, showConfirm }: ScheduleFormProps) {
  const isEditMode = !!event;
  const [title, setTitle] = useState(event?.title ?? '');
  const [category, setCategory] = useState<ScheduleCategory>(event?.category ?? 'SHARED');
  const [allDay, setAllDay] = useState(event?.allDay ?? false);
  const [startDate, setStartDate] = useState(event?.startAt.slice(0, 10) ?? defaultDate ?? '');
  const [startTime, setStartTime] = useState(event?.startAt.slice(11, 16) ?? '09:00');
  const [endDate, setEndDate] = useState(event?.endAt.slice(0, 10) ?? defaultDate ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  // 아직 confirm 안 된 새 사진들의 objectKey — 저장 성공 후 이 일정의 id로 confirm됨
  const [pendingPhotos, setPendingPhotos] = useState<PendingPhoto[]>([]);
  // 사진이 아직 업로드 중이면 저장 버튼을 막음 — 안 그러면 업로드가 덜 끝난 사진이 저장 시점에 조용히 누락될 수 있음
  const [isPhotoUploading, setIsPhotoUploading] = useState(false);
  // 일정 저장까지는 성공했는데 사진 연결(confirm)만 실패한 경우, 재시도 시 저장 API를 다시 안 부르기 위해
  // 기억해둠 — 안 그러면 신규 등록에서 일정이 중복 생성되거나 수정에서 불필요한 API 호출이 또 나감
  const [savedEvent, setSavedEvent] = useState<ScheduleEvent | null>(null);
  useEscapeKey(onClose);

  const isValid = title.trim().length > 0 && startDate !== '' && (!allDay || (endDate !== '' && endDate >= startDate));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      const payload = {
        title: title.trim(),
        category,
        startAt: allDay ? `${startDate}T00:00:00` : `${startDate}T${startTime}:00`,
        endAt: allDay ? `${endDate}T23:59:59` : `${startDate}T${startTime}:00`,
        allDay,
        // 텔레그램 알림에 "사진 N장 추가됨" 한 줄을 넣기 위한 신호일 뿐, DB에 저장되는 값이 아님
        newPhotoCount: pendingPhotos.length,
      };
      const saved = savedEvent ?? (isEditMode ? await scheduleApi.update(event.id, payload) : await scheduleApi.create(payload));
      setSavedEvent(saved);
      if (pendingPhotos.length > 0) {
        try {
          await Promise.all(pendingPhotos.map((p) => photoApi.confirm('SCHEDULE_EVENT', saved.id, p.objectKey, p.thumbnailObjectKey)));
        } catch (photoErr) {
          // 일정 자체는 이미 저장 완료된 상태라 "저장에 실패했습니다"로 뭉뚱그리면 안 됨 — 폼도 닫지 않고
          // 그대로 둬서, 사용자가 다시 저장을 누르면 위 savedEvent 재사용 분기로 confirm만 다시 시도됨
          console.error('Failed to confirm photos:', photoErr);
          setError('일정은 저장됐지만 사진 연결에 실패했습니다. 다시 시도해주세요');
          return;
        }
      }
      showToast(isEditMode ? '일정을 수정했습니다' : '일정을 추가했습니다', 'success');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = () => {
    if (!event) return;
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

  return (
    <FormModal title={isEditMode ? '일정 수정' : '일정 추가'} onClose={onClose} onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">제목 *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="예: 언니들 커피약속"
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">구분 *</label>
        <div className="grid grid-cols-3 gap-1.5">
          {SCHEDULE_CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`flex items-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-medium transition-colors whitespace-nowrap ${
                category === c ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${SCHEDULE_CATEGORY_COLORS[c].bg}`} />
              <span className="truncate">{SCHEDULE_CATEGORY_LABELS[c]}</span>
            </button>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={allDay} onChange={(e) => setAllDay(e.target.checked)} className="w-4 h-4" />
        하루 종일
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">시작일 *</label>
        <div className="flex gap-2">
          <div className="flex-1 overflow-hidden border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-w-0 max-w-full px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>
          {!allDay && (
            <div className="w-28 shrink-0 overflow-hidden border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full min-w-0 max-w-full px-2 py-2 text-sm focus:outline-none"
                required
              />
            </div>
          )}
        </div>
      </div>

      {allDay && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">종료일 *</label>
          <div className="w-full overflow-hidden border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="date"
              value={endDate}
              min={startDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-w-0 max-w-full px-3 py-2 text-sm focus:outline-none"
              required
            />
          </div>
        </div>
      )}

      {/* 메모는 여기서 안 다룸 — 등록 직후엔 event.id가 없어 추가할 수 없고, 수정 시엔 상세보기(ScheduleEventDetail)의
          메모 스레드에서 바로 추가/삭제하는 게 더 자연스러워서 폼에서는 뺌 */}

      <PhotoUploadSection
        entityType="SCHEDULE_EVENT"
        initialPhotos={event?.photos ?? []}
        onPendingChange={setPendingPhotos}
        onUploadingChange={setIsPhotoUploading}
        showToast={showToast}
        showConfirm={showConfirm}
      />

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        {isEditMode && (
          <button
            type="button"
            onClick={handleDelete}
            className="px-4 py-2.5 rounded-lg font-medium text-sm text-red-600 hover:bg-red-50 transition-colors"
          >
            삭제
          </button>
        )}
        <button
          type="submit"
          disabled={!isValid || isSubmitting || isPhotoUploading}
          className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSubmitting ? '저장 중...' : isPhotoUploading ? '사진 업로드 중...' : isEditMode ? '수정' : '저장'}
        </button>
      </div>
    </FormModal>
  );
}
