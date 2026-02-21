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
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-md rounded-xl bg-white px-8 py-10 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
        <div className="mb-8 flex flex-col items-center justify-center gap-2">
          {/* Formbricks-like Logo SVG */}
          <div className="flex items-center gap-2">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3Z" fill="#00E5B5" />
              <path d="M9 8H16V10H9V8Z" fill="white" />
              <path d="M9 14H14V16H9V14Z" fill="white" />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-slate-900">Inquiry</span>
          </div>
          <h2 className="mt-2 text-center text-sm font-medium text-slate-600">Login to your account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="email" className="sr-only">이메일</label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@example.com"
              required
              className="block w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
          <div>
            <label htmlFor="password" className="sr-only">비밀번호</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              required
              className="block w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="flex w-full justify-center rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-70"
          >
            {loading ? '로그인 중...' : 'Login with Email'}
          </button>
        </form>

        <SocialLoginButtons />

        <div className="mt-8 text-center text-xs text-slate-500">
          New to Inquiry?{' '}
          <a href="/auth/signup" className="font-semibold text-slate-900 hover:underline">
            Create an account
          </a>
        </div>
      </div>
    </div>
  );
}
