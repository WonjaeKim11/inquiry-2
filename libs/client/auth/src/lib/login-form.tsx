'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@inquiry/client-core';
import { SocialLoginButtons } from './social-login-buttons';

/** 로그인 폼 입력값 검증 스키마 */
const loginSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

/**
 * 이메일+비밀번호 로그인 폼.
 * zod로 클라이언트 사이드 검증 후 서버에 요청한다.
 */
export function LoginForm() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // 클라이언트 사이드 검증
    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await login(email, password);
      // 로그인 성공 시 AuthProvider가 상태를 업데이트하고, 페이지에서 리다이렉트 처리
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
      <SocialLoginButtons />
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        계정이 없으신가요? <a href="/signup">회원가입</a>
      </p>
    </div>
  );
}
