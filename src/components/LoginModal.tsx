'use client';

import { useState } from 'react';
import { useEscapeKey } from '@/hooks/useEscapeKey';

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (password: string) => void;
  isLoading?: boolean;
  error?: string;
}

export default function LoginModal({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  error
}: LoginModalProps) {
  const [password, setPassword] = useState('');
  // 로그인 성공 시 부모가 handleClose를 거치지 않고 직접 isOpen을 false로 바꾸는 경로가 있어서,
  // 다시 열렸을 때 비밀번호가 남아있지 않도록 렌더 중에 prop 변화를 감지해서 리셋(useEffect 대신 —
  // effect로 하면 리셋 전 상태가 한 프레임 먼저 그려짐)
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setPassword('');
    }
  }

  const handleClose = () => {
    setPassword('');
    onClose();
  };

  useEscapeKey(handleClose, isOpen);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password.trim()) {
      onConfirm(password);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-72 p-4">
        <h3 className="text-lg font-bold mb-4">관리자 로그인</h3>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호 입력"
            className="w-full px-3 py-2 border rounded-lg text-base focus:outline-none focus:ring-2 focus:ring-blue-500 mb-2"
            autoFocus
            disabled={isLoading}
          />

          {error && (
            <p className="text-xs text-red-500 mb-2">{error}</p>
          )}

          <div className="flex gap-2 mt-4">
            <button
              type="button"
              onClick={handleClose}
              disabled={isLoading}
              className="flex-1 py-2 px-3 text-sm font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="submit"
              disabled={isLoading || !password.trim()}
              className="flex-1 py-2 px-3 text-sm font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-lg transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {isLoading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
