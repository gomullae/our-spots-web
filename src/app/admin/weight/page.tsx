'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageShell from '@/components/AdminPageShell';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import WeightEntryTab from '@/components/weight/WeightEntryTab';
import WeightGraphTab from '@/components/weight/WeightGraphTab';
import WeightListTab from '@/components/weight/WeightListTab';
import { useAuth } from '@/hooks/useAuth';
import { useSwipeNav } from '@/hooks/useSwipeNav';
import { useToast } from '@/hooks/useToast';
import { weightApi } from '@/services/api';
import { WeightMeta, WeightRecord } from '@/types';
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
  // 초기 렌더 시점에 캐시를 동기적으로 읽어서 첫 페인트부터 바로 그려지게 함(일정 관리와 동일한 패턴) — 실제로 최신인지는 마운트 후 백그라운드에서 검증
  const [records, setRecords] = useState<WeightRecord[]>(() => readWeightCache()?.records ?? []);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) return;

    const cache = readWeightCache();
    // 캐시가 없는 진짜 첫 조회일 때만 로딩 표시 — 캐시가 있으면 이미 화면엔 그 데이터가 보이고 있어서 백그라운드에서 조용히 검증만 함
    setIsLoading(!cache);

    const fetchFromServer = (meta: WeightMeta | null) => {
      weightApi.getAll()
        .then((data) => {
          setRecords(data);
          if (meta) writeWeightCache({ meta, records: data });
        })
        .catch(err => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
        .finally(() => setIsLoading(false));
    };

    weightApi.getMeta()
      .then((meta) => {
        const cacheValid = !!cache && isSameWeightMeta(cache.meta, meta);
        // 캐시가 이미 정확한 걸로 확인됨 — 화면엔 이미 그 데이터가 보이고 있으므로 더 할 일 없음
        if (cacheValid) { setIsLoading(false); return; }
        fetchFromServer(meta);
      })
      // meta 확인 자체가 실패하면(오프라인 등) 캐시 검증을 포기하고 그냥 서버에서 직접 불러옴
      .catch(() => fetchFromServer(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  // 저장/삭제는 서버 응답을 받은 뒤 로컬 state만 갱신해왔는데, 캐시(weightCache)는 그대로 두면
  // 다음 마운트(홈 화면 바로가기 재실행 등) 때 낡은 캐시가 잠깐 보였다가 meta 불일치로 재조회되는 깜빡임이 생김 —
  // 저장/삭제 직후 meta를 다시 받아 캐시를 같이 갱신해서 이 세션 안에서도 캐시가 항상 최신을 유지하게 함
  const syncCache = (nextRecords: WeightRecord[]) => {
    weightApi.getMeta()
      .then((meta) => writeWeightCache({ meta, records: nextRecords }))
      // meta 재조회 실패해도 화면엔 지장 없음 — 다음 마운트 때 다시 검증됨
      .catch(() => {});
  };

  const handleUpsert = (record: WeightRecord) => {
    const next = [record, ...records.filter(r => r.id !== record.id)]
      .sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
    setRecords(next);
    syncCache(next);
  };

  const handleDeleted = (id: number) => {
    const next = records.filter(r => r.id !== id);
    setRecords(next);
    syncCache(next);
  };

  // 모바일에서만 좌우 스와이프로 입력/그래프/전체기록 탭 전환 (PC는 탭 버튼 클릭만)
  const tabKeys = TABS.map((t) => t.key);
  const { handleTouchStart, handleTouchEnd } = useSwipeNav((direction) => {
    if (window.innerWidth >= 640) return;
    const nextIndex = tabKeys.indexOf(tab) + direction;
    if (nextIndex >= 0 && nextIndex < tabKeys.length) setTab(tabKeys[nextIndex]);
  });

  return (
    <AdminPageShell auth={auth} title="체중 관리" showBackButton={false}>
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
