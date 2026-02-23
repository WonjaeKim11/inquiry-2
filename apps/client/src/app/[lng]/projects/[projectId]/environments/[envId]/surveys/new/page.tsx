'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import { Button } from '@inquiry/client-ui';
import { CreateSurveyDialog } from '@inquiry/client-survey';

/**
 * 새 설문 생성 페이지.
 * CreateSurveyDialog를 열린 상태로 표시하여 바로 설문을 생성할 수 있다.
 * 생성 성공 시 편집 페이지로 자동 이동한다.
 */
export default function NewSurveyPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}) {
  const { lng, projectId, envId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [dialogOpen, setDialogOpen] = useState(true);

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

  /** 다이얼로그가 닫히면 설문 목록으로 돌아간다 */
  const handleOpenChange = (open: boolean) => {
    setDialogOpen(open);
    if (!open) {
      router.push(
        `/${lng}/projects/${projectId}/environments/${envId}/surveys`
      );
    }
  };

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 네비게이션 */}
      <div className="mb-6 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() =>
            router.push(
              `/${lng}/projects/${projectId}/environments/${envId}/surveys`
            )
          }
        >
          {t('survey.editor.back_to_list')}
        </Button>
      </div>

      <h1 className="mb-8 text-2xl font-bold">{t('survey.create.title')}</h1>

      {/* 생성 다이얼로그 (열린 상태로 표시) */}
      <CreateSurveyDialog
        environmentId={envId}
        open={dialogOpen}
        onOpenChange={handleOpenChange}
        onCreated={(survey) => {
          router.push(
            `/${lng}/projects/${projectId}/environments/${envId}/surveys/${survey.id}/edit`
          );
        }}
      />
    </div>
  );
}
