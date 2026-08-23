'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import LoginModal from '@/components/LoginModal';
import { UseAuthReturn } from '@/hooks/useAuth';

interface AdminPageShellProps {
  auth: UseAuthReturn;
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
}

export default function AdminPageShell({ auth, title, headerExtra, children }: AdminPageShellProps) {
  const router = useRouter();

  if (!auth.isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50">
        <LoginModal
          isOpen={auth.showLoginModal}
          onClose={() => router.push('/')}
          onConfirm={auth.handleLogin}
          isLoading={auth.isLoggingIn}
          error={auth.loginError}
        />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-gray-100 flex justify-center overflow-hidden">
      <div className="w-full max-w-md bg-white shadow-sm flex flex-col h-full">
        <header className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          <button
            onClick={() => router.push('/')}
            className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
            aria-label="지도로 돌아가기"
          >
            ‹
          </button>
          <h1 className="text-sm font-bold">{title}</h1>
          {headerExtra}
        </header>

        {children}
      </div>
    </div>
  );
}
