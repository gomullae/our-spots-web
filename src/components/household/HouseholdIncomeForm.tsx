'use client';

import { useState } from 'react';
import FormModal from '@/components/FormModal';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { HouseholdIncomePayload } from '@/types';

interface HouseholdIncomeFormProps {
  initialLabel?: string;
  initialAmount?: number;
  initialMemo?: string;
  isEditMode?: boolean;
  onSubmit: (data: HouseholdIncomePayload) => Promise<void>;
  onClose: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
}

export default function HouseholdIncomeForm({
  initialLabel,
  initialAmount,
  initialMemo,
  isEditMode,
  onSubmit,
  onClose,
  onDelete,
  onHistory,
}: HouseholdIncomeFormProps) {
  const [label, setLabel] = useState(initialLabel || '');
  const [amount, setAmount] = useState(initialAmount != null ? initialAmount.toLocaleString('ko-KR') : '');
  const [memo, setMemo] = useState(initialMemo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  useEscapeKey(onClose);

  const amountValue = Number(amount.replace(/,/g, ''));
  const isValid = label.trim().length > 0 && amountValue > 0;

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '');
    setAmount(digits ? Number(digits).toLocaleString('ko-KR') : '');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({ label: label.trim(), amount: amountValue, memo: memo.trim() || undefined });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal title={isEditMode ? '수입 항목 수정' : '수입 항목 추가'} onClose={onClose} onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">구분 *</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 급여"
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">금액 *</label>
        <input
          type="text"
          inputMode="numeric"
          value={amount}
          onChange={handleAmountChange}
          placeholder="원"
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="예: PS(1회/년, 700)"
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <div className="flex gap-2">
        {isEditMode && onHistory && (
          <button
            type="button"
            onClick={onHistory}
            className="px-3 py-2.5 rounded-lg font-medium text-sm text-gray-600 hover:bg-gray-100 transition-colors"
          >
            이력
          </button>
        )}
        {isEditMode && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="px-3 py-2.5 rounded-lg font-medium text-sm text-red-600 hover:bg-red-50 transition-colors"
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
    </FormModal>
  );
}
