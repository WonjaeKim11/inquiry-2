'use client';

import { useState } from 'react';
import { z } from 'zod';
import { apiFetch } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  Label,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';

/**
 * 비밀번호 재설정 폼 검증 스키마.
 * 서버 DTO 규칙과 동기화되어야 한다.
 */
const resetPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, 'auth.reset_password.min_length')
      .max(128, 'auth.reset_password.max_length')
      .regex(/[A-Z]/, 'auth.reset_password.require_uppercase')
      .regex(/[0-9]/, 'auth.reset_password.require_number'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'auth.reset_password.password_mismatch',
    path: ['confirmPassword'],
  });

/**
 * 비밀번호 재설정 폼.
 * URL의 ?token= 파라미터와 새 비밀번호를 서버에 전송한다.
 */
export function ResetPasswordForm() {
  const { t } = useTranslation();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = resetPasswordSchema.safeParse({ password, confirmPassword });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (!token) {
      setError(t('auth.reset_password.no_token'));
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ token, password }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || t('auth.reset_password.fail'));
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.reset_password.fail'));
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 px-2 py-4 text-center shadow-[0_0_15px_rgba(0,0,0,0.05)]">
          <CardHeader className="items-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <CardTitle className="text-2xl">{t('auth.reset_password.success_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-teal-600">{t('auth.reset_password.success_message')}</p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild className="w-full">
              <a href="/auth/login">{t('auth.reset_password.login_new_password')}</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-0 px-2 py-4 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
        <CardHeader>
          <CardTitle className="text-2xl">{t('auth.reset_password.title')}</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.reset_password.new_password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('auth.reset_password.password_placeholder')}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">{t('auth.reset_password.confirm_password')}</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={t('auth.reset_password.confirm_password_placeholder')}
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('auth.reset_password.processing') : t('auth.reset_password.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <a href="/auth/login" className="text-sm text-muted-foreground hover:underline">
            {t('auth.reset_password.back_to_login')}
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
