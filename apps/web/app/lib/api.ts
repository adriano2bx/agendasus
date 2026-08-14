export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const token = typeof window === 'undefined' ? null : sessionStorage.getItem('confirma_access_token');
  if (!token) {
    expireSession();
    throw new Error('Sessão expirada');
  }

  const headers = new Headers(init.headers);
  headers.set('authorization', `Bearer ${token}`);
  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    expireSession();
    throw new Error('Sessão expirada');
  }
  return response;
}

function expireSession(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.removeItem('confirma_access_token');
  window.location.replace('/login');
}
