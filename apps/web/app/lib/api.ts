export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers);
  const csrf = typeof document === 'undefined' ? null : document.cookie.split(';').map((part) => part.trim().split('=')).find(([key]) => key === 'confirma_csrf_token')?.[1];
  if (csrf && ['POST', 'PUT', 'PATCH', 'DELETE'].includes((init.method ?? 'GET').toUpperCase())) headers.set('x-csrf-token', csrf);
  const response = await fetch(input, { ...init, headers, credentials: 'include' });
  if (response.status === 401) {
    expireSession();
    throw new Error('Sessão expirada');
  }
  return response;
}

function expireSession(): void {
  if (typeof window === 'undefined') return;
  window.location.replace('/login');
}
