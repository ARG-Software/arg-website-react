import { useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from '../hooks/useAuth.jsx';
import { QueryClientProvider } from '@tanstack/react-query';
import { adminQueryClient } from '../queryClient';
import { AltchaVerification } from '@components/forms/AltchaVerification.jsx';
import { AmbientVideoBackground } from '@ui/layout/AmbientVideoBackground.jsx';
import { ArgMarkIcon } from '@ui/icons/ArgMarkIcon.jsx';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiField } from '@ui/primitives/UiField.jsx';

function LoginForm() {
  const { isAuthenticated, login, isLoginLoading, loginError } = useAuth();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [altchaPayload, setAltchaPayload] = useState('');
  const [altchaState, setAltchaState] = useState('unverified');

  if (isAuthenticated) {
    const from = new URLSearchParams(location.search).get('from') || '/admin/';
    return <Navigate to={from} replace />;
  }

  const handleSubmit = async e => {
    e.preventDefault();

    if (altchaState !== 'verified' || !altchaPayload) {
      return;
    }

    try {
      await login({ email, password, altcha: altchaPayload });
    } catch {
      // Error is surfaced via loginError from the auth context
    }
  };

  return (
    <div className="admin-login-page">
      <Helmet>
        <title>Admin Backoffice | ARG</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>
      <AmbientVideoBackground src="/videos/hero-video-opt.mp4" />
      <div className="admin-login-center">
        <ArgMarkIcon className="admin-login-mark" />
        <h1 className="admin-login-title">Admin Backoffice</h1>

        <UiCard className="admin-login-card">
          <form className="admin-form" onSubmit={handleSubmit}>
            <UiField
              id="admin-email"
              label="Email"
              type="email"
              value={email}
              onChange={event => setEmail(event.target.value)}
              autoComplete="username"
              required
            />
            <UiField
              id="admin-password"
              label="Password"
              type="password"
              value={password}
              onChange={event => setPassword(event.target.value)}
              autoComplete="current-password"
              required
            />

            <div className="admin-altcha">
              <AltchaVerification
                onStateChange={setAltchaState}
                onVerified={setAltchaPayload}
                theme="business"
              />
            </div>

            {loginError && <p className="admin-error">{loginError.message}</p>}

            <UiButton type="submit" disabled={isLoginLoading || altchaState !== 'verified'}>
              {isLoginLoading
                ? 'Signing in...'
                : altchaState === 'verified'
                  ? 'Sign in'
                  : 'Verify to sign in'}
            </UiButton>
          </form>
        </UiCard>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <AuthProvider>
        <LoginForm />
      </AuthProvider>
    </QueryClientProvider>
  );
}
