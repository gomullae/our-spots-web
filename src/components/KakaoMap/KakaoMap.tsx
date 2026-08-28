'use client';

import { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from 'react';
import { Marker, SearchResultPlace } from '@/types';
import { MAP_ZOOM, DEFAULT_CENTER, MAP_SETTLE_MS } from '@/constants/placeConfig';
import { useKakaoSDK } from '@/hooks/useKakaoSDK';
import { groupMarkersByCoord, createSingleMarkerHTML, createGroupMarkerHTML, createSearchMarkerHTML } from './markerUtils';

interface KakaoMapProps {
  markers: Marker[];
  onMarkerClick: (markers: Marker[], position: { x: number; y: number; markerCenter?: { x: number; y: number; w: number; h: number } }) => void;
  onMapClick?: (latlng: { lat?: number; lng?: number; address?: string }) => void;
  center?: { lat: number; lng: number };
  zoom?: number;
  moveTo?: { lat: number; lng: number; zoom?: number } | null;
  previewPosition?: { lat: number; lng: number } | null;
  highlightPosition?: { lat: number; lng: number } | null;
  searchResults?: SearchResultPlace[];
  onSearchMarkerClick?: (result: SearchResultPlace) => void;
  onMapMoved?: () => void;
  currentLocation?: { lat: number; lng: number } | null;
}

export interface KakaoMapHandle {
  getBounds: () => { sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null;
  getCenter: () => { lat: number; lng: number } | null;
  coordToScreenPosition: (lat: number, lng: number) => { x: number; y: number } | null;
}

const KakaoMap = forwardRef<KakaoMapHandle, KakaoMapProps>(function KakaoMap({
  markers,
  onMarkerClick,
  onMapClick,
  center = DEFAULT_CENTER,
  zoom = MAP_ZOOM.DEFAULT,
  moveTo,
  previewPosition,
  highlightPosition,
  searchResults = [],
  onSearchMarkerClick,
  onMapMoved,
  currentLocation,
}, ref) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<KakaoMapInstance | null>(null);
  const markerInstancesRef = useRef<KakaoCustomOverlay[]>([]);
  const searchMarkerInstancesRef = useRef<KakaoCustomOverlay[]>([]);
  const previewPinRef = useRef<KakaoCustomOverlay | null>(null);
  const highlightPinRef = useRef<KakaoCustomOverlay | null>(null);
  const currentLocationOverlayRef = useRef<KakaoCustomOverlay | null>(null);
  const markerClickedRef = useRef(false);
  const programmaticMoveRef = useRef(false);
  const onMapMovedRef = useRef(onMapMoved);
  // 렌더 중 ref를 직접 mutate하지 않고 effect 안에서 갱신(deps 없이 매 렌더 후 실행)
  useEffect(() => {
    onMapMovedRef.current = onMapMoved;
  });
  const [mapReady, setMapReady] = useState(false);
  const { isLoaded, error } = useKakaoSDK();

  useImperativeHandle(ref, () => ({
    getBounds: () => {
      if (!mapInstanceRef.current) return null;
      const bounds = mapInstanceRef.current.getBounds();
      const sw = bounds.getSouthWest();
      const ne = bounds.getNorthEast();
      return {
        sw: { lat: sw.getLat(), lng: sw.getLng() },
        ne: { lat: ne.getLat(), lng: ne.getLng() },
      };
    },
    getCenter: () => {
      if (!mapInstanceRef.current) return null;
      const center = mapInstanceRef.current.getCenter();
      return { lat: center.getLat(), lng: center.getLng() };
    },
    coordToScreenPosition: (lat: number, lng: number) => {
      if (!mapInstanceRef.current) return null;
      const projection = mapInstanceRef.current.getProjection();
      const latlng = new window.kakao.maps.LatLng(lat, lng);
      const point = projection.containerPointFromCoords(latlng);
      const mapEl = mapRef.current;
      if (!mapEl) return null;
      const rect = mapEl.getBoundingClientRect();
      return { x: rect.left + point.x, y: rect.top + point.y };
    },
  }));

  // Create map
  useEffect(() => {
    if (!isLoaded || !mapRef.current || mapInstanceRef.current) return;

    try {
      const options = {
        center: new window.kakao.maps.LatLng(center.lat, center.lng),
        level: zoom,
      };
      mapInstanceRef.current = new window.kakao.maps.Map(mapRef.current, options);
      // 카카오맵 인스턴스 생성은 DOM ref가 필요해 렌더 중엔 할 수 없는 외부 시스템 동기화라 effect가 맞는 위치 —
      // "prop에서 파생 가능한 state를 effect에서 세팅"하는 안티패턴과 달리, 다른 effect들이 mapInstanceRef를
      // 안전하게 쓸 수 있는 시점을 아는 유일한 방법이 이 완료 플래그라 그대로 둠
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMapReady(true);
    } catch (e) {
      console.error('Failed to create map:', e);
    }
  }, [isLoaded, center.lat, center.lng, zoom]);

  // Move map to location
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !moveTo) return;

    programmaticMoveRef.current = true;
    const moveLatLng = new window.kakao.maps.LatLng(moveTo.lat, moveTo.lng);
    mapInstanceRef.current.setCenter(moveLatLng);
    if (moveTo.zoom != null) {
      mapInstanceRef.current.setLevel(moveTo.zoom);
    }
    const timer = setTimeout(() => { programmaticMoveRef.current = false; }, MAP_SETTLE_MS);
    return () => clearTimeout(timer);
  }, [mapReady, moveTo]);

  // Current location overlay with ripple effect
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    if (currentLocationOverlayRef.current) {
      currentLocationOverlayRef.current.setMap(null);
      currentLocationOverlayRef.current = null;
    }

    if (!currentLocation) return;

    if (!document.getElementById('current-location-style')) {
      const style = document.createElement('style');
      style.id = 'current-location-style';
      style.textContent = `
        @keyframes locationRipple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(3); opacity: 0; }
        }
      `;
      document.head.appendChild(style);
    }

    const el = document.createElement('div');
    el.innerHTML = `
      <div style="position: relative; width: 20px; height: 20px;">
        <div style="
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 20px; height: 20px;
          background: rgba(66, 133, 244, 0.25);
          border-radius: 50%;
          animation: locationRipple 2s ease-out infinite;
        "></div>
        <div style="
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          width: 14px; height: 14px;
          background: #4285F4;
          border: 2.5px solid white;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        "></div>
      </div>
    `;

    const position = new window.kakao.maps.LatLng(currentLocation.lat, currentLocation.lng);
    const overlay = new window.kakao.maps.CustomOverlay({
      position,
      content: el,
      yAnchor: 0.5,
      xAnchor: 0.5,
    });
    overlay.setMap(mapInstanceRef.current);
    currentLocationOverlayRef.current = overlay;

    return () => {
      overlay.setMap(null);
      currentLocationOverlayRef.current = null;
    };
  }, [mapReady, currentLocation]);

  // Preview pin
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !previewPosition) return;

    const position = new window.kakao.maps.LatLng(previewPosition.lat, previewPosition.lng);

    const pinEl = document.createElement('div');
    pinEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: previewBounce 0.4s ease-out;
      ">
        <div style="
          width: 28px;
          height: 28px;
          background: #EF4444;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 10px rgba(0,0,0,0.35);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div style="
          width: 8px;
          height: 8px;
          background: rgba(0,0,0,0.2);
          border-radius: 50%;
          margin-top: 2px;
        "></div>
      </div>
    `;

    // 바운스 애니메이션 스타일 삽입
    if (!document.getElementById('preview-pin-style')) {
      const style = document.createElement('style');
      style.id = 'preview-pin-style';
      style.textContent = `
        @keyframes previewBounce {
          0% { transform: translateY(-20px); opacity: 0; }
          60% { transform: translateY(4px); opacity: 1; }
          100% { transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    const overlay = new window.kakao.maps.CustomOverlay({
      position,
      content: pinEl,
      yAnchor: 1,
      xAnchor: 0.5,
    });

    overlay.setMap(mapInstanceRef.current);
    previewPinRef.current = overlay;

    return () => {
      overlay.setMap(null);
      previewPinRef.current = null;
      document.getElementById('preview-pin-style')?.remove();
    };
  }, [mapReady, previewPosition]);

  // Highlight pin (deep link)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !highlightPosition) return;

    const position = new window.kakao.maps.LatLng(highlightPosition.lat, highlightPosition.lng);

    const pinEl = document.createElement('div');
    pinEl.innerHTML = `
      <div style="
        display: flex;
        flex-direction: column;
        align-items: center;
        animation: highlightBounce 0.5s ease-out;
      ">
        <div style="
          width: 32px;
          height: 32px;
          background: #2563EB;
          border: 3px solid white;
          border-radius: 50% 50% 50% 0;
          transform: rotate(-45deg);
          box-shadow: 0 3px 12px rgba(37,99,235,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
        ">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="white" style="transform: rotate(45deg);">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
        <div style="
          width: 10px;
          height: 10px;
          background: rgba(37,99,235,0.25);
          border-radius: 50%;
          margin-top: 2px;
        "></div>
      </div>
    `;

    if (!document.getElementById('highlight-pin-style')) {
      const style = document.createElement('style');
      style.id = 'highlight-pin-style';
      style.textContent = `
        @keyframes highlightBounce {
          0% { transform: translateY(-30px); opacity: 0; }
          60% { transform: translateY(5px); opacity: 1; }
          100% { transform: translateY(0); }
        }
      `;
      document.head.appendChild(style);
    }

    const overlay = new window.kakao.maps.CustomOverlay({
      position,
      content: pinEl,
      yAnchor: 1,
      xAnchor: 0.5,
    });

    overlay.setMap(mapInstanceRef.current);
    highlightPinRef.current = overlay;

    return () => {
      overlay.setMap(null);
      highlightPinRef.current = null;
      document.getElementById('highlight-pin-style')?.remove();
    };
  }, [mapReady, highlightPosition]);

  // 역지오코딩 후 onMapClick 호출하는 공통 헬퍼
  const onMapClickRef = useRef(onMapClick);
  // 렌더 중 ref를 직접 mutate하지 않고 effect 안에서 갱신(deps 없이 매 렌더 후 실행)
  useEffect(() => {
    onMapClickRef.current = onMapClick;
  });
  const reverseGeocodeAndClick = useCallback((lat: number, lng: number) => {
    if (window.kakao.maps.services?.Geocoder) {
      const geocoder = new window.kakao.maps.services.Geocoder();
      geocoder.coord2Address(lng, lat, (result: KakaoGeocoderResult[], status: string) => {
        let address = '';
        if (status === window.kakao.maps.services!.Status.OK && result[0]) {
          address = result[0].road_address?.address_name || result[0].address?.address_name || '';
        }
        onMapClickRef.current?.({ lat, lng, address });
      });
    } else {
      onMapClickRef.current?.({ lat, lng });
    }
  }, []);

  // Map click event (Ctrl+Click → 장소 등록, 일반 클릭 → 패널 닫기)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !onMapClick) return;

    let lastCtrlClick = false;
    const container = mapRef.current;
    const captureModifier = (e: MouseEvent) => {
      lastCtrlClick = e.ctrlKey || e.metaKey;
    };
    container?.addEventListener('mousedown', captureModifier);

    const clickHandler = (mouseEvent: { latLng: KakaoLatLng }) => {
      if (markerClickedRef.current) {
        markerClickedRef.current = false;
        return;
      }
      if (!lastCtrlClick) {
        onMapClick({});
        return;
      }
      reverseGeocodeAndClick(mouseEvent.latLng.getLat(), mouseEvent.latLng.getLng());
    };

    window.kakao.maps.event.addListener(mapInstanceRef.current, 'click', clickHandler);

    const mapInstance = mapInstanceRef.current;
    return () => {
      container?.removeEventListener('mousedown', captureModifier);
      window.kakao.maps.event.removeListener(mapInstance, 'click', clickHandler);
    };
  }, [mapReady, onMapClick, reverseGeocodeAndClick]);

  // 모바일 롱프레스 → 장소 등록 미리보기
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !onMapClick) return;
    const container = mapRef.current;
    if (!container) return;

    const LONG_PRESS_MS = 600;
    let timer: ReturnType<typeof setTimeout> | null = null;
    let startX = 0;
    let startY = 0;
    let fired = false;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      fired = false;

      timer = setTimeout(() => {
        fired = true;
        // 롱프레스 위치를 지도 좌표로 변환
        const map = mapInstanceRef.current;
        if (!map) return;
        const proj = map.getProjection();
        const bounds = container.getBoundingClientRect();
        const point = { x: startX - bounds.left, y: startY - bounds.top };
        // containerPointToCoords는 카카오맵에서 제공하지 않으므로
        // 지도 중심 + 오프셋으로 계산
        const centerPoint = proj.containerPointFromCoords(map.getCenter());
        const dx = point.x - centerPoint.x;
        const dy = point.y - centerPoint.y;
        // 줌 레벨에 따른 스케일 근사 (카카오맵은 containerPointFromCoords/coordsFromContainerPoint 쌍 미제공)
        // 대신 bounds의 두 모서리를 이용해 px당 좌표를 계산
        const mapBounds = map.getBounds();
        const sw = mapBounds.getSouthWest();
        const ne = mapBounds.getNorthEast();
        const lngPerPx = (ne.getLng() - sw.getLng()) / bounds.width;
        const latPerPx = (ne.getLat() - sw.getLat()) / bounds.height;
        const center = map.getCenter();
        const lat = center.getLat() - dy * latPerPx;
        const lng = center.getLng() + dx * lngPerPx;
        reverseGeocodeAndClick(lat, lng);
      }, LONG_PRESS_MS);
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (!timer) return;
      const dx = e.touches[0].clientX - startX;
      const dy = e.touches[0].clientY - startY;
      if (Math.sqrt(dx * dx + dy * dy) > 10) {
        clearTimeout(timer);
        timer = null;
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      // 롱프레스가 발동된 경우 후속 click 이벤트 방지
      if (fired) {
        e.preventDefault();
      }
    };

    // 롱프레스 시 브라우저 기본 컨텍스트 메뉴 방지
    const preventContext = (e: Event) => { e.preventDefault(); };
    container.addEventListener('contextmenu', preventContext);
    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);

    return () => {
      if (timer) clearTimeout(timer);
      container.removeEventListener('contextmenu', preventContext);
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
    };
  }, [mapReady, onMapClick, reverseGeocodeAndClick]);

  // Map moved events (dragend, zoom_changed) — 사용자 조작 시만
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current) return;

    let timer: ReturnType<typeof setTimeout>;

    const handleMoved = () => {
      if (programmaticMoveRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        onMapMovedRef.current?.();
      }, 300);
    };

    const mapInstance = mapInstanceRef.current;
    window.kakao.maps.event.addListener(mapInstance, 'dragend', handleMoved);
    window.kakao.maps.event.addListener(mapInstance, 'zoom_changed', handleMoved);

    return () => {
      clearTimeout(timer);
      window.kakao.maps.event.removeListener(mapInstance, 'dragend', handleMoved);
      window.kakao.maps.event.removeListener(mapInstance, 'zoom_changed', handleMoved);
    };
  }, [mapReady]);

  // Render registered markers
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.kakao?.maps) return;

    // Clear existing markers
    markerInstancesRef.current.forEach((marker) => marker.setMap(null));
    markerInstancesRef.current = [];

    const groupedMarkers = groupMarkersByCoord(markers);

    groupedMarkers.forEach((markersAtLocation) => {
      const firstMarker = markersAtLocation[0];
      const position = new window.kakao.maps.LatLng(firstMarker.latitude, firstMarker.longitude);
      const isGroup = markersAtLocation.length > 1;

      const content = document.createElement('div');
      content.innerHTML = isGroup
        ? createGroupMarkerHTML(markersAtLocation.length)
        : createSingleMarkerHTML(firstMarker);

      content.style.cursor = 'pointer';
      content.onclick = (e) => {
        e.stopPropagation();
        markerClickedRef.current = true;
        const rect = content.getBoundingClientRect();
        const cx = rect.left + rect.width / 2;
        const cy = rect.top + rect.height / 2;
        onMarkerClick(markersAtLocation, {
          x: rect.right + 8,
          y: rect.top,
          markerCenter: { x: cx, y: cy, w: rect.width + 16, h: rect.height + 16 },
        });
      };

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 0.5,
        xAnchor: 0.5,
      });

      customOverlay.setMap(mapInstanceRef.current);
      markerInstancesRef.current.push(customOverlay);
    });
  }, [mapReady, markers, onMarkerClick]);

  // Render search result markers (A, B, C...)
  useEffect(() => {
    if (!mapReady || !mapInstanceRef.current || !window.kakao?.maps) return;

    // Clear existing search markers
    searchMarkerInstancesRef.current.forEach((marker) => marker.setMap(null));
    searchMarkerInstancesRef.current = [];

    searchResults.forEach((result) => {
      const position = new window.kakao.maps.LatLng(result.lat, result.lng);

      const content = document.createElement('div');
      content.innerHTML = createSearchMarkerHTML(result.label);
      content.style.cursor = 'pointer';
      content.onclick = (e) => {
        e.stopPropagation();
        markerClickedRef.current = true;
        onSearchMarkerClick?.(result);
      };

      const customOverlay = new window.kakao.maps.CustomOverlay({
        position,
        content,
        yAnchor: 1,
        xAnchor: 0.5,
      });

      customOverlay.setMap(mapInstanceRef.current);
      searchMarkerInstancesRef.current.push(customOverlay);
    });
  }, [mapReady, searchResults, onSearchMarkerClick]);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-gray-100">
        <div className="text-center p-8">
          <p className="text-gray-600">지도 로딩 중...</p>
        </div>
      </div>
    );
  }

  return <div ref={mapRef} className="h-full w-full select-none" style={{ WebkitTouchCallout: 'none' }} />;
});

export default KakaoMap;
