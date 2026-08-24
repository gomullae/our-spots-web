'use client';

import { useCallback, useEffect, useState } from 'react';
import { Toast } from '@/hooks/useToast';
import { expenseApi } from '@/services/api';
import { ExpenseCategory, ExpenseRecord } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
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
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<ExpenseCategory | null>(null);
  const [categoryPage, setCategoryPage] = useState(0);
  const [selectedWeek, setSelectedWeek] = useState<WeekRange | null>(null);
  const [detailTab, setDetailTab] = useState<DetailTab>('category');
  const [budgetInput, setBudgetInput] = useState('420000');
  const [isSending, setIsSending] = useState(false);

  const weeks = getMonthWeeks(yearMonth);

  const fetchRecords = useCallback(() => {
    const paddedStart = weeks[0].start;
    const paddedEnd = weeks[weeks.length - 1].end;
    setIsLoading(true);
    return expenseApi.getByRange(paddedStart, paddedEnd)
      .then(setRecords)
      .catch((err) => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [yearMonth, showToast]);

  useEffect(() => {
    setExpandedCategory(null);
    setSelectedWeek(null);
    fetchRecords();
  }, [fetchRecords]);

  const monthRecords = records.filter((r) => r.expenseDate.startsWith(yearMonth));
  const monthTotal = sumAmount(monthRecords);

  if (selectedWeek) {
    const weekRecords = records.filter((r) => inRange(r, selectedWeek)).sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));

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
            {EXPENSE_CATEGORIES.map((category) => {
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
        <button onClick={() => setYearMonth((m) => shiftMonth(m, -1))} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">‹</button>
        <span className="text-sm font-medium">{formatMonthLabel(yearMonth)}</span>
        <button onClick={() => setYearMonth((m) => shiftMonth(m, 1))} className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1">›</button>
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : (
        <>
          <div className="px-4 py-3 border-b bg-gray-50">
            <div className="flex items-baseline justify-between">
              <span className="text-xs text-gray-500">{formatMonthShortLabel(yearMonth)} 총 지출</span>
              <span className="text-lg font-bold">{formatAmount(monthTotal)}</span>
            </div>
            <div className="flex gap-1.5 mt-2">
              {EXPENSE_CATEGORIES.map((category) => {
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
                  {totalPages > 1 && (
                    <div className="flex items-center justify-center gap-4 pt-2">
                      <button
                        onClick={() => setCategoryPage((p) => Math.max(0, p - 1))}
                        disabled={categoryPage === 0}
                        className="text-xs font-medium text-gray-600 disabled:text-gray-300 transition-colors"
                      >
                        이전
                      </button>
                      <span className="text-[11px] text-gray-400">{categoryPage + 1} / {totalPages}</span>
                      <button
                        onClick={() => setCategoryPage((p) => Math.min(totalPages - 1, p + 1))}
                        disabled={categoryPage >= totalPages - 1}
                        className="text-xs font-medium text-gray-600 disabled:text-gray-300 transition-colors"
                      >
                        다음
                      </button>
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          <div className="grid grid-cols-7 px-3 pt-2 pb-1">
            {WEEKDAY_LABELS.map((label, i) => (
              <div key={label} className={`text-center text-[10px] font-medium ${weekdayColor(i, true)}`}>
                {label}
              </div>
            ))}
          </div>

          <div className="divide-y divide-gray-100">
            {weeks.map((week) => {
              const weekRecords = records.filter((r) => inRange(r, week));
              const weekTotal = sumAmount(weekRecords);
              const days = weekDays(week, yearMonth, records);
              return (
                <button
                  key={week.start}
                  onClick={() => setSelectedWeek(week)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center justify-end px-1 mb-1">
                    <span className={`text-xs ${weekTotal > 0 ? 'font-bold text-gray-900' : 'text-gray-300'}`}>
                      {formatAmount(weekTotal)}
                    </span>
                  </div>
                  <div className="grid grid-cols-7">
                    {days.map((day, i) => (
                      <div
                        key={day.date}
                        title={day.holidayName}
                        className={`flex flex-col items-center justify-start py-1 gap-0.5 ${!day.inMonth ? 'opacity-30' : ''}`}
                      >
                        <span className={`text-[10px] ${dayNumberColor(i, !!day.holidayName)}`}>{day.dayNum}</span>
                        <span className="text-[9px] font-semibold text-gray-700 h-3">
                          {formatAmountCompact(day.amount)}
                        </span>
                      </div>
                    ))}
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
