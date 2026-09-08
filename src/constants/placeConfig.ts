import { PlaceType } from '@/types';

// ============================================================================
// Type Configuration
// ============================================================================

export const TYPE_CONFIG: Record<PlaceType, {
  label: string;
  emoji: string;
  color: string;
  activeColor: string;
}> = {
  RESTAURANT: {
    label: '맛집',
    emoji: '🍽️',
    color: 'bg-red-100 text-red-700',
    activeColor: 'bg-red-500 text-white',
  },
  KIDS_PLAYGROUND: {
    label: '아이 놀이터',
    emoji: '🎠',
    color: 'bg-green-100 text-green-700',
    activeColor: 'bg-emerald-500 text-white',
  },
  RELAXATION: {
    label: '아빠의 시간',
    emoji: '☕',
    color: 'bg-blue-100 text-blue-700',
    activeColor: 'bg-indigo-500 text-white',
  },
  MY_FOOTPRINT: {
    label: '나의 발자취',
    emoji: '👣',
    color: 'bg-purple-100 text-purple-700',
    activeColor: 'bg-amber-500 text-white',
  },
  RECOMMENDED_RESTAURANT: {
    label: '추천 맛집',
    emoji: '🍴',
    color: 'bg-orange-100 text-orange-700',
    activeColor: 'bg-pink-500 text-white',
  },
  RECOMMENDED_SPOT: {
    label: '추천 명소',
    emoji: '🏛️',
    color: 'bg-teal-100 text-teal-700',
    activeColor: 'bg-cyan-600 text-white',
  },
  OTHER: {
    label: '기타',
    emoji: '📌',
    color: 'bg-slate-100 text-slate-700',
    activeColor: 'bg-slate-600 text-white',
  },
};

// ============================================================================
// Grade Configuration
// ============================================================================

export const GRADE_CONFIG: Record<PlaceType, Record<1 | 2 | 3, { label: string; color: string }>> = {
  RESTAURANT: {
    1: { label: '🔥 찐맛집', color: 'bg-red-600 text-white' },
    2: { label: '👌 괜찮은 곳', color: 'bg-red-400 text-white' },
    3: { label: '🙂 무난한', color: 'bg-red-200 text-red-800' },
  },
  KIDS_PLAYGROUND: {
    1: { label: '⭐ 하민 최애', color: 'bg-green-700 text-white' },
    2: { label: '👍 하민 추천', color: 'bg-green-500 text-white' },
    3: { label: '🙂 무난한', color: 'bg-lime-300 text-green-800' },
  },
  RELAXATION: {
    1: { label: '⭐ 소중한 시간', color: 'bg-blue-900 text-white' },
    2: { label: '👍 알찬 시간', color: 'bg-blue-500 text-white' },
    3: { label: '🙂 무난한', color: 'bg-sky-200 text-blue-800' },
  },
  MY_FOOTPRINT: {
    1: { label: '⭐ 특별한 곳', color: 'bg-purple-700 text-white' },
    2: { label: '👍 좋은 곳', color: 'bg-purple-500 text-white' },
    3: { label: '🙂 무난한', color: 'bg-purple-200 text-purple-800' },
  },
  RECOMMENDED_RESTAURANT: {
    1: { label: '🔥 강추', color: 'bg-orange-700 text-white' },
    2: { label: '👌 괜찮은 곳', color: 'bg-orange-500 text-white' },
    3: { label: '🙂 무난한', color: 'bg-orange-200 text-orange-800' },
  },
  RECOMMENDED_SPOT: {
    1: { label: '⭐ 꼭 가볼 곳', color: 'bg-teal-600 text-white' },
    2: { label: '👍 가볼만한 곳', color: 'bg-teal-400 text-white' },
    3: { label: '🙂 무난한', color: 'bg-teal-200 text-teal-800' },
  },
  // 기타는 취향이 아니라 "다시 찾아갈 만한가"가 기준이라 등급 라벨도 신뢰도 표현으로 씀
  OTHER: {
    1: { label: '⭐ 확실한 곳', color: 'bg-slate-700 text-white' },
    2: { label: '👍 괜찮음', color: 'bg-slate-500 text-white' },
    3: { label: '🙂 일단 저장', color: 'bg-slate-200 text-slate-800' },
  },
};

// ============================================================================
// Marker Colors (for KakaoMap)
// ============================================================================

export const MARKER_COLORS: Record<PlaceType, Record<1 | 2 | 3, string>> = {
  RESTAURANT: {
    1: '#DC2626', // 진빨강 (Dark Red)
    2: '#F87171', // 빨강 (Red)
    3: '#FCA5A5', // 연빨강 (Light Red)
  },
  KIDS_PLAYGROUND: {
    1: '#166534', // 진초록 (Forest)
    2: '#22C55E', // 초록 (Green)
    3: '#84CC16', // 연두 (Lime)
  },
  RELAXATION: {
    1: '#1E3A8A', // 네이비 (Navy)
    2: '#3B82F6', // 파랑 (Blue)
    3: '#7DD3FC', // 하늘 (Sky Blue)
  },
  MY_FOOTPRINT: {
    1: '#7E22CE', // 진보라 (Deep Purple)
    2: '#A855F7', // 보라 (Purple)
    3: '#D8B4FE', // 라벤더 (Lavender)
  },
  RECOMMENDED_RESTAURANT: {
    1: '#C2410C', // 진주황 (Burnt Orange)
    2: '#F97316', // 주황 (Orange)
    3: '#FDBA74', // 살구 (Apricot)
  },
  RECOMMENDED_SPOT: {
    1: '#0D9488', // 청록 (Teal)
    2: '#2DD4BF', // 터쿼이즈 (Turquoise)
    3: '#99F6E4', // 민트 (Mint)
  },
  OTHER: {
    1: '#475569', // 진회색 (Slate)
    2: '#94A3B8', // 회색 (Gray)
    3: '#CBD5E1', // 연회색 (Light Slate)
  },
};

export const DEFAULT_MARKER_COLOR = '#9CA3AF';

// ============================================================================
// Filter Configuration
// ============================================================================

export const PUBLIC_TYPES: PlaceType[] = ['RESTAURANT', 'KIDS_PLAYGROUND', 'RELAXATION'];
export const PERSONAL_TYPES: PlaceType[] = ['MY_FOOTPRINT', 'RECOMMENDED_RESTAURANT', 'RECOMMENDED_SPOT', 'OTHER'];

export const PUBLIC_FILTERS: { type: PlaceType | null; label: string; emoji: string }[] = [
  { type: null, label: '전체', emoji: '📍' },
  { type: 'RESTAURANT', label: '맛집', emoji: '🍽️' },
  { type: 'KIDS_PLAYGROUND', label: '아이 놀이터', emoji: '🎠' },
  { type: 'RELAXATION', label: '아빠의 시간', emoji: '☕' },
];

export const PERSONAL_FILTERS: { type: PlaceType; label: string; emoji: string }[] = [
  { type: 'MY_FOOTPRINT', label: '나의 발자취', emoji: '👣' },
  { type: 'RECOMMENDED_RESTAURANT', label: '추천 맛집', emoji: '🍴' },
  { type: 'RECOMMENDED_SPOT', label: '추천 명소', emoji: '🏛️' },
  { type: 'OTHER', label: '기타', emoji: '📌' },
];

export const GRADE_LABELS = [
  { grade: 1, label: '최애' },
  { grade: 2, label: '추천' },
  { grade: 3, label: '무난' },
] as const;

// ============================================================================
// UI Dimensions
// ============================================================================

export const PANEL_DIMENSIONS = {
  // PlaceDetail
  DETAIL_WIDTH: 288,    // w-72
  DETAIL_HEIGHT: 320,   // max-h-80
  HEADER_HEIGHT: 140,

  // PlaceListPopup
  LIST_WIDTH: 240,
  LIST_MAX_HEIGHT: 300,

  // Common
  MARGIN: 16,
} as const;

export const MAP_ZOOM = {
  // 앱 첫 진입 시 — 검단 + 김포 일부까지 들어오는 정도(레벨은 1이 최대 확대, 14가 최대 축소이고
  // 1단계마다 대략 2배씩 넓어짐). 5 → 7 → 8로 두 번 넓힌 값(2026-09-09)
  START: 8,
  // ?place={id} 공유 링크로 특정 장소를 열 때 — 그 장소를 가까이 봐야 하므로 START보다 확대.
  // 원래 이 값 하나(DEFAULT)를 첫 진입과 공유 링크가 같이 썼는데, 첫 진입만 넓히려다 공유 링크까지
  // 멀어지는 문제가 있어서 분리함(2026-09-09)
  PLACE: 3,
  ADDR: 6,
  ON_MOVE: 6,
} as const;

// 지도 기본 중심 — 신검단중앙역(인천 서구 원당동, 인천 1호선)
export const DEFAULT_CENTER = { lat: 37.6025, lng: 126.6986 } as const;

// 지도 프로그래밍 이동 후 안정화 대기 시간 (ms)
export const MAP_SETTLE_MS = 500;

// 주소 검색 타임아웃 (ms)
export const GEOCODE_TIMEOUT_MS = 500;

// ============================================================================
// Helper Functions
// ============================================================================

export const getGradeLabel = (type: PlaceType, grade?: number) => {
  const config = GRADE_CONFIG[type];
  if (config && grade && config[grade as 1 | 2 | 3]) {
    return config[grade as 1 | 2 | 3];
  }
  const typeConfig = TYPE_CONFIG[type];
  return { label: typeConfig?.label || '장소', color: 'bg-gray-100 text-gray-800' };
};

// 등급과 무관하게 "타입"만 나타내야 하는 곳(라벨 테두리 등)에서 쓰는 색 — 항상 1등급(가장 진한) 색.
// 3등급 색은 연해서 1.5px 선으로 그리면 흰 배경과 거의 구분이 안 됨. 등급 정보는 마커 점이 이미 표현함
export const getTypeAccentColor = (type: PlaceType): string =>
  MARKER_COLORS[type]?.[1] ?? DEFAULT_MARKER_COLOR;

export const getMarkerColor = (type: PlaceType, grade?: number): string => {
  const colors = MARKER_COLORS[type];
  if (colors && grade && colors[grade as 1 | 2 | 3]) {
    return colors[grade as 1 | 2 | 3];
  }
  return DEFAULT_MARKER_COLOR;
};
