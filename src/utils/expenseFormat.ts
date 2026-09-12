import { ExpenseRecord } from '@/types';

export function formatAmount(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

// 가계 현황(고정비 총계/부채 계처럼 "이 금액만큼 차감된다"를 항상 마이너스로 표시하는 항목)이 각자
// `- ${formatAmount(x)}`로 직접 이어붙이던 걸 통일 — amount 자체의 부호와 무관하게 항상 "- " 접두
export function formatAmountAsDeduction(amount: number): string {
  return `- ${formatAmount(amount)}`;
}

// 지원금(SUBSIDY)은 실제 결제수단이 아니라 할인/환급 등으로 받은 돈이라, amount는 항상 양수로
// 저장하되 합산 시점엔 부호를 뒤집어 총액에서 차감함 — 백엔드 ExpenseService.effectiveAmount()와 동일한 규칙
export function effectiveAmount(record: ExpenseRecord): number {
  return record.paymentMethod === 'SUBSIDY' ? -record.amount : record.amount;
}

export function sumAmount(records: ExpenseRecord[]): number {
  return records.reduce((sum, r) => sum + effectiveAmount(r), 0);
}

// 지원금은 실제 지출이 아니라 차감 항목이라, 금액(원본 amount)이 커도 "가장 많이 쓴 곳"처럼 보이면
// 안 되므로 금액 정렬에서 항상 맨 아래로 — 하루 내역(DayExpensesSheet)과 날짜별 목록(같은 날짜 안에서의
// 2차 정렬)이 공유하는 비교 함수
export function compareBySubsidyLastThenAmountDesc(a: ExpenseRecord, b: ExpenseRecord): number {
  const aSubsidy = a.paymentMethod === 'SUBSIDY';
  const bSubsidy = b.paymentMethod === 'SUBSIDY';
  if (aSubsidy !== bSubsidy) return aSubsidy ? 1 : -1;
  return b.amount - a.amount;
}

// 달력 일자 칸처럼 좁은 공간에 쓰는 축약 표기 (예: 79440 -> "7.9만", 900 -> "900", -30000 -> "-3만")
// 순수 포맷터 — "그 날 기록이 아예 없어서 빈 칸이어야 하는지"는 호출부가 판단(하루 지출과 지원금이
// 같은 날 상쇄돼 순액이 0 이하가 될 수 있는데, 그 경우에도 기록 자체는 있으므로 이 함수가 임의로
// 빈 문자열을 반환하면 안 됨 — 2026-09-12, 달력 칸에서 그런 날이 빈칸으로 사라져 보이던 버그 수정)
export function formatAmountCompact(amount: number): string {
  if (amount === 0) return '0';
  if (amount < 0) return `-${formatAmountCompact(-amount)}`;
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
