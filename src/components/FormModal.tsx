'use client';

import { CloseIcon } from '@/components/icons';

interface FormModalProps {
  title: string;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
}

// PlaceForm/ScheduleForm/ExpenseForm이 거의 동일하게 갖고 있던 모달 뼈대(배경+카드, 헤더, form 태그)를 공용화 —
// 필드/에러 표시/제출 버튼처럼 폼마다 다른 부분은 children으로 넘김
export default function FormModal({ title, onClose, onSubmit, children }: FormModalProps) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-xl shadow-2xl w-80 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors" aria-label="닫기">
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={onSubmit} className="p-4 space-y-4">
          {children}
        </form>
      </div>
    </div>
  );
}
