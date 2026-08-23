'use client';

import { useCallback, useEffect, useState } from 'react';
import AdminPageShell from '@/components/AdminPageShell';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import WeightEntryTab from '@/components/weight/WeightEntryTab';
import WeightGraphTab from '@/components/weight/WeightGraphTab';
import WeightListTab from '@/components/weight/WeightListTab';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';
import { weightApi } from '@/services/api';
import { WeightRecord } from '@/types';

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
  const [records, setRecords] = useState<WeightRecord[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!auth.isAuthenticated) {
      auth.setShowLoginModal(true);
      return;
    }
    setIsLoading(true);
    weightApi.getAll()
      .then(setRecords)
      .catch(err => showToast(err instanceof Error ? err.message : '불러오기에 실패했습니다', 'error'))
      .finally(() => setIsLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth.isAuthenticated]);

  const handleUpsert = (record: WeightRecord) => {
    setRecords(prev => {
      const next = [record, ...prev.filter(r => r.id !== record.id)];
      return next.sort((a, b) => b.recordedDate.localeCompare(a.recordedDate));
    });
  };

  const handleDeleted = (id: number) => {
    setRecords(prev => prev.filter(r => r.id !== id));
  };

  return (
    <AdminPageShell auth={auth} title="체중 관리">
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
        <div className="flex-1 overflow-y-auto">
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
