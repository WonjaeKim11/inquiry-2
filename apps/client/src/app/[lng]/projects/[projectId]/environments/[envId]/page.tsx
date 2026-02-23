'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, apiFetch } from '@inquiry/client-core';
import type { Environment } from '@inquiry/client-project';
import { Button, Badge, Card, CardContent } from '@inquiry/client-ui';

/**
 * 환경 대시보드 페이지.
 * 환경 상세 정보를 표시하고 ActionClass 관리 페이지로의 네비게이션을 제공한다.
 */
export default function EnvironmentDashboardPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string; envId: string }>;
}) {
  const { lng, projectId, envId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [environment, setEnvironment] = useState<Environment | null>(null);
  const [loading, setLoading] = useState(true);

  /** 환경 상세 정보를 서버에서 조회한다 */
  const fetchEnvironment = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/environments/${envId}`);
      if (res.ok) {
        const data = await res.json();
        setEnvironment(data);
      } else {
        router.replace(`/${lng}/projects/${projectId}`);
      }
    } catch {
      router.replace(`/${lng}/projects/${projectId}`);
    } finally {
      setLoading(false);
    }
  }, [envId, projectId, lng, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
      return;
    }
    if (user) {
      fetchEnvironment();
    }
  }, [authLoading, user, router, lng, fetchEnvironment]);

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!user || !environment) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">
            {t(`project.environment.${environment.type}`)}
          </h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge
              variant={
                environment.type === 'production' ? 'default' : 'secondary'
              }
            >
              {environment.type}
            </Badge>
          </div>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/${lng}/projects/${projectId}/environments/${envId}/surveys`
              )
            }
          >
            {t('survey.title')}
          </Button>
          <Button
            variant="outline"
            onClick={() =>
              router.push(
                `/${lng}/projects/${projectId}/environments/${envId}/action-classes`
              )
            }
          >
            {t('project.action_class.title')}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/${lng}/projects/${projectId}`)}
          >
            {t('project.title')}
          </Button>
        </div>
      </div>

      {/* 환경 정보 */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('project.environment.switch')}
            </p>
            <p className="mt-1 font-medium">
              {t(`project.environment.${environment.type}`)}
            </p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() =>
            router.push(
              `/${lng}/projects/${projectId}/environments/${envId}/surveys`
            )
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">{t('survey.title')}</p>
            <p className="mt-1 font-medium">{t('survey.title')}</p>
          </CardContent>
        </Card>

        <Card
          className="cursor-pointer transition-shadow hover:shadow-md"
          onClick={() =>
            router.push(
              `/${lng}/projects/${projectId}/environments/${envId}/action-classes`
            )
          }
        >
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">
              {t('project.action_class.title')}
            </p>
            <p className="mt-1 font-medium">
              {t('project.action_class.title')}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
