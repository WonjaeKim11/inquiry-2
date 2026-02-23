'use client';

import { use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@inquiry/client-core';
import { useOrganization } from '@inquiry/client-organization';
import { useProject } from '@inquiry/client-project';
import {
  Button,
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  Badge,
} from '@inquiry/client-ui';

/**
 * 프로젝트 목록 페이지.
 * 현재 조직 소속 프로젝트를 카드 형태로 표시한다.
 * 각 카드에 환경 수, 언어 수 정보를 포함한다.
 */
export default function ProjectsPage({
  params,
}: {
  params: Promise<{ lng: string }>;
}) {
  const { lng } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { currentOrganization } = useOrganization();
  const { projects, loading: projectLoading } = useProject();
  const router = useRouter();

  // 미인증 시 로그인 페이지로 리다이렉트
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
    }
  }, [authLoading, user, router, lng]);

  if (authLoading || projectLoading) {
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('project.title')}</h1>
          {currentOrganization && (
            <p className="mt-1 text-sm text-muted-foreground">
              {currentOrganization.name}
            </p>
          )}
        </div>
        <Button onClick={() => router.push(`/${lng}/projects/new`)}>
          {t('project.create.title')}
        </Button>
      </div>

      {projects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <p className="mb-4 text-muted-foreground">
              {t('project.list.empty')}
            </p>
            <Button onClick={() => router.push(`/${lng}/projects/new`)}>
              {t('project.create.title')}
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {projects.map((project) => (
            <Card
              key={project.id}
              className="cursor-pointer transition-shadow hover:shadow-md"
              onClick={() => router.push(`/${lng}/projects/${project.id}`)}
            >
              <CardHeader>
                <CardTitle className="text-lg">{project.name}</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-3">
                  <Badge variant="outline">
                    {t('project.list.environments')}:{' '}
                    {project.environments?.length ?? 0}
                  </Badge>
                  <Badge variant="outline">
                    {t('project.list.languages')}:{' '}
                    {project.languages?.length ?? 0}
                  </Badge>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
