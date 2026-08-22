import { useState, useCallback, useRef } from 'react';
import type { KakaoMapHandle } from '@/components/KakaoMap';
import { SearchResultPlace } from '@/types';

interface UseMapSearchOptions {
  mapRef: React.RefObject<KakaoMapHandle | null>;
  setMoveTo: (moveTo: { lat: number; lng: number; zoom?: number } | null) => void;
  setPreviewPlace: (place: { lat: number; lng: number; address: string; name: string } | null) => void;
  clearPanels: () => void;
  clearDetailPanels: () => void;
}

interface UseMapSearchReturn {
  searchResults: SearchResultPlace[];
  searchKeyword: string;
  showResearchButton: boolean;
  searchToast: string | null;
  performMapSearch: (keyword: string) => void;
  handleSearchKeyword: (keyword: string) => void;
  handleMapMoved: () => void;
  handleResearch: () => void;
  dismissResearchButton: () => void;
  handleSearchResultSelect: (result: SearchResultPlace) => void;
  handleCloseSearchResults: () => void;
}

export function useMapSearch({
  mapRef,
  setMoveTo,
  setPreviewPlace,
  clearPanels,
  clearDetailPanels,
}: UseMapSearchOptions): UseMapSearchReturn {
  const [searchResults, setSearchResults] = useState<SearchResultPlace[]>([]);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [showResearchButton, setShowResearchButton] = useState(false);
  const [searchToast, setSearchToast] = useState<string | null>(null);
  const searchKeywordRef = useRef('');
  const lastSearchBoundsRef = useRef<{ sw: { lat: number; lng: number }; ne: { lat: number; lng: number } } | null>(null);
  searchKeywordRef.current = searchKeyword;

  const performMapSearch = useCallback((keyword: string) => {
    if (!keyword.trim() || !window.kakao?.maps?.services) return;

    const bounds = mapRef.current?.getBounds();
    const center = mapRef.current?.getCenter();
    if (!bounds) return;

    setShowResearchButton(false);

    const ps = new window.kakao.maps.services.Places();

    const rect = `${bounds.sw.lng},${bounds.sw.lat},${bounds.ne.lng},${bounds.ne.lat}`;

    const baseOptions: Record<string, unknown> = {
      rect,
      size: 15,
    };

    if (center) {
      baseOptions.x = String(center.lng);
      baseOptions.y = String(center.lat);
      baseOptions.sort = window.kakao.maps.services.SortBy.DISTANCE;
    }

    const processResults = (allData: KakaoPlaceSearchResult[]) => {
      if (bounds) {
        lastSearchBoundsRef.current = bounds;
      }

      if (allData.length > 0) {
        const seen = new Set<string>();
        const unique = allData.filter((item) => {
          const key = `${item.place_name}_${item.x}_${item.y}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });

        const results: SearchResultPlace[] = unique.slice(0, 15).map((item, index) => ({
          label: String.fromCharCode(65 + index),
          name: item.place_name,
          category: item.category_group_name || '',
          address: item.road_address_name || item.address_name,
          phone: item.phone || '',
          lat: parseFloat(item.y),
          lng: parseFloat(item.x),
        }));
        setSearchResults(results);
        setSearchKeyword(keyword);
        clearPanels();
      } else {
        setSearchResults([]);
        setSearchKeyword(keyword);
        setSearchToast('검색 결과가 없습니다');
        setTimeout(() => setSearchToast(null), 2000);
      }
    };

    ps.keywordSearch(
      keyword,
      (data1: KakaoPlaceSearchResult[], status1: string) => {
        const page1 = status1 === window.kakao.maps.services!.Status.OK ? data1 : [];

        if (page1.length >= 15) {
          ps.keywordSearch(
            keyword,
            (data2: KakaoPlaceSearchResult[], status2: string) => {
              const page2 = status2 === window.kakao.maps.services!.Status.OK ? data2 : [];
              processResults([...page1, ...page2]);
            },
            { ...baseOptions, page: 2 }
          );
        } else {
          processResults(page1);
        }
      },
      { ...baseOptions, page: 1 }
    );
  }, [mapRef, clearPanels]);

  const handleSearchKeyword = useCallback((keyword: string) => {
    setSearchKeyword(keyword);
    searchKeywordRef.current = keyword;
  }, []);

  const handleMapMoved = useCallback(() => {
    if (!searchKeywordRef.current) return;

    const lastBounds = lastSearchBoundsRef.current;
    if (!lastBounds) {
      setShowResearchButton(true);
      return;
    }

    const currentBounds = mapRef.current?.getBounds();
    if (!currentBounds) return;

    // 현재 화면(bounds)이 마지막 검색 범위 안에 완전히 들어와 있지 않으면
    // (줌아웃으로 넓어졌거나, 팬으로 벗어난 경우) 검색 안 된 영역이 노출된 것 → 재검색 필요
    const isContained =
      currentBounds.sw.lat >= lastBounds.sw.lat &&
      currentBounds.sw.lng >= lastBounds.sw.lng &&
      currentBounds.ne.lat <= lastBounds.ne.lat &&
      currentBounds.ne.lng <= lastBounds.ne.lng;

    if (!isContained) {
      setShowResearchButton(true);
    }
  }, [mapRef]);

  const handleResearch = useCallback(() => {
    performMapSearch(searchKeywordRef.current);
  }, [performMapSearch]);

  const dismissResearchButton = useCallback(() => {
    setShowResearchButton(false);
  }, []);

  const handleSearchResultSelect = useCallback((result: SearchResultPlace) => {
    setMoveTo({ lat: result.lat, lng: result.lng });
    setPreviewPlace({
      lat: result.lat,
      lng: result.lng,
      address: result.address,
      name: result.name,
    });
    setSearchResults([]);
    clearDetailPanels();
  }, [setMoveTo, setPreviewPlace, clearDetailPanels]);

  const handleCloseSearchResults = useCallback(() => {
    setSearchResults([]);
    setSearchKeyword('');
    setShowResearchButton(false);
    lastSearchBoundsRef.current = null;
  }, []);

  return {
    searchResults,
    searchKeyword,
    showResearchButton,
    searchToast,
    performMapSearch,
    handleSearchKeyword,
    handleMapMoved,
    handleResearch,
    dismissResearchButton,
    handleSearchResultSelect,
    handleCloseSearchResults,
  };
}
