export type PlaceType = 'RESTAURANT' | 'KIDS_PLAYGROUND' | 'RELAXATION'
  | 'MY_FOOTPRINT' | 'RECOMMENDED_RESTAURANT' | 'RECOMMENDED_SPOT';

export interface Place {
  id: number;
  name: string;
  type: PlaceType;
  address: string;
  latitude: number;
  longitude: number;
  description?: string;
  grade?: number;
  googlePlaceId?: string;
  googleRating?: number;
  googleRatingsTotal?: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  photos: Photo[];
}

// 장소/일정이 공용으로 쓰는 사진 — Cloudflare R2에 업로드된 파일의 메타데이터만 DB/응답에 실림
export type PhotoEntityType = 'PLACE' | 'SCHEDULE_EVENT';

export interface Photo {
  id: number;
  url: string;
  // 목록/썸네일용 축소본 — 이 기능 추가 전에 올라간 사진은 빈 문자열일 수 있어(원본으로 대체 표시)
  thumbnailUrl: string;
  displayOrder: number;
  // 전체공개 여부 — 신규 업로드는 항상 false(비공개)로 시작, 관리자가 "등록 사진 이력"에서 전환
  isPublic: boolean;
}

// 관리자 "등록 사진 이력" 화면 전용 — Photo는 Place와 FK 없이 연결돼있어서 장소명을 서버가 별도로 채워서 내려줌
export interface PhotoAdminEntry {
  id: number;
  placeId: number;
  placeName: string;
  url: string;
  thumbnailUrl: string;
  isPublic: boolean;
  createdAt: string;
}

export interface PhotoPresignResponse {
  uploadUrl: string;
  objectKey: string;
  publicUrl: string;
}

export type PlaceDetail = Place;

export interface Marker {
  id: number;
  name: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  grade?: number;
  hasPhotos: boolean;
  // 공개 사진이 하나라도 있는지 — hasPhotos는 true인데 이게 false면 "사진은 있지만 전부 비공개"라
  // 마커 배지를 옅은 회색으로 표시함(눌러봐야 비로그인 사용자에겐 안 보인다는 힌트)
  hasPublicPhoto: boolean;
}

export type PlaceRecentSortBy = 'CREATED_AT' | 'UPDATED_AT';

export interface SearchResultPlace {
  label: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  lat: number;
  lng: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
}

export interface WeightRecord {
  id: number;
  recordedDate: string;
  weightKg: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
}

export interface WeightRecordUpsertPayload {
  recordedDate: string;
  weightKg: number;
  memo?: string;
}

export interface WeightMeta {
  count: number;
  lastModified: string | null;
}

export type PaymentMethod = 'WOW_CARD' | 'KB_CARD' | 'WOORI_CARD' | 'HYUNDAI_CARD' | 'CHOYOUNG_PAYMENT' | 'OTHER';
export type ExpenseCategory = 'FOOD' | 'LIVING' | 'IRREGULAR';

export interface ExpenseRecord {
  id: number;
  expenseDate: string;
  paymentMethod: PaymentMethod;
  category: ExpenseCategory;
  merchant: string;
  amount: number;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface ExpenseRecordPayload {
  expenseDate: string;
  paymentMethod: PaymentMethod;
  category: ExpenseCategory;
  merchant: string;
  amount: number;
}

export interface ExpenseMeta {
  count: number;
  lastModified: string | null;
}

export type BackupTable = 'PLACES' | 'EXPENSE_RECORDS' | 'WEIGHT_RECORDS' | 'LOGIN_ATTEMPTS' | 'FEEDBACKS' | 'ERROR_LOGS' | 'ACCESS_DENIED_LOGS' | 'SCHEDULE_EVENTS';
export type BackupPeriod = 'ALL' | 'RECENT_3_MONTHS';

export type ScheduleCategory =
  | 'COMMON'
  | 'SHARED'
  | 'MUST_CHECK'
  | 'JINWOO'
  | 'CHOYOUNG'
  | 'WORK_FROM_HOME'
  | 'HOLIDAY'
  | 'TRAVEL'
  | 'ANNIVERSARY';

export interface ScheduleEvent {
  id: number;
  title: string;
  category: ScheduleCategory;
  startAt: string;
  endAt: string;
  allDay: boolean;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
  photos: Photo[];
}

export interface ScheduleEventPayload {
  title: string;
  category: ScheduleCategory;
  startAt: string;
  endAt: string;
  allDay: boolean;
  memo?: string;
}

export interface ScheduleMeta {
  count: number;
  lastModified: string | null;
}

export interface TableData {
  headers: string[];
  rows: (string | number | boolean | null)[][];
}

// 가계 현황("Our Budget" 4번째 탭) — 금액은 백엔드에서 DB엔 암호화 저장되지만 API 응답은 평문 숫자로 내려옴
export type HouseholdSectionType = 'FIXED_COST' | 'ASSET' | 'PLANNED_EXPENSE' | 'SUBSCRIPTION';
export type HouseholdAssetKind = 'ASSET' | 'LIABILITY';
export type HouseholdPayer = 'JINWOO' | 'CHOYOUNG' | 'FAMILY';
export type HouseholdAccount = 'UTILITY_ACCOUNT' | 'JINWOO_ACCOUNT' | 'LIVING_ACCOUNT' | 'OTHER';
export type HouseholdAutoDebitSource = 'SHINHAN_BANK' | 'WOORI_BANK' | 'CHOYOUNG_ACCOUNT' | 'HYUNDAI_CARD' | 'KB_CARD' | 'OTHER';
export type HouseholdHistoryAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE';

export interface HouseholdIncome {
  id: number;
  label: string;
  amount: number;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface HouseholdIncomePayload {
  label: string;
  amount: number;
  memo?: string;
}

export interface HouseholdBudgetItem {
  id: number;
  sectionType: HouseholdSectionType;
  assetKind?: HouseholdAssetKind;
  label: string;
  vendor?: string;
  amount: number;
  payer?: HouseholdPayer;
  autoDebitBank?: HouseholdAutoDebitSource;
  debitDay?: number;
  account?: HouseholdAccount;
  plannedMonth?: string;
  memo?: string;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string;
}

export interface HouseholdBudgetItemPayload {
  sectionType: HouseholdSectionType;
  assetKind?: HouseholdAssetKind;
  label: string;
  vendor?: string;
  amount: number;
  payer?: HouseholdPayer;
  autoDebitBank?: HouseholdAutoDebitSource;
  debitDay?: number;
  account?: HouseholdAccount;
  plannedMonth?: string;
  memo?: string;
}

export interface HouseholdBudgetOverview {
  incomes: HouseholdIncome[];
  items: HouseholdBudgetItem[];
}

export interface HouseholdBudgetMeta {
  count: number;
  lastModified: string | null;
}

export interface HouseholdHistoryEntry {
  id: number;
  action: HouseholdHistoryAction;
  sectionType?: HouseholdSectionType;
  assetKind?: HouseholdAssetKind;
  label: string;
  vendor?: string;
  amount: number;
  payer?: HouseholdPayer;
  autoDebitBank?: HouseholdAutoDebitSource;
  debitDay?: number;
  account?: HouseholdAccount;
  plannedMonth?: string;
  memo?: string;
  createdAt: string;
}
