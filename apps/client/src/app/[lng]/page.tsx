'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import {
  useOrganization,
  OrganizationSwitcher,
} from '@inquiry/client-organization';
import { Button } from '@inquiry/client-ui';

/**
 * 루트 페이지 -- 인증 여부에 따라 대시보드 또는 로그인 리다이렉트.
 * 인증된 사용자에게는 현재 조직 정보와 함께 대시보드 플레이스홀더를 표시한다.
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
  const { currentOrganization, loading: orgLoading } = useOrganization();
  const router = useRouter();

  // 로딩 완료 후 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [loading, user, router, lng]);

  // 로딩 중 스켈레톤 UI 표시
  if (loading || orgLoading) {
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

  // 인증된 사용자 -- 대시보드
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-8">
      {/* 상단 조직 전환 영역 */}
      <div className="mb-8">
        <OrganizationSwitcher
          onCreateNew={() => router.push(`/${lng}/organizations/new`)}
        />
      </div>

      <h1 className="text-3xl font-bold">{t('dashboard.title')}</h1>
      <p className="mt-4 text-muted-foreground">{t('dashboard.placeholder')}</p>

      {/* 현재 조직이 있으면 설정 페이지 링크를 표시한다 */}
      {currentOrganization && (
        <Button
          variant="outline"
          className="mt-6"
          onClick={() =>
            router.push(
              `/${lng}/organizations/${currentOrganization.id}/settings`
            )
          }
        >
          {t('organization.settings.title')}
        </Button>
      )}
    </div>
  );
}
