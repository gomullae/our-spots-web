import { ExpenseRecord } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { formatAmount } from '@/utils/expenseFormat';

export default function TransactionRow({
  record,
  showDate = true,
  showMethod = true,
}: {
  record: ExpenseRecord;
  showDate?: boolean;
  showMethod?: boolean;
}) {
  return (
    <li className="flex items-center gap-2 text-xs text-gray-500">
      {showDate && <span className="shrink-0">{record.expenseDate.slice(5)}</span>}
      <span className="truncate flex-1 min-w-0">{record.merchant}</span>
      {showMethod && (
        <span className="text-[10px] text-gray-400 shrink-0 min-w-14 text-right whitespace-nowrap">
          {PAYMENT_METHOD_LABELS[record.paymentMethod]}
        </span>
      )}
      <span className="shrink-0 min-w-20 text-right whitespace-nowrap">{formatAmount(record.amount)}</span>
    </li>
  );
}
