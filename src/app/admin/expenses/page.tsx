'use client';

import { useState } from 'react';
import AdminPageShell from '@/components/AdminPageShell';
import ExpenseEntryTab from '@/components/expense/ExpenseEntryTab';
import ExpenseCalendarTab from '@/components/expense/ExpenseCalendarTab';
import ExpenseStatsTab from '@/components/expense/ExpenseStatsTab';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

type Tab = 'calendar' | 'entry' | 'stats';

const TABS: { key: Tab; label: string }[] = [
  { key: 'calendar', label: '달력' },
  { key: 'entry', label: '이력' },
  { key: 'stats', label: '통계' },
];

export default function ExpenseAdminPage() {
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

  const [tab, setTab] = useState<Tab>('calendar');

  return (
    <AdminPageShell auth={auth} title="가계부 관리" showBackButton={false}>
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

      {tab === 'calendar' && <ExpenseCalendarTab showToast={showToast} />}
      {tab === 'entry' && <ExpenseEntryTab showToast={showToast} showConfirm={showConfirm} />}
      {tab === 'stats' && <ExpenseStatsTab showToast={showToast} />}

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
