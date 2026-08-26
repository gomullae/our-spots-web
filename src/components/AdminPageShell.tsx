'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon } from '@/components/icons';
import LoginModal from '@/components/LoginModal';
import { UseAuthReturn } from '@/hooks/useAuth';

interface AdminPageShellProps {
  auth: UseAuthReturn;
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  // 폼/리스트 위주인 다른 관리자 페이지는 좁은 폭(max-w-md)이 적당하지만, 캘린더처럼 넓은 화면이 필요한 페이지는 이 prop으로 넓힐 수 있음
  maxWidthClassName?: string;
  // 지도 화면 플로팅 버튼이 사라지고 홈 화면 바로가기/관리 페이지 "바로가기" 탭으로 진입하는 페이지들은 뒤로가기 필요성이 낮아 숨길 수 있음
  showBackButton?: boolean;
}

export default function AdminPageShell({
  auth,
  title,
  headerExtra,
  children,
  maxWidthClassName = 'max-w-md',
  showBackButton = true,
}: AdminPageShellProps) {
  const router = useRouter();

  if (!auth.isAuthenticated) {
    return (
      <div className="h-dvh bg-gray-50 flex flex-col items-center justify-center gap-4 px-6 text-center">
        <LockIcon className="w-10 h-10 text-gray-300" />
        <div>
          <p className="text-base font-semibold text-gray-700">로그인이 필요한 페이지예요</p>
          <p className="text-sm text-gray-400 mt-1">관리자 인증 후 이용할 수 있습니다</p>
        </div>
        <button
          onClick={() => auth.setShowLoginModal(true)}
          className="px-5 py-2.5 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 transition-colors"
        >
          인증하기
        </button>
        <button
          onClick={() => router.push('/')}
          className="text-xs text-gray-400 hover:text-gray-600 hover:underline underline-offset-2"
        >
          지도로 돌아가기
        </button>

        <LoginModal
          isOpen={auth.showLoginModal}
          onClose={() => auth.setShowLoginModal(false)}
          onConfirm={auth.handleLogin}
          isLoading={auth.isLoggingIn}
          error={auth.loginError}
        />
      </div>
    );
  }

  return (
    <div className="h-dvh bg-gray-100 flex justify-center overflow-hidden">
      <div className={`w-full ${maxWidthClassName} bg-white shadow-sm flex flex-col h-full`}>
        <header className="flex items-center gap-2 px-4 py-3 border-b shrink-0">
          {showBackButton && (
            <button
              onClick={() => router.push('/')}
              className="text-gray-400 hover:text-gray-600 text-lg leading-none px-1"
              aria-label="지도로 돌아가기"
            >
              ‹
            </button>
          )}
          <h1 className="text-sm font-bold">{title}</h1>
          {headerExtra}
        </header>

        {children}
      </div>
    </div>
  );
}
