'use client';

import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '@inquiry/client-core';

const forgotPasswordSchema = z.object({
  email: z.string().email('올바른 이메일 형식을 입력해주세요.').max(255),
});

/**
 * 비밀번호 재설정 요청 폼.
 * 이메일을 입력하면 서버에서 재설정 링크를 발송한다.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(result.error.issues[0].message);
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || '요청 처리에 실패했습니다.');
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : '요청 처리에 실패했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem', textAlign: 'center' }}>
        <h1>이메일을 확인해주세요</h1>
        <p style={{ marginTop: '1rem', color: '#555' }}>
          <strong>{email}</strong>로 비밀번호 재설정 링크를 발송했습니다.
          <br />
          메일함을 확인해주세요.
        </p>
        <p style={{ marginTop: '1.5rem' }}>
          <a href="/auth/login">로그인 페이지로 돌아가기</a>
        </p>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 400, margin: '0 auto', padding: '2rem' }}>
      <h1>비밀번호 재설정</h1>
      <p style={{ color: '#555', marginBottom: '1.5rem' }}>
        가입에 사용한 이메일을 입력하면 비밀번호 재설정 링크를 보내드립니다.
      </p>
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
        {error && <p style={{ color: 'red', marginBottom: '1rem' }}>{error}</p>}
        <button
          type="submit"
          disabled={loading}
          style={{ width: '100%', padding: '0.75rem', cursor: loading ? 'not-allowed' : 'pointer' }}
        >
          {loading ? '처리 중...' : '재설정 링크 보내기'}
        </button>
      </form>
      <p style={{ textAlign: 'center', marginTop: '1rem' }}>
        <a href="/auth/login">로그인 페이지로 돌아가기</a>
      </p>
    </div>
  );
}
