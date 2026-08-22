'use client';

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import KakaoMap from '@/components/KakaoMap';
import type { KakaoMapHandle } from '@/components/KakaoMap';
import PlaceDetail from '@/components/PlaceDetail';
import PlaceForm from '@/components/PlaceForm';
import FilterButtons from '@/components/FilterButtons';
import AddressSearch from '@/components/AddressSearch';
import ShareLinkButton from '@/components/ShareLinkButton';
import LoginModal from '@/components/LoginModal';
import PlaceListPopup from '@/components/PlaceListPopup';
import PlacePreviewCard from '@/components/PlacePreviewCard';
import AboutModal from '@/components/AboutModal';
import FeedbackModal from '@/components/FeedbackModal';
import SearchResultsPanel from '@/components/SearchResultsPanel';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { LocationPinIcon, RefreshIcon, LockIcon, UnlockIcon, CurrentLocationIcon, MegaphoneIcon, ChatBubbleIcon, ScaleIcon } from '@/components/icons';
import { mapApi, placeApi } from '@/services/api';
import { Marker } from '@/types';
import { useMarkerFilter } from '@/hooks/useMarkerFilter';
import { useAuth } from '@/hooks/useAuth';
import { usePlaceActions } from '@/hooks/usePlaceActions';
import { useMapSearch } from '@/hooks/useMapSearch';
import { useKakaoSDK } from '@/hooks/useKakaoSDK';
import { useToast } from '@/hooks/useToast';
import { DEFAULT_CENTER, MAP_ZOOM, MAP_SETTLE_MS, GEOCODE_TIMEOUT_MS } from '@/constants/placeConfig';

function Home() {
  const searchParams = useSearchParams();
  const { isLoaded: isKakaoLoaded } = useKakaoSDK();
  const [markers, setMarkers] = useState<Marker[]>([]);
  const [moveTo, setMoveTo] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [currentLocation, setCurrentLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isTrackingLocation, setIsTrackingLocation] = useState(false);
  const locationWatchIdRef = useRef<number | null>(null);
  const [highlightPosition, setHighlightPosition] = useState<{ lat: number; lng: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const mapRef = useRef<KakaoMapHandle>(null);
  const headerRef = useRef<HTMLElement>(null);
  const [headerHeight, setHeaderHeight] = useState(0);

  const auth = useAuth();

  const {
    filteredMarkers,
    selectedTypes,
    selectedGrades,
    handleTypeToggle,
    setSelectedGrades,
  } = useMarkerFilter({ markers, isAuthenticated: auth.isAuthenticated });

  // Place actions hook
  const place = usePlaceActions({ setMarkers, setMoveTo });

  // Map search hook
  const search = useMapSearch({
    mapRef,
    setMoveTo,
    setPreviewPlace: place.setPreviewPlace,
    clearPanels: place.clearPanels,
    clearDetailPanels: place.clearDetailPanels,
  });

  // Toast & Confirm
  const { toasts, showToast, removeToast } = useToast();
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);

  const showConfirm = useCallback((message: string, onConfirm: () => void, isDestructive?: boolean) => {
    setConfirmState({ message, onConfirm, isDestructive });
  }, []);

  // Preview card screen position (computed after map moves)
  const [previewScreenPosition, setPreviewScreenPosition] = useState<{ x: number; y: number } | null>(null);
  useEffect(() => {
    if (!place.previewPlace) {
      setPreviewScreenPosition(null);
      return;
    }
    // KakaoMap's moveTo useEffect (child) runs before this (parent) useEffect,
    // so the map has already moved when we compute the screen position here.
    const pos = mapRef.current?.coordToScreenPosition(place.previewPlace.lat, place.previewPlace.lng) ?? null;
    setPreviewScreenPosition(pos);
  }, [place.previewPlace]);

  // About modal & refresh state
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showAbout, setShowAbout] = useState(false);
  const [showAboutBadge, setShowAboutBadge] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);

  useEffect(() => {
    if (!localStorage.getItem('about-seen')) {
      setShowAboutBadge(true);
    }
  }, []);

  // 헤더 높이 측정 (SearchResultsPanel 위치용)
  useEffect(() => {
    if (!headerRef.current) return;
    const observer = new ResizeObserver(() => {
      if (headerRef.current) {
        setHeaderHeight(headerRef.current.offsetHeight);
      }
    });
    observer.observe(headerRef.current);
    setHeaderHeight(headerRef.current.offsetHeight);
    return () => observer.disconnect();
  }, []);

  // 마커 fetch
  useEffect(() => {
    const fetchMarkers = async () => {
      try {
        const data = await mapApi.getMarkers();
        setMarkers(data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch markers:', err);
        setError('마커를 불러오는데 실패했습니다. 백엔드 서버가 실행 중인지 확인해주세요.');
      }
    };
    fetchMarkers();
  }, []);

  // URL addr 파라미터로 초기 위치 설정
  useEffect(() => {
    const addr = searchParams.get('addr');
    if (!addr || !isKakaoLoaded) return;

    let cancelled = false;
    const timeout = setTimeout(() => {
      cancelled = true;
      console.warn(`[addr] 주소 검색 타임아웃: "${addr}"`);
    }, GEOCODE_TIMEOUT_MS);

    const geocoder = new window.kakao.maps.services!.Geocoder();
    geocoder.addressSearch(addr, (result: KakaoGeocoderResult[], status: string) => {
      clearTimeout(timeout);
      if (cancelled) return;
      if (status === window.kakao.maps.services!.Status.OK && result.length > 0) {
        console.log(`[addr] 주소 찾음: "${addr}" → (${result[0].y}, ${result[0].x})`);
        setMoveTo({ lat: parseFloat(result[0].y), lng: parseFloat(result[0].x), zoom: MAP_ZOOM.ADDR });
      } else {
        console.warn(`[addr] 주소 못 찾음: "${addr}" (status: ${status})`);
      }
    });

    return () => { cancelled = true; clearTimeout(timeout); };
  }, [searchParams, isKakaoLoaded]);

  // URL place 파라미터로 장소 상세 자동 오픈
  useEffect(() => {
    const placeId = searchParams.get('place');
    if (!placeId) return;
    const id = parseInt(placeId, 10);
    if (isNaN(id)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    (async () => {
      try {
        const placeData = await placeApi.getById(id);
        if (cancelled) return;
        setHighlightPosition({ lat: placeData.latitude, lng: placeData.longitude });
        setMoveTo({ lat: placeData.latitude, lng: placeData.longitude, zoom: MAP_ZOOM.DEFAULT });
        timer = setTimeout(() => {
          if (cancelled) return;
          const screenPos = mapRef.current?.coordToScreenPosition(placeData.latitude, placeData.longitude);
          const pos = screenPos
            ? { x: screenPos.x, y: screenPos.y + 60 }
            : { x: window.innerWidth / 2, y: window.innerHeight / 2 };
          place.openPlaceById(id, pos);
        }, MAP_SETTLE_MS);
      } catch (err) {
        console.warn(`[place] 장소를 찾을 수 없습니다: id=${placeId}`, err);
      }
    })();

    return () => { cancelled = true; clearTimeout(timer); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleRefreshMarkers = useCallback(async () => {
    setIsRefreshing(true);
    try {
      const data = await mapApi.refreshMarkers();
      setMarkers(data);
    } catch (err) {
      console.error('Failed to refresh markers:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  const stopTrackingLocation = useCallback(() => {
    if (locationWatchIdRef.current !== null) {
      navigator.geolocation.clearWatch(locationWatchIdRef.current);
      locationWatchIdRef.current = null;
    }
    setIsTrackingLocation(false);
    setCurrentLocation(null);
  }, []);

  const handleMoveToCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      showToast('이 브라우저에서는 위치 서비스를 지원하지 않습니다.', 'error');
      return;
    }

    if (isTrackingLocation) {
      stopTrackingLocation();
      return;
    }

    let isFirst = true;
    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setCurrentLocation(loc);
        if (isFirst) {
          setMoveTo(loc);
          isFirst = false;
        }
      },
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          showToast('위치 권한이 거부되었습니다. 브라우저 설정에서 위치 권한을 허용해주세요.', 'error');
        } else {
          showToast('현재 위치를 가져올 수 없습니다.', 'error');
        }
        stopTrackingLocation();
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    locationWatchIdRef.current = watchId;
    setIsTrackingLocation(true);
  }, [showToast, isTrackingLocation, stopTrackingLocation]);

  useEffect(() => {
    return () => {
      if (locationWatchIdRef.current !== null) {
        navigator.geolocation.clearWatch(locationWatchIdRef.current);
      }
    };
  }, []);

  return (
    <main className="relative h-dvh w-screen overflow-hidden">
      {/* Map */}
      <KakaoMap
        ref={mapRef}
        markers={filteredMarkers}
        onMarkerClick={place.handleMarkerClick}
        onMapClick={place.handleMapClick}
        center={DEFAULT_CENTER}
        zoom={MAP_ZOOM.DEFAULT}
        moveTo={moveTo}
        previewPosition={place.previewPlace ? { lat: place.previewPlace.lat, lng: place.previewPlace.lng } : null}
        highlightPosition={highlightPosition}
        searchResults={search.searchResults}
        onSearchMarkerClick={search.handleSearchResultSelect}
        onMapMoved={search.handleMapMoved}
        currentLocation={currentLocation}
      />

      {/* Header */}
      <header ref={headerRef} className="absolute top-0 left-0 right-0 z-10">
        {/* Title Bar */}
        <div className="bg-white border-b border-gray-100 shadow-sm">
          <div className="px-4 py-2.5 flex items-center gap-2">
            <LocationPinIcon className="w-5 h-5 text-red-500 shrink-0" />
            <h1
              className="text-lg sm:text-xl font-bold tracking-tight text-[#1E293B]"
              style={{ fontFamily: 'var(--font-geist-sans), sans-serif' }}
            >
              Our<span className="font-light">Spots</span>
            </h1>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="bg-white/95 backdrop-blur-sm border-b border-gray-200 shadow-sm px-4 pt-2 pb-2.5 flex flex-col gap-3">
          <FilterButtons
            selectedTypes={selectedTypes}
            onTypeToggle={handleTypeToggle}
            selectedGrades={selectedGrades}
            onGradeChange={setSelectedGrades}
            isAuthenticated={auth.isAuthenticated}
          />
          <AddressSearch
            onSelect={place.handleSearchSelect}
            onSearchKeyword={search.handleSearchKeyword}
            onClearKeyword={search.handleCloseSearchResults}
          />
        </div>
      </header>

      {/* 플로팅 "현 지도에서 검색" 버튼 */}
      <div
        style={{ top: `${headerHeight + 12}px` }}
        className={`absolute -translate-x-1/2 z-20 flex items-center gap-0 bg-white border border-blue-400 rounded-full shadow-lg transition-all duration-300 ${
          search.showResearchButton && search.searchKeyword
            ? 'opacity-100 translate-y-0'
            : 'opacity-0 -translate-y-2 pointer-events-none'
        } ${
          search.searchResults.length > 0
            ? 'left-1/2 sm:left-[calc(50%+10rem)]'
            : 'left-1/2'
        }`}
      >
        <button
          onClick={search.handleResearch}
          className="text-blue-600 pl-4 pr-2 py-2 text-sm font-medium hover:bg-blue-50 active:bg-blue-100 rounded-l-full transition-colors"
        >
          ↻ 현 지도에서 검색
        </button>
        <button
          onClick={search.dismissResearchButton}
          className="text-gray-400 hover:text-gray-600 pr-3 pl-1 py-2 rounded-r-full hover:bg-gray-100 transition-colors"
          aria-label="닫기"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* 검색 결과 없음 토스트 */}
      {search.searchToast && (
        <div
          className="absolute left-1/2 -translate-x-1/2 z-30 bg-gray-800/90 text-white px-4 py-2 rounded-full text-sm shadow-lg"
          style={{ top: `${headerHeight + 12}px` }}
        >
          {search.searchToast}
        </div>
      )}

      {/* Search Results Panel (현 지도 내 검색 결과) */}
      {search.searchResults.length > 0 && (
        <SearchResultsPanel
          results={search.searchResults}
          keyword={search.searchKeyword}
          onSelect={search.handleSearchResultSelect}
          onClose={search.handleCloseSearchResults}
          headerHeight={headerHeight}
        />
      )}

      {/* Error message */}
      {error && (
        <div className="absolute top-36 left-1/2 -translate-x-1/2 z-10 bg-red-100 text-red-700 px-4 py-2 rounded-lg shadow-lg text-sm">
          {error}
        </div>
      )}

      {/* Place Detail Panel */}
      <PlaceDetail
        place={place.selectedPlace}
        isLoading={place.isLoadingPlace}
        onClose={() => { place.handleCloseDetail(); setHighlightPosition(null); }}
        onEdit={place.handleEditPlace}
        onDelete={place.handleDeletePlace}
        position={place.panelPosition}
        isAuthenticated={auth.isAuthenticated}
        onToast={showToast}
        showConfirm={showConfirm}
      />

      {/* Place List Popup (같은 위치에 여러 장소) */}
      {place.groupMarkers && place.groupPosition && (
        <PlaceListPopup
          markers={place.groupMarkers}
          position={place.groupPosition}
          onSelect={place.handleGroupMarkerSelect}
          onClose={place.handleCloseGroupPopup}
        />
      )}

      {/* Place Preview Card (검색 결과 클릭 시 미리보기) */}
      {place.previewPlace && (
        <PlacePreviewCard
          name={place.previewPlace.name}
          address={place.previewPlace.address}
          screenPosition={previewScreenPosition}
          onRegister={place.handlePreviewRegister}
          onClose={place.handlePreviewClose}
        />
      )}

      {/* Place Form Modal - Create (검색 결과 클릭으로만 열림) */}
      {place.newPlaceCoords && (
        <PlaceForm
          latitude={place.newPlaceCoords.lat}
          longitude={place.newPlaceCoords.lng}
          initialAddress={place.newPlaceCoords.address}
          initialName={place.newPlaceCoords.name}
          isAuthenticated={auth.isAuthenticated}
          onSubmit={place.handleCreatePlace}
          onClose={place.handleCloseForm}
        />
      )}

      {/* Place Form Modal - Edit */}
      {place.editingPlace && (
        <PlaceForm
          latitude={place.editingPlace.latitude}
          longitude={place.editingPlace.longitude}
          initialAddress={place.editingPlace.address}
          initialName={place.editingPlace.name}
          initialType={place.editingPlace.type}
          initialDescription={place.editingPlace.description}
          initialGrade={place.editingPlace.grade}
          isEditMode
          isAuthenticated={auth.isAuthenticated}
          onSubmit={place.handleUpdatePlace}
          onClose={place.handleCloseForm}
        />
      )}

      {/* Floating action buttons - bottom left */}
      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] left-4 z-10 flex flex-col gap-2">
        {auth.isAuthenticated && (
          <button
            onClick={() => window.open('/admin/weight', '_blank')}
            className="bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg hover:bg-white transition-colors"
            title="체중 관리"
          >
            <ScaleIcon className="w-5 h-5 text-gray-600" />
          </button>
        )}
        {auth.isAuthenticated && (
          <button
            onClick={handleRefreshMarkers}
            disabled={isRefreshing}
            className="bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg hover:bg-white transition-colors disabled:opacity-50"
            title="DB에서 마커 새로고침"
          >
            <RefreshIcon className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
          </button>
        )}
        <button
          onClick={auth.isAuthenticated ? auth.handleLogout : () => { auth.setLoginError(undefined); auth.setShowLoginModal(true); }}
          className={`backdrop-blur p-2.5 rounded-full shadow-lg transition-colors ${
            auth.isAuthenticated
              ? 'bg-green-100/90 hover:bg-green-200'
              : 'bg-white/90 hover:bg-white'
          }`}
          title={auth.isAuthenticated ? '로그아웃' : '관리자 로그인'}
        >
          {auth.isAuthenticated ? (
            <UnlockIcon className="w-5 h-5 text-green-600" />
          ) : (
            <LockIcon className="w-5 h-5 text-gray-600" />
          )}
        </button>
      </div>

      {/* Floating action buttons - bottom right */}
      <div className="absolute bottom-[calc(1rem+env(safe-area-inset-bottom,0px))] right-4 z-10 flex flex-col gap-2">
        <button
          onClick={handleMoveToCurrentLocation}
          className={`backdrop-blur p-2.5 rounded-full shadow-lg transition-colors ${isTrackingLocation ? 'bg-blue-500 hover:bg-blue-600' : 'bg-white/90 hover:bg-white'}`}
          title={isTrackingLocation ? '위치 추적 중지' : '현재 위치로 이동'}
        >
          <CurrentLocationIcon className={`w-5 h-5 ${isTrackingLocation ? 'text-white' : 'text-gray-600'}`} />
        </button>
        <ShareLinkButton />
        <button
          onClick={() => { setShowAbout(true); setShowAboutBadge(false); localStorage.setItem('about-seen', '1'); }}
          className="relative bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg hover:bg-white transition-colors"
          title="프로젝트 소개"
        >
          <MegaphoneIcon className="w-5 h-5 text-gray-600" />
          {showAboutBadge && (
            <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
          )}
        </button>
        <button
          onClick={() => setShowFeedback(true)}
          className="bg-white/90 backdrop-blur p-2.5 rounded-full shadow-lg hover:bg-white transition-colors"
          title="피드백"
        >
          <ChatBubbleIcon className="w-5 h-5 text-gray-600" />
        </button>
      </div>

      {/* Login Modal */}
      <LoginModal
        isOpen={auth.showLoginModal}
        onClose={() => auth.setShowLoginModal(false)}
        onConfirm={auth.handleLogin}
        isLoading={auth.isLoggingIn}
        error={auth.loginError}
      />

      {/* About Modal */}
      <AboutModal isOpen={showAbout} onClose={() => setShowAbout(false)} />

      {/* Feedback Modal */}
      <FeedbackModal isOpen={showFeedback} onClose={() => setShowFeedback(false)} onToast={showToast} />

      {/* Toast */}
      <ToastContainer toasts={toasts} onRemove={removeToast} />

      {/* Confirm Modal */}
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          isDestructive={confirmState.isDestructive}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </main>
  );
}

export default function HomeClient() {
  return (
    <Suspense>
      <Home />
    </Suspense>
  );
}
