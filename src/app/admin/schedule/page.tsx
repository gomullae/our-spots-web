'use client';

import { useCallback, useState } from 'react';
import AdminPageShell from '@/components/AdminPageShell';
import ToastContainer from '@/components/Toast';
import ConfirmModal from '@/components/ConfirmModal';
import ScheduleCalendarTab from '@/components/schedule/ScheduleCalendarTab';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/useToast';

export default function ScheduleAdminPage() {
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

  return (
    <AdminPageShell auth={auth} title="Our Schedule" maxWidthClassName="max-w-5xl" showBackButton={false} showRefreshAndLogout showConfirm={showConfirm}>
      <ScheduleCalendarTab showToast={showToast} showConfirm={showConfirm} />

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
