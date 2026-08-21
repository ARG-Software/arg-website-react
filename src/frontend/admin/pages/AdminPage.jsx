import { Suspense } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth';
import { QueryClientProvider } from '@tanstack/react-query';
import { adminQueryClient } from '../queryClient';
import { Loading } from '../components/Loading';

function AuthGate() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <Loading />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="admin-layout">
      <header className="admin-header">
        <div className="admin-header__content">
          <h1>Admin Dashboard</h1>
          <UserMenu />
        </div>
      </header>
      <main className="admin-main">
        <Suspense fallback={<Loading />}>
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function UserMenu() {
  const { user, signOut } = useAuth();

  return (
    <div className="user-menu">
      <span>{user.email}</span>
      <button onClick={signOut}>Sign out</button>
    </div>
  );
}

export default function AdminPage() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AuthProvider>
        <AuthGate />
      </AuthProvider>
    </QueryClientProvider>
  );
}
