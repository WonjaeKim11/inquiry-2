'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@inquiry/client-core';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardFooter,
  Alert,
  AlertDescription,
} from '@inquiry/client-ui';

/**
 * 이메일 검증 컴포넌트.
 * URL의 ?token= 파라미터를 추출하여 서버에 검증 요청을 보낸다.
 */
export function VerifyEmail() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const { t } = useTranslation();
  const [message, setMessage] = useState(t('auth.verify_email.processing'));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');

    if (!token) {
      setStatus('error');
      setMessage(t('auth.verify_email.missing_token'));
      return;
    }

    apiFetch('/auth/verify-email', {
      method: 'POST',
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus('success');
          setMessage(data.message || t('auth.verify_email.success_default'));
        } else {
          setStatus('error');
          setMessage(data.message || t('auth.verify_email.fail_default'));
        }
      })
      .catch(() => {
        setStatus('error');
        setMessage(t('auth.verify_email.error'));
      });
  }, [t]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-0 px-2 py-4 text-center shadow-[0_0_15px_rgba(0,0,0,0.05)]">
        <CardHeader className="items-center">
          <CardTitle className="text-2xl">{t('auth.verify_email.title')}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === 'loading' && (
            <div className="flex justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
            </div>
          )}

          {status === 'success' && (
            <>
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
                <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-teal-600">{message}</p>
            </>
          )}

          {status === 'error' && (
            <Alert variant="destructive">
              <AlertDescription>{message}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        {status !== 'loading' && (
          <CardFooter className="justify-center">
            <Button asChild variant="outline" className="w-full">
              <a href="/auth/login">{t('auth.verify_email.to_login')}</a>
            </Button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}
