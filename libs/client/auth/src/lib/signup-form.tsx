'use client';

import { useState, useCallback, useMemo } from 'react';
import { z } from 'zod';
import { useAuth } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile';
import { useRef } from 'react';
import {
  Button,
  Input,
  Card,
  CardHeader,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';
import { SocialLoginButtons } from './social-login-buttons';

/**
 * 회원가입 폼 입력값 검증 스키마.
 * 서버 DTO 규칙과 동기화되어야 한다.
 */
const signupSchema = z.object({
  email: z.string().email('auth.login_form.invalid_email').max(255),
  password: z
    .string()
    .min(8, 'auth.reset_password.min_length')
    .max(128, 'auth.reset_password.max_length')
    .regex(/[A-Z]/, 'auth.reset_password.require_uppercase')
    .regex(/[0-9]/, 'auth.reset_password.require_number'),
  name: z
    .string()
    .min(1, 'auth.signup_form.name_required')
    .max(50)
    .regex(/^[\p{L}\p{N}\s\-']+$/u, 'auth.signup_form.name_invalid'),
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

/** Turnstile CAPTCHA가 활성화되어 있는지 확인 (환경변수 기반) */
const TURNSTILE_SITE_KEY = process.env['NEXT_PUBLIC_TURNSTILE_SITE_KEY'] || '';

/**
 * 이메일+비밀번호 회원가입 폼.
 * zod로 클라이언트 사이드 검증 후 서버에 요청한다.
 * 회원가입 성공 시 이메일 검증 안내 메시지를 표시한다.
 * Turnstile CAPTCHA, inviteToken, userLocale 연동을 포함한다.
 */
export function SignupForm() {
  const { t, i18n } = useTranslation();
  const { signup } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [isPasswordFocused, setIsPasswordFocused] = useState(false);

  // Turnstile CAPTCHA 상태 관리
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const [turnstileError, setTurnstileError] = useState(false);
  const turnstileRef = useRef<TurnstileInstance | null>(null);

  const pwdRules = checkPasswordRules(password);

  // URL query string에서 inviteToken 추출 (초대 기반 회원가입)
  const inviteToken = useMemo(() => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    return params.get('inviteToken') || undefined;
  }, []);

  /** Turnstile 검증 성공 콜백 */
  const handleTurnstileSuccess = useCallback((token: string) => {
    setTurnstileToken(token);
    setTurnstileError(false);
  }, []);

  /** Turnstile 에러 콜백 */
  const handleTurnstileError = useCallback(() => {
    setTurnstileToken(null);
    setTurnstileError(true);
  }, []);

  /** Turnstile 만료 콜백 */
  const handleTurnstileExpire = useCallback(() => {
    setTurnstileToken(null);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = signupSchema.safeParse({
      email,
      password,
      name: name.trim(),
    });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    // Turnstile이 활성화되어 있으면 토큰 검증 필요
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError(t('auth.signup_form.captcha_required'));
      return;
    }

    setLoading(true);
    try {
      // 현재 i18n locale을 userLocale로 전달
      const userLocale = i18n.language;
      await signup(email, password, name.trim(), {
        inviteToken,
        userLocale,
        turnstileToken: turnstileToken || undefined,
      });
      setSuccess(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('auth.signup_form.signup_fail')
      );
      // 실패 시 Turnstile 위젯 리셋하여 재시도 가능하게 함
      turnstileRef.current?.reset();
      setTurnstileToken(null);
    } finally {
      setLoading(false);
    }
  };

  // 회원가입 성공 -> 이메일 검증 안내
  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 px-2 py-4 text-center shadow-[0_0_15px_rgba(0,0,0,0.05)]">
          <CardHeader className="items-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <svg
                className="h-8 w-8 text-teal-500"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {t('auth.signup_form.verify_email_title')}
            </h1>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('auth.signup_form.verify_email_sent_1', {
                email: <strong>{email}</strong>,
              })}
              <br />
              {t('auth.signup_form.verify_email_sent_2')}
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild className="w-full">
              <a href="/auth/login">{t('auth.signup_form.to_login')}</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <Card className="my-8 w-full max-w-md border-0 px-2 py-4 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
        <CardHeader className="items-center gap-2 pb-6">
          {/* Logo */}
          <div className="flex items-center gap-2">
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M6 3H19C20.1046 3 21 3.89543 21 5V19C21 20.1046 20.1046 21 19 21H6C4.89543 21 4 20.1046 4 19V5C4 3.89543 4.89543 3 6 3Z"
                fill="#00E5B5"
              />
              <path d="M9 8H16V10H9V8Z" fill="white" />
              <path d="M9 14H14V16H9V14Z" fill="white" />
            </svg>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Inquiry
            </span>
          </div>
          <h2 className="text-center text-sm font-medium text-muted-foreground">
            {t('auth.signup_form.title')}
          </h2>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="name" className="sr-only">
                {t('auth.signup_form.name_label')}
              </label>
              <Input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('auth.signup_form.name_placeholder')}
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.signup_form.email_label')}
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>
            <div>
              <label htmlFor="password" className="sr-only">
                {t('auth.signup_form.password_label')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setIsPasswordFocused(true)}
                onBlur={() => setIsPasswordFocused(false)}
                placeholder="Password"
                required
              />
              {/* 비밀번호 실시간 유효성 힌트 -- shadcn 대응 컴포넌트 없으므로 커스텀 유지 */}
              {(isPasswordFocused || password.length > 0) && (
                <div className="mt-2.5 space-y-1.5 text-[0.8rem]">
                  <p
                    className={`${
                      pwdRules.length
                        ? 'text-teal-600'
                        : 'text-muted-foreground'
                    } flex items-center transition-colors`}
                  >
                    <svg
                      className="mr-1.5 h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('auth.signup_form.pwd_rule_length')}
                  </p>
                  <p
                    className={`${
                      pwdRules.uppercase
                        ? 'text-teal-600'
                        : 'text-muted-foreground'
                    } flex items-center transition-colors`}
                  >
                    <svg
                      className="mr-1.5 h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('auth.signup_form.pwd_rule_uppercase')}
                  </p>
                  <p
                    className={`${
                      pwdRules.number
                        ? 'text-teal-600'
                        : 'text-muted-foreground'
                    } flex items-center transition-colors`}
                  >
                    <svg
                      className="mr-1.5 h-3.5 w-3.5 flex-shrink-0"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                    {t('auth.signup_form.pwd_rule_number')}
                  </p>
                </div>
              )}
            </div>

            {/* Turnstile CAPTCHA 위젯 — NEXT_PUBLIC_TURNSTILE_SITE_KEY 미설정 시 graceful degradation */}
            {TURNSTILE_SITE_KEY && (
              <div className="flex flex-col items-center">
                {turnstileError ? (
                  <p className="text-xs text-destructive">
                    {t('auth.signup_form.captcha_error')}
                  </p>
                ) : (
                  <Turnstile
                    ref={turnstileRef}
                    siteKey={TURNSTILE_SITE_KEY}
                    onSuccess={handleTurnstileSuccess}
                    onError={handleTurnstileError}
                    onExpire={handleTurnstileExpire}
                    options={{
                      theme: 'light',
                      size: 'normal',
                    }}
                  />
                )}
              </div>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="mt-2 w-full">
              {loading
                ? t('auth.signup_form.signing_up')
                : t('auth.signup_form.submit')}
            </Button>
          </form>

          <SocialLoginButtons />
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-xs text-muted-foreground">
            {t('auth.signup_form.already_have_account')}{' '}
            <a
              href="/auth/login"
              className="font-semibold text-slate-900 hover:underline"
            >
              {t('auth.signup_form.login')}
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
