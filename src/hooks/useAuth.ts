import { useState, useEffect, useCallback, useRef } from 'react';
import { authApi, isLoggedIn } from '@/services/api';

export interface UseAuthReturn {
  isAuthenticated: boolean;
  showLoginModal: boolean;
  loginError: string | undefined;
  isLoggingIn: boolean;
  setShowLoginModal: (show: boolean) => void;
  setLoginError: (error: string | undefined) => void;
  handleLogin: (password: string) => Promise<void>;
  handleLogout: () => void;
}

export function useAuth(): UseAuthReturn {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [loginError, setLoginError] = useState<string | undefined>();
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    setIsAuthenticated(isLoggedIn());

    const handleAuthExpired = () => {
      setIsAuthenticated(false);
    };
    window.addEventListener('auth-expired', handleAuthExpired);
    return () => window.removeEventListener('auth-expired', handleAuthExpired);
  }, []);

  const handleLogin = useCallback(async (password: string) => {
    setIsLoggingIn(true);
    setLoginError(undefined);
    try {
      await authApi.login(password);
      setIsAuthenticated(true);
      setShowLoginModal(false);
    } catch (err) {
      setLoginError(err instanceof Error ? err.message : '로그인에 실패했습니다');
    } finally {
      setIsLoggingIn(false);
    }
  }, []);

  const handleLogout = useCallback(() => {
    authApi.logout();
    setIsAuthenticated(false);
  }, []);

  return {
    isAuthenticated,
    showLoginModal,
    loginError,
    isLoggingIn,
    setShowLoginModal,
    setLoginError,
    handleLogin,
    handleLogout,
  };
}
