import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useUpdateUser } from '../queries/authQueries';

export default function SettingsPage() {
  const { user } = useAuth();
  const updateUser = useUpdateUser();
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
  });
  const [passwordData, setPasswordData] = useState({
    password: '',
    confirmPassword: '',
  });
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleProfileUpdate = async e => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    try {
      await updateUser.mutateAsync({ name: formData.name });
      setMessage({ type: 'success', text: 'Profile updated successfully' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  const handlePasswordUpdate = async e => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (passwordData.password !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'Passwords do not match' });
      return;
    }

    if (passwordData.password.length < 8) {
      setMessage({ type: 'error', text: 'Password must be at least 8 characters' });
      return;
    }

    try {
      await updateUser.mutateAsync({ password: passwordData.password });
      setMessage({ type: 'success', text: 'Password updated successfully' });
      setPasswordData({ password: '', confirmPassword: '' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message });
    }
  };

  return (
    <div className="settings-page">
      <h2>Settings</h2>

      {message.text && (
        <div className={`settings-message settings-message--${message.type}`}>{message.text}</div>
      )}

      <div className="settings-section">
        <h3>Profile</h3>
        <form onSubmit={handleProfileUpdate}>
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input type="email" id="email" value={formData.email} disabled />
          </div>
          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              value={formData.name}
              onChange={e => setFormData({ ...formData, name: e.target.value })}
            />
          </div>
          <button type="submit" disabled={updateUser.isLoading}>
            {updateUser.isLoading ? 'Saving...' : 'Save Changes'}
          </button>
        </form>
      </div>

      <div className="settings-section">
        <h3>Change Password</h3>
        <form onSubmit={handlePasswordUpdate}>
          <div className="form-group">
            <label htmlFor="new-password">New Password</label>
            <input
              type="password"
              id="new-password"
              value={passwordData.password}
              onChange={e => setPasswordData({ ...passwordData, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label htmlFor="confirm-password">Confirm Password</label>
            <input
              type="password"
              id="confirm-password"
              value={passwordData.confirmPassword}
              onChange={e => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
            />
          </div>
          <button type="submit" disabled={updateUser.isLoading}>
            {updateUser.isLoading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </div>
    </div>
  );
}
