'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@inquiry/client-core';
import { ActionClassList } from '@inquiry/client-project';
import { Button } from '@inquiry/client-ui';
import { useTranslation } from 'react-i18next';

/**
 * ActionClass 목록 페이지.
 * 환경별 ActionClass를 테이블로 표시하고, 생성/삭제 기능을 제공한다.
 */
export default function ActionClassesPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}) {
  const { lng, projectId, envId } = use(params);
  const { t } = useTranslation();
  const { user, loading } = useAuth();
  const router = useRouter();

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [loading, user, router, lng]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!user) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 네비게이션 */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(`/${lng}/projects/${projectId}/environments/${envId}`)
          }
        >
          {t('project.environment.switch')}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => router.push(`/${lng}/projects/${projectId}`)}
        >
          {t('project.title')}
        </Button>
      </div>

      <ActionClassList
        environmentId={envId}
        onCreateNew={() =>
          router.push(
            `/${lng}/projects/${projectId}/environments/${envId}/action-classes/new`
          )
        }
      />
    </div>
  );
}
