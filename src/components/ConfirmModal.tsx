'use client';

import { useEscapeKey } from '@/hooks/useEscapeKey';

interface ConfirmModalProps {
  message: string;
  isDestructive?: boolean;
  // 확인 버튼 라벨 — 기본 "확인", 맥락에 맞는 동사가 있으면 오버라이드(예: 장소 등록 전 중복 경고의 "등록")
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ message, isDestructive, confirmLabel, onConfirm, onCancel }: ConfirmModalProps) {
  // Esc는 항상 "취소"로 처리 — 삭제 등 위험한 동작을 실수로 확정시키면 안 되므로
  useEscapeKey(onCancel);

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-[60]" onClick={onCancel} />
      <div className="fixed inset-0 z-[60] flex items-center justify-center p-6">
        <div
          className="bg-white rounded-2xl shadow-2xl max-w-xs w-full overflow-hidden"
          onClick={e => e.stopPropagation()}
        >
          <div className="px-5 pt-6 pb-4 text-center">
            <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">{message}</p>
          </div>
          <div className="flex border-t border-gray-200">
            <button
              onClick={onCancel}
              className="flex-1 py-3 text-sm font-medium text-gray-500 hover:bg-gray-50 transition-colors border-r border-gray-200"
            >
              취소
            </button>
            <button
              onClick={onConfirm}
              className={`flex-1 py-3 text-sm font-semibold transition-colors ${
                isDestructive
                  ? 'text-red-500 hover:bg-red-50'
                  : 'text-blue-500 hover:bg-blue-50'
              }`}
            >
              {confirmLabel ?? '확인'}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
