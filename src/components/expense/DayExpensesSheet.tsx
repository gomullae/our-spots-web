'use client';

import { CloseIcon } from '@/components/icons';
import { getHoliday } from '@/constants/holidays';
import { useEscapeKey } from '@/hooks/useEscapeKey';
import { useSwipeDownToClose } from '@/hooks/useSwipeDownToClose';
import { ExpenseRecord } from '@/types';
import { formatAmount, sumAmount } from '@/utils/expenseFormat';
import { formatDisplayDate } from '@/utils/weightDate';
import TransactionRow from './TransactionRow';

interface DayExpensesSheetProps {
  date: string;
  records: ExpenseRecord[];
  onClose: () => void;
}

// 관리자 페이지 컨테이너 자체가 넓은 화면에서도 좁은 폭(max-w-md)으로 고정돼있어서(AdminPageShell),
// 모바일은 일정 관리와 동일한 하단 시트로, PC는 그 폭에 맞는 가운데 모달(ConfirmModal과 동일한 톤)로 분기
export default function DayExpensesSheet({ date, records, onClose }: DayExpensesSheetProps) {
  useEscapeKey(onClose);
  const holiday = getHoliday(date);
  const total = sumAmount(records);
  // 금액 큰 순으로 — 그 날 어디에 많이 썼는지 한눈에 보이도록
  const sortedRecords = [...records].sort((a, b) => b.amount - a.amount);
  // 손잡이+헤더 영역에서만 반응 — 목록 스크롤 영역까지 포함하면 내역이 많을 때 스크롤하려다 닫히는 오작동이 생김
  const { handleDragStart, handleDragEnd } = useSwipeDownToClose(onClose);

  const header = (
    <div className="flex items-start justify-between px-4 pt-3 pb-3 shrink-0">
      <div>
        <h2 className="text-base font-bold">{formatDisplayDate(date)}</h2>
        {holiday && <p className="text-xs text-gray-400 mt-0.5">{holiday.name}</p>}
      </div>
      <button onClick={onClose} className="text-gray-300 hover:text-gray-500 transition-colors" aria-label="닫기">
        <CloseIcon className="w-5 h-5" />
      </button>
    </div>
  );

  const list = (
    <div className="flex-1 min-h-0 overflow-y-auto px-4">
      {sortedRecords.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">지출 내역이 없습니다</p>
      ) : (
        <ul className="space-y-1.5 pb-2">
          {sortedRecords.map((r) => (
            <TransactionRow key={r.id} record={r} showDate={false} />
          ))}
        </ul>
      )}
    </div>
  );

  return (
    <>
      <div className="sm:hidden fixed inset-0 z-40 flex items-end" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="relative w-full h-[50dvh] bg-white rounded-t-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0" onTouchStart={handleDragStart} onTouchEnd={handleDragEnd}>
            <div className="flex justify-center pt-2">
              <div className="w-10 h-1 bg-gray-300 rounded-full" />
            </div>
            {header}
          </div>
          {list}
          {records.length > 0 && (
            // 하단이 iPhone 홈 인디케이터(safe area)와 겹쳐 살짝 잘리는 문제 — 최소 여백을 그 아래로 더 확보
            <div
              className="flex items-center justify-between px-4 pt-3 border-t shrink-0"
              style={{ paddingBottom: 'max(0.875rem, env(safe-area-inset-bottom))' }}
            >
              <span className="text-xs text-gray-400">합계</span>
              <span className="text-sm font-bold">{formatAmount(total)}</span>
            </div>
          )}
        </div>
      </div>

      <div className="hidden sm:flex fixed inset-0 z-40 items-center justify-center p-6" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div
          className="relative w-full max-w-sm max-h-[70vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {header}
          {list}
          {records.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t shrink-0">
              <span className="text-xs text-gray-400">합계</span>
              <span className="text-sm font-bold">{formatAmount(total)}</span>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
