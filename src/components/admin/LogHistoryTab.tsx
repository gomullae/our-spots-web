'use client';

import { useState } from 'react';
import Pagination from '@/components/Pagination';
import { BACKUP_PERIODS, BACKUP_PERIOD_LABELS, BACKUP_TABLE_LABELS } from '@/constants/backupConfig';
import { Toast } from '@/hooks/useToast';
import { adminLogApi } from '@/services/api';
import { BackupPeriod, BackupTable, TableData } from '@/types';

interface LogHistoryTabProps {
  showToast: (message: string, type?: Toast['type']) => void;
}

const PAGE_SIZE = 10;

const LOG_TABLE_OPTIONS: BackupTable[] = ['ERROR_LOGS', 'ACCESS_DENIED_LOGS', 'LOGIN_ATTEMPTS', 'FEEDBACKS'];

export default function LogHistoryTab({ showToast }: LogHistoryTabProps) {
  const [table, setTable] = useState<BackupTable>('ERROR_LOGS');
  const [period, setPeriod] = useState<BackupPeriod>('RECENT_3_MONTHS');
  const [data, setData] = useState<TableData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [page, setPage] = useState(0);

  const handleSearch = async () => {
    setIsLoading(true);
    setHasSearched(true);
    setPage(0);
    try {
      const result = await adminLogApi.getLogs(table, period);
      setData(result);
    } catch (err) {
      showToast(err instanceof Error ? err.message : '조회에 실패했습니다', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const totalPages = data ? Math.ceil(data.rows.length / PAGE_SIZE) : 0;
  const pagedRows = data ? data.rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE) : [];

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      <select
        value={table}
        onChange={(e) => setTable(e.target.value as BackupTable)}
        className="w-full border rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        {LOG_TABLE_OPTIONS.map((key) => (
          <option key={key} value={key}>{BACKUP_TABLE_LABELS[key]}</option>
        ))}
      </select>

      <div className="flex items-center gap-2">
        <div className="flex flex-wrap gap-1.5 flex-1">
          {BACKUP_PERIODS.map((key) => (
            <button
              key={key}
              onClick={() => setPeriod(key)}
              className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                period === key ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500'
              }`}
            >
              {BACKUP_PERIOD_LABELS[key]}
            </button>
          ))}
        </div>
        <button
          onClick={handleSearch}
          disabled={isLoading}
          className="shrink-0 px-3 py-1.5 rounded-lg bg-gray-900 text-white text-xs font-medium hover:bg-gray-800 disabled:opacity-50 transition-colors"
        >
          {isLoading ? '조회 중...' : '조회'}
        </button>
      </div>

      {!hasSearched ? (
        <p className="text-sm text-gray-400 text-center py-10">조건을 선택하고 조회 버튼을 눌러주세요</p>
      ) : isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : !data || data.rows.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-10">조회된 데이터가 없습니다</p>
      ) : (
        <>
          <p className="text-xs text-gray-400">총 {data.rows.length}건</p>
          <div className="overflow-x-auto border rounded-lg">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {data.headers.map((h) => (
                    <th key={h} className="px-2 py-1.5 text-left font-medium text-gray-500 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {pagedRows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td
                        key={j}
                        title={cell === null ? '' : String(cell)}
                        className="px-2 py-1.5 text-gray-700 whitespace-nowrap max-w-[200px] truncate"
                      >
                        {cell === null ? '' : String(cell)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <Pagination page={page} totalPages={totalPages} onChange={setPage} className="flex items-center justify-center gap-4 pt-1" />
        </>
      )}
    </div>
  );
}
