'use client';

import { useCallback, useState } from 'react';
import ExpenseForm from '@/components/expense/ExpenseForm';
import { RestoreIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { expenseApi } from '@/services/api';
import { ExpenseCategory, ExpenseRecord, ExpenseRecordPayload, PaymentMethod } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_BADGE_COLORS, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { effectiveAmount, formatAmount, formatDateTimeCompact, sumAmount } from '@/utils/expenseFormat';
import { parseDateString, toDateString, todayString } from '@/utils/weightDate';

interface ExpenseEntryTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

type SortBy = 'expenseDate' | 'amount' | 'createdAt' | 'updatedAt';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'expenseDate', label: '지출일자순' },
  { key: 'amount', label: '금액순' },
  { key: 'createdAt', label: '등록일시순' },
  { key: 'updatedAt', label: '수정일시순' },
];

// 생성 시 createdAt/updatedAt이 각각 별도로 now()를 호출해서 값이 미세하게 달라질 수 있어 분 단위로 잘라서 비교
function wasEdited(record: ExpenseRecord): boolean {
  const created = Math.floor(new Date(record.createdAt).getTime() / 60000);
  const updated = Math.floor(new Date(record.updatedAt).getTime() / 60000);
  return updated !== created;
}

// 기본 조회기간 = 오늘로부터 한 달 전 (달력상의 그 달이 아니라 날짜 기준 롤링 윈도우)
function defaultStart(): string {
  const date = parseDateString(todayString());
  date.setMonth(date.getMonth() - 1);
  return toDateString(date);
}

export default function ExpenseEntryTab({ showToast, showConfirm }: ExpenseEntryTabProps) {
  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(todayString);
  const [keyword, setKeyword] = useState('');
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('expenseDate');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  // 조회기간/검색어는 값이 바뀔 때마다 자동 재조회하지 않고, "조회" 버튼(또는 검색어에서 Enter)을
  // 눌렀을 때만 서버에 요청 — 통계 탭과 동일한 절제된 패턴
  const fetchRecords = useCallback(() => {
    setIsLoading(true);
    return expenseApi.getByRange(startDate, endDate, true, keyword.trim() || undefined)
      .then((data) => setRecords(data))
      .catch((err) => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
      .finally(() => setIsLoading(false));
  }, [startDate, endDate, keyword, showToast]);

  const handleSearch = () => {
    setSelectedIds(new Set());
    setHasSearched(true);
    fetchRecords();
  };

  // 조회기간/검색어가 자유로워지면서 "지금 화면에 보이는 기간에 속하는지"를 프론트에서 재현하기 어려워짐
  // (키워드 LIKE 매칭까지 클라이언트에서 다시 구현해야 함) — 등록/수정 후에는 그냥 현재 조회 조건으로 다시
  // 불러오는 쪽이 더 단순하고 정확함(체중/가계 현황에서도 같은 이유로 이미 적용한 패턴)
  const handleCreate = async (data: ExpenseRecordPayload) => {
    await expenseApi.create(data);
    showToast('등록했습니다', 'success');
    setHasSearched(true);
    await fetchRecords();
  };

  const handleUpdate = async (data: ExpenseRecordPayload) => {
    if (!editingRecord) return;
    await expenseApi.update(editingRecord.id, data);
    showToast('수정했습니다', 'success');
    setHasSearched(true);
    await fetchRecords();
  };

  const filteredRecords = records
    .filter((r) => (!categoryFilter || r.category === categoryFilter) && (!methodFilter || r.paymentMethod === methodFilter))
    .sort((a, b) => {
      // createdAt/updatedAt은 시:분:초.밀리초까지 있는 전체 datetime 문자열이라 localeCompare(로케일
      // 정렬 규칙 적용)로 비교하면 실제 시간 순서와 어긋날 수 있음 — Date로 파싱해 숫자 비교로 교체
      // (expenseDate는 "YYYY-MM-DD"만 있는 날짜 전용 문자열이라 localeCompare로도 항상 안전함)
      const cmp = sortBy === 'amount'
        ? a.amount - b.amount
        : sortBy === 'createdAt' || sortBy === 'updatedAt'
          ? new Date(a[sortBy]).getTime() - new Date(b[sortBy]).getTime()
          : a.expenseDate.localeCompare(b.expenseDate);
      return sortDir === 'desc' ? -cmp : cmp;
    });

  const selectableIds = filteredRecords.filter((r) => !r.deletedAt).map((r) => r.id);
  const allSelected = selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));

  const toggleSelectAll = () => {
    setSelectedIds(allSelected ? new Set() : new Set(selectableIds));
  };

  const toggleSelect = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleRestore = async (record: ExpenseRecord) => {
    try {
      const restored = await expenseApi.restore(record.id);
      setRecords((prev) => prev.map((r) => (r.id === restored.id ? restored : r)));
      showToast('복구했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '복구에 실패했습니다', 'error');
    }
  };

  const handleBulkDelete = () => {
    const ids = Array.from(selectedIds);
    if (ids.length === 0 || isBulkDeleting) return;

    showConfirm(`선택한 ${ids.length}건을 삭제하시겠습니까?`, async () => {
      setIsBulkDeleting(true);
      try {
        await Promise.all(ids.map((id) => expenseApi.delete(id)));
        showToast(`${ids.length}건 삭제했습니다`, 'success');
        setSelectedIds(new Set());
        await fetchRecords();
      } catch (err) {
        showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
      } finally {
        setIsBulkDeleting(false);
      }
    }, true);
  };

  const activeRecords = filteredRecords.filter((r) => !r.deletedAt);
  const total = sumAmount(activeRecords);

  return (
    <>
      <div className="flex items-center gap-2 px-4 py-2.5 border-b shrink-0">
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
          className="shrink-0 w-14 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          조회
        </button>
        <button
          onClick={() => setShowAddForm(true)}
          className="shrink-0 w-14 py-[calc(0.375rem-1px)] rounded-lg border border-gray-900 text-gray-900 text-xs font-medium hover:bg-gray-100 transition-colors"
        >
          추가
        </button>
      </div>

      <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0">
        <input
          type="text"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
          placeholder="사용처 검색"
          className="w-full px-2.5 py-1.5 border rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {!isLoading && hasSearched && records.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 flex-wrap">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortBy)}
            className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
            title={sortDir === 'desc' ? '내림차순' : '오름차순'}
            className="shrink-0 px-2 py-1 border rounded text-xs text-gray-600 hover:bg-gray-50 transition-colors"
          >
            {sortDir === 'desc' ? '↓ 내림차순' : '↑ 오름차순'}
          </button>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | '')}
            className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 구분</option>
            {EXPENSE_CATEGORIES.map((c) => (
              <option key={c} value={c}>{EXPENSE_CATEGORY_LABELS[c]}</option>
            ))}
          </select>
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value as PaymentMethod | '')}
            className="flex-1 min-w-0 px-2 py-1 border rounded text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">전체 결제수단</option>
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{PAYMENT_METHOD_LABELS[m]}</option>
            ))}
          </select>
        </div>
      )}

      {!isLoading && hasSearched && records.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2 border-b shrink-0 bg-gray-50">
          <label className="flex items-center gap-1.5 text-xs text-gray-500">
            <input type="checkbox" checked={allSelected} onChange={toggleSelectAll} className="w-3.5 h-3.5" />
            전체선택
          </label>
          {selectedIds.size > 0 ? (
            <button
              onClick={handleBulkDelete}
              disabled={isBulkDeleting}
              className="ml-auto text-xs font-medium text-red-600 hover:text-red-700 disabled:text-gray-300 transition-colors"
            >
              {isBulkDeleting ? '삭제 중...' : `선택 삭제 (${selectedIds.size})`}
            </button>
          ) : (
            <span className="ml-auto text-xs text-gray-400">총 {activeRecords.length}건</span>
          )}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {!hasSearched ? (
          <p className="text-sm text-gray-400 text-center py-10">조건을 선택하고 조회 버튼을 눌러주세요</p>
        ) : isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">조회 결과가 없습니다</p>
        ) : filteredRecords.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">조건에 맞는 내역이 없습니다</p>
        ) : (
          <ul className="divide-y divide-gray-100">
            {filteredRecords.map((record) => (
              <li
                key={record.id}
                onClick={() => { if (!record.deletedAt) setEditingRecord(record); }}
                className={`flex items-start gap-2 px-4 py-3 ${
                  record.deletedAt ? 'bg-red-50/50' : 'cursor-pointer hover:bg-gray-50 transition-colors'
                }`}
              >
                <input
                  type="checkbox"
                  checked={selectedIds.has(record.id)}
                  disabled={!!record.deletedAt}
                  onClick={(e) => e.stopPropagation()}
                  onChange={() => toggleSelect(record.id)}
                  className="w-3.5 h-3.5 mt-1 shrink-0 disabled:opacity-30"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-400 shrink-0">{record.expenseDate.slice(5)}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${EXPENSE_CATEGORY_BADGE_COLORS[record.category]}`}>
                      {EXPENSE_CATEGORY_LABELS[record.category]}
                    </span>
                    <span className={`text-sm font-medium truncate ${record.deletedAt ? 'line-through text-gray-400' : ''}`}>
                      {record.merchant}
                    </span>
                    {record.deletedAt && (
                      <span className="flex items-center gap-1 shrink-0 ml-auto">
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600">
                          삭제됨 · {formatDateTimeCompact(record.deletedAt)}
                        </span>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleRestore(record); }}
                          title="복구"
                          className="text-blue-600 hover:text-blue-700 transition-colors"
                        >
                          <RestoreIcon className="w-4 h-4" />
                        </button>
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-gray-500">{PAYMENT_METHOD_LABELS[record.paymentMethod]}</span>
                    {!record.deletedAt && wasEdited(record) && (
                      <span className="text-[10px] text-gray-400">수정됨 · {formatDateTimeCompact(record.updatedAt)}</span>
                    )}
                    <span className={`text-xs font-medium ml-auto ${record.paymentMethod === 'SUBSIDY' ? 'text-green-600' : 'text-gray-700'}`}>
                      {formatAmount(effectiveAmount(record))}
                    </span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && hasSearched && activeRecords.length > 0 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t shrink-0 bg-gray-50">
          <span className="text-xs text-gray-400">총 {activeRecords.length}건</span>
          <span className="text-sm font-bold">{formatAmount(total)}</span>
        </div>
      )}

      {showAddForm && (
        <ExpenseForm onSubmit={handleCreate} onClose={() => setShowAddForm(false)} />
      )}
      {editingRecord && (
        <ExpenseForm
          isEditMode
          initialExpenseDate={editingRecord.expenseDate}
          initialPaymentMethod={editingRecord.paymentMethod}
          initialCategory={editingRecord.category}
          initialMerchant={editingRecord.merchant}
          initialAmount={editingRecord.amount}
          onSubmit={handleUpdate}
          onClose={() => setEditingRecord(null)}
        />
      )}
    </>
  );
}
