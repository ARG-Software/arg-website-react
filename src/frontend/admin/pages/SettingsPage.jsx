import { useState } from 'react';
import { UiButton } from '@ui/primitives/UiButton.jsx';
import { UiCard } from '@ui/primitives/UiCard.jsx';
import { UiField } from '@ui/primitives/UiField.jsx';
import { useUpdateUser } from '../queries/auth/useAuthQueries.js';

export default function SettingsPage({ userEmail }) {
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [status, setStatus] = useState('');
  const updateUserMutation = useUpdateUser();

  async function handleSubmit(event) {
    event.preventDefault();
    setStatus('');

    if (password && password !== passwordConfirm) {
      setStatus('Passwords do not match.');
      return;
    }

    try {
      if (name) {
        await updateUserMutation.mutateAsync({ name });
      }

      if (password) {
        await updateUserMutation.mutateAsync({ password });
        setPassword('');
        setPasswordConfirm('');
      }

      setStatus('Settings updated.');
    } catch (error) {
      setStatus(error.message);
    }
  }

  return (
    <UiCard className="admin-settings-card" tone="light">
      <form className="admin-form" onSubmit={handleSubmit}>
        <UiField id="admin-settings-email" label="Email" value={userEmail || ''} disabled />
        <UiField
          id="admin-settings-name"
          label="Name"
          value={name}
          onChange={event => setName(event.target.value)}
        />
        <UiField
          id="admin-settings-password"
          label="New password"
          type="password"
          value={password}
          onChange={event => setPassword(event.target.value)}
          minLength={8}
        />
        <UiField
          id="admin-settings-password-confirm"
          label="Confirm new password"
          type="password"
          value={passwordConfirm}
          onChange={event => setPasswordConfirm(event.target.value)}
          minLength={8}
        />
        <div className="admin-detail-form__actions">
          <UiButton type="submit" disabled={updateUserMutation.isPending}>
            {updateUserMutation.isPending ? 'Saving...' : 'Save settings'}
          </UiButton>
          {status && <span className="admin-save-status">{status}</span>}
        </div>
      </form>
    </UiCard>
  );
}
