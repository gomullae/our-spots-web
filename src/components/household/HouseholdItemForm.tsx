'use client';

import { useState } from 'react';
import FormModal from '@/components/FormModal';
import { useCommaAmountInput } from '@/hooks/useCommaAmountInput';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { HOUSEHOLD_ASSET_KIND_LABELS, HOUSEHOLD_PAYERS, HOUSEHOLD_PAYER_LABELS, HOUSEHOLD_SECTIONS, HOUSEHOLD_SECTION_LABELS } from '@/constants/householdConfig';
import { HouseholdAssetKind, HouseholdBudgetItemPayload, HouseholdPayer, HouseholdSectionType } from '@/types';

interface HouseholdItemFormProps {
  initialSectionType?: HouseholdSectionType;
  initialAssetKind?: HouseholdAssetKind;
  initialLabel?: string;
  initialVendor?: string;
  initialAmount?: number;
  initialPayer?: HouseholdPayer;
  initialAutoDebitBank?: string;
  initialDebitDay?: number;
  initialAccount?: string;
  initialPlannedMonth?: string;
  initialMemo?: string;
  isEditMode?: boolean;
  onSubmit: (data: HouseholdBudgetItemPayload) => Promise<void>;
  onClose: () => void;
  onDelete?: () => void;
  onHistory?: () => void;
}

export default function HouseholdItemForm({
  initialSectionType,
  initialAssetKind,
  initialLabel,
  initialVendor,
  initialAmount,
  initialPayer,
  initialAutoDebitBank,
  initialDebitDay,
  initialAccount,
  initialPlannedMonth,
  initialMemo,
  isEditMode,
  onSubmit,
  onClose,
  onDelete,
  onHistory,
}: HouseholdItemFormProps) {
  const [sectionType, setSectionType] = useState<HouseholdSectionType>(initialSectionType || 'FIXED_COST');
  const [assetKind, setAssetKind] = useState<HouseholdAssetKind>(initialAssetKind || 'ASSET');
  const [label, setLabel] = useState(initialLabel || '');
  const [vendor, setVendor] = useState(initialVendor || '');
  const { amount, amountValue, handleAmountChange } = useCommaAmountInput(initialAmount);
  const [payer, setPayer] = useState<HouseholdPayer | ''>(initialPayer || '');
  const [autoDebitBank, setAutoDebitBank] = useState(initialAutoDebitBank || '');
  const [debitDay, setDebitDay] = useState(initialDebitDay != null ? String(initialDebitDay) : '');
  const [account, setAccount] = useState(initialAccount || '');
  const [plannedMonth, setPlannedMonth] = useState(initialPlannedMonth || '');
  const [memo, setMemo] = useState(initialMemo || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | undefined>();
  useEscapeKey(onClose);

  // 유튜브 구독(영철 지원으로 0원)처럼 정말 0원인 항목도 있어서 amountValue > 0이 아니라 >= 0으로 허용
  const isValid = label.trim().length > 0 && amount !== '' && amountValue >= 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;
    setError(undefined);
    setIsSubmitting(true);
    try {
      await onSubmit({
        sectionType,
        assetKind: sectionType === 'ASSET' ? assetKind : undefined,
        label: label.trim(),
        vendor: vendor.trim() || undefined,
        amount: amountValue,
        payer: payer || undefined,
        autoDebitBank: (sectionType === 'FIXED_COST' || sectionType === 'SUBSCRIPTION') ? (autoDebitBank.trim() || undefined) : undefined,
        debitDay: (sectionType === 'FIXED_COST' || sectionType === 'SUBSCRIPTION') && debitDay ? Number(debitDay) : undefined,
        account: sectionType === 'FIXED_COST' ? (account.trim() || undefined) : undefined,
        plannedMonth: sectionType === 'PLANNED_EXPENSE' ? (plannedMonth.trim() || undefined) : undefined,
        memo: memo.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '저장에 실패했습니다');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <FormModal title={isEditMode ? '생활비 항목 수정' : '생활비 항목 추가'} onClose={onClose} onSubmit={handleSubmit}>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">구분 *</label>
        <div className="flex gap-2 flex-wrap">
          {HOUSEHOLD_SECTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSectionType(s)}
              className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                sectionType === s ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              {HOUSEHOLD_SECTION_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {sectionType === 'ASSET' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">자산/부채 *</label>
          <div className="flex gap-2">
            {(['ASSET', 'LIABILITY'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setAssetKind(k)}
                className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition-colors ${
                  assetKind === k ? 'bg-blue-500 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {HOUSEHOLD_ASSET_KIND_LABELS[k]}
              </button>
            ))}
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">항목명 *</label>
        <input
          type="text"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="예: 통신비"
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          required
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">업체명/기관명</label>
        <input
          type="text"
          value={vendor}
          onChange={(e) => setVendor(e.target.value)}
          placeholder="예: SKT"
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
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
        <label className="block text-sm font-medium text-gray-700 mb-1">대상자</label>
        <select
          value={payer}
          onChange={(e) => setPayer(e.target.value as HouseholdPayer | '')}
          className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="">선택 안 함</option>
          {HOUSEHOLD_PAYERS.map((p) => (
            <option key={p} value={p}>{HOUSEHOLD_PAYER_LABELS[p]}</option>
          ))}
        </select>
      </div>

      {(sectionType === 'FIXED_COST' || sectionType === 'SUBSCRIPTION') && (
        <>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">자동이체 은행</label>
            <input
              type="text"
              value={autoDebitBank}
              onChange={(e) => setAutoDebitBank(e.target.value)}
              placeholder="예: 신한은행"
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">이체일</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={31}
              value={debitDay}
              onChange={(e) => setDebitDay(e.target.value)}
              placeholder="1~31"
              className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </>
      )}

      {sectionType === 'FIXED_COST' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">연결계좌</label>
          <input
            type="text"
            value={account}
            onChange={(e) => setAccount(e.target.value)}
            placeholder="예: 공과금통장"
            className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {sectionType === 'PLANNED_EXPENSE' && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">예정월</label>
          <input
            type="month"
            value={plannedMonth}
            onChange={(e) => setPlannedMonth(e.target.value)}
            className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">비고</label>
        <input
          type="text"
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          placeholder="선택"
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
