'use client';

import { useCallback, useEffect, useState } from 'react';
import DayExpensesSheet from './DayExpensesSheet';
import Pagination from '@/components/Pagination';
import { ArrowRightIcon } from '@/components/icons';
import { useLatestRequestGuard } from '@/hooks/useLatestRequestGuard';
import { useSwipeNav } from '@/hooks/useSwipeNav';
import { Toast } from '@/hooks/useToast';
import { expenseApi } from '@/services/api';
import { ExpenseCategory, ExpenseMeta, ExpenseRecord } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { isSameExpenseMeta, readExpenseCache, writeExpenseCache } from '@/utils/expenseCache';
import { formatAmount, formatAmountCompact, sumAmount } from '@/utils/expenseFormat';
import { WeekRange, currentYearMonth, formatMonthLabel, formatMonthShortLabel, formatWeekLabel, getMonthWeeks, shiftMonth } from '@/utils/expenseDate';
import { parseDateString, shiftDate } from '@/utils/weightDate';
import { getHoliday } from '@/constants/holidays';
import TransactionRow from './TransactionRow';

interface ExpenseCalendarTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
}

const WEEKDAY_LABELS = ['월', '화', '수', '목', '금', '토', '일'];
const CATEGORY_PAGE_SIZE = 10;
// 주간 정산 텔레그램 전송(정산 보내기)의 기본 예산과 동일한 값 — 달력 그리드의 주별 초과/절약
// 배지도 같은 기준으로 비교해야 "정산 보내기 화면과 다른 숫자"로 헷갈리지 않음
const DEFAULT_WEEKLY_BUDGET = 420000;

// 월요일 시작 기준 5번째(토)는 파란색, 6번째(일)는 빨간색
function weekdayColor(index: number, weak = false): string {
  if (index === 5) return weak ? 'text-blue-500' : 'text-blue-600';
  if (index === 6) return weak ? 'text-red-500' : 'text-red-600';
  return weak ? 'text-gray-400' : 'text-gray-500';
}

// 토/일 색은 공휴일 여부와 무관하게 항상 유지 — 공휴일 강조는 평일(월~금)에만 적용
function dayNumberColor(index: number, isHoliday: boolean): string {
  if (index !== 5 && index !== 6 && isHoliday) return 'text-orange-600';
  return weekdayColor(index);
}

type DetailTab = 'method' | 'category';

const DETAIL_TABS: { key: DetailTab; label: string }[] = [
  { key: 'category', label: '카테고리별' },
  { key: 'method', label: '결제수단별' },
];

// 정기지출(식비+생활비) 기준으로만 볼지, 비정기지출까지 합쳐서 볼지 — 기본값은 REGULAR.
// 한 줄에 "정기 X원 (비정기 포함 Y원)"처럼 같이 보여줬더니 오히려 헷갈린다는 피드백으로,
// 아예 화면 전체가 한 기준(총 지출/카테고리 카드/주 총액/날짜 칸/상세 내역)만 보여주는 방식으로 변경
type ViewMode = 'REGULAR' | 'ALL';

const VIEW_MODE_TABS: { key: ViewMode; label: string }[] = [
  { key: 'REGULAR', label: '정기지출' },
  { key: 'ALL', label: '비정기지출 포함' },
];

function inRange(record: ExpenseRecord, week: WeekRange): boolean {
  return record.expenseDate >= week.start && record.expenseDate <= week.end;
}

function weekDays(week: WeekRange, yearMonth: string, records: ExpenseRecord[]) {
  return Array.from({ length: 7 }, (_, i) => {
    const date = shiftDate(week.start, i);
    const amount = sumAmount(records.filter((r) => r.expenseDate === date));
    const holiday = getHoliday(date);
    return {
      date,
      dayNum: parseDateString(date).getDate(),
      amount,
      inMonth: date.startsWith(yearMonth),
      holidayName: holiday?.name,
    };
  });
}

export default function ExpenseCalendarTab({ showToast }: ExpenseCalendarTabProps) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  // 초기 렌더 시점에 캐시를 동기적으로 읽어서 첫 페인트부터 바로 그려지게 함(일정 관리와 동일한 패턴) — 실제로 최신인지는 마운트 후 백그라운드에서 검증
  const [records, setRecords] = useState<ExpenseRecord[]>(() => readExpenseCache()?.months[currentYearMonth()] ?? []);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<ExpenseCategory | null>(null);
  const [categoryPage, setCategoryPage] = useState(0);
  const [viewMode, setViewMode] = useState<ViewMode>('REGULAR');
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('category');
  const [budgetInput, setBudgetInput] = useState(String(DEFAULT_WEEKLY_BUDGET));
  const [isSending, setIsSending] = useState(false);
  const beginRequest = useLatestRequestGuard();

  const weeks = getMonthWeeks(yearMonth);

  // 캐시에 그 달이 있으면 월 전환과 같은 틱에 동기적으로 반영 — setYearMonth와 배치돼서 "잘못된 달이 잠깐 보이는" 프레임 없이 바로 맞는 화면(캐시)이 그려짐
  const goToMonth = (next: string) => {
    setYearMonth(next);
    const cached = readExpenseCache()?.months[next];
    if (cached) setRecords(cached);
  };

  const { handleTouchStart, handleTouchEnd } = useSwipeNav((direction) => goToMonth(shiftMonth(yearMonth, direction)));

  const fetchRecords = useCallback(() => {
    const requestedMonth = yearMonth;
    const isStale = beginRequest();

    const cache = readExpenseCache();
    const cachedMonthRecords = cache?.months[requestedMonth];
    // 캐시가 없는 진짜 첫 조회일 때만 로딩 표시. 캐시가 있으면 명시적으로 false로 되돌림 —
    // 안 그러면 stale 처리된 이전 요청이 finally의 setIsLoading(false)를 건너뛰어 로딩 상태가 눌어붙을 수 있음
    setIsLoading(!cachedMonthRecords);

    const fetchFromServer = (months: Record<string, ExpenseRecord[]>, meta: ExpenseMeta | null) => {
      const paddedStart = weeks[0].start;
      const paddedEnd = weeks[weeks.length - 1].end;
      expenseApi.getByRange(paddedStart, paddedEnd)
        .then((data) => {
          if (isStale()) return;
          setRecords(data);
          if (!meta) return;
          const nextMonths = { ...months, [requestedMonth]: data };
          // "지금 보고 있는 달"이 아니라 "오늘"(실제 현재 월) 기준 고정 범위 — 일정 관리와 동일한 패턴, 조회 위치가 바뀌어도 창이 안 움직여서 이 범위 안에서는 왔다갔다 해도 캐시가 안 지워짐
          const keep = new Set([-1, 0, 1, 2, 3].map((offset) => shiftMonth(currentYearMonth(), offset)));
          for (const key of Object.keys(nextMonths)) {
            if (!keep.has(key)) delete nextMonths[key];
          }
          writeExpenseCache({ meta, months: nextMonths });
        })
        .catch((err) => { if (!isStale()) showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'); })
        .finally(() => { if (!isStale()) setIsLoading(false); });
    };

    expenseApi.getMeta()
      .then((meta) => {
        if (isStale()) return;
        const cacheValid = !!cache && isSameExpenseMeta(cache.meta, meta);
        // 캐시가 이미 정확한 걸로 확인됨 — 화면엔 이미 그 데이터가 보이고 있으므로 더 할 일 없음
        if (cacheValid && cachedMonthRecords) return;
        fetchFromServer(cacheValid ? cache!.months : {}, meta);
      })
      // meta 확인 자체가 실패하면(오프라인 등) 캐시 검증을 포기하고 그냥 서버에서 직접 불러옴
      .catch(() => { if (!isStale()) fetchFromServer({}, null); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth, showToast, beginRequest]);

  useEffect(() => {
    setExpandedCategory(null);
    setSelectedWeek(null);
    fetchRecords();
  }, [fetchRecords]);

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
    // 정기지출 모드로 바꾸면 비정기지출 카드 자체가 안 보이게 되므로, 그 카드가 펼쳐진 채로 남아있으면 어색함
    setExpandedCategory(null);
    setCategoryPage(0);
  };

  // 총 지출/카테고리 카드/주 총액/날짜 칸/상세 내역 전부 이 파생 배열 하나만 보고 그림 —
  // "정기지출"이면 비정기지출 건은 통째로 안 보이는 것처럼, "비정기지출 포함"이면 전부 보이는 것처럼
  const visibleRecords = viewMode === 'REGULAR' ? records.filter((r) => r.category !== 'IRREGULAR') : records;
  const visibleCategories = viewMode === 'REGULAR' ? EXPENSE_CATEGORIES.filter((c) => c !== 'IRREGULAR') : EXPENSE_CATEGORIES;

  const monthRecords = visibleRecords.filter((r) => r.expenseDate.startsWith(yearMonth));
  const monthTotal = sumAmount(monthRecords);

  if (selectedWeek) {
    const weekRecords = visibleRecords.filter((r) => inRange(r, selectedWeek)).sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));

    const handleSendSummary = async () => {
      const budget = Number(budgetInput);
      if (!budget || budget <= 0) {
        showToast('예산 금액을 확인해주세요', 'error');
        return;
      }
      setIsSending(true);
      try {
        await expenseApi.sendWeeklySummary(selectedWeek.start, selectedWeek.end, budget);
        showToast('텔레그램으로 전송했습니다', 'success');
      } catch (err) {
        showToast(err instanceof Error ? err.message : '전송에 실패했습니다', 'error');
      } finally {
        setIsSending(false);
      }
    };

    return (
      <div className="flex-1 overflow-y-auto">
        <div className="flex items-center gap-2 px-4 py-2.5 border-b sticky top-0 bg-white">
          <button
            onClick={() => setSelectedWeek(null)}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label="달력으로"
          >
            ‹
          </button>
          <span className="text-sm font-medium">{formatWeekLabel(selectedWeek)}</span>
          <span className="text-sm font-bold ml-auto">{formatAmount(sumAmount(weekRecords))}</span>
        </div>

        <div className="flex border-b shrink-0">
          {DETAIL_TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setDetailTab(t.key)}
              className={`flex-1 text-center py-2 text-xs font-medium transition-colors ${
                detailTab === t.key ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : weekRecords.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">이 주에 등록된 내역이 없습니다</p>
        ) : detailTab === 'method' ? (
          <div className="p-4 space-y-3">
            {PAYMENT_METHODS.map((method) => {
              const items = weekRecords.filter((r) => r.paymentMethod === method);
              if (items.length === 0) return null;
              return (
                <div key={method}>
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>{PAYMENT_METHOD_LABELS[method]} <span className="text-xs text-gray-400 font-normal">{items.length}건</span></span>
                    <span>{formatAmount(sumAmount(items))}</span>
                  </div>
                  <ul className="mt-1 space-y-0.5">
                    {items.map((r) => (
                      <TransactionRow key={r.id} record={r} showMethod={false} />
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="p-4 space-y-5">
            {visibleCategories.map((category) => {
              const items = weekRecords.filter((r) => r.category === category);
              return (
                <section key={category}>
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-gray-500">
                      {EXPENSE_CATEGORY_LABELS[category]} <span className="font-normal text-gray-400">{items.length}건</span>
                    </h3>
                    <span className="text-sm font-medium">{formatAmount(sumAmount(items))}</span>
                  </div>
                  {items.length === 0 ? (
                    <p className="text-xs text-gray-300 mt-1">내역 없음</p>
                  ) : (
                    <ul className="mt-1 space-y-0.5">
                      {items.map((r) => (
                        <TransactionRow key={r.id} record={r} />
                      ))}
                    </ul>
                  )}
                </section>
              );
            })}
          </div>
        )}

        {!isLoading && weekRecords.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-3 border-t">
            <span className="text-xs text-gray-400 shrink-0">예산</span>
            <input
              type="number"
              value={budgetInput}
              onChange={(e) => setBudgetInput(e.target.value)}
              className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button
              onClick={handleSendSummary}
              disabled={isSending}
              className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
            >
              {isSending ? '전송 중...' : '📨 정산 보내기'}
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="flex items-center justify-center gap-3 px-4 py-2.5 border-b shrink-0">
        <button onClick={() => goToMonth(shiftMonth(yearMonth, -1))} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">‹</button>
        <span className="text-sm font-medium">{formatMonthLabel(yearMonth)}</span>
        <button onClick={() => goToMonth(shiftMonth(yearMonth, 1))} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">›</button>
      </div>

      {/* 정기지출만 볼지 비정기지출까지 포함해서 볼지 — 아래 총 지출/카테고리 카드/주 총액/날짜 칸/상세 전부 이 선택 기준으로 표시됨 */}
      <div className="flex mx-4 my-2 border rounded-lg overflow-hidden shrink-0">
        {VIEW_MODE_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => handleViewModeChange(tab.key)}
            className={`flex-1 py-1.5 text-xs font-semibold transition-colors ${
              viewMode === tab.key ? 'bg-gray-900 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : (
        <>
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">
                {formatMonthShortLabel(yearMonth)} {viewMode === 'REGULAR' ? '정기 지출' : '총 지출'}
              </span>
              <span className="text-lg font-bold">{formatAmount(monthTotal)}</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {visibleCategories.map((category) => {
                const total = sumAmount(monthRecords.filter((r) => r.category === category));
                const isExpanded = expandedCategory === category;
                return (
                  <button
                    key={category}
                    onClick={() => { setExpandedCategory(isExpanded ? null : category); setCategoryPage(0); }}
                    className={`flex-1 text-left px-2 py-1.5 rounded-lg border transition-colors ${
                      isExpanded ? 'bg-gray-100 border-gray-300' : 'bg-white border-gray-200 hover:bg-gray-100'
                    }`}
                  >
                    <div className="text-[10px] text-gray-500">{EXPENSE_CATEGORY_LABELS[category]}</div>
                    <div className="text-xs font-bold text-gray-900">
                      {formatAmount(total)}
                    </div>
                  </button>
                );
              })}
            </div>

            {expandedCategory && (() => {
              const items = monthRecords
                .filter((r) => r.category === expandedCategory)
                .sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
              const totalPages = Math.ceil(items.length / CATEGORY_PAGE_SIZE);
              const paged = items.slice(categoryPage * CATEGORY_PAGE_SIZE, (categoryPage + 1) * CATEGORY_PAGE_SIZE);

              return (
                <>
                  <ul className="mt-3 space-y-1 border-t pt-2">
                    {paged.map((r) => (
                      <TransactionRow key={r.id} record={r} />
                    ))}
                    {items.length === 0 && (
                      <li className="text-xs text-gray-300">내역 없음</li>
                    )}
                  </ul>
                  <Pagination page={categoryPage} totalPages={totalPages} onChange={setCategoryPage} className="flex items-center justify-center gap-4 pt-2" />
                </>
              );
            })()}
          </div>

          <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
            <div className="grid grid-cols-7 px-3 pt-2 pb-1">
              {WEEKDAY_LABELS.map((label, i) => (
                <div key={label} className={`text-center text-[10px] font-medium ${weekdayColor(i, true)}`}>
                  {label}
                </div>
              ))}
            </div>

            <div className="divide-y divide-gray-100">
              {weeks.map((week) => {
              const weekRecords = visibleRecords.filter((r) => inRange(r, week));
              const weekTotal = sumAmount(weekRecords);
              const days = weekDays(week, yearMonth, visibleRecords);
              // 비정기지출은 예산 판단 대상이 아니므로(주간 정산 텔레그램과 동일 원칙) 정기지출 모드 +
              // 지출이 있는 주에서만 배지 표시 — 예산 절약이면 초록, 초과면 빨강
              const budgetDiff = DEFAULT_WEEKLY_BUDGET - weekTotal;
              const showBudgetBadge = viewMode === 'REGULAR' && weekTotal > 0;
              return (
                <div key={week.start} className="px-3 py-2">
                  {/* 주 총액 = 주간 상세로 이동하는 버튼 — 화살표 아이콘으로 눌러야 하는 영역임을 표시(날짜 칸과는 별개 클릭 영역) */}
                  <button
                    onClick={() => setSelectedWeek(week)}
                    className="w-full flex items-center justify-end gap-1.5 px-1 py-1 mb-1 rounded hover:bg-gray-100 transition-colors"
                  >
                    <span className={`text-xs ${weekTotal > 0 ? 'font-bold text-gray-900' : 'text-gray-300'}`}>
                      {formatAmount(weekTotal)}
                    </span>
                    {showBudgetBadge && (
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        budgetDiff >= 0 ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                      }`}>
                        {budgetDiff >= 0 ? `${formatAmount(budgetDiff)} 절약` : `+${formatAmount(-budgetDiff)} 초과`}
                      </span>
                    )}
                    <ArrowRightIcon className="w-3 h-3 text-gray-400" />
                  </button>
                  <div className="grid grid-cols-7">
                    {days.map((day, i) => (
                      <button
                        key={day.date}
                        onClick={() => setSelectedDay(day.date)}
                        title={day.holidayName}
                        className={`flex flex-col items-center justify-start py-1 gap-0.5 rounded hover:bg-gray-100 transition-colors ${!day.inMonth ? 'opacity-30' : ''}`}
                      >
                        <span className={`text-[10px] ${dayNumberColor(i, !!day.holidayName)}`}>{day.dayNum}</span>
                        <span className="text-[9px] font-semibold text-gray-700 h-3">
                          {formatAmountCompact(day.amount)}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            </div>
          </div>
        </>
      )}

      {selectedDay && (
        <DayExpensesSheet
          date={selectedDay}
          records={visibleRecords.filter((r) => r.expenseDate === selectedDay)}
          onClose={() => setSelectedDay(null)}
        />
      )}
    </div>
  );
}
