import { createContext, useContext, useEffect, useCallback, useState } from 'react';
import { useSession, useLogin, useSignOut } from '../queries/authQueries';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const { data, isLoading, error } = useSession();
  const loginMutation = useLogin();
  const signOutMutation = useSignOut();
  const [isInactive, setIsInactive] = useState(false);

  const login = useCallback(
    async ({ email, password, altcha }) => {
      await loginMutation.mutateAsync({ email, password, altcha });
    },
    [loginMutation]
  );

  const signOut = useCallback(async () => {
    await signOutMutation.mutateAsync();
  }, [signOutMutation]);

  useEffect(() => {
    if (!data?.user) return;

    const events = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
    let timeoutId;

    const resetTimer = () => {
      setIsInactive(false);
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => setIsInactive(true), 60 * 60 * 1000);
    };

    resetTimer();
    events.forEach(event => window.addEventListener(event, resetTimer, { passive: true }));

    return () => {
      clearTimeout(timeoutId);
      events.forEach(event => window.removeEventListener(event, resetTimer));
    };
  }, [data?.user]);

  useEffect(() => {
    if (isInactive && data?.user) {
      signOut();
    }
  }, [isInactive, data?.user, signOut]);

  const value = {
    user: data?.user || null,
    isAuthenticated: !!data?.user,
    isLoading,
    error,
    login: loginMutation.isPending ? undefined : login,
    signOut: signOutMutation.isPending ? undefined : signOut,
    isLoginLoading: loginMutation.isPending,
    loginError: loginMutation.error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
