'use client';

import { useState } from 'react';
import { z } from 'zod';
import { useAuth } from '@inquiry/client-core';
import { SocialLoginButtons } from './social-login-buttons';

/**
 * 회원가입 폼 입력값 검증 스키마.
 * 서버 DTO 규칙과 동기화되어야 한다.
 */
const signupSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.').max(255),
  password: z
    .string()
    .min(8, '비밀번호는 최소 8자 이상이어야 합니다.')
    .max(128, '비밀번호는 최대 128자까지 가능합니다.')
    .regex(/[A-Z]/, '비밀번호에 대문자가 1자 이상 포함되어야 합니다.')
    .regex(/[0-9]/, '비밀번호에 숫자가 1자 이상 포함되어야 합니다.'),
  name: z
    .string()
    .min(1, '이름은 필수 입력입니다.')
    .max(50)
    .regex(/^[\p{L}\p{N}\s\-']+$/u, '이름에 허용되지 않는 문자가 포함되어 있습니다.'),
});

/**
 * 이메일+비밀번호 회원가입 폼.
 * zod로 클라이언트 사이드 검증 후 서버에 요청한다.
 * 회원가입 성공 시 이메일 검증 안내 메시지를 표시한다.
 */
export function SignupForm() {
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = signupSchema.safeParse({ email, password, name: name.trim() });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      await signup(email, password, name.trim());
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '회원가입에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 성공 → 이메일 검증 안내
  if (success) {
    return (
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1>이메일을 확인해주세요</h1>
        <p style={{ marginTop: '1rem', color: '#555' }}>
          <strong>{email}</strong>로 인증 메일을 발송했습니다.
          <br />
          메일의 링크를 클릭하여 계정을 활성화해주세요.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/auth/login">로그인 페이지로 이동</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1>회원가입</h1>
      <form onSubmit={handleSubmit}>
        <div style={{ marginBottom: '1rem' }}>
          <label htmlFor="name">이름</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="이름"
            required
            style={{ width: '100%', padding: '0.5rem', marginTop: '0.25rem' }}
          />
        </div>
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
            placeholder="8자 이상, 대문자·숫자 포함"
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
          {loading ? '가입 중...' : '회원가입'}
        </button>
      </form>
      <SocialLoginButtons />
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        이미 계정이 있으신가요? <a href="/auth/login">로그인</a>
      </p>
    </div>
  );
}
