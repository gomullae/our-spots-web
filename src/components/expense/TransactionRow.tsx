import { ExpenseRecord } from '@/types';
import { PAYMENT_METHOD_LABELS } from '@/constants/expenseConfig';
import { formatAmount } from '@/utils/expenseFormat';

export default function TransactionRow({ record, showMethod = true }: { record: ExpenseRecord; showMethod?: boolean }) {
  return (
    <li className="flex items-center gap-2 text-xs text-gray-500">
      <span className="shrink-0">{record.expenseDate.slice(5)}</span>
      <span className="truncate flex-1 min-w-0">{record.merchant}</span>
      {showMethod && (
        <span className="text-[10px] text-gray-400 shrink-0">{PAYMENT_METHOD_LABELS[record.paymentMethod]}</span>
      )}
      <span className="shrink-0">{formatAmount(record.amount)}</span>
    </li>
  );
}
