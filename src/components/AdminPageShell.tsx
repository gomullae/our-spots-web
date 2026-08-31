'use client';

import { ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { LockIcon, RefreshIcon, UnlockIcon } from '@/components/icons';
import LoginModal from '@/components/LoginModal';
import { UseAuthReturn } from '@/hooks/useAuth';
import { clearAllCaches } from '@/services/api';

interface AdminPageShellProps {
  auth: UseAuthReturn;
  title: string;
  headerExtra?: ReactNode;
  children: ReactNode;
  // 폼/리스트 위주인 다른 관리자 페이지는 좁은 폭(max-w-md)이 적당하지만, 캘린더처럼 넓은 화면이 필요한 페이지는 이 prop으로 넓힐 수 있음
  maxWidthClassName?: string;
  // 지도 화면 플로팅 버튼이 사라지고 홈 화면 바로가기/관리 페이지 "바로가기" 탭으로 진입하는 페이지들은 뒤로가기 필요성이 낮아 숨길 수 있음
  showBackButton?: boolean;
  // 가계 현황/체중/일정처럼 localStorage 캐시를 쓰는 페이지에서만 헤더 우측에 "캐시 지우고 새로고침"/"로그아웃" 버튼 표시
  // ("관리" 페이지는 캐시가 없어서 기본 false)
  showRefreshAndLogout?: boolean;
  // 로그아웃 버튼 클릭 시 확인 절차를 거치게 하려면 각 페이지가 이미 갖고 있는 showConfirm을 그대로 전달 —
  // 폼 저장/삭제 중에 실수로 로그아웃 버튼을 눌러 진행 중인 요청/미저장 입력을 날리는 사고를 막기 위함
  // (전달 안 하면 기존처럼 확인 없이 바로 로그아웃)
  showConfirm?: (message: string, onConfirm: () => void, isDestructive?: boolean) => void;
}

export default function AdminPageShell({
  auth,
  title,
  headerExtra,
  children,
  maxWidthClassName = 'max-w-md',
  showBackButton = true,
  showRefreshAndLogout = false,
  showConfirm,
}: AdminPageShellProps) {
  const router = useRouter();

  const handleClearCacheAndReload = () => {
    clearAllCaches();
    window.location.reload();
  };

  const handleLogoutClick = () => {
    // showConfirm이 없으면(호출부가 안 넘겼으면) 기존처럼 바로 로그아웃
    if (!showConfirm) { auth.handleLogout(); return; }
    showConfirm('로그아웃하시겠습니까? 저장 중인 내용이 있다면 먼저 완료해주세요.', () => auth.handleLogout());
  };

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
          {showRefreshAndLogout && (
            <div className="ml-auto flex items-center gap-3">
              <button
                onClick={handleClearCacheAndReload}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="캐시 지우고 새로고침"
                aria-label="캐시 지우고 새로고침"
              >
                <RefreshIcon className="w-4 h-4" />
              </button>
              <button
                onClick={handleLogoutClick}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                title="로그아웃"
                aria-label="로그아웃"
              >
                <UnlockIcon className="w-4 h-4" />
              </button>
            </div>
          )}
        </header>

        {children}
      </div>
    </div>
  );
}
