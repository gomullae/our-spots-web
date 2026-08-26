'use client';

import { useRef } from 'react';
import { CloseIcon } from '@/components/icons';
import { getHoliday } from '@/constants/holidays';
import { SCHEDULE_CATEGORY_COLORS } from '@/constants/scheduleConfig';
import { ScheduleEvent } from '@/types';
import { formatDayHeader, formatEventTime } from '@/utils/scheduleDate';

interface DayEventsSheetProps {
  date: string;
  events: ScheduleEvent[];
  onClose: () => void;
  onAdd: () => void;
  onSelectEvent: (event: ScheduleEvent) => void;
}

// 이 거리 이상 아래로 쓸어내려야 닫힘으로 인정 — 위로 스크롤하려는 의도와 헷갈리지 않도록
const SWIPE_DOWN_THRESHOLD = 60;

export default function DayEventsSheet({ date, events, onClose, onAdd, onSelectEvent }: DayEventsSheetProps) {
  const holiday = getHoliday(date);
  const touchStartYRef = useRef<number | null>(null);

  // 손잡이+헤더 영역에서만 반응 — 목록 스크롤 영역까지 포함하면 일정이 많을 때 스크롤하려다 닫히는 오작동이 생김
  const handleDragStart = (e: React.TouchEvent) => {
    touchStartYRef.current = e.touches[0].clientY;
  };
  const handleDragEnd = (e: React.TouchEvent) => {
    const startY = touchStartYRef.current;
    touchStartYRef.current = null;
    if (startY === null) return;
    if (e.changedTouches[0].clientY - startY > SWIPE_DOWN_THRESHOLD) onClose();
  };

  return (
    <div className="sm:hidden fixed inset-0 z-40 flex items-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/40" />
      <div
        className="relative w-full h-[50dvh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0" onTouchStart={handleDragStart} onTouchEnd={handleDragEnd}>
          <div className="flex justify-center pt-2 pb-1">
            <div className="w-10 h-1 bg-gray-300 rounded-full" />
          </div>

          <div className="flex items-start justify-between px-4 pb-3">
            <div>
              <h2 className="text-lg font-bold">{formatDayHeader(date)}</h2>
              {holiday && <p className="text-sm text-gray-400 mt-0.5">{holiday.name}</p>}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-full flex items-center justify-center text-gray-400 hover:bg-gray-100 transition-colors"
                aria-label="닫기"
              >
                <CloseIcon className="w-4 h-4" />
              </button>
              <button
                onClick={onAdd}
                className="w-9 h-9 rounded-full bg-gray-900 text-white flex items-center justify-center text-xl leading-none"
                aria-label="일정 추가"
              >
                +
              </button>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {events.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-10">등록된 일정이 없습니다</p>
          ) : (
            events.map((event) => (
              <div
                key={event.id}
                onClick={() => onSelectEvent(event)}
                className="flex items-center gap-3 px-4 py-3 border-b border-gray-50 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <span className="text-xs text-gray-400 w-9 shrink-0">{event.allDay ? '종일' : ''}</span>
                <span className={`w-1 self-stretch rounded-full ${SCHEDULE_CATEGORY_COLORS[event.category].bg}`} />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[15px] truncate">{event.title}</p>
                  {!event.allDay && <p className="text-xs text-gray-400 mt-0.5">{formatEventTime(event.startAt)}</p>}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
