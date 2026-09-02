'use client';

import { useCallback, useState } from 'react';
import AdminPageShell from '@/components/AdminPageShell';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import WeightEntryTab from '@/components/weight/WeightEntryTab';
import WeightGraphTab from '@/components/weight/WeightGraphTab';
import WeightListTab from '@/components/weight/WeightListTab';
import { useAuth } from '@/hooks/useAuth';
import { useCachedFetch } from '@/hooks/useCachedFetch';
import { useSwipeNav } from '@/hooks/useSwipeNav';
import { useToast } from '@/hooks/useToast';
import { weightApi } from '@/services/api';
import { WeightRecord } from '@/types';
import { isSameWeightMeta, readWeightCache, writeWeightCache } from '@/utils/weightCache';

type Tab = 'entry' | 'graph' | 'list';

const TABS: { key: Tab; label: string }[] = [
  { key: 'entry', label: '입력' },
  { key: 'graph', label: '그래프' },
  { key: 'list', label: '전체기록' },
];

export default function WeightAdminPage() {
  const auth = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);
  const showConfirm = useCallback((message: string, onConfirm: () => void, isDestructive?: boolean) => {
    setConfirmState({ message, onConfirm, isDestructive });
  }, []);

  const [tab, setTab] = useState<Tab>('entry');
  // 마운트 시점 + visibilitychange 재검증 + CRUD 성공 후 재조회를 useCachedFetch 하나로 통일
  // (일정/가계 현황 페이지와 거의 동일하게 복붙돼 있던 코드 — 캐시 유효성 검증/레이스 가드 로직은 그쪽 hook 참고)
  const { data: records, isLoading, refetch: fetchAll } = useCachedFetch({
    enabled: auth.isAuthenticated,
    initialData: [] as WeightRecord[],
    readCache: () => {
      const cache = readWeightCache();
      return cache ? { meta: cache.meta, data: cache.records } : null;
    },
    writeCache: ({ meta, data }) => writeWeightCache({ meta, records: data }),
    isSameMeta: isSameWeightMeta,
    fetchMeta: () => weightApi.getMeta(),
    fetchData: () => weightApi.getAll(),
    onError: (message) => showToast(message, 'error'),
  });

  const handleUpsert = () => {
    fetchAll();
  };

  const handleDeleted = () => {
    fetchAll();
  };

  // 모바일에서만 좌우 스와이프로 입력/그래프/전체기록 탭 전환 (PC는 탭 버튼 클릭만)
  const tabKeys = TABS.map((t) => t.key);
  const { handleTouchStart, handleTouchEnd } = useSwipeNav((direction) => {
    if (window.innerWidth >= 640) return;
    const nextIndex = tabKeys.indexOf(tab) + direction;
    if (nextIndex >= 0 && nextIndex < tabKeys.length) setTab(tabKeys[nextIndex]);
  });

  return (
    <AdminPageShell auth={auth} title="My Weight" showBackButton={false} showRefreshAndLogout showConfirm={showConfirm}>
      <div className="flex border-b shrink-0">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 text-center py-2.5 text-sm font-medium transition-colors ${
              tab === t.key ? 'text-gray-900 border-b-2 border-gray-900' : 'text-gray-400'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-gray-400 text-center py-10">불러오는 중...</p>
      ) : (
        <div className="flex-1 overflow-y-auto" onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {tab === 'entry' && (
            <WeightEntryTab records={records} onSaved={handleUpsert} showToast={showToast} />
          )}
          {tab === 'graph' && <WeightGraphTab records={records} />}
          {tab === 'list' && (
            <WeightListTab
              records={records}
              onDeleted={handleDeleted}
              showConfirm={showConfirm}
              showToast={showToast}
            />
          )}
        </div>
      )}

      <ToastContainer toasts={toasts} onRemove={removeToast} />
      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          isDestructive={confirmState.isDestructive}
          onConfirm={() => { confirmState.onConfirm(); setConfirmState(null); }}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </AdminPageShell>
  );
}
