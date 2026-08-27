'use client';

import { useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { ExpenseCategory, ExpenseRecordPayload, PaymentMethod } from '@/types';
import { EXPENSE_CATEGORIES, EXPENSE_CATEGORY_LABELS, PAYMENT_METHODS, PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { todayString } from '@/utils/weightDate';
import { CloseIcon } from '@/components/icons';

interface ExpenseFormProps {
  initialExpenseDate?: string;
  initialPaymentMethod?: PaymentMethod;
  initialCategory?: ExpenseCategory;
  initialMerchant?: string;
  initialAmount?: number;
  isEditMode?: boolean;
  onSubmit: (data: ExpenseRecordPayload) => Promise<void>;
  onClose: () => void;
}

export default function ExpenseForm({
  initialExpenseDate,
  initialPaymentMethod,
  initialCategory,
  initialMerchant,
  initialAmount,
  isEditMode,
  onSubmit,
  onClose,
}: ExpenseFormProps) {
  const [expenseDate, setExpenseDate] = useState(initialExpenseDate || todayString());
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(initialPaymentMethod || 'WOORI_CARD');
  const [category, setCategory] = useState<ExpenseCategory>(initialCategory || 'FOOD');
  const [merchant, setMerchant] = useState(initialMerchant || '');
  const [amount, setAmount] = useState(initialAmount ? String(initialAmount) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  useEscapeKey(onClose);

  const amountValue = Number(amount);
  const isValid = merchant.trim().length > 0 && amountValue > 0 && expenseDate <= todayString();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        expenseDate,
        paymentMethod,
        category,
        merchant: merchant.trim(),
        amount: amountValue,
      });
      onClose();
    } catch (err) {
      console.error('Failed to save expense record:', err);
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{isEditMode ? '지출 내역 수정' : '지출 내역 추가'}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="닫기">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">지출일자 *</label>
            <div className="w-full overflow-hidden border rounded-lg focus-within:ring-2 focus-within:ring-blue-500">
              <input
                type="date"
                value={expenseDate}
                max={todayString()}
                onChange={(e) => setExpenseDate(e.target.value)}
                className="w-full min-w-0 max-w-full px-3 py-2 text-sm focus:outline-none"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">구분 *</label>
            <div className="flex gap-2">
              {EXPENSE_CATEGORIES.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                    category === c ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {EXPENSE_CATEGORY_LABELS[c]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">결제수단 *</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {PAYMENT_METHODS.map((p) => (
                <option key={p} value={p}>{PAYMENT_METHOD_LABELS[p]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">사용처 *</label>
            <input
              type="text"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="예: 이마트"
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">금액 *</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="원"
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={!isValid || isSubmitting}
            className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
          >
            {isSubmitting ? '저장 중...' : isEditMode ? '수정' : '저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
