import { auth } from './firebase';
import { API_BASE } from './utils';

/**
 * fetch() wrapper for the backend. Attaches the signed-in user's Firebase ID token
 * so the server can scope every request to that user's own data.
 * getIdToken() returns a cached token and refreshes it automatically when it expires.
 */
export async function apiFetch(path, options = {}) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error('You are not signed in.');
  }

  const token = await user.getIdToken();
  const headers = {
    ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    ...options.headers,
    Authorization: `Bearer ${token}`,
  };

  return fetch(`${API_BASE}${path}`, { ...options, headers });
}
