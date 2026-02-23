'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import { Button } from '@inquiry/client-ui';
import { SurveyList, CreateSurveyDialog } from '@inquiry/client-survey';

/**
 * 설문 목록 페이지.
 * 환경에 속한 모든 설문을 표시하고 생성/편집 기능을 제공한다.
 */
export default function SurveysPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}) {
  const { lng, projectId, envId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [authLoading, user, router, lng]);

  if (authLoading) {
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

      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold">{t('survey.title')}</h1>
        <Button onClick={() => setCreateOpen(true)}>
          {t('survey.create.title')}
        </Button>
      </div>

      {/* 설문 목록 */}
      <SurveyList
        environmentId={envId}
        refreshKey={refreshKey}
        onEdit={(surveyId) =>
          router.push(
            `/${lng}/projects/${projectId}/environments/${envId}/surveys/${surveyId}/edit`
          )
        }
      />

      {/* 생성 다이얼로그 */}
      <CreateSurveyDialog
        environmentId={envId}
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={(survey) => {
          setRefreshKey((k) => k + 1);
          router.push(
            `/${lng}/projects/${projectId}/environments/${envId}/surveys/${survey.id}/edit`
          );
        }}
      />
    </div>
  );
}
