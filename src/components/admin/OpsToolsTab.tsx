'use client';

import { useState } from 'react';
import { DownloadIcon, RefreshIcon } from '@/components/icons';
import { Toast } from '@/hooks/useToast';
import { mapApi, backupApi } from '@/services/api';
import { BackupPeriod, BackupTable } from '@/types';

interface OpsToolsTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
}

const BACKUP_TABLES: { key: BackupTable; label: string }[] = [
  { key: 'PLACES', label: '장소' },
  { key: 'EXPENSE_RECORDS', label: '지출 내역' },
  { key: 'WEIGHT_RECORDS', label: '체중 기록' },
  { key: 'LOGIN_ATTEMPTS', label: '로그인 시도' },
  { key: 'FEEDBACKS', label: '방명록' },
];

const BACKUP_PERIODS: { key: BackupPeriod; label: string }[] = [
  { key: 'ALL', label: '전체' },
  { key: 'RECENT_3_MONTHS', label: '최근 3개월' },
];

export default function OpsToolsTab({ showToast }: OpsToolsTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backupTable, setBackupTable] = useState<BackupTable>('PLACES');
  const [backupPeriod, setBackupPeriod] = useState<BackupPeriod>('RECENT_3_MONTHS');
  const [isDownloading, setIsDownloading] = useState(false);

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

  const handleDownloadBackup = async () => {
    // iOS Safari 등 모바일은 blob+download 방식이 불안정해서(새 탭 미리보기로만 뜨고 저장 안 됨) 맥북/PC에서만 허용
    if (/Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
      showToast('데이터 백업은 맥북/PC 환경에서만 가능합니다', 'error');
      return;
    }
    setIsDownloading(true);
    try {
      await backupApi.download(backupTable, backupPeriod);
      showToast('백업 파일을 다운로드했습니다', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : '백업 다운로드에 실패했습니다', 'error');
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
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

      <div className="border rounded-lg p-4 space-y-3">
        <div>
          <p className="text-sm font-medium">데이터 백업</p>
          <p className="text-xs text-gray-400 mt-0.5">
            선택한 테이블을 엑셀(.xlsx) 파일로 다운로드합니다. (삭제된 항목 포함)
          </p>
        </div>

        <select
          value={backupTable}
          onChange={(e) => setBackupTable(e.target.value as BackupTable)}
          className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {BACKUP_TABLES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {BACKUP_PERIODS.map((p) => (
              <button
                key={p.key}
                onClick={() => setBackupPeriod(p.key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  backupPeriod === p.key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleDownloadBackup}
            disabled={isDownloading}
            className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            <DownloadIcon className="w-4 h-4" />
            {isDownloading ? '다운로드 중...' : '다운로드'}
          </button>
        </div>
      </div>
    </div>
  );
}
