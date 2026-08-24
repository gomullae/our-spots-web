import { ApiResponse, BackupPeriod, BackupTable, ExpenseRecord, ExpenseRecordPayload, Marker, PageResponse, Place, PlaceDetail, PlaceType, TableData, WeightRecord, WeightRecordUpsertPayload } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || '/api';

const TOKEN_KEY = 'admin_token';

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function isLoggedIn(): boolean {
  return !!getToken();
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
    clearToken();
    window.dispatchEvent(new Event('auth-expired'));
    throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
  }

  // 빈 응답 처리 (DELETE 등)
  const text = await res.text();
  if (!text) {
    return undefined as T;
  }

  const data: ApiResponse<T> = JSON.parse(text);

  if (!data.success) {
    throw new Error(data.error || 'API request failed');
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
  getAll: (type?: PlaceType) => {
    const params = type ? `?type=${type}` : '';
    return fetchApi<Place[]>(`/places${params}`);

  },

  getRecent: (params: {
    startDate: string;
    endDate: string;
    keyword?: string;
    type?: PlaceType;
    grade?: number;
    includeDeleted?: boolean;
    page: number;
    size?: number;
  }) => {
    const query = new URLSearchParams({
      startDate: params.startDate,
      endDate: params.endDate,
      includeDeleted: String(params.includeDeleted ?? true),
      page: String(params.page),
      size: String(params.size ?? 10),
    });
    if (params.keyword) query.set('keyword', params.keyword);
    if (params.type) query.set('type', params.type);
    if (params.grade != null) query.set('grade', String(params.grade));

    return fetchApi<PageResponse<Place>>(`/places/recent?${query.toString()}`);
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

  create: (place: Omit<Place, 'id' | 'createdAt' | 'updatedAt'>) => {
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
      clearToken();
      window.dispatchEvent(new Event('auth-expired'));
      throw new Error('인증이 만료되었습니다. 다시 로그인해주세요.');
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
