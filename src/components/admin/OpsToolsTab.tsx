'use client';

import { useState } from 'react';
import { RefreshIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { mapApi } from '@/services/api';

interface OpsToolsTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
}

export default function OpsToolsTab({ showToast }: OpsToolsTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefreshMarkers = async () => {
    setIsRefreshing(true);
    try {
      await mapApi.refreshMarkers();
      showToast('마커 캐시를 새로고침했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '새로고침에 실패했습니다', 'error');
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4">
      <div className="flex items-center justify-between gap-3 border rounded-lg p-4">
        <div className="min-w-0">
          <p className="text-sm font-medium">마커 캐시 새로고침</p>
          <p className="text-xs text-gray-400 mt-0.5">
            DB에서 장소를 다시 불러와 지도 마커 캐시를 갱신합니다. (12시간마다 자동 갱신, 등록/수정/삭제는 즉시 반영되지 않음)
          </p>
        </div>
        <button
          onClick={handleRefreshMarkers}
          disabled={isRefreshing}
          title="마커 캐시 새로고침"
          className="shrink-0 p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-50 transition-colors"
        >
          <RefreshIcon className={`w-5 h-5 text-gray-600 ${isRefreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
