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
 * 비밀번호 실시간 유효성 검사를 위한 헬퍼 함수
 */
const checkPasswordRules = (pwd: string) => {
  return {
    length: pwd.length >= 8 && pwd.length <= 128,
    uppercase: /[A-Z]/.test(pwd),
    number: /[0-9]/.test(pwd),
  };
};

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
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  const pwdRules = checkPasswordRules(password);

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
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-md rounded-xl bg-white px-8 py-10 text-center shadow-[0_0_15px_rgba(0,0,0,0.05)]">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">이메일을 확인해주세요</h1>
          <p className="mt-4 text-sm text-slate-500">
            <strong>{email}</strong>로 인증 메일을 발송했습니다.
            <br />
            메일의 링크를 클릭하여 계정을 활성화해주세요.
          </p>
          <a
            href="/auth/login"
            className="mt-8 inline-block w-full rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800"
          >
            로그인 페이지로 이동
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <div className="my-8 w-full max-w-md rounded-xl bg-white px-8 py-10 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
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
          <h2 className="mt-2 text-center text-sm font-medium text-slate-600">Create your account</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="name" className="sr-only">이름</label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Full Name"
              required
              className="block w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
          </div>
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
              onFocus={() => setIsPasswordFocused(true)}
              onBlur={() => setIsPasswordFocused(false)}
              placeholder="Password"
              required
              className="block w-full rounded-md border border-slate-200 px-3 py-2.5 text-sm outline-none placeholder:text-slate-400 focus:border-slate-400 focus:ring-1 focus:ring-slate-400"
            />
            {/* Realtime password validation feedback */}
            {(isPasswordFocused || password.length > 0) && (
              <div className="mt-2.5 space-y-1.5 text-[0.8rem]">
                <p className={`${pwdRules.length ? 'text-teal-600' : 'text-slate-400'} flex items-center transition-colors`}>
                  <svg className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  최소 8자 이상
                </p>
                <p className={`${pwdRules.uppercase ? 'text-teal-600' : 'text-slate-400'} flex items-center transition-colors`}>
                  <svg className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  대문자 1자 이상 포함
                </p>
                <p className={`${pwdRules.number ? 'text-teal-600' : 'text-slate-400'} flex items-center transition-colors`}>
                  <svg className="mr-1.5 h-3.5 w-3.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  숫자 1자 이상 포함
                </p>
              </div>
            )}
          </div>

          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="mt-2 flex w-full justify-center rounded-md bg-slate-900 px-3 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900 disabled:opacity-70"
          >
            {loading ? '가입 중...' : 'Sign up with Email'}
          </button>
        </form>

        <SocialLoginButtons />

        <div className="mt-8 text-center text-xs text-slate-500">
          Already have an account?{' '}
          <a href="/auth/login" className="font-semibold text-slate-900 hover:underline">
            Login
          </a>
        </div>
      </div>
    </div>
  );
}
