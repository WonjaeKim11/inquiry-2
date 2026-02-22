'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@inquiry/client-core';
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
 * OAuth 콜백 처리 컴포넌트.
 * URL 쿼리 파라미터에서 accessToken을 추출하여 AuthProvider에 전달하고,
 * 성공 시 메인 페이지로 리다이렉트한다.
 */
export function AuthCallback() {
  const { handleOAuthCallback } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const { t } = useTranslation();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const accessToken = params.get('accessToken');

    if (!accessToken) {
      setError(t('auth.callback.no_token'));
      return;
    }

    handleOAuthCallback(accessToken)
      .then(() => {
        // URL에서 토큰 파라미터 제거 후 메인으로 이동
        window.location.href = '/';
      })
      .catch(() => {
        setError(t('auth.callback.error'));
      });
  }, [handleOAuthCallback]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
        <Card className="w-full max-w-md border-0 px-2 py-4 shadow-[0_0_15px_rgba(0,0,0,0.05)]">
          <CardHeader className="items-center">
            <CardTitle className="text-2xl">{t('auth.callback.error_title', { defaultValue: 'Error' })}</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter className="justify-center">
            <Button asChild variant="outline" className="w-full">
              <a href="/auth/login">{t('auth.callback.back_to_login')}</a>
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3]">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
      <p className="mt-4 text-sm text-muted-foreground">{t('auth.callback.processing')}</p>
    </div>
  );
}
