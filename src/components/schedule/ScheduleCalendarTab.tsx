'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import DayEventsSheet from './DayEventsSheet';
import ScheduleForm from './ScheduleForm';
import { SCHEDULE_CATEGORY_COLORS } from '@/constants/scheduleConfig';
import { useLatestRequestGuard } from '@/hooks/useLatestRequestGuard';
import { useSwipeNav } from '@/hooks/useSwipeNav';
import { Toast } from '@/hooks/useToast';
import { scheduleApi } from '@/services/api';
import { ScheduleEvent, ScheduleMeta } from '@/types';
import { currentYearMonth, formatMonthLabel, shiftMonth } from '@/utils/expenseDate';
import { isSameScheduleMeta, readScheduleCache, writeScheduleCache } from '@/utils/scheduleCache';
import { assignLanes, chunkIntoWeeks, formatEventTime, getCalendarGridDays } from '@/utils/scheduleDate';
import { parseDateString, todayString } from '@/utils/weightDate';

interface ScheduleCalendarTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

const WEEKDAY_HEADERS = ['월', '화', '수', '목', '금', '토', '일'];
const DATE_HEADER_HEIGHT = 22;
const LANE_HEIGHT = 20;
// 일정이 없어도 데스크탑 캘린더 앱처럼 칸이 넉넉해 보이도록 하는 최소 높이
const MIN_ROW_HEIGHT = 112;

interface EventSpan {
  event: ScheduleEvent;
  startDate: string;
  endDate: string;
  lane: number;
}

export default function ScheduleCalendarTab({ showToast, showConfirm }: ScheduleCalendarTabProps) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  // 초기 렌더 시점에 캐시를 동기적으로 읽어서 첫 페인트부터 바로 그려지게 함(네트워크 대기로 인한 빈 화면 깜빡임 방지) — 실제로 최신인지는 마운트 후 백그라운드에서 검증
  const [events, setEvents] = useState<ScheduleEvent[]>(() => readScheduleCache()?.months[currentYearMonth()] ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [formState, setFormState] = useState<{ event?: ScheduleEvent; defaultDate?: string } | null>(null);
  const [daySheetDate, setDaySheetDate] = useState<string | null>(null);
  const beginRequest = useLatestRequestGuard();

  const gridDays = useMemo(() => getCalendarGridDays(yearMonth), [yearMonth]);
  const weeks = useMemo(() => chunkIntoWeeks(gridDays), [gridDays]);

  // 캐시에 그 달이 있으면 월 전환과 같은 틱에 동기적으로 반영 — setYearMonth와 배치돼서 "잘못된 달이 잠깐 보이는" 프레임 없이 바로 맞는 화면(캐시)이 그려짐
  const goToMonth = (next: string) => {
    setYearMonth(next);
    const cached = readScheduleCache()?.months[next];
    if (cached) setEvents(cached);
  };

  const fetchEvents = useCallback(() => {
    const requestedMonth = yearMonth;
    const isStale = beginRequest();

    const cache = readScheduleCache();
    const cachedMonthEvents = cache?.months[requestedMonth];
    // 캐시가 없는 진짜 첫 조회일 때만 로딩 표시. 캐시가 있으면 명시적으로 false로 되돌림 —
    // 안 그러면 "캐시 없는 달로 갔다가(true) 응답 오기 전에 캐시 있는 달로 돌아오는" 경우
    // 이전 요청이 stale 처리되며 finally의 setIsLoading(false)를 건너뛰어서 로딩 상태가 계속 눌어붙어 있었음
    setIsLoading(!cachedMonthEvents);

    const fetchFromServer = (months: Record<string, ScheduleEvent[]>, meta: ScheduleMeta | null) => {
      const start = `${gridDays[0]}T00:00:00`;
      const end = `${gridDays[gridDays.length - 1]}T23:59:59`;
      scheduleApi.getEvents(start, end)
        .then((data) => {
          if (isStale()) return;
          setEvents(data);
          if (!meta) return;
          const nextMonths = { ...months, [requestedMonth]: data };
          // "지금 보고 있는 달" 기준이 아니라 "오늘(실제 현재 월)" 기준 고정 범위 — 조회 위치가 바뀌어도 창 자체가 안 움직여서
          // 이 범위 안에서는 아무리 왔다갔다 해도 캐시가 밀려나지 않음(전엔 방문한 달 기준으로 계산해서 왕복 시 밀려나는 문제가 있었음)
          const keep = new Set([-1, 0, 1, 2, 3].map((offset) => shiftMonth(currentYearMonth(), offset)));
          for (const key of Object.keys(nextMonths)) {
            if (!keep.has(key)) delete nextMonths[key];
          }
          writeScheduleCache({ meta, months: nextMonths });
        })
        .catch((err) => { if (!isStale()) showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'); })
        .finally(() => { if (!isStale()) setIsLoading(false); });
    };

    scheduleApi.getMeta()
      .then((meta) => {
        if (isStale()) return;
        const cacheValid = !!cache && isSameScheduleMeta(cache.meta, meta);
        // 캐시가 이미 정확한 걸로 확인됨 — 화면엔 이미 그 데이터가 보이고 있으므로 더 할 일 없음
        if (cacheValid && cachedMonthEvents) return;
        fetchFromServer(cacheValid ? cache!.months : {}, meta);
      })
      // meta 확인 자체가 실패하면(오프라인 등) 캐시 검증을 포기하고 그냥 서버에서 직접 불러옴
      .catch(() => { if (!isStale()) fetchFromServer({}, null); });
  }, [gridDays, yearMonth, showToast, beginRequest]);

  // 가계부 달력 탭(ExpenseCalendarTab)의 fetchRecords와 동일한 fetch-on-range-change 패턴
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFormState(null);
    setDaySheetDate(null);
    fetchEvents();
  }, [fetchEvents]);

  // 겹치는 일정끼리 줄(lane)을 달 전체 기준으로 한 번만 배정 — 주가 바뀌어도 같은 일정은 같은 줄에 표시됨
  const spans: EventSpan[] = useMemo(() => {
    const base = events
      .map((e) => ({ event: e, startDate: e.startAt.slice(0, 10), endDate: e.endAt.slice(0, 10) }))
      // assignLanes 자체의 정렬(시작일→종료일)에서 같은 날짜끼리 동률일 때의 타이브레이크 — 안정 정렬이라 시작/종료일이 완전히 같은 일정끼리만 이 순서가 유지되고, 여러 날에 걸친 일정의 줄 배정에는 영향 없음
      .sort((a, b) => (a.event.allDay === b.event.allDay ? 0 : a.event.allDay ? 1 : -1));
    return assignLanes(base, (b) => b.startDate, (b) => b.endDate)
      .map(({ item, lane }) => ({ ...item, lane }));
  }, [events]);

  // 시트에 표시할 그 날짜의 일정 목록 — 시간 있는 일정 먼저, 그다음 하루종일 일정
  const daySheetEvents = useMemo(() => {
    if (!daySheetDate) return [];
    return events
      .filter((e) => e.startAt.slice(0, 10) <= daySheetDate && e.endAt.slice(0, 10) >= daySheetDate)
      .sort((a, b) => (a.allDay !== b.allDay ? (a.allDay ? 1 : -1) : a.startAt.localeCompare(b.startAt)));
  }, [events, daySheetDate]);

  const closeForm = () => setFormState(null);
  // 직접 등록/수정/삭제하면 서버 meta(count/lastModified)가 이미 바뀐 뒤라 fetchEvents가 캐시 무효화를 알아서 감지함 — 별도로 캐시를 비울 필요 없음
  const handleSaved = () => { closeForm(); fetchEvents(); };
  const handleDeleted = () => { closeForm(); fetchEvents(); };

  // 모바일은 빈 날짜 클릭 시 그날 일정 목록 시트를 먼저 보여주고, PC는 바로 등록 폼을 연다
  const handleDayClick = (day: string) => {
    if (window.innerWidth < 640) {
      setDaySheetDate(day);
    } else {
      setFormState({ defaultDate: day });
    }
  };

  const { handleTouchStart, handleTouchEnd } = useSwipeNav((direction) => goToMonth(shiftMonth(yearMonth, direction)));

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="relative flex items-center justify-center px-4 py-3 border-b border-gray-100">
        <button
          onClick={() => goToMonth(currentYearMonth())}
          disabled={yearMonth === currentYearMonth()}
          className="absolute left-4 text-[11px] px-2 py-1 rounded-full border border-gray-200 text-gray-500 hover:bg-gray-100 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
        >
          오늘
        </button>
        <div className="flex items-center gap-2">
          <button onClick={() => goToMonth(shiftMonth(yearMonth, -1))} className="text-gray-400 hover:text-gray-600 px-2 transition-colors">
            ‹
          </button>
          <span className="text-sm font-semibold">{formatMonthLabel(yearMonth)}</span>
          <button onClick={() => goToMonth(shiftMonth(yearMonth, 1))} className="text-gray-400 hover:text-gray-600 px-2 transition-colors">
            ›
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[11px] py-1.5 border-b border-gray-100 bg-gray-50">
        {WEEKDAY_HEADERS.map((label, i) => (
          <span key={label} className={i === 6 ? 'text-red-500' : i === 5 ? 'text-blue-500' : 'text-gray-400'}>
            {label}
          </span>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : (
        <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {weeks.map((week) => {
            const weekStart = week[0];
            const weekEnd = week[6];
            const weekSpans = spans.filter((s) => s.startDate <= weekEnd && s.endDate >= weekStart);
            const maxLane = weekSpans.reduce((max, s) => Math.max(max, s.lane), -1);
            const rowHeight = Math.max(MIN_ROW_HEIGHT, DATE_HEADER_HEIGHT + (maxLane + 1) * LANE_HEIGHT + 4);

            return (
              <div key={weekStart} className="relative border-b border-gray-100" style={{ height: `${rowHeight}px` }}>
                <div className="grid grid-cols-7 h-full">
                  {week.map((day) => {
                    const dayOfWeek = parseDateString(day).getDay();
                    const inCurrentMonth = day.slice(0, 7) === yearMonth;
                    const isToday = day === todayString();
                    return (
                      <div
                        key={day}
                        onClick={() => handleDayClick(day)}
                        className="border-r border-gray-100 last:border-r-0 px-1 pt-0.5 cursor-pointer hover:bg-gray-50 transition-colors"
                      >
                        <span
                          className={`text-[11px] ${isToday ? 'font-bold' : ''} ${
                            !inCurrentMonth ? 'text-gray-300' : dayOfWeek === 0 ? 'text-red-500' : dayOfWeek === 6 ? 'text-blue-500' : 'text-gray-600'
                          }`}
                        >
                          {parseDateString(day).getDate()}
                        </span>
                      </div>
                    );
                  })}
                </div>

                <div
                  className="absolute left-0 right-0 grid grid-cols-7 pointer-events-none"
                  style={{ top: `${DATE_HEADER_HEIGHT}px`, gridAutoRows: `${LANE_HEIGHT}px` }}
                >
                  {weekSpans.map((span) => {
                    const clippedStart = span.startDate < weekStart ? weekStart : span.startDate;
                    const clippedEnd = span.endDate > weekEnd ? weekEnd : span.endDate;
                    const colStart = week.indexOf(clippedStart);
                    const colSpan = week.indexOf(clippedEnd) - colStart + 1;
                    const colors = SCHEDULE_CATEGORY_COLORS[span.event.category];
                    // 주 경계에서 잘린 쪽은 각지게, 실제로 시작/끝나는 쪽만 둥글게 — 다음 주로 이어지는 일정임을 시각적으로 구분
                    const isTrueStart = clippedStart === span.startDate;
                    const isTrueEnd = clippedEnd === span.endDate;
                    const roundedClass = `${isTrueStart ? 'rounded-l' : ''} ${isTrueEnd ? 'rounded-r' : ''}`;

                    return (
                      <div
                        key={span.event.id}
                        onClick={(e) => { e.stopPropagation(); setFormState({ event: span.event }); }}
                        className={`pointer-events-auto ${isTrueStart ? 'ml-0.5' : ''} ${isTrueEnd ? 'mr-0.5' : ''} my-px px-1.5 ${roundedClass} flex items-center justify-between gap-1 text-[10px] font-medium cursor-pointer hover:brightness-95 hover:shadow-sm transition ${colors.bg} ${colors.text}`}
                        style={{ gridColumn: `${colStart + 1} / span ${colSpan}`, gridRow: span.lane + 1 }}
                      >
                        <span className="overflow-hidden whitespace-nowrap">{span.event.title}</span>
                        {!span.event.allDay && (
                          <span className="hidden sm:inline shrink-0 opacity-90">{formatEventTime(span.event.startAt)}</span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {daySheetDate && (
        <DayEventsSheet
          date={daySheetDate}
          events={daySheetEvents}
          onClose={() => setDaySheetDate(null)}
          onAdd={() => { setFormState({ defaultDate: daySheetDate }); setDaySheetDate(null); }}
          onSelectEvent={(event) => { setFormState({ event }); setDaySheetDate(null); }}
        />
      )}

      {formState && (
        <ScheduleForm
          event={formState.event}
          defaultDate={formState.defaultDate}
          onClose={closeForm}
          onSaved={handleSaved}
          onDeleted={handleDeleted}
          showToast={showToast}
          showConfirm={showConfirm}
        />
      )}
    </div>
  );
}
