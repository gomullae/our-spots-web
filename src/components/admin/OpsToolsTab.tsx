'use client';

import { useState } from 'react';
import { DownloadIcon, RefreshIcon } from '@/components/icons';
import { BACKUP_PERIODS, BACKUP_PERIOD_LABELS, BACKUP_TABLE_LABELS } from '@/constants/backupConfig';
import { Toast } from '@/hooks/useToast';
import { mapApi, backupApi } from '@/services/api';
import { BackupPeriod, BackupTable } from '@/types';

interface OpsToolsTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
}

const BACKUP_TABLE_OPTIONS: BackupTable[] = [
  'PLACES',
  'EXPENSE_RECORDS',
  'WEIGHT_RECORDS',
  'SCHEDULE_EVENTS',
  'LOGIN_ATTEMPTS',
  'FEEDBACKS',
  'HOUSEHOLD_INCOMES',
  'HOUSEHOLD_BUDGET_ITEMS',
  'HOUSEHOLD_HISTORY',
];

// "전체"는 실제 백엔드 테이블이 아니라 프론트에서만 쓰는 선택지 — 고르면 위 9개 테이블을 순차적으로
// 하나씩 다운로드(백엔드에 table=ALL 같은 통합 엔드포인트를 새로 만들지 않고, 이미 있는 단건 다운로드
// API를 반복 호출하는 방식). 동시에 여러 개를 한꺼번에 트리거하면 브라우저가 "여러 파일 다운로드" 차단
// 경고를 띄울 수 있어서, await로 하나씩 순서대로 받게 함(그래서 "일괄"이 아니라 "순차적으로")
const ALL_TABLES = 'ALL_TABLES' as const;
type BackupTableSelection = BackupTable | typeof ALL_TABLES;

export default function OpsToolsTab({ showToast }: OpsToolsTabProps) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [backupTable, setBackupTable] = useState<BackupTableSelection>('PLACES');
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
      if (backupTable === ALL_TABLES) {
        // 병렬이 아니라 순차 — 브라우저의 "여러 파일 동시 다운로드" 차단을 피하고, 실패 시 어디까지
        // 받았는지도 명확해짐
        for (const table of BACKUP_TABLE_OPTIONS) {
          await backupApi.download(table, backupPeriod);
        }
        showToast(`${BACKUP_TABLE_OPTIONS.length}개 테이블을 모두 다운로드했습니다`, 'success');
      } else {
        await backupApi.download(backupTable, backupPeriod);
        showToast('백업 파일을 다운로드했습니다', 'success');
      }
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
          onChange={(e) => setBackupTable(e.target.value as BackupTableSelection)}
          className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value={ALL_TABLES}>전체 ({BACKUP_TABLE_OPTIONS.length}개 테이블 순차 다운로드)</option>
          {BACKUP_TABLE_OPTIONS.map((key) => (
            <option key={key} value={key}>{BACKUP_TABLE_LABELS[key]}</option>
          ))}
        </select>

        <div className="flex items-center gap-2">
          <div className="flex flex-wrap gap-1.5 flex-1">
            {BACKUP_PERIODS.map((key) => (
              <button
                key={key}
                onClick={() => setBackupPeriod(key)}
                className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                  backupPeriod === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {BACKUP_PERIOD_LABELS[key]}
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
