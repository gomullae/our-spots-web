'use client';

import { useEffect, useState } from 'react';
import { CloseIcon } from '@/components/icons';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { householdBudgetApi } from '@/services/api';
import { HouseholdHistoryAction, HouseholdHistoryEntry } from '@/types';
import { formatAmount } from '@/utils/expenseFormat';

interface HouseholdHistoryModalProps {
  kind: 'income' | 'item';
  id: number;
  label: string;
  onClose: () => void;
}

const ACTION_LABELS: Record<HouseholdHistoryAction, string> = {
  CREATE: '등록',
  UPDATE: '수정',
  DELETE: '삭제',
  RESTORE: '복구',
};

const ACTION_COLORS: Record<HouseholdHistoryAction, string> = {
  CREATE: 'bg-blue-50 text-blue-600',
  UPDATE: 'bg-amber-50 text-amber-600',
  DELETE: 'bg-red-50 text-red-600',
  RESTORE: 'bg-green-50 text-green-600',
};

function formatDateTime(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

// 항목 하나(수입 또는 예산 항목)의 변경 이력 타임라인 — household_history 테이블 조회 결과를 그대로 보여줌
export default function HouseholdHistoryModal({ kind, id, label, onClose }: HouseholdHistoryModalProps) {
  const [entries, setEntries] = useState<HouseholdHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  useEscapeKey(onClose);

  useEffect(() => {
    const fetcher = kind === 'income' ? householdBudgetApi.getIncomeHistory : householdBudgetApi.getItemHistory;
    fetcher(id)
      .then(setEntries)
      .catch((err) => setError(err instanceof Error ? err.message : '이력을 불러오지 못했습니다'))
      .finally(() => setIsLoading(false));
  }, [kind, id]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-80 max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white">
          <div>
            <h2 className="text-sm font-bold">변경 이력</h2>
            <p className="text-xs text-gray-400 mt-0.5">{label}</p>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="닫기">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          {isLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">불러오는 중...</p>
          ) : error ? (
            <p className="text-sm text-red-500 text-center py-6">{error}</p>
          ) : entries.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">이력이 없습니다</p>
          ) : (
            <ul className="space-y-3">
              {entries.map((entry) => (
                <li key={entry.id} className="flex items-start gap-2">
                  <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded-full font-medium ${ACTION_COLORS[entry.action]}`}>
                    {ACTION_LABELS[entry.action]}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium">{formatAmount(entry.amount)}</p>
                    <p className="text-[11px] text-gray-400">{formatDateTime(entry.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
