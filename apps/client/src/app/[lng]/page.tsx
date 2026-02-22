'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';

/**
 * 루트 페이지 — 인증 여부에 따라 대시보드 또는 로그인 리다이렉트
 * 미인증 사용자는 /{lng}/auth/login으로 리다이렉트된다.
 */
export default function DashboardPage({
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

  // 미인증 상태 — 리다이렉트 대기
  if (!user) {
    return null;
  }

  // 인증된 사용자 — 대시보드 플레이스홀더
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('dashboard.placeholder')}</p>
    </div>
  );
}
