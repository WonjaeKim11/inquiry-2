'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { useAuth, apiFetch } from '@inquiry/client-core';
import {
  ProjectSettings,
  ProjectStylingForm,
  LanguageManager,
  DeleteProjectDialog,
  useProject,
} from '@inquiry/client-project';
import type { Project } from '@inquiry/client-project';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  Button,
} from '@inquiry/client-ui';

/**
 * 프로젝트 설정 페이지.
 * 탭 형태로 일반/스타일링/언어/삭제 설정을 제공한다.
 * URL 파라미터의 projectId로 해당 프로젝트 상세 정보를 서버에서 조회한다.
 */
export default function ProjectSettingsPage({
  params,
}: {
  params: Promise<{ lng: string; projectId: string }>;
}) {
  const { lng, projectId } = use(params);
  const { t } = useTranslation();
  const { user, loading: authLoading } = useAuth();
  const { refreshProjects } = useProject();
  const router = useRouter();

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  /** 프로젝트 상세 정보를 서버에서 조회한다 */
  const fetchProject = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch(`/projects/${projectId}`);
      if (res.ok) {
        const data = await res.json();
        setProject(data);
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
      fetchProject();
    }
  }, [authLoading, user, router, lng, fetchProject]);

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
      {/* 페이지 헤더 */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{t('project.settings.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{project.name}</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => router.push(`/${lng}/projects/${projectId}`)}
          >
            {t('project.title')}
          </Button>
          <Button
            variant="outline"
            onClick={() => router.push(`/${lng}/projects`)}
          >
            {t('project.title')}
          </Button>
        </div>
      </div>

      {/* 설정 탭 */}
      <Tabs defaultValue="general" className="space-y-6">
        <TabsList>
          <TabsTrigger value="general">
            {t('project.settings.general')}
          </TabsTrigger>
          <TabsTrigger value="styling">
            {t('project.settings.styling')}
          </TabsTrigger>
          <TabsTrigger value="languages">
            {t('project.settings.languages')}
          </TabsTrigger>
          <TabsTrigger value="danger">
            {t('project.settings.danger')}
          </TabsTrigger>
        </TabsList>

        {/* 일반 설정 탭 */}
        <TabsContent value="general">
          <ProjectSettings
            project={project}
            onUpdated={async () => {
              await fetchProject();
              await refreshProjects();
            }}
          />
        </TabsContent>

        {/* 스타일링 설정 탭 */}
        <TabsContent value="styling">
          <ProjectStylingForm
            project={project}
            onUpdated={async () => {
              await fetchProject();
            }}
          />
        </TabsContent>

        {/* 언어 관리 탭 */}
        <TabsContent value="languages">
          <LanguageManager projectId={projectId} />
        </TabsContent>

        {/* 위험 영역 — 프로젝트 삭제 */}
        <TabsContent value="danger">
          <div className="rounded-lg border border-destructive/50 p-6">
            <h3 className="text-lg font-semibold text-destructive">
              {t('project.delete.title')}
            </h3>
            <p className="mt-2 text-sm text-muted-foreground">
              {t('project.delete.warning')}
            </p>
            <Button
              variant="destructive"
              className="mt-4"
              onClick={() => setDeleteDialogOpen(true)}
            >
              {t('project.delete.submit')}
            </Button>
          </div>

          <DeleteProjectDialog
            project={project}
            open={deleteDialogOpen}
            onOpenChange={setDeleteDialogOpen}
            onDeleted={async () => {
              await refreshProjects();
              router.replace(`/${lng}/projects`);
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
