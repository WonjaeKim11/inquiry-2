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
  CardDescription,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';

const forgotPasswordSchema = z.object({
  email: z.string().email('auth.forgot_password.invalid_email').max(255),
});

/**
 * 비밀번호 재설정 요청 폼.
 * 이메일을 입력하면 서버에서 재설정 링크를 발송한다.
 */
export function ForgotPasswordForm() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const result = forgotPasswordSchema.safeParse({ email });
    if (!result.success) {
      setError(t(result.error.issues[0].message));
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
        throw new Error(data.message || t('auth.forgot_password.fail'));
      }
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('auth.forgot_password.fail'));
    } finally {
      setLoading(false);
    }
  };

  if (sent) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 px-2 py-4 text-center shadow-[0_0_15px_rgba(0,0,0,0.05)]">
          <CardHeader className="items-center">
            <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
              <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <CardTitle className="text-2xl">{t('auth.forgot_password.check_email_title')}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              {t('auth.forgot_password.email_sent_1', { email: <strong>{email}</strong> })}
              <br />
              {t('auth.forgot_password.email_sent_2')}
            </p>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild variant="outline" className="w-full">
              <a href="/auth/login">{t('auth.forgot_password.back_to_login')}</a>
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
          <CardTitle className="text-2xl">{t('auth.forgot_password.title')}</CardTitle>
          <CardDescription>{t('auth.forgot_password.description')}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.forgot_password.email_label')}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? t('auth.forgot_password.processing') : t('auth.forgot_password.submit')}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="justify-center">
          <a href="/auth/login" className="text-sm text-muted-foreground hover:underline">
            {t('auth.forgot_password.back_to_login')}
          </a>
        </CardFooter>
      </Card>
    </div>
  );
}
