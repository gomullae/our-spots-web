'use client';

import { useState } from 'react';
import { WeightRecord } from '@/types';
import { weightApi } from '@/services/api';
import { formatDisplayDate } from '@/utils/weightDate';
import { formatWeight } from '@/utils/weightFormat';

interface WeightListTabProps {
  records: WeightRecord[];
  onDeleted: (id: number) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
  showToast: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function WeightListTab({ records, onDeleted, showConfirm, showToast }: WeightListTabProps) {
  const [isEditing, setIsEditing] = useState(false);

  const handleDelete = (record: WeightRecord) => {
    showConfirm(
      `${formatDisplayDate(record.recordedDate)} 기록(${formatWeight(record.weightKg)}kg)을 삭제하시겠습니까?`,
      async () => {
        try {
          await weightApi.delete(record.id);
          onDeleted(record.id);
          showToast('삭제했습니다', 'success');
        } catch (err) {
          showToast(err instanceof Error ? err.message : '삭제에 실패했습니다', 'error');
        }
      },
      true
    );
  };

  return (
    <div>
      <div className="flex justify-end px-4 py-2.5">
        <button
          onClick={() => setIsEditing(v => !v)}
          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
            isEditing ? 'border-red-300 text-red-500 bg-red-50' : 'border-gray-200 text-gray-500'
          }`}
        >
          {isEditing ? '완료' : '편집'}
        </button>
      </div>

      {records.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">기록된 데이터가 없습니다</p>
      ) : (
        <>
          <div className="divide-y">
            {records.map(record => (
              <div key={record.id} className="flex items-center justify-between px-4 py-2.5">
                <div className="flex items-center gap-2">
                  {isEditing && (
                    <button
                      onClick={() => handleDelete(record)}
                      className="text-red-500 text-xs w-5 h-5 flex items-center justify-center rounded-full bg-red-50 hover:bg-red-100 transition-colors"
                      aria-label="삭제"
                    >
                      −
                    </button>
                  )}
                  <span className="text-sm font-medium">
                    {formatWeight(record.weightKg)}<span className="text-xs text-gray-500 font-normal"> kg</span>
                  </span>
                </div>
                <span className="text-xs text-gray-400">{formatDisplayDate(record.recordedDate)}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
