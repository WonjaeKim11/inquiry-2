/**
 * 인증된 API 요청을 위한 fetch 래퍼.
 * Access Token 만료 시 자동으로 refresh하여 재시도한다.
 */

const API_BASE_URL = process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api';

/** 메모리에 보관하는 Access Token (XSS 방어를 위해 localStorage 미사용) */
let accessToken: string | null = null;

export function setAccessToken(token: string | null) {
  accessToken = token;
}

export function getAccessToken(): string | null {
  return accessToken;
}

/**
 * Refresh Token(HTTP-only Cookie)으로 새 Access Token을 요청.
 * 실패 시 null 반환.
 */
async function refreshAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: 'POST',
      credentials: 'include', // 쿠키 전송
    });
    if (!res.ok) return null;
    const data = await res.json();
    accessToken = data.accessToken;
    return accessToken;
  } catch {
    return null;
  }
}

/**
 * 인증이 포함된 fetch 래퍼.
 * 401 응답 시 토큰을 갱신하고 한 번 재시도한다.
 *
 * @param path - API 경로 (e.g., '/auth/me')
 * @param options - fetch 옵션
 */
export async function apiFetch(path: string, options: RequestInit = {}): Promise<Response> {
  const url = `${API_BASE_URL}${path}`;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  let res = await fetch(url, {
    ...options,
    headers,
    credentials: 'include',
  });

  // 401이면 토큰 갱신 후 재시도
  if (res.status === 401 && accessToken) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      headers['Authorization'] = `Bearer ${newToken}`;
      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });
    }
  }

  return res;
}
