import { HouseholdAccount, HouseholdAssetKind, HouseholdAutoDebitSource, HouseholdPayer, HouseholdSectionType } from '@/types';

export const HOUSEHOLD_SECTION_LABELS: Record<HouseholdSectionType, string> = {
  FIXED_COST: '고정비',
  ASSET: '자산',
  PLANNED_EXPENSE: '지출예정액',
  SUBSCRIPTION: '구독료',
};

export const HOUSEHOLD_SECTIONS: HouseholdSectionType[] = ['FIXED_COST', 'ASSET', 'PLANNED_EXPENSE', 'SUBSCRIPTION'];

export const HOUSEHOLD_ASSET_KIND_LABELS: Record<HouseholdAssetKind, string> = {
  ASSET: '자산',
  LIABILITY: '부채',
};

export const HOUSEHOLD_PAYER_LABELS: Record<HouseholdPayer, string> = {
  JINWOO: '진우',
  CHOYOUNG: '초영',
  FAMILY: '가족',
};

export const HOUSEHOLD_PAYERS: HouseholdPayer[] = ['JINWOO', 'CHOYOUNG', 'FAMILY'];

// 연결계좌/자동이체 — 원래 자유 텍스트였는데, 오타 하나로 고정비 계좌 소계 그룹(fixedCostGroups)이나
// 정렬 기준(sortByAutoDebitAndDebitDay)이 조용히 갈라지는 문제가 있어 PaymentMethod(생활비 결제수단)와
// 동일한 패턴(고정 enum + OTHER)으로 전환(2026-09-02) — 새 계좌/카드가 생기면 이 두 매핑에 한 줄씩만 추가하면 됨
export const HOUSEHOLD_ACCOUNT_LABELS: Record<HouseholdAccount, string> = {
  UTILITY_ACCOUNT: '공과금통장',
  JINWOO_ACCOUNT: '진우통장',
  LIVING_ACCOUNT: '생활비통장',
  OTHER: '기타',
};
export const HOUSEHOLD_ACCOUNTS: HouseholdAccount[] = ['UTILITY_ACCOUNT', 'JINWOO_ACCOUNT', 'LIVING_ACCOUNT', 'OTHER'];

export const HOUSEHOLD_AUTO_DEBIT_LABELS: Record<HouseholdAutoDebitSource, string> = {
  SHINHAN_BANK: '신한은행',
  WOORI_BANK: '우리은행',
  CHOYOUNG_ACCOUNT: '초영통장',
  HYUNDAI_CARD: '현대카드',
  KB_CARD: '국민카드',
  OTHER: '기타',
};
export const HOUSEHOLD_AUTO_DEBIT_SOURCES: HouseholdAutoDebitSource[] = [
  'SHINHAN_BANK',
  'WOORI_BANK',
  'CHOYOUNG_ACCOUNT',
  'HYUNDAI_CARD',
  'KB_CARD',
  'OTHER',
];

// 카드 좌측 보더 + 금액 텍스트 색 — 가계부 이력 탭의 카테고리 색 관례를 참고해 새 톤으로 지정
export const HOUSEHOLD_ASSET_ACCENT = { border: 'border-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' };
export const HOUSEHOLD_LIABILITY_ACCENT = { border: 'border-red-400', text: 'text-red-600', bg: 'bg-red-50' };
