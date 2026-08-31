import { ApiResponse, BackupPeriod, BackupTable, ExpenseMeta, ExpenseRecord, ExpenseRecordPayload, HouseholdBudgetItem, HouseholdBudgetItemPayload, HouseholdBudgetMeta, HouseholdBudgetOverview, HouseholdHistoryEntry, HouseholdIncome, HouseholdIncomePayload, Marker, PageResponse, Photo, PhotoAdminEntry, PhotoEntityType, PhotoPresignResponse, Place, PlaceDetail, PlaceRecentSortBy, PlaceType, ScheduleEvent, ScheduleEventPayload, ScheduleMeta, TableData, WeightMeta, WeightRecord, WeightRecordUpsertPayload } from '@/types';
import { clearExpenseCache } from '@/utils/expenseCache';
import { clearHouseholdCache } from '@/utils/householdCache';
import { clearScheduleCache } from '@/utils/scheduleCache';
import { clearWeightCache } from '@/utils/weightCache';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const TOKEN_KEY = 'admin_token';

// 호출부가 특정 HTTP 상태(예: 404 = 이미 지워짐)에 따라 다르게 대응해야 할 때 사용 — Error를 상속해서
// 기존의 `err instanceof Error` 체크는 그대로 다 통과함
export class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
  // 로그아웃/토큰 만료 시 같이 쓰는 컴퓨터에 일정/체중/가계부/가계 현황 내용이 localStorage에 남아있지 않도록 같이 정리
  clearScheduleCache();
  clearWeightCache();
  clearExpenseCache();
  clearHouseholdCache();
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

// 토큰 만료 시 두 fetch 경로(JSON 응답의 fetchApi, 바이너리 응답의 backupApi.download)가 공통으로 수행
function handleAuthExpired(): never {
  clearToken();
  window.dispatchEvent(new Event('auth-expired'));
  throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
}

async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  const token = getToken();
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      ...headers,
      ...options?.headers,
    },
  });

  if (res.status === 401) {
    handleAuthExpired();
  }

  // 빈 응답 처리 (DELETE 등)
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  const data: ApiResponse<T> = JSON.parse(text);

  if (!data.success) {
    throw new ApiError(data.error || 'API request failed', res.status);
  }

  return data.data as T;
}

export const authApi = {
  login: async (password: string): Promise<void> => {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });

    const data: ApiResponse<{ token: string }> = await res.json();

    if (!data.success) {
      throw new Error(data.error || '로그인에 실패했습니다');
    }

    setToken(data.data!.token);
  },

  logout: (): void => {
    clearToken();
  },
};

export const placeApi = {
  getRecent: (params: {
    startDate: string;
    endDate: string;
    keyword?: string;
    type?: PlaceType;
    grade?: number;
    includeDeleted?: boolean;
    sortBy?: PlaceRecentSortBy;
    page: number;
    size?: number;
  }) => {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      includeDeleted: String(params.includeDeleted ?? true),
      sortBy: params.sortBy ?? 'CREATED_AT',
      page: String(params.page),
      size: String(params.size ?? 10),
    });
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.type) query.set('type', params.type);
    if (params.grade != null) query.set('grade', String(params.grade));

    return fetchApi<PageResponse<Place>>(`/places/recent?${query.toString()}`);
  },

  // 관리자 "등록 사진 이력" 화면 전용 — 장소 사진만 대상, 등록일시 내림차순 고정(정렬 옵션 없음)
  getPhotoHistory: (params: { isPublic?: boolean; page: number; size?: number }) => {
    const query = new URLSearchParams({
      page: String(params.page),
      size: String(params.size ?? 20),
    });
    if (params.isPublic != null) query.set('isPublic', String(params.isPublic));

    return fetchApi<PageResponse<PhotoAdminEntry>>(`/places/photos?${query.toString()}`);
  },

  restore: (id: number) => {
    return fetchApi<Place>(`/places/${id}/restore`, {
      method: 'POST',
    });
  },

  syncGoogleRating: (id: number) => {
    return fetchApi<Place>(`/places/${id}/sync-google`, {
      method: 'POST',
    });
  },

  getById: (id: number) => {
    return fetchApi<PlaceDetail>(`/places/${id}`);
  },

  create: (place: Omit<Place, 'id' | 'createdAt' | 'updatedAt' | 'photos'>) => {
    return fetchApi<Place>('/places', {
      method: 'POST',
      body: JSON.stringify(place),
    });
  },

  update: (id: number, place: Partial<Place>) => {
    return fetchApi<Place>(`/places/${id}`, {
      method: 'PUT',
      body: JSON.stringify(place),
    });
  },

  delete: (id: number) => {
    return fetchApi<void>(`/places/${id}`, {
      method: 'DELETE',
    });
  },
};

export const mapApi = {
  getMarkers: (params?: {
    type?: PlaceType;
    swLat?: number;
    swLng?: number;
    neLat?: number;
    neLng?: number;
  }) => {
    const searchParams = new URLSearchParams();
    if (params?.type) searchParams.set('type', params.type);
    if (params?.swLat) searchParams.set('swLat', params.swLat.toString());
    if (params?.swLng) searchParams.set('swLng', params.swLng.toString());
    if (params?.neLat) searchParams.set('neLat', params.neLat.toString());
    if (params?.neLng) searchParams.set('neLng', params.neLng.toString());

    const query = searchParams.toString();
    return fetchApi<Marker[]>(`/map/markers${query ? `?${query}` : ''}`);
  },

  refreshMarkers: () => {
    return fetchApi<Marker[]>('/map/markers/refresh', {
      method: 'POST',
    });
  },
};

export const weightApi = {
  getAll: () => {
    return fetchApi<WeightRecord[]>('/weights');
  },

  // 로컬(localStorage) 캐시 검증용 — 전체 목록 대신 count/lastModified만 가볍게 확인
  getMeta: () => {
    return fetchApi<WeightMeta>('/weights/meta');
  },

  upsert: (record: WeightRecordUpsertPayload) => {
    return fetchApi<WeightRecord>('/weights', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  delete: (id: number) => {
    return fetchApi<void>(`/weights/${id}`, {
      method: 'DELETE',
    });
  },
};

export const expenseApi = {
  getByRange: (startDate: string, endDate: string, includeDeleted?: boolean) => {
    const query = new URLSearchParams({ startDate, endDate, includeDeleted: String(includeDeleted ?? false) });
    return fetchApi<ExpenseRecord[]>(`/expenses?${query.toString()}`);
  },

  // 로컬(localStorage) 캐시 검증용 — 전체 목록 대신 count/lastModified만 가볍게 확인
  getMeta: () => {
    return fetchApi<ExpenseMeta>('/expenses/meta');
  },

  create: (record: ExpenseRecordPayload) => {
    return fetchApi<ExpenseRecord>('/expenses', {
      method: 'POST',
      body: JSON.stringify(record),
    });
  },

  update: (id: number, record: ExpenseRecordPayload) => {
    return fetchApi<ExpenseRecord>(`/expenses/${id}`, {
      method: 'PUT',
      body: JSON.stringify(record),
    });
  },

  delete: (id: number) => {
    return fetchApi<void>(`/expenses/${id}`, {
      method: 'DELETE',
    });
  },

  restore: (id: number) => {
    return fetchApi<ExpenseRecord>(`/expenses/${id}/restore`, {
      method: 'POST',
    });
  },

  sendWeeklySummary: (startDate: string, endDate: string, budget: number) => {
    const query = new URLSearchParams({ startDate, endDate, budget: String(budget) });
    return fetchApi<void>(`/expenses/weekly-summary?${query.toString()}`, {
      method: 'POST',
    });
  },
};

export const backupApi = {
  // 응답이 JSON이 아니라 바이너리 파일이라 fetchApi<T> 대신 직접 fetch + blob 다운로드 처리
  download: async (table: BackupTable, period: BackupPeriod): Promise<void> => {
    const token = getToken();
    const query = new URLSearchParams({ table, period });
    const res = await fetch(`${API_BASE_URL}/admin/backup?${query.toString()}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });

    if (res.status === 401) {
      handleAuthExpired();
    }
    if (!res.ok) {
      throw new Error('백업 다운로드에 실패했습니다');
    }

    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const filename = disposition.match(/filename="?([^"]+)"?/)?.[1] || `${table.toLowerCase()}_backup.xlsx`;

    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  },
};

export const adminLogApi = {
  getLogs: (table: BackupTable, period: BackupPeriod) => {
    const query = new URLSearchParams({ table, period });
    return fetchApi<TableData>(`/admin/logs?${query.toString()}`);
  },
};

export const feedbackApi = {
  create: (content: string) => {
    return fetchApi<void>('/feedbacks', {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  },
};

export const scheduleApi = {
  getEvents: (start: string, end: string, includeDeleted?: boolean) => {
    const query = new URLSearchParams({ start, end, includeDeleted: String(includeDeleted ?? false) });
    return fetchApi<ScheduleEvent[]>(`/schedules?${query.toString()}`);
  },

  // 로컬(localStorage) 캐시 검증용 — 전체 목록 대신 count/lastModified만 가볍게 확인
  getMeta: () => {
    return fetchApi<ScheduleMeta>('/schedules/meta');
  },

  create: (event: ScheduleEventPayload) => {
    return fetchApi<ScheduleEvent>('/schedules', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  },

  update: (id: number, event: ScheduleEventPayload) => {
    return fetchApi<ScheduleEvent>(`/schedules/${id}`, {
      method: 'PUT',
      body: JSON.stringify(event),
    });
  },

  delete: (id: number) => {
    return fetchApi<void>(`/schedules/${id}`, {
      method: 'DELETE',
    });
  },

  restore: (id: number) => {
    return fetchApi<ScheduleEvent>(`/schedules/${id}/restore`, {
      method: 'POST',
    });
  },
};

// 장소/일정 공용 사진 업로드 — presign으로 받은 uploadUrl에는 브라우저가 R2로 직접 PUT(서버를 거치지 않음, photoUpload.ts 참고)
export const photoApi = {
  presign: (entityType: PhotoEntityType, contentType: string) => {
    return fetchApi<PhotoPresignResponse>('/photos/presign', {
      method: 'POST',
      body: JSON.stringify({ entityType, contentType }),
    });
  },

  confirm: (entityType: PhotoEntityType, entityId: number, objectKey: string, thumbnailObjectKey: string) => {
    return fetchApi<Photo>('/photos/confirm', {
      method: 'POST',
      body: JSON.stringify({ entityType, entityId, objectKey, thumbnailObjectKey }),
    });
  },

  delete: (id: number) => {
    return fetchApi<void>(`/photos/${id}`, {
      method: 'DELETE',
    });
  },

  // "등록 사진 이력" 화면에서 공개/비공개 전환
  updateVisibility: (id: number, isPublic: boolean) => {
    return fetchApi<Photo>(`/photos/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ isPublic }),
    });
  },
};

// "Our Budget" 4번째 탭 "가계 현황" — 급여/자산 등 민감한 데이터라 백엔드가 amount 컬럼을 암호화 저장하고,
// 추가/수정/삭제 시마다 텔레그램 알림 + 이력 기록까지 처리함(프론트는 CRUD 호출만 담당)
export const householdBudgetApi = {
  getOverview: (includeDeleted = false) => {
    return fetchApi<HouseholdBudgetOverview>(`/household-budget?includeDeleted=${includeDeleted}`);
  },

  // 로컬(localStorage) 캐시 검증용 — 전체 목록 대신 count/lastModified만 가볍게 확인
  getMeta: () => {
    return fetchApi<HouseholdBudgetMeta>('/household-budget/meta');
  },

  createIncome: (payload: HouseholdIncomePayload) => {
    return fetchApi<HouseholdIncome>('/household-budget/incomes', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateIncome: (id: number, payload: HouseholdIncomePayload) => {
    return fetchApi<HouseholdIncome>(`/household-budget/incomes/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteIncome: (id: number) => {
    return fetchApi<void>(`/household-budget/incomes/${id}`, {
      method: 'DELETE',
    });
  },

  restoreIncome: (id: number) => {
    return fetchApi<HouseholdIncome>(`/household-budget/incomes/${id}/restore`, {
      method: 'POST',
    });
  },

  getIncomeHistory: (id: number) => {
    return fetchApi<HouseholdHistoryEntry[]>(`/household-budget/incomes/${id}/history`);
  },

  createItem: (payload: HouseholdBudgetItemPayload) => {
    return fetchApi<HouseholdBudgetItem>('/household-budget/items', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  updateItem: (id: number, payload: HouseholdBudgetItemPayload) => {
    return fetchApi<HouseholdBudgetItem>(`/household-budget/items/${id}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  deleteItem: (id: number) => {
    return fetchApi<void>(`/household-budget/items/${id}`, {
      method: 'DELETE',
    });
  },

  restoreItem: (id: number) => {
    return fetchApi<HouseholdBudgetItem>(`/household-budget/items/${id}/restore`, {
      method: 'POST',
    });
  },

  getItemHistory: (id: number) => {
    return fetchApi<HouseholdHistoryEntry[]>(`/household-budget/items/${id}/history`);
  },
};
