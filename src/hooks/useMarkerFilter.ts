import { useState, useMemo, useCallback } from 'react';
import { Marker, PlaceType } from '@/types';
import { PUBLIC_TYPES, PERSONAL_TYPES, GRADE_LABELS } from '@/constants/placeConfig';

interface UseMarkerFilterOptions {
  markers: Marker[];
  isAuthenticated: boolean;
}

interface UseMarkerFilterReturn {
  filteredMarkers: Marker[];
  selectedTypes: Set<PlaceType>;
  selectedGrades: Set<number>;
  handleTypeToggle: (type: PlaceType | null) => void;
  setSelectedGrades: (grades: Set<number>) => void;
}

const ALL_GRADES = new Set(GRADE_LABELS.map(g => g.grade));
const DEFAULT_GRADES = new Set([1, 2]); // 기본: 최애, 추천

/**
 * 마커 필터링 로직을 캡슐화한 훅
 * - 타입 필터 (공개/개인 카테고리)
 * - 등급 필터 (1=최애, 2=추천, 3=무난)
 * - 인증 상태에 따른 필터링
 */
export function useMarkerFilter({
  markers,
  isAuthenticated,
}: UseMarkerFilterOptions): UseMarkerFilterReturn {
  const [selectedTypes, setSelectedTypes] = useState<Set<PlaceType>>(new Set(PUBLIC_TYPES));
  const [selectedGrades, setSelectedGrades] = useState<Set<number>>(DEFAULT_GRADES);
  // 로그인/로그아웃 시 개인 카테고리 자동 토글 — prop(isAuthenticated) 변화에 따른 상태 조정이라
  // effect 대신 렌더 중 조정(React 공식 패턴) — effect로 하면 토글 전 상태가 한 프레임 먼저 그려짐
  const [prevAuthenticated, setPrevAuthenticated] = useState(isAuthenticated);
  if (isAuthenticated !== prevAuthenticated) {
    setPrevAuthenticated(isAuthenticated);
    if (isAuthenticated) {
      // 로그인: "나의 발자취" 활성화
      setSelectedTypes(prev => new Set([...prev, 'MY_FOOTPRINT']));
    } else {
      // 로그아웃: 개인 카테고리 해제
      setSelectedTypes(prev => {
        const next = new Set(prev);
        PERSONAL_TYPES.forEach(t => next.delete(t));
        return next;
      });
    }
  }

  // 타입 + 등급 필터링된 마커 (비로그인 시 개인 카테고리 숨김)
  const filteredMarkers = useMemo(() => {
    let result = markers;

    if (!isAuthenticated) {
      result = result.filter(m => !PERSONAL_TYPES.includes(m.type));
      // 비로그인 방문자에게는 맛집만 1등급(찐맛집)으로 더 좁혀서 보여줌 — 아이 놀이터/아빠의 시간은 기존 등급 필터(1,2등급) 그대로
      result = result.filter(m => m.type !== 'RESTAURANT' || m.grade === 1);
    }

    result = result.filter(m => selectedTypes.has(m.type));

    // 등급 필터 (공개 카테고리만 적용, 개인 카테고리는 항상 표시)
    const allGradesSelected = ALL_GRADES.size === selectedGrades.size && [...ALL_GRADES].every(g => selectedGrades.has(g));
    if (selectedGrades.size === 0) return result.filter(m => PERSONAL_TYPES.includes(m.type));
    if (allGradesSelected) return result;
    return result.filter(m => PERSONAL_TYPES.includes(m.type) || (m.grade && selectedGrades.has(m.grade)));
  }, [markers, selectedTypes, selectedGrades, isAuthenticated]);

  const handleTypeToggle = useCallback((type: PlaceType | null) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);

      if (type === null) {
        // "전체" 클릭: 토글 동작
        const allPublicSelected = PUBLIC_TYPES.every(t => prev.has(t));
        if (allPublicSelected) {
          PUBLIC_TYPES.forEach(t => next.delete(t));
        } else {
          PUBLIC_TYPES.forEach(t => next.add(t));
        }
        return next;
      }

      if (PERSONAL_TYPES.includes(type)) {
        // 개인 타입: 독립 토글
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
        return next;
      }

      const allPublicSelected = PUBLIC_TYPES.every(t => prev.has(t));
      if (allPublicSelected) {
        PUBLIC_TYPES.forEach(t => next.delete(t));
        next.add(type);
      } else {
        if (next.has(type)) {
          next.delete(type);
        } else {
          next.add(type);
        }
      }
      return next;
    });
  }, []);

  return {
    filteredMarkers,
    selectedTypes,
    selectedGrades,
    handleTypeToggle,
    setSelectedGrades,
  };
}
