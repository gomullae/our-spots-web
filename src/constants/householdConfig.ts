import { HouseholdAssetKind, HouseholdPayer, HouseholdSectionType } from '@/types';

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

// 카드 좌측 보더 + 금액 텍스트 색 — 가계부 이력 탭의 카테고리 색 관례를 참고해 새 톤으로 지정
export const HOUSEHOLD_ASSET_ACCENT = { border: 'border-blue-400', text: 'text-blue-600', bg: 'bg-blue-50' };
export const HOUSEHOLD_LIABILITY_ACCENT = { border: 'border-red-400', text: 'text-red-600', bg: 'bg-red-50' };
