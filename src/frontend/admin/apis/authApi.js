export async function loginAdmin({ email, password, altcha }) {
  const response = await fetch('/api/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, altcha }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Login failed');
  }

  return response.json();
}

export async function fetchSession() {
  const response = await fetch('/api/admin/session');

  if (!response.ok) {
    throw new Error('No active session');
  }

  return response.json();
}

export async function refreshSession() {
  const response = await fetch('/api/admin/session', {
    method: 'POST',
  });

  if (!response.ok) {
    throw new Error('Session refresh failed');
  }

  return response.json();
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

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error?.message || 'Update failed');
  }

  return response.json();
}
