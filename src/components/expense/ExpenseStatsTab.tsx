'use client';

import { useCallback, useRef, useState } from 'react';
import { useClickOutside } from '@/hooks/useClickOutside';
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

type GroupBy = 'category' | 'method';

function defaultStart(): string {
  return shiftDate(todayString(), -6);
}

function MultiSelectDropdown<T extends string>({
  allLabel,
  countLabel,
  options,
  optionLabels,
  selected,
  onToggle,
}: {
  allLabel: string;
  countLabel: string;
  options: T[];
  optionLabels: Record<T, string>;
  selected: Set<T>;
  onToggle: (value: T) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useClickOutside(ref, () => setIsOpen(false));

  const deselected = options.filter((opt) => !selected.has(opt));
  // 대부분 "전체 중 한둘만 빼는" 패턴이라 개수보다 뭐가 빠졌는지 보여주는 게 더 직관적 — 많이 빠지면(선택이 소수면) 개수 표시로 전환
  const buttonLabel =
    deselected.length === 0
      ? allLabel
      : deselected.length <= 2 && selected.size >= deselected.length
        ? `${deselected.map((opt) => optionLabels[opt]).join(', ')} 제외`
        : `${countLabel} ${selected.size}개`;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="flex items-center gap-1 px-2.5 py-1.5 border rounded-lg text-xs text-gray-700 bg-white whitespace-nowrap"
      >
        {buttonLabel}
        <span className="text-gray-400 text-[10px]">⌄</span>
      </button>
      {isOpen && (
        <div className="absolute z-10 mt-1 min-w-[8rem] bg-white border rounded-lg shadow-lg py-1">
          {options.map((opt) => (
            <label
              key={opt}
              className="flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer whitespace-nowrap"
            >
              <input
                type="checkbox"
                checked={selected.has(opt)}
                onChange={() => onToggle(opt)}
                className="w-3.5 h-3.5 shrink-0"
              />
              {optionLabels[opt]}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ExpenseStatsTab({ showToast }: ExpenseStatsTabProps) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayString);
  const [selectedMethods, setSelectedMethods] = useState<Set<PaymentMethod>>(() => new Set(PAYMENT_METHODS));
  const [selectedCategories, setSelectedCategories] = useState<Set<ExpenseCategory>>(() => new Set(EXPENSE_CATEGORIES));
  const [groupBy, setGroupBy] = useState<GroupBy>('category');
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);
  const [detailPage, setDetailPage] = useState(0);

  const fetchRecords = useCallback(() => {
    setIsLoading(true);
    return expenseApi.getByRange(startDate, endDate)
      .then(setRecords)
      .catch((err) => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
      .finally(() => setIsLoading(false));
  }, [startDate, endDate, showToast]);

  const handleSearch = () => {
    setExpandedGroup(null);
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

  const toggleCategory = (category: ExpenseCategory) => {
    setSelectedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(category)) next.delete(category);
      else next.add(category);
      return next;
    });
  };

  const changeGroupBy = (g: GroupBy) => {
    setGroupBy(g);
    setExpandedGroup(null);
    setDetailPage(0);
  };

  const filteredRecords = records.filter((r) => selectedMethods.has(r.paymentMethod) && selectedCategories.has(r.category));
  const total = sumAmount(filteredRecords);

  const groups: { key: string; label: string; records: ExpenseRecord[] }[] =
    groupBy === 'category'
      ? EXPENSE_CATEGORIES.filter((c) => selectedCategories.has(c)).map((c) => ({
          key: c,
          label: EXPENSE_CATEGORY_LABELS[c],
          records: filteredRecords.filter((r) => r.category === c),
        }))
      : PAYMENT_METHODS.filter((m) => selectedMethods.has(m)).map((m) => ({
          key: m,
          label: PAYMENT_METHOD_LABELS[m],
          records: filteredRecords.filter((r) => r.paymentMethod === m),
        }));

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

        <div className="flex items-center gap-1.5">
          <MultiSelectDropdown
            allLabel="전체 구분"
            countLabel="구분"
            options={EXPENSE_CATEGORIES}
            optionLabels={EXPENSE_CATEGORY_LABELS}
            selected={selectedCategories}
            onToggle={toggleCategory}
          />
          <MultiSelectDropdown
            allLabel="전체 결제수단"
            countLabel="결제수단"
            options={PAYMENT_METHODS}
            optionLabels={PAYMENT_METHOD_LABELS}
            selected={selectedMethods}
            onToggle={toggleMethod}
          />
        </div>
      </div>

      {!hasSearched ? (
        <p className="text-sm text-gray-400 text-center py-10">조건을 선택하고 조회 버튼을 눌러주세요</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {startDate.replace(/-/g, '.')} ~ {endDate.replace(/-/g, '.')} 총 지출
            </span>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => changeGroupBy('category')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  groupBy === 'category' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                카테고리별
              </button>
              <button
                onClick={() => changeGroupBy('method')}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium transition-colors ${
                  groupBy === 'method' ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                결제수단별
              </button>
            </div>
          </div>
          <div className="text-right text-lg font-bold mt-0.5">{formatAmount(total)}</div>

          <div className="mt-3 divide-y divide-gray-100 border-t border-b">
            {groups.map((group) => {
              const groupTotal = sumAmount(group.records);
              const isExpanded = expandedGroup === group.key;
              const items = [...group.records].sort((a, b) => a.expenseDate.localeCompare(b.expenseDate));
              const totalPages = Math.ceil(items.length / DETAIL_PAGE_SIZE);
              const paged = items.slice(detailPage * DETAIL_PAGE_SIZE, (detailPage + 1) * DETAIL_PAGE_SIZE);

              return (
                <div key={group.key}>
                  <button
                    onClick={() => { setExpandedGroup(isExpanded ? null : group.key); setDetailPage(0); }}
                    className="w-full flex items-center justify-between py-3 hover:bg-gray-50 transition-colors"
                  >
                    <span className="text-sm text-gray-600">{group.label}</span>
                    <span className="text-sm font-bold text-gray-900">{formatAmount(groupTotal)}</span>
                  </button>

                  {isExpanded && (
                    <div className="pb-3">
                      <ul className="space-y-1">
                        {paged.map((r) => (
                          <TransactionRow key={r.id} record={r} showMethod={groupBy !== 'method'} />
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
