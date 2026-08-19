'use client';

import { useEffect, useState } from 'react';
import { WeightRecord } from '@/types';
import { weightApi } from '@/services/api';
import { formatDisplayDate, shiftDate, todayString } from '@/utils/weightDate';
import { formatWeight, roundToOneDecimal } from '@/utils/weightFormat';

interface WeightEntryTabProps {
  records: WeightRecord[];
  onSaved: (record: WeightRecord) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function WeightEntryTab({ records, onSaved, showToast }: WeightEntryTabProps) {
  const today = todayString();
  const [selectedDate, setSelectedDate] = useState(today);
  const [weightInput, setWeightInput] = useState('');
  const [memoInput, setMemoInput] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const existing = records.find(r => r.recordedDate === selectedDate);
    setWeightInput(existing ? formatWeight(existing.weightKg) : '');
    setMemoInput(existing?.memo ?? '');
  }, [selectedDate, records]);

  const priorRecord = records.find(r => r.recordedDate < selectedDate);

  const handleWeightBlur = () => {
    if (!weightInput.trim()) return;
    const parsed = parseFloat(weightInput);
    if (!isNaN(parsed)) setWeightInput(formatWeight(parsed));
  };

  const handleSave = async () => {
    const parsed = parseFloat(weightInput);
    if (!weightInput.trim() || isNaN(parsed) || parsed < 20 || parsed > 300) {
      showToast('체중을 20~300kg 사이로 입력해주세요', 'error');
      return;
    }
    const weightKg = roundToOneDecimal(parsed);
    setIsSaving(true);
    try {
      const saved = await weightApi.upsert({
        recordedDate: selectedDate,
        weightKg,
        memo: memoInput.trim() || undefined,
      });
      onSaved(saved);
      showToast('저장했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '저장에 실패했습니다', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between border rounded-lg px-3 py-2.5 mb-5">
        <button
          onClick={() => setSelectedDate(d => shiftDate(d, -1))}
          className="text-gray-400 hover:text-gray-600 px-2 text-lg leading-none"
          aria-label="이전 날짜"
        >
          ‹
        </button>
        <span className="text-sm font-medium">{formatDisplayDate(selectedDate)}</span>
        <button
          onClick={() => setSelectedDate(d => shiftDate(d, 1))}
          disabled={selectedDate >= today}
          className="text-gray-400 hover:text-gray-600 px-2 text-lg leading-none disabled:opacity-30 disabled:hover:text-gray-400"
          aria-label="다음 날짜"
        >
          ›
        </button>
      </div>

      {priorRecord && (
        <p className="text-xs text-gray-500 mb-5">
          지난 기록은 <span className="font-medium text-gray-800">{formatWeight(priorRecord.weightKg)}kg</span> ({formatDisplayDate(priorRecord.recordedDate)})이었습니다.
        </p>
      )}

      <label className="block text-xs text-gray-500 mb-1.5">체중</label>
      <div className="flex items-center gap-2 border rounded-lg px-3 py-2 mb-4 focus-within:ring-2 focus-within:ring-blue-500">
        <input
          type="number"
          inputMode="decimal"
          step="0.1"
          value={weightInput}
          onChange={e => setWeightInput(e.target.value)}
          onBlur={handleWeightBlur}
          placeholder="미입력"
          className="flex-1 outline-none text-base"
        />
        <span className="text-xs text-gray-500">kg</span>
      </div>

      <label className="block text-xs text-gray-500 mb-1.5">메모 (선택)</label>
      <textarea
        value={memoInput}
        onChange={e => setMemoInput(e.target.value)}
        placeholder="미입력"
        rows={2}
        maxLength={200}
        className="w-full border rounded-lg px-3 py-2 text-sm outline-none resize-none mb-5 focus:ring-2 focus:ring-blue-500"
      />

      <button
        onClick={handleSave}
        disabled={isSaving}
        className="w-full py-2.5 bg-blue-500 text-white rounded-lg font-medium text-sm hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
      >
        {isSaving ? '저장 중...' : '저장'}
      </button>
    </div>
  );
}
