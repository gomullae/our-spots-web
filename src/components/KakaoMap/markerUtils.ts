import { Marker, PlaceType } from '@/types';
import { getMarkerColor, getTypeAccentColor } from '@/constants/placeConfig';

// 좌표를 키로 변환 (소수점 5자리까지 반올림하여 같은 위치 판단)
export const coordKey = (lat: number, lng: number) => `${lat.toFixed(5)},${lng.toFixed(5)}`;

// PlaceType별 SVG path
export function getIconPath(placeType: string): string {
  switch (placeType) {
    case 'RESTAURANT':
      return `<path d="M11 9H9V2H7v7H5V2H3v7c0 2.12 1.66 3.84 3.75 3.97V22h2.5v-9.03C11.34 12.84 13 11.12 13 9V2h-2v7zm5-3v8h2.5v8H21V2c-2.76 0-5 2.24-5 4z"/>`;
    case 'KIDS_PLAYGROUND':
      return `<path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>`;
    case 'RELAXATION':
      return `<path d="M2 21h18v-2H2v2zm2-4h14V7H4v10zm4-8h6v6H8V9zm8 0h2v6h-2V9zM6 3h12v2H6V3z"/>`;
    case 'MY_FOOTPRINT':
      return `<path d="M13.5 5.5c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zM9.8 8.9L7 23h2.1l1.8-8 2.1 2v6h2v-7.5l-2.1-2 .6-3C14.8 12 16.8 13 19 13v-2c-1.9 0-3.5-1-4.3-2.4l-1-1.6c-.4-.6-1-1-1.7-1-.3 0-.5.1-.8.1L6 8.3V13h2V9.6l1.8-.7"/>`;
    case 'RECOMMENDED_RESTAURANT':
      return `<path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>`;
    // 원래 default가 담당하던 깃발 아이콘 — 기타(OTHER) 추가로 default를 넘겨주면서 명시 case로 옮김
    case 'RECOMMENDED_SPOT':
      return `<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/>`;
    // 기타(OTHER) 및 알 수 없는 타입 폴백 — 북마크(저장해둔 곳)
    default:
      return `<path d="M17 3H7c-1.1 0-2 .9-2 2v16l7-3 7 3V5c0-1.1-.9-2-2-2z"/>`;
  }
}

// 좌표 기준 마커 그룹화
export function groupMarkersByCoord(markers: Marker[]): Map<string, Marker[]> {
  const grouped = new Map<string, Marker[]>();
  markers.forEach((marker) => {
    const key = coordKey(marker.latitude, marker.longitude);
    if (!grouped.has(key)) {
      grouped.set(key, []);
    }
    grouped.get(key)!.push(marker);
  });
  return grouped;
}

// 사진이 있는 장소만 마커 우측 하단에 붙는 작은 배지 — 튀지 않게 흰 배경 + 무채색 아이콘, 아주 작게.
// 공개 사진이 하나도 없이 비공개 사진만 있으면 아이콘 색만 옅은 회색으로 바꿔서 구분함(눌러봐야
// 비로그인 사용자에겐 안 보인다는 힌트) — 공개 사진이 하나라도 있으면 기존 진한 회색 그대로.
// 흰 배경 원 자체는 항상 opacity 1로 또렷하게 유지 — 배지 전체를 반투명하게 하면 지도 배경(다른
// 아이콘/글자)이 비쳐서 배지 자체가 거의 안 보이는 문제가 있었음(2026-08-30, 아이콘 색만 바꾸는 방식으로 변경)
function photoBadgeHtml(hasPublicPhoto: boolean): string {
  const strokeColor = hasPublicPhoto ? '#6B7280' : '#D1D5DB';
  return `
  <div style="
    position: absolute;
    left: 24px;
    top: 24px;
    width: 11px;
    height: 11px;
    background: white;
    border-radius: 50%;
    box-shadow: 0 1px 2px rgba(0,0,0,0.3);
    display: flex;
    align-items: center;
    justify-content: center;
  ">
    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
    </svg>
  </div>
`;
}

// 단일 마커 HTML 생성 — isAuthenticated는 사진 배지 표시 여부 판단에만 씀(비로그인 시 비공개 사진뿐인
// 장소는 배지 자체를 아예 안 보여줌: 눌러봐야 안 보일 배지를 미리 노출할 필요 없음. 로그인 시에는
// hasPhotos만으로 판단해 공개/비공개 무관하게 표시하고, 옅은 회색으로 구분함)
export function createSingleMarkerHTML(marker: Marker, isAuthenticated: boolean): string {
  const color = getMarkerColor(marker.type as PlaceType, marker.grade);
  const icon = getIconPath(marker.type);
  const shouldShowPhotoBadge = isAuthenticated ? marker.hasPhotos : marker.hasPublicPhoto;

  return `
    <div style="
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    ">
      <div style="
        width: 18px;
        height: 18px;
        background-color: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <svg width="10" height="10" viewBox="0 0 24 24" fill="white">
          ${icon}
        </svg>
      </div>
      ${shouldShowPhotoBadge ? photoBadgeHtml(marker.hasPublicPhoto) : ''}
    </div>
  `;
}

// 검색 결과 라벨 마커 HTML 생성 (A, B, C...)
export function createSearchMarkerHTML(label: string): string {
  return `
    <div style="
      width: 36px;
      height: 44px;
      display: flex;
      flex-direction: column;
      align-items: center;
      cursor: pointer;
    ">
      <div style="
        width: 24px;
        height: 24px;
        background: #EA4335;
        border: 2px solid white;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 2px 6px rgba(0,0,0,0.35);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="
          transform: rotate(45deg);
          color: white;
          font-size: 11px;
          font-weight: bold;
          line-height: 1;
        ">${label}</span>
      </div>
      <div style="
        width: 6px;
        height: 6px;
        background: rgba(0,0,0,0.2);
        border-radius: 50%;
        margin-top: 1px;
      "></div>
    </div>
  `;
}

// 그룹 마커 HTML 생성
export function createGroupMarkerHTML(count: number): string {
  return `
    <div style="
      width: 44px;
      height: 44px;
      display: flex;
      align-items: center;
      justify-content: center;
      cursor: pointer;
      position: relative;
    ">
      <div style="
        width: 22px;
        height: 22px;
        background: linear-gradient(135deg, #6366F1, #8B5CF6);
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-size: 11px;
        font-weight: bold;
      ">
        ${count}
      </div>
    </div>
  `;
}

// ============================================================================
// 마커 이름 라벨 (줌 조건부 표시 + 충돌 해소)
// ============================================================================

// 라벨에 표시할 최대 글자 수 — 길수록 서로 잡아먹어서 화면에 살아남는 라벨 총량이 줄어듦
const LABEL_MAX_CHARS = 8;

// 마커 컨테이너(44x44)에서 실제로 눈에 보이는 점 영역만 남기기 위한 여백.
// 44 전체를 점유 영역으로 치면 라벨이 과하게 막힘 — 안쪽 22x22 정도가 원+사진배지에 해당
const DOT_INSET = 11;

// 점 중심에서 라벨까지의 거리 — 점 반지름 9 + 사진 배지 하단(박스 좌표 35)을 피하는 여유.
// 아래/위/오른쪽/왼쪽 네 후보 자리 계산이 전부 이 값에서 파생되므로 여기만 바꾸면 다 같이 움직임
const LABEL_OFFSET = 14;

// 라벨의 기본 transform — 가로 중앙 정렬. 후보 자리 이동은 이 뒤에 translate()를 덧붙여서 표현
export const LABEL_BASE_TRANSFORM = 'translateX(-50%)';

export function truncateLabel(name: string, max = LABEL_MAX_CHARS): string {
  const trimmed = name.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed;
}

// 마커 이름 라벨 엘리먼트 생성.
// - position:absolute — 44x44 컨테이너의 레이아웃 크기를 키우지 않기 위함. 크기가 커지면
//   yAnchor:0.5 기준이 밀려서 점이 실제 좌표에서 벗어나고, content.getBoundingClientRect()로 계산하는
//   상세 패널 위치도 같이 틀어짐
// - pointer-events:none — 라벨이 옆 마커 위에 걸쳐도 그 마커의 클릭을 가로채지 않게
// - 초기값 visibility:hidden — 레이아웃 계산(layoutMarkerLabels)이 돌아야 보임. 계산이 안 돌면
//   라벨이 안 보일 뿐 마커 자체는 멀쩡하다는 안전한 실패 방향
export function createMarkerLabelElement(marker: Marker): HTMLElement {
  const el = document.createElement('div');
  el.style.cssText = [
    'position: absolute',
    // 박스(44x44)가 아니라 점(18px) 기준으로 붙임 — 박스는 클릭 영역이라 점보다 훨씬 커서,
    // top:100%로 두면 점에서 14px이나 떨어져 라벨이 따로 노는 것처럼 보였음.
    // 거리는 LABEL_OFFSET, 실제 자리는 layoutMarkerLabels가 네 후보 중에서 고름
    'top: 50%',
    'left: 50%',
    `transform: ${LABEL_BASE_TRANSFORM}`,
    `margin-top: ${LABEL_OFFSET}px`,
    'white-space: nowrap',
    'font-size: 11px',
    'line-height: 1.35',
    'font-weight: 700',
    'color: #111827',
    // 흰 배경 pill — 카카오 기본 POI 라벨이 이미 빽빽한 지도 위에 덧그리는 구조라, 글자만으로는
    // (외곽선을 줘도) 배경의 일부로 읽혀서 묻힘. 배경을 깔아 층을 분리해야 "내가 저장한 곳"으로 구분됨
    'background: rgba(255,255,255,0.92)',
    // 타입 색 테두리 — 처음엔 pill 안에 5px 컬러 점을 넣었는데 점+간격으로 9px을 먹어서 뺐음.
    // 테두리는 3px만 늘면서 색이 더 잘 읽히고, 사방에 경계가 생겨 흰 건물 위에서도 윤곽이 살아남.
    // 색은 등급 무관 진한 색(getTypeAccentColor) — 3등급 연한 색은 1.5px 선으로는 흰 배경과 구분이 안 됨
    `border: 1.5px solid ${getTypeAccentColor(marker.type as PlaceType)}`,
    'border-radius: 4px',
    'padding: 1px 5px',
    'box-shadow: 0 1px 2px rgba(0,0,0,0.18)',
    'pointer-events: none',
    'visibility: hidden',
  ].join(';');

  el.textContent = truncateLabel(marker.name);
  return el;
}

export interface LabelRect {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface LabelCandidate {
  index: number;
  // 낮을수록 먼저 자리를 차지함
  priority: number;
  rect: LabelRect;
}

export function toLabelRect(rect: DOMRect, inset = 0): LabelRect {
  return {
    left: rect.left + inset,
    top: rect.top + inset,
    right: rect.right - inset,
    bottom: rect.bottom - inset,
  };
}

export function dotRect(rect: DOMRect): LabelRect {
  return toLabelRect(rect, DOT_INSET);
}

function overlaps(a: LabelRect, b: LabelRect): boolean {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

// 기본 자리(점 아래)를 0으로 두고, 거기서 얼마나 옮길지를 px로 표현
export interface LabelOffset {
  dx: number;
  dy: number;
}

function shiftRect(rect: LabelRect, offset: LabelOffset): LabelRect {
  return {
    left: rect.left + offset.dx,
    top: rect.top + offset.dy,
    right: rect.right + offset.dx,
    bottom: rect.bottom + offset.dy,
  };
}

/**
 * 라벨을 놓아볼 네 자리를 순서대로 반환 — 아래(기본) → 위 → 오른쪽 → 왼쪽.
 * 전부 점 중심에서 LABEL_OFFSET만큼 떨어지므로 어느 자리를 골라도 자기 점은 안 가림.
 * w/h는 실제로 측정한 라벨 크기(글자 길이에 따라 달라짐).
 */
function candidateOffsets(w: number, h: number): LabelOffset[] {
  return [
    { dx: 0, dy: 0 },
    { dx: 0, dy: -(LABEL_OFFSET * 2 + h) },
    { dx: LABEL_OFFSET + w / 2, dy: -(LABEL_OFFSET + h / 2) },
    { dx: -(LABEL_OFFSET + w / 2), dy: -(LABEL_OFFSET + h / 2) },
  ];
}

/**
 * 우선순위가 높은 라벨부터 자리를 차지하는 greedy 배치. 구글/카카오 지도가 자기네 POI 라벨에
 * 쓰는 방식과 같음 — 카카오맵 CustomOverlay에는 이 기능이 없어서 직접 계산해야 함.
 *
 * 라벨마다 네 자리(아래/위/오른쪽/왼쪽)를 차례로 시도해서 처음으로 안 겹치는 곳에 놓고,
 * 네 곳 다 막혔을 때만 포기함(라벨을 숨기고 점만 남김). 자리를 한 곳만 보면 아래가 조금
 * 막혔다는 이유로 바로 포기해서, 옆으로 살짝 비키면 들어갈 라벨까지 버리게 됨.
 *
 * blocked에는 "라벨이 침범하면 안 되는 영역"(모든 마커의 점)을 미리 넣어둠 — 라벨이 남의 점을
 * 가리는 건 z-index로는 못 막음(점과 라벨이 같은 오버레이에 들어있어 z-index를 따로 못 줌)
 *
 * 반환값은 index → 확정된 자리. 여기 없는 index는 네 자리 모두 실패해서 숨겨야 하는 라벨.
 */
export function resolveLabelPlacements(
  candidates: LabelCandidate[],
  blocked: LabelRect[],
): Map<number, LabelOffset> {
  const placements = new Map<number, LabelOffset>();
  const placed: LabelRect[] = [...blocked];

  [...candidates]
    .sort((a, b) => a.priority - b.priority)
    .forEach((candidate) => {
      const width = candidate.rect.right - candidate.rect.left;
      const height = candidate.rect.bottom - candidate.rect.top;

      for (const offset of candidateOffsets(width, height)) {
        const rect = shiftRect(candidate.rect, offset);
        if (placed.some((taken) => overlaps(rect, taken))) continue;
        placed.push(rect);
        placements.set(candidate.index, offset);
        break;
      }
    });

  return placements;
}
