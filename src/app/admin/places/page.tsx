'use client';

import { useState } from 'react';
import AdminPageShell from '@/components/AdminPageShell';
import PlacesListTab from '@/components/admin/PlacesListTab';
import OpsToolsTab from '@/components/admin/OpsToolsTab';
import LogHistoryTab from '@/components/admin/LogHistoryTab';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

type Tab = 'ops' | 'recent' | 'logs';

const TABS: { key: Tab; label: string }[] = [
  { key: 'ops', label: '운영 도구' },
  { key: 'recent', label: '최근 등록 장소' },
  { key: 'logs', label: '로그 이력' },
];

export default function AdminPlacesPage() {
  const auth = useAuth();
  const { toasts, showToast, removeToast } = useToast();
  const [confirmState, setConfirmState] = useState<{
    message: string;
    onConfirm: () => void;
    isDestructive?: boolean;
  } | null>(null);
  const showConfirm = (message: string, onConfirm: () => void, isDestructive?: boolean) => {
    setConfirmState({ message, onConfirm, isDestructive });
  };

  // '운영 도구'를 기본 탭으로 둬서 '최근 등록 장소' 탭을 열기 전까지는 그 쪽 목록 쿼리가 나가지 않음
  const [tab, setTab] = useState<Tab>('ops');

  return (
    <AdminPageShell auth={auth} title="관리">
      <div className="flex border-b shrink-0">
        {TABS.map((t) => (
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

      {tab === 'ops' && <OpsToolsTab showToast={showToast} />}
      {tab === 'recent' && <PlacesListTab showToast={showToast} showConfirm={showConfirm} />}
      {tab === 'logs' && <LogHistoryTab showToast={showToast} />}

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
