import { ExpenseRecord } from '@/types';

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

export function sumAmount(records: ExpenseRecord[]): number {
  return records.reduce((sum, r) => sum + r.amount, 0);
}

// 달력 일자 칸처럼 좁은 공간에 쓰는 축약 표기 (예: 79440 -> "7.9만", 900 -> "900")
export function formatAmountCompact(amount: number): string {
  if (amount <= 0) return '';
  if (amount >= 10000) {
    const man = amount / 10000;
    return `${Number.isInteger(man) ? man : man.toFixed(1)}만`;
  }
  return amount.toLocaleString('ko-KR');
}

// 삭제/수정 시각처럼 "언제 있었던 일인지"를 짧게 표기 (예: "08/23 15:50")
export function formatDateTimeCompact(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  return `${mm}/${dd} ${hh}:${min}`;
}
