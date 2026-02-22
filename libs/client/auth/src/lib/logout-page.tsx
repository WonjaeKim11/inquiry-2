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
} from '@inquiry/client-ui';

/**
 * 로그아웃 처리 컴포넌트.
 * 마운트 시 자동으로 로그아웃하고 로그인 페이지로 안내한다.
 */
export function LogoutPage() {
  const { logout } = useAuth();
  const [done, setDone] = useState(false);
  const { t } = useTranslation();

  useEffect(() => {
    logout().then(() => setDone(true)).catch(() => setDone(true));
  }, [logout]);

  if (!done) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
        <p className="mt-4 text-sm text-muted-foreground">{t('auth.logout.processing')}</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#e4f6f3] px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md border-0 px-2 py-4 text-center shadow-[0_0_15px_rgba(0,0,0,0.05)]">
        <CardHeader className="items-center">
          <div className="mx-auto mb-2 flex h-16 w-16 items-center justify-center rounded-full bg-teal-50">
            <svg className="h-8 w-8 text-teal-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <CardTitle className="text-2xl">{t('auth.logout.complete')}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">{t('auth.logout.success_message')}</p>
        </CardContent>
        <CardFooter className="justify-center">
          <Button asChild className="w-full">
            <a href="/auth/login">{t('auth.logout.relogin')}</a>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
