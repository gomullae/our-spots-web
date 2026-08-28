import { Marker, PlaceType } from '@/types';
import { getMarkerColor } from '@/constants/placeConfig';

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
    default:
      return `<path d="M14.4 6L14 4H5v17h2v-7h5.6l.4 2h7V6h-5.6z"/>`;
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

// 사진이 있는 장소만 마커 우측 하단에 붙는 작은 배지 — 튀지 않게 흰 배경 + 무채색 아이콘, 아주 작게
const PHOTO_BADGE_HTML = `
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
    <svg width="7" height="7" viewBox="0 0 24 24" fill="none" stroke="#6B7280" stroke-width="2">
      <path stroke-linecap="round" stroke-linejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z"/>
    </svg>
  </div>
`;

// 단일 마커 HTML 생성
export function createSingleMarkerHTML(marker: Marker): string {
  const color = getMarkerColor(marker.type as PlaceType, marker.grade);
  const icon = getIconPath(marker.type);

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
      ${marker.hasPhotos ? PHOTO_BADGE_HTML : ''}
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
