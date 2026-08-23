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
