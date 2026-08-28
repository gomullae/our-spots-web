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
}

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
