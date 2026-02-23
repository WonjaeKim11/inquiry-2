'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import { TwoFactorSetup } from '@inquiry/client-auth';

/**
 * 보안 설정 페이지 -- /settings/security
 * 인증된 사용자만 접근 가능하며, 2FA 설정을 관리할 수 있다.
 * 미인증 사용자는 로그인 페이지로 리다이렉트된다.
 */
export default function SecuritySettingsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = use(params);
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  // 로딩 완료 후 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [loading, user, router, lng]);

  // 로딩 중 스켈레톤 UI 표시
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  // 미인증 상태 -- 리다이렉트 대기
  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          {t('settings.security.title')}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {t('settings.security.description')}
        </p>
      </div>

      <TwoFactorSetup />
    </div>
  );
}
