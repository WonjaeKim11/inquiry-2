/**
 * 인증된 API 요청을 위한 fetch 래퍼.
 * Access Token 만료 시 자동으로 refresh하여 재시도한다.
 * 429/502/503/504 응답에 지수 백오프 재시도를 수행한다.
 */

const API_BASE_URL =
  process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api';

/** 재시도 대상 HTTP 상태 코드 */
const RETRYABLE_STATUS_CODES = [429, 502, 503, 504];

/** 최대 재시도 횟수 */
const MAX_RETRIES = 3;

/** 기본 재시도 대기 시간 (ms) */
const BASE_RETRY_DELAY = 1000;

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
      credentials: 'include',
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
 * 지정된 시간(ms)만큼 대기한다.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry-After 헤더를 파싱하여 대기 시간(ms)을 반환한다.
 * 헤더가 없거나 파싱 실패 시 null 반환.
 */
function parseRetryAfter(response: Response): number | null {
  const retryAfter = response.headers.get('Retry-After');
  if (!retryAfter) return null;

  // 초 단위 숫자
  const seconds = parseInt(retryAfter, 10);
  if (!isNaN(seconds)) return seconds * 1000;

  // HTTP-date 형식
  const date = new Date(retryAfter);
  if (!isNaN(date.getTime())) {
    return Math.max(0, date.getTime() - Date.now());
  }

  return null;
}

/**
 * 인증이 포함된 fetch 래퍼.
 * - 401 응답 시 토큰을 갱신하고 한 번 재시도한다.
 * - 429/502/503/504 응답 시 지수 백오프로 최대 3회 재시도한다.
 *
 * @param path - API 경로 (e.g., '/auth/me')
 * @param options - fetch 옵션
 */
export async function apiFetch(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
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

  // 재시도 가능한 상태 코드에 대해 지수 백오프 재시도
  if (RETRYABLE_STATUS_CODES.includes(res.status)) {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const retryAfterMs = parseRetryAfter(res);
      const backoffMs = retryAfterMs ?? BASE_RETRY_DELAY * Math.pow(2, attempt);
      await sleep(backoffMs);

      res = await fetch(url, {
        ...options,
        headers,
        credentials: 'include',
      });

      if (!RETRYABLE_STATUS_CODES.includes(res.status)) {
        break;
      }
    }
  }

  return res;
}
