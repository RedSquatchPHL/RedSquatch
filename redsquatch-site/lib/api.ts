export const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

// Ends the server session and clears local state. keepalive lets the request
// finish even though the caller navigates away (to /logout) right after.
export function logout() {
  fetch(`${API}/api/client/logout`, { method: 'POST', credentials: 'include', keepalive: true }).catch(() => {});
  localStorage.clear();
}
