'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAuth } from '@inquiry/client-core';
import { SocialLoginButtons } from './social-login-buttons';

/**
 * 로그인 폼 입력값 검증 스키마.
 * 서버 DTO 규칙과 동기화되어야 한다.
 */
const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.').max(255),
  password: z.string().min(1, '비밀번호를 입력해주세요.').max(128),
});

/** 에러 코드 → 사용자 메시지 매핑 */
const ERROR_MESSAGES: Record<string, string> = {
  'email-verification-required': '이메일 인증이 필요합니다. 메일함을 확인해주세요.',
  'account-inactive': '비활성화된 계정입니다. 관리자에게 문의해주세요.',
  'invalid-credentials': '이메일 또는 비밀번호가 올바르지 않습니다.',
};

/**
 * 이메일+비밀번호 로그인 폼.
 * zod로 클라이언트 사이드 검증 후 서버에 요청한다.
 * URL query string의 ?error= 파라미터로 에러 메시지를 표시한다.
 */
export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // URL query string에서 에러 코드 파싱
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setError(ERROR_MESSAGES[errorCode]);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : '로그인에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1>로그인</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="email">이메일</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="email@example.com"
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="password">비밀번호</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="비밀번호"
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '로그인 중...' : '로그인'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '0.5rem' }}>
        <a href="/auth/forgot-password">비밀번호를 잊으셨나요?</a>
      </p>
      <SocialLoginButtons />
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        계정이 없으신가요? <a href="/auth/signup">회원가입</a>
      </p>
    </div>
  );
}
