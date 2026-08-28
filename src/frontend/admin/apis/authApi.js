import { readAdminResponse } from './adminResponse.js';

export async function loginAdmin({ email, password, altcha }) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, altcha }),
  });

  return readAdminResponse(response, 'Login failed');
}

export async function fetchSession() {
  const response = await fetch('/api/admin/session');

  return readAdminResponse(response, 'No active session');
}

export async function refreshSession() {
  const response = await fetch('/api/admin/session', {
    method: 'POST',
  });

  return readAdminResponse(response, 'Session refresh failed');
}

export async function signOut() {
  await fetch('/api/admin/session', {
    method: 'DELETE',
  });
}

export async function updateUser({ name, password }) {
  const response = await fetch('/api/admin/user', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, password }),
  });

  return readAdminResponse(response, 'Update failed');
}
