'use client';

import { useState } from 'react';
import PlacesListTab from '@/components/admin/PlacesListTab';
import PhotoHistoryTab from '@/components/admin/PhotoHistoryTab';
import { Toast } from '@/hooks/useToast';

type SubTab = 'records' | 'photos';

const SUB_TABS: { key: SubTab; label: string }[] = [
  { key: 'records', label: '등록 장소 이력' },
  { key: 'photos', label: '등록 사진 이력' },
];

interface PlaceHistoryTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
  showConfirm: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

// "장소 이력" 탭 — 기존 "최근 등록 장소" 화면(등록 장소 이력)과 신규 "등록 사진 이력" 화면을
// 하위 탭 2개로 묶음. 상위 탭(운영 도구/장소 이력/로그 이력/바로가기)과 구분되게 세그먼트 pill 스타일 사용
export default function PlaceHistoryTab({ showToast, showConfirm }: PlaceHistoryTabProps) {
  const [subTab, setSubTab] = useState<SubTab>('records');

  return (
    <>
      <div className="flex gap-1.5 px-4 py-2 border-b shrink-0 bg-gray-50">
        {SUB_TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setSubTab(t.key)}
            className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
              subTab === t.key ? 'bg-gray-800 text-white' : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-100'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {subTab === 'records' && <PlacesListTab showToast={showToast} showConfirm={showConfirm} />}
      {subTab === 'photos' && <PhotoHistoryTab showToast={showToast} showConfirm={showConfirm} />}
    </>
  );
}
