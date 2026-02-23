'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, apiFetch } from '@inquiry/client-core';
import { EnvironmentSwitcher, useProject } from '@inquiry/client-project';
import type { Project } from '@inquiry/client-project';
import { Button, Badge, Card, CardContent } from '@inquiry/client-ui';

/**
 * 프로젝트 대시보드 페이지.
 * 프로젝트 상세 정보와 환경 전환 기능을 제공한다.
 * 환경을 선택하면 해당 환경의 대시보드로 이동할 수 있다.
 */
export default function ProjectDashboardPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string }>;
}) {
  const { lng, projectId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { switchProject, switchEnvironment } = useProject();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEnvId, setSelectedEnvId] = useState<string | null>(null);

  /** 프로젝트 상세 정보를 서버에서 조회한다 */
  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
        // 첫 번째 환경을 기본 선택
        if (data.environments && data.environments.length > 0) {
          setSelectedEnvId(data.environments[0].id);
        }
      } else {
        router.replace(`/${lng}/projects`);
      }
    } catch {
      router.replace(`/${lng}/projects`);
    } finally {
      setLoading(false);
    }
  }, [projectId, lng, router]);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace(`/${lng}/auth/login`);
      return;
    }
    if (user) {
      // context의 현재 프로젝트를 이 프로젝트로 전환한다
      switchProject(projectId);
      fetchProject();
    }
  }, [authLoading, user, router, lng, fetchProject, switchProject, projectId]);

  /** 환경 전환 핸들러 */
  const handleEnvSwitch = (envId: string) => {
    setSelectedEnvId(envId);
    switchEnvironment(envId);
  };

  if (authLoading || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-gray-900" />
      </div>
    );
  }

  if (!user || !project) {
    return null;
  }

  return (
    <div className="mx-auto max-w-4xl p-8">
      {/* 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{project.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('project.title')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() =>
              router.push(`/${lng}/projects/${projectId}/settings`)
            }
          >
            {t('project.settings.title')}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/${lng}/projects`)}
          >
            {t('project.title')}
          </Button>
        </div>
      </div>

      {/* 환경 전환 */}
      <div className="mb-6">
        <EnvironmentSwitcher
          environments={project.environments}
          currentEnvironmentId={selectedEnvId}
          onSwitch={handleEnvSwitch}
        />
      </div>

      {/* 환경 정보 카드 */}
      {selectedEnvId && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() =>
              router.push(
                `/${lng}/projects/${projectId}/environments/${selectedEnvId}`
              )
            }
          >
            <CardContent className="pt-6">
              <h3 className="font-medium">{t('project.environment.switch')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {project.environments.find((e) => e.id === selectedEnvId)?.type}
              </p>
            </CardContent>
          </Card>

          <Card
            className="cursor-pointer transition-shadow hover:shadow-md"
            onClick={() =>
              router.push(
                `/${lng}/projects/${projectId}/environments/${selectedEnvId}/action-classes`
              )
            }
          >
            <CardContent className="pt-6">
              <h3 className="font-medium">{t('project.action_class.title')}</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                {t('project.action_class.title')}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* 프로젝트 메타 정보 */}
      <div className="mt-6 flex flex-wrap gap-2">
        <Badge variant="outline">
          {t('project.list.environments')}: {project.environments?.length ?? 0}
        </Badge>
        <Badge variant="outline">
          {t('project.list.languages')}: {project.languages?.length ?? 0}
        </Badge>
      </div>
    </div>
  );
}
