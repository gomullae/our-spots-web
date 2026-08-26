'use client';

import { useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { SCHEDULE_CATEGORIES, SCHEDULE_CATEGORY_COLORS, SCHEDULE_CATEGORY_LABELS } from '@/constants/scheduleConfig';
import { Toast } from '@/hooks/useToast';
import { scheduleApi } from '@/services/api';
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
  const [memo, setMemo] = useState(event?.memo ?? '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();

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
        memo: memo.trim() || undefined,
      };
      if (isEditMode) {
        await scheduleApi.update(event.id, payload);
        showToast('일정을 수정했습니다', 'success');
      } else {
        await scheduleApi.create(payload);
        showToast('일정을 추가했습니다', 'success');
      }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{isEditMode ? '일정 수정' : '일정 추가'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="닫기">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
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

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">메모</label>
            <textarea
              value={memo}
              onChange={(e) => setMemo(e.target.value.slice(0, 500))}
              rows={3}
              placeholder="메모를 입력해주세요"
              className="w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

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
              disabled={!isValid || isSubmitting}
              className="flex-1 py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
            >
              {isSubmitting ? '저장 중...' : isEditMode ? '수정' : '저장'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
