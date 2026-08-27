'use client';

import { useState } from 'react';
import { feedbackApi } from '@/services/api';
import { CloseIcon } from '@/components/icons';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onToast?: (message: string, type: 'success' | 'error' | 'info') => void;
}

export default function FeedbackModal({ isOpen, onClose, onToast }: FeedbackModalProps) {
  const [content, setContent] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async () => {
    const trimmed = content.trim();
    if (!trimmed || isSending) return;

    try {
      setIsSending(true);
      setError(null);
      await feedbackApi.create(trimmed);
      setContent('');
      onClose();
      if (onToast) onToast('피드백이 전송되었습니다', 'success');
    } catch (err) {
      setError(err instanceof Error ? err.message : '전송에 실패했습니다.');
    } finally {
      setIsSending(false);
    }
  };

  useEscapeKey(onClose, isOpen);
  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onClose} />
      <div className="fixed z-50 inset-0 flex items-center justify-center px-4">
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-md flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <h2 className="text-base font-semibold text-gray-900">💬 운영자에게 피드백</h2>
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 transition-colors"
            >
              <CloseIcon className="w-5 h-5 text-gray-400" />
            </button>
          </div>

          {/* Body */}
          <div className="px-4 py-4 space-y-3">
            <div className="relative">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value.slice(0, 500))}
                placeholder="의견이나 제안을 자유롭게 작성해주세요..."
                rows={5}
                className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-blue-400 transition-colors resize-none"
              />
              <span className="absolute bottom-2 right-3 text-xs text-gray-300">
                {content.length}/500
              </span>
            </div>

            {error && (
              <p className="text-xs text-red-500">{error}</p>
            )}

            <div className="flex gap-2 justify-end">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleSend}
                disabled={!content.trim() || isSending}
                className="px-4 py-2 bg-blue-500 text-white text-sm font-medium rounded-lg hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? '전송 중...' : '보내기'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
