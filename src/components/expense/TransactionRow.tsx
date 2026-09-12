import { ExpenseRecord } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { effectiveAmount, formatAmount } from '@/utils/expenseFormat';

export default function TransactionRow({
  record,
  showDate = true,
  showMethod = true,
}: {
  record: ExpenseRecord;
  showDate?: boolean;
  showMethod?: boolean;
}) {
  const isSubsidy = record.paymentMethod === 'SUBSIDY';
  return (
    <li className="flex items-center gap-2 text-xs text-gray-500">
      {showDate && <span className="shrink-0">{record.expenseDate.slice(5)}</span>}
      <span className="truncate flex-1 min-w-0">{record.merchant}</span>
      {showMethod && (
        <span className="text-[10px] text-gray-400 shrink-0 min-w-14 text-right whitespace-nowrap">
          {PAYMENT_METHOD_LABELS[record.paymentMethod]}
        </span>
      )}
      {/* 지원금은 일반 지출과 헷갈리지 않도록 음수 + 초록색으로 표시(effectiveAmount가 이미 부호를 뒤집어줌) */}
      <span className={`shrink-0 min-w-20 text-right whitespace-nowrap ${isSubsidy ? 'text-green-600' : ''}`}>
        {formatAmount(effectiveAmount(record))}
      </span>
    </li>
  );
}
