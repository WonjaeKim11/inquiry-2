'use client';

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch, setAccessToken, getAccessToken } from './api';

/** 인증 사용자 정보 타입 */
interface User {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
  emailVerified: string | null; // DateTime? → ISO string | null
}

/** AuthContext가 제공하는 값 */
interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  /** 회원가입 후 이메일 검증이 필요하므로 자동 로그인하지 않음 */
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  /** OAuth 콜백에서 받은 accessToken을 설정하고 사용자 정보를 불러온다 */
  handleOAuthCallback: (accessToken: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/**
 * 인증 상태를 관리하는 프로바이더.
 * 앱 최상위에 배치하여 하위 컴포넌트에서 useAuth를 사용할 수 있게 한다.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  /** 현재 사용자 정보를 서버에서 가져온다 */
  const fetchUser = useCallback(async () => {
    try {
      const res = await apiFetch('/auth/me');
      if (res.ok) {
        const data = await res.json();
        setUser(data);
      } else {
        setUser(null);
        setAccessToken(null);
      }
    } catch {
      setUser(null);
    }
  }, []);

  // 초기 로드: refresh token으로 세션 복원 시도
  useEffect(() => {
    const init = async () => {
      if (!getAccessToken()) {
        try {
          const res = await fetch(`${process.env['NEXT_PUBLIC_API_URL'] || 'http://localhost:3000/api'}/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
          });
          if (res.ok) {
            const data = await res.json();
            setAccessToken(data.accessToken);
          }
        } catch {
          // refresh 실패 = 비로그인 상태
        }
      }
      if (getAccessToken()) {
        await fetchUser();
      }
      setLoading(false);
    };
    init();
  }, [fetchUser]);

  const login = useCallback(
    async (email: string, password: string) => {
      const res = await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '로그인에 실패했습니다.');
      }
      const data = await res.json();
      setAccessToken(data.accessToken);
      await fetchUser();
    },
    [fetchUser]
  );

  /**
   * 회원가입 요청.
   * 서버는 토큰을 발급하지 않으므로 자동 로그인하지 않는다.
   * 호출 측(SignupForm)에서 이메일 검증 안내를 표시해야 한다.
   */
  const signup = useCallback(
    async (email: string, password: string, name: string) => {
      const res = await apiFetch('/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ email, password, name }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || '회원가입에 실패했습니다.');
      }
      // 토큰 미발급 → 자동 로그인 없음. 이메일 검증 후 로그인 필요.
    },
    []
  );

  const logout = useCallback(async () => {
    await apiFetch('/auth/logout', { method: 'POST' });
    setAccessToken(null);
    setUser(null);
  }, []);

  const handleOAuthCallback = useCallback(
    async (token: string) => {
      setAccessToken(token);
      await fetchUser();
    },
    [fetchUser]
  );

  return (
    <AuthContext.Provider value={{ user, loading, login, signup, logout, handleOAuthCallback }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * AuthContext 사용 훅.
 * AuthProvider 하위에서만 사용 가능.
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서만 사용할 수 있습니다.');
  }
  return context;
}
