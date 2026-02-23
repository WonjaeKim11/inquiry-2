'use client';

import { useState, useEffect } from 'react';
import { z } from 'zod';
import { useAuth } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';
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
 * 로그인 폼 입력값 검증 스키마.
 * 서버 DTO 규칙과 동기화되어야 한다.
 */
const loginSchema = z.object({
  email: z.string().email('auth.login_form.invalid_email').max(255),
  password: z.string().min(1, 'auth.login_form.password_required').max(128),
});

/** 로그인 흐름 단계: credentials(이메일+비밀번호) 또는 two-factor(2FA 코드 입력) */
type LoginStep = 'credentials' | 'two-factor';

/** 에러 코드 → 사용자 메시지 매핑 */
const ERROR_MESSAGES: Record<string, string> = {
  'email-verification-required': 'auth.login_form.error_email_verification',
  'account-inactive': 'auth.login_form.error_account_inactive',
  'invalid-credentials': 'auth.login_form.error_invalid_credentials',
  'invalid-two-factor-code': 'auth.two_factor_input.invalid_code',
};

/**
 * 이메일+비밀번호 로그인 폼.
 * 2FA가 활성화된 사용자의 경우 TOTP 코드 또는 백업 코드 입력 단계로 전환된다.
 * zod로 클라이언트 사이드 검증 후 서버에 요청한다.
 * URL query string의 ?error= 파라미터로 에러 메시지를 표시한다.
 */
export function LoginForm() {
  const { t } = useTranslation();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // 2FA 관련 상태
  const [step, setStep] = useState<LoginStep>('credentials');
  const [totpCode, setTotpCode] = useState('');
  const [backupCode, setBackupCode] = useState('');
  const [useBackup, setUseBackup] = useState(false);

  // URL query string에서 에러 코드 파싱
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const errorCode = params.get('error');
    if (errorCode && ERROR_MESSAGES[errorCode]) {
      setError(t(ERROR_MESSAGES[errorCode]));
    }
  }, [t]);

  /**
   * credentials 단계: 이메일+비밀번호로 로그인 시도.
   * 서버가 2FA를 요구하면 two-factor 단계로 전환한다.
   */
  const handleCredentialsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = loginSchema.safeParse({ email, password });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    setLoading(true);
    try {
      const loginResult = await login(email, password);
      if (!loginResult.success && loginResult.requiresTwoFactor) {
        // 2FA 필요 — 코드 입력 단계로 전환
        setStep('two-factor');
      }
      // loginResult.success === true이면 AuthContext가 사용자 정보를 로드하고 리다이렉트 처리
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t('auth.login_form.login_fail')
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * two-factor 단계: TOTP 코드 또는 백업 코드와 함께 로그인 재시도.
   * 이미 입력된 이메일/비밀번호를 함께 전송한다.
   */
  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const loginResult = useBackup
        ? await login(email, password, undefined, backupCode)
        : await login(email, password, totpCode);

      if (!loginResult.success) {
        setError(t('auth.two_factor_input.invalid_code'));
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t('auth.two_factor_input.invalid_code')
      );
    } finally {
      setLoading(false);
    }
  };

  /**
   * 2FA 단계에서 로그인 단계로 돌아가기.
   * 2FA 관련 상태를 초기화한다.
   */
  const handleBackToLogin = () => {
    setStep('credentials');
    setTotpCode('');
    setBackupCode('');
    setUseBackup(false);
    setError(null);
  };

  // 2FA 코드 입력 단계 UI
  if (step === 'two-factor') {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 px-2 py-4 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
          <CardHeader className="items-center gap-2 pb-6">
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
              {t('auth.two_factor_input.title')}
            </h2>
            <p className="text-center text-xs text-muted-foreground">
              {t('auth.two_factor_input.description')}
            </p>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleTwoFactorSubmit} className="space-y-4">
              {useBackup ? (
                <div>
                  <label
                    htmlFor="backupCode"
                    className="text-sm font-medium text-slate-700"
                  >
                    {t('auth.two_factor_input.backup_label')}
                  </label>
                  <Input
                    id="backupCode"
                    type="text"
                    value={backupCode}
                    onChange={(e) => setBackupCode(e.target.value)}
                    placeholder={t('auth.two_factor_input.backup_placeholder')}
                    required
                    className="mt-1"
                    autoComplete="off"
                  />
                </div>
              ) : (
                <div>
                  <label
                    htmlFor="totpCode"
                    className="text-sm font-medium text-slate-700"
                  >
                    {t('auth.two_factor_input.code_label')}
                  </label>
                  <Input
                    id="totpCode"
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]{6}"
                    maxLength={6}
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, ''))
                    }
                    placeholder={t('auth.two_factor_input.code_placeholder')}
                    required
                    className="mt-1"
                    autoComplete="one-time-code"
                    autoFocus
                  />
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={loading} className="w-full">
                {loading
                  ? t('auth.login_form.logging_in')
                  : t('auth.two_factor_input.verify')}
              </Button>

              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setUseBackup(!useBackup);
                    setError(null);
                  }}
                  className="text-xs text-muted-foreground hover:text-slate-900 hover:underline"
                >
                  {useBackup
                    ? t('auth.two_factor_input.use_totp')
                    : t('auth.two_factor_input.use_backup')}
                </button>
                <button
                  type="button"
                  onClick={handleBackToLogin}
                  className="text-xs text-muted-foreground hover:text-slate-900 hover:underline"
                >
                  {t('auth.two_factor_input.back')}
                </button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  // credentials 단계 UI (기존 로그인 폼)
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-0 px-2 py-4 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
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
            {t('auth.login_form.title')}
          </h2>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleCredentialsSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="sr-only">
                {t('auth.login_form.email_label')}
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
                {t('auth.login_form.password_label')}
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                required
              />
              {/* 비밀번호 찾기 링크 -- 비밀번호 필드 직후에 배치하여 접근성 향상 */}
              <div className="mt-1.5 text-right">
                <a
                  href="/auth/forgot-password"
                  className="text-xs text-muted-foreground hover:text-slate-900 hover:underline"
                >
                  {t('auth.login_form.forgot_password')}
                </a>
              </div>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading
                ? t('auth.login_form.logging_in')
                : t('auth.login_form.submit')}
            </Button>
          </form>

          <SocialLoginButtons />
        </CardContent>

        <CardFooter className="justify-center">
          <p className="text-xs text-muted-foreground">
            {t('auth.login_form.new_user')}{' '}
            <a
              href="/auth/signup"
              className="font-semibold text-slate-900 hover:underline"
            >
              {t('auth.login_form.create_account')}
            </a>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
