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
}

export type PlaceDetail = Place;

export interface Marker {
  id: number;
  name: string;
  type: PlaceType;
  latitude: number;
  longitude: number;
  grade?: number;
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

export type BackupTable = 'PLACES' | 'EXPENSE_RECORDS' | 'WEIGHT_RECORDS' | 'LOGIN_ATTEMPTS' | 'FEEDBACKS';
export type BackupPeriod = 'ALL' | 'RECENT_3_MONTHS';
