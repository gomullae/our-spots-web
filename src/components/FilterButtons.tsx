'use client';

import { useState, useRef, useCallback } from 'react';
import { PlaceType } from '@/types';
import { PUBLIC_FILTERS, PERSONAL_FILTERS, GRADE_LABELS, PUBLIC_TYPES } from '@/constants/placeConfig';
import { useClickOutside } from '@/hooks/useClickOutside';

interface FilterButtonsProps {
  selectedTypes: Set<PlaceType>;
  onTypeToggle: (type: PlaceType | null) => void;
  selectedGrades: Set<number>;
  onGradeChange: (grades: Set<number>) => void;
  isAuthenticated: boolean;
}

export default function FilterButtons({ selectedTypes, onTypeToggle, selectedGrades, onGradeChange, isAuthenticated }: FilterButtonsProps) {
  const [showGradeMenu, setShowGradeMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const isAllPublicSelected = PUBLIC_TYPES.every(t => selectedTypes.has(t));

  const closeMenu = useCallback(() => setShowGradeMenu(false), []);
  useClickOutside(menuRef, closeMenu);

  const toggleGrade = (grade: number) => {
    const newGrades = new Set(selectedGrades);
    if (newGrades.has(grade)) {
      newGrades.delete(grade);
    } else {
      newGrades.add(grade);
    }
    onGradeChange(newGrades);
  };

  // 기본값({1,2})도 3개 전체 선택은 아니라서 파란 점이 뜸 — "건드렸는지"가 아니라 "전체 선택인지"가 기준
  const isFiltered = selectedGrades.size < 3;

  return (
    <div className="flex items-center relative">
      {/* 스크롤 가능한 카테고리 칩 영역 */}
      <div className="flex-1 min-w-0 overflow-x-scroll touch-pan-x [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
        <div className="inline-flex gap-2 pr-14 py-1">
          <button
            onClick={() => onTypeToggle(null)}
            className={`
              px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0
              ${
                isAllPublicSelected
                  ? 'bg-gray-900 text-white shadow-lg'
                  : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
              }
            `}
          >
            📍 전체
          </button>
          {PUBLIC_FILTERS.filter(f => f.type !== null).map(({ type, label, emoji }) => (
            <button
              key={type!}
              onClick={() => onTypeToggle(type)}
              className={`
                px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0
                ${
                  !isAllPublicSelected && selectedTypes.has(type!)
                    ? 'bg-gray-900 text-white shadow-lg'
                    : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                }
              `}
            >
              {emoji} {label}
            </button>
          ))}
          {isAuthenticated && (
            <>
              <span className="flex items-center text-gray-300 flex-shrink-0">·</span>
              {PERSONAL_FILTERS.map(({ type, label, emoji }) => (
                <button
                  key={type}
                  onClick={() => onTypeToggle(type)}
                  className={`
                    px-3 py-1.5 rounded-full text-xs font-medium transition-all whitespace-nowrap flex-shrink-0
                    ${
                      selectedTypes.has(type)
                        ? 'bg-gray-900 text-white shadow-lg'
                        : 'bg-white text-gray-700 hover:bg-gray-100 shadow'
                    }
                  `}
                >
                  {emoji} {label}
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      {/* 그라데이션 + 구분선 + 필터 버튼 (우측 고정) — 등급 필터 자체가 로그인 여부와 무관하게 항상 있었지만,
          비로그인 사용자에게는 굳이 노출할 필요 없는 부가 기능이라 통째로 숨김 */}
      {isAuthenticated && (
      <div className="absolute right-0 flex items-center h-full">
        {/* 그라데이션 페이드 */}
        <div className="w-12 h-full bg-gradient-to-r from-transparent to-white pointer-events-none" />

        {/* 구분선 */}
        <div className="w-px h-5 bg-gray-300" />

        {/* 필터 버튼 */}
        <div ref={menuRef} className="relative bg-white pl-2">
          <button
            onClick={() => setShowGradeMenu(!showGradeMenu)}
            className={`
              relative p-2 rounded-full transition-all flex-shrink-0 flex items-center justify-center
              ${showGradeMenu
                ? 'bg-gray-100 shadow-lg'
                : 'bg-white hover:bg-gray-100 shadow border border-gray-200'
              }
            `}
          >
            <svg
              className="w-4 h-4"
              fill={isFiltered ? '#6B7280' : 'none'}
              stroke="#6B7280"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
            {isFiltered && (
              <span className="absolute -top-0.5 -right-0.5 w-2.5 h-2.5 bg-blue-500 rounded-full border-2 border-white" />
            )}
          </button>

          {/* 드롭다운 메뉴 */}
          {showGradeMenu && (
            <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border p-2 z-50 min-w-[120px]">
              <div className="text-xs text-gray-500 px-2 py-1 font-medium">등급 필터</div>
              {GRADE_LABELS.map(({ grade, label }) => (
                <label
                  key={grade}
                  className="flex items-center gap-2 px-2 py-1.5 hover:bg-gray-50 rounded cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={selectedGrades.has(grade)}
                    onChange={() => toggleGrade(grade)}
                    className="w-4 h-4 rounded border-gray-300 text-blue-500 focus:ring-blue-500"
                  />
                  <span className="text-sm whitespace-nowrap">{label}</span>
                </label>
              ))}
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
}
