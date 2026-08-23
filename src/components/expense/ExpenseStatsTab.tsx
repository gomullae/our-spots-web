'use client';

import { useCallback, useState } from 'react';
import { Toast } from '@/hooks/useToast';
import { expenseApi } from '@/services/api';
import { ExpenseCategory, ExpenseRecord, PaymentMethod } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { formatAmount, sumAmount } from '@/utils/expenseFormat';
import { shiftDate, todayString } from '@/utils/weightDate';
import TransactionRow from './TransactionRow';

interface ExpenseStatsTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
}

const DETAIL_PAGE_SIZE = 10;
const DEFAULT_EXCLUDED_METHODS: PaymentMethod[] = ['CHOYOUNG_PAYMENT'];

function defaultStart(): string {
  return shiftDate(todayString(), -6);
}

export default function ExpenseStatsTab({ showToast }: ExpenseStatsTabProps) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayString);
  const [selectedMethods, setSelectedMethods] = useState<Set<PaymentMethod>>(
    () => new Set(PAYMENT_METHODS.filter((m) => !DEFAULT_EXCLUDED_METHODS.includes(m)))
  );
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedCategory, setExpandedCategory] = useState<ExpenseCategory | null>(null);
  const [detailPage, setDetailPage] = useState(0);

  const fetchRecords = useCallback(() => {
    setIsLoading(true);
    return expenseApi.getByRange(startDate, endDate)
      .then(setRecords)
      .catch((err) => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
      .finally(() => setIsLoading(false));
  }, [startDate, endDate, showToast]);

  const handleSearch = () => {
    setExpandedCategory(null);
    setDetailPage(0);
    setHasSearched(true);
    fetchRecords();
  };

  const toggleMethod = (method: PaymentMethod) => {
    setSelectedMethods((prev) => {
      const next = new Set(prev);
      if (next.has(method)) next.delete(method);
      else next.add(method);
      return next;
    });
  };

  const filteredRecords = records.filter((r) => selectedMethods.has(r.paymentMethod));
  const total = sumAmount(filteredRecords);

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="p-4 space-y-3 border-b">
        <div className="flex items-center gap-2">
          <div className="flex-1 overflow-hidden border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="date"
              value={startDate}
              max={endDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full min-w-0 max-w-full px-2 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <span className="text-gray-400 text-xs shrink-0">~</span>
          <div className="flex-1 overflow-hidden border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
            <input
              type="date"
              value={endDate}
              min={startDate}
              max={todayString()}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full min-w-0 max-w-full px-2 py-1.5 text-xs focus:outline-none"
            />
          </div>
          <button
            onClick={handleSearch}
            disabled={isLoading}
            className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            {isLoading ? '조회 중...' : '조회'}
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {PAYMENT_METHODS.map((method) => {
            const active = selectedMethods.has(method);
            return (
              <button
                key={method}
                onClick={() => toggleMethod(method)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  active ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {PAYMENT_METHOD_LABELS[method]}
              </button>
            );
          })}
        </div>
      </div>

      {!hasSearched ? (
        <p className="text-sm text-gray-400 text-center py-10">조건을 선택하고 조회 버튼을 눌러주세요</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : (
        <div className="px-4 py-3">
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-gray-500">
              {startDate.replace(/-/g, '.')} ~ {endDate.replace(/-/g, '.')} 총 지출
            </span>
            <span className="text-lg font-bold">{formatAmount(total)}</span>
          </div>

          <div className="mt-3 divide-y divide-gray-100 border-t border-b">
            {EXPENSE_CATEGORIES.map((category) => {
              const categoryRecords = filteredRecords.filter((r) => r.category === category);
              const categoryTotal = sumAmount(categoryRecords);
              const isExpanded = expandedCategory === category;
              const items = categoryRecords.sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
              const totalPages = Math.ceil(items.length / DETAIL_PAGE_SIZE);
              const paged = items.slice(detailPage * DETAIL_PAGE_SIZE, (detailPage + 1) * DETAIL_PAGE_SIZE);

              return (
                <div key={category}>
                  <button
                    onClick={() => { setExpandedCategory(isExpanded ? null : category); setDetailPage(0); }}
                    className="w-full flex items-center justify-between py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-600">{EXPENSE_CATEGORY_LABELS[category]}</span>
                    <span className="text-sm font-bold text-gray-900">{formatAmount(categoryTotal)}</span>
                  </button>

                  {isExpanded && (
                    <div className="pb-3">
                      <ul className="space-y-1">
                        {paged.map((r) => (
                          <TransactionRow key={r.id} record={r} />
                        ))}
                        {items.length === 0 && (
                          <li className="text-xs text-gray-300">내역 없음</li>
                        )}
                      </ul>
                      {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-4 pt-3">
                          <button
                            onClick={() => setDetailPage((p) => Math.max(0, p - 1))}
                            disabled={detailPage === 0}
                            className="text-xs font-medium text-gray-600 disabled:text-gray-300 transition-colors"
                          >
                            이전
                          </button>
                          <span className="text-[11px] text-gray-400">{detailPage + 1} / {totalPages}</span>
                          <button
                            onClick={() => setDetailPage((p) => Math.min(totalPages - 1, p + 1))}
                            disabled={detailPage >= totalPages - 1}
                            className="text-xs font-medium text-gray-600 disabled:text-gray-300 transition-colors"
                          >
                            다음
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
