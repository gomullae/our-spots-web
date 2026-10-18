import { ExpenseCategory, PaymentMethod } from '@/types';

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  WOW_CARD: '와우카드',
  KB_CARD: '국민카드',
  WOORI_CARD: '우리카드',
  HYUNDAI_CARD: '현대카드',
  JINWOO_IEUM_CARD: '진우이음카드',
  CHOYOUNG_PAYMENT: '초영생활비통장',
  CHOYOUNG_IEUM_CARD: '초영이음카드',
  OTHER: '기타',
  // 실제 결제수단이 아니라 할인/환급 등으로 받은 돈 — 금액은 항상 양수로 입력하되 합계에서는
  // 자동으로 차감됨(sumAmount 참고)
  SUBSIDY: '지원금',
};

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  FOOD: '식비',
  LIVING: '생활비',
  IRREGULAR: '비정기지출',
};

export const PAYMENT_METHODS: PaymentMethod[] = ['WOW_CARD', 'KB_CARD', 'WOORI_CARD', 'HYUNDAI_CARD', 'JINWOO_IEUM_CARD', 'CHOYOUNG_PAYMENT', 'CHOYOUNG_IEUM_CARD', 'OTHER', 'SUBSIDY'];
export const EXPENSE_CATEGORIES: ExpenseCategory[] = ['FOOD', 'LIVING', 'IRREGULAR'];

export const EXPENSE_CATEGORY_BADGE_COLORS: Record<ExpenseCategory, string> = {
  FOOD: 'bg-orange-100 text-orange-600',
  LIVING: 'bg-blue-100 text-blue-600',
  IRREGULAR: 'bg-purple-100 text-purple-600',
};

// 주당 예산 — 적용 시작일(주 시작일=월요일 기준) 이후의 주부터 해당 금액. 예산을 바꿀 땐 과거 주의 절약/초과
// 판정이 바뀌지 않도록 기존 항목은 두고 새 항목만 오름차순으로 추가할 것
const WEEKLY_BUDGET_SCHEDULE: { from: string; amount: number }[] = [
  { from: '0000-01-01', amount: 420000 },
  { from: '2026-10-26', amount: 350000 },
];

export function getWeeklyBudget(weekStart: string): number {
  let amount = WEEKLY_BUDGET_SCHEDULE[0].amount;
  for (const entry of WEEKLY_BUDGET_SCHEDULE) {
    if (entry.from <= weekStart) amount = entry.amount;
  }
  return amount;
}
