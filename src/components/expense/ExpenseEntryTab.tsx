'use client';

import { useCallback, useEffect, useState } from 'react';
import ExpenseForm from '@/components/expense/ExpenseForm';
import { RestoreIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { expenseApi } from '@/services/api';
import { ExpenseCategory, ExpenseRecord, ExpenseRecordPayload, PaymentMethod } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_BADGE_COLORS, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { formatAmount, formatDateTimeCompact, sumAmount } from '@/utils/expenseFormat';
import { currentYearMonth, formatMonthLabel, shiftMonth } from '@/utils/expenseDate';
import { toDateString } from '@/utils/weightDate';

interface ExpenseEntryTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

type SortBy = 'expenseDate' | 'amount';

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: 'expenseDate', label: '지출일자순' },
  { key: 'amount', label: '금액순' },
];

// 생성 시 createdAt/updatedAt이 각각 별도로 now()를 호출해서 값이 미세하게 달라질 수 있어 분 단위로 잘라서 비교
function wasEdited(record: ExpenseRecord): boolean {
  const created = Math.floor(new Date(record.createdAt).getTime() / 60000);
  const updated = Math.floor(new Date(record.updatedAt).getTime() / 60000);
  return updated !== created;
}

export default function ExpenseEntryTab({ showToast, showConfirm }: ExpenseEntryTabProps) {
  const [yearMonth, setYearMonth] = useState(currentYearMonth);
  const [records, setRecords] = useState<ExpenseRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingRecord, setEditingRecord] = useState<ExpenseRecord | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | ''>('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [sortBy, setSortBy] = useState<SortBy>('expenseDate');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');

  const fetchRecords = useCallback(() => {
    const [year, month] = yearMonth.split('-').map(Number);
    const start = `${yearMonth}-01`;
    const end = toDateString(new Date(year, month, 0));
    setIsLoading(true);
    return expenseApi.getByRange(start, end, true)
      .then((data) => setRecords(data))
      .catch((err) => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
      .finally(() => setIsLoading(false));
  }, [yearMonth, showToast]);

  useEffect(() => {
    setSelectedIds(new Set());
    fetchRecords();
  }, [fetchRecords]);

  const handleCreate = async (data: ExpenseRecordPayload) => {
    const created = await expenseApi.create(data);
    if (created.expenseDate.startsWith(yearMonth)) {
      setRecords((prev) => [...prev, created]);
    }
    showToast('등록했습니다', 'success');
  };

  const handleUpdate = async (data: ExpenseRecordPayload) => {
    if (!editingRecord) return;
    const updated = await expenseApi.update(editingRecord.id, data);
    if (updated.expenseDate.startsWith(yearMonth)) {
      setRecords((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    } else {
      setRecords((prev) => prev.filter((r) => r.id !== updated.id));
    }
    showToast('수정했습니다', 'success');
  };

  const filteredRecords = records
    .filter((r) => (!categoryFilter || r.category === categoryFilter) && (!methodFilter || r.paymentMethod === methodFilter))
    .sort((a, b) => {
      const cmp = sortBy === 'amount' ? a.amount - b.amount : a.expenseDate.localeCompare(b.expenseDate);
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
      <div className="flex items-center justify-between px-4 py-2.5 border-b shrink-0">
        <div className="flex items-center gap-2">
          <button onClick={() => setYearMonth((m) => shiftMonth(m, -1))} className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none">‹</button>
          <span className="text-sm font-medium">{formatMonthLabel(yearMonth)}</span>
          <button onClick={() => setYearMonth((m) => shiftMonth(m, 1))} className="text-gray-400 hover:text-gray-600 px-1 text-lg leading-none">›</button>
        </div>
        <button
          onClick={() => setShowAddForm(true)}
          className="text-xs font-medium text-blue-600 hover:text-blue-700 transition-colors"
        >
          + 추가
        </button>
      </div>

      {!isLoading && records.length > 0 && (
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

      {!isLoading && records.length > 0 && (
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
        {isLoading ? (
          <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
        ) : records.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-10">이 달에 등록된 내역이 없습니다</p>
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
                    <span className="text-xs text-gray-700 font-medium ml-auto">{formatAmount(record.amount)}</span>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!isLoading && activeRecords.length > 0 && (
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
